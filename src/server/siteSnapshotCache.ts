import crypto from "crypto";
import path from "path";
import { DEFAULT_FRACTIELEDEN } from "../data/fractieleden.js";
import { BUURTKAART_43_WIJKEN } from "../data/defaultWijken.js";
import {
  invalidateVideoThumbnailCache,
  prebakeAllVideoThumbnails,
  getPrebakedThumbnailStats,
} from "./videoThumbnailService.js";

export const DEFAULT_VIDEO_STANDPUNTEN: Record<
  string,
  { hoofdstukNr: number; standpuntNr: number; standpuntTitel: string }
> = {
  "1001": { hoofdstukNr: 5, standpuntNr: 3, standpuntTitel: "Meer betaalbare koopwoningen" },
  "1002": { hoofdstukNr: 6, standpuntNr: 1, standpuntTitel: "Betere bereikbaarheid en doorstroming" },
  "1003": { hoofdstukNr: 6, standpuntNr: 4, standpuntTitel: "Geen betaald parkeren Weerribben-Wieden" },
  "1004": { hoofdstukNr: 7, standpuntNr: 1, standpuntTitel: "Lagere lokale lasten voor inwoners en ondernemers" },
  "1005": { hoofdstukNr: 1, standpuntNr: 6, standpuntTitel: "Lokale autonomie herstellen" },
  "1006": { hoofdstukNr: 8, standpuntNr: 11, standpuntTitel: "Sterke lokale sportverenigingen" },
  "1007": { hoofdstukNr: 6, standpuntNr: 13, standpuntTitel: "Lokale knelpunten oplossen" },
  "1008": { hoofdstukNr: 1, standpuntNr: 12, standpuntTitel: "Verantwoordelijke financiën" },
  "1009": { hoofdstukNr: 4, standpuntNr: 7, standpuntTitel: "Ondersteuning van lokale verenigingen" },
  "1010": { hoofdstukNr: 8, standpuntNr: 5, standpuntTitel: "Regie terug in de jeugdzorg" },
};

export interface PublicSiteSnapshot {
  version: string;
  etag: string;
  generatedAt: string;
  fractieleden: any[];
  videos: any[];
  newsSummaries: any[];
  events: any[];
  wijken: any[];
  categories: any[];
  faqs: any[];
  stemgedrag: any[];
  podcasts: any[];
  inlineBootstrapScript: string;
}

let activeSnapshot: PublicSiteSnapshot | null = null;
let snapshotVersionCounter = Date.now();
const articleMemoryCache = new Map<string, any>();
const htmlPageCache = new Map<string, { html: string; etag: string; createdAt: number }>();
let lastCachePurgeAt: string = new Date().toISOString();

function stripHtmlTags(raw?: string): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const INTERNAL_ADMIN_USERNAMES = new Set([
  "tempadmin",
  "admin",
  "superadmin",
  "root",
  "moderator",
  "system",
]);

function extractSafePublicCity(rawAddress?: string, fallbackCity?: string): string {
  if (fallbackCity && typeof fallbackCity === "string" && fallbackCity.trim()) {
    return fallbackCity.trim();
  }
  if (!rawAddress || typeof rawAddress !== "string") return "Steenwijkerland";
  const trimmed = rawAddress.trim();
  if (!trimmed) return "Steenwijkerland";
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/^\d{4}\s*[A-Za-z]{2}\s+/, "").trim() || "Steenwijkerland";
  }
  if (/\d/.test(trimmed)) {
    const tokens = trimmed.split(/\s+/);
    const nonNumericTail = tokens.filter((t) => !/\d/.test(t));
    if (nonNumericTail.length > 0 && nonNumericTail.length < tokens.length) {
      return nonNumericTail[nonNumericTail.length - 1];
    }
  }
  return trimmed;
}

export function sanitizePublicAuthorName(rawAuthor?: string): string {
  if (!rawAuthor || typeof rawAuthor !== "string") return "";
  const trimmed = rawAuthor.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (INTERNAL_ADMIN_USERNAMES.has(lower) || lower.startsWith("tempadmin")) {
    return "Onafhankelijk Steenwijkerland";
  }
  return trimmed;
}

export function sanitizePublicEventForSnapshot(e: any, includeDescription = true): any {
  if (!e) return e;
  const city = extractSafePublicCity(e.address, e.city);
  const publicAddress = city || "Steenwijkerland";
  const result: Record<string, any> = {
    id: e.id,
    ...(e.slug ? { slug: e.slug } : {}),
    title: e.title || "",
    date: e.date || "",
    startTime: e.startTime || "",
    endTime: e.endTime || "",
    city: publicAddress,
    address: publicAddress,
    shortDescription: e.shortDescription || "",
    ...(includeDescription ? { description: e.description || "" } : {}),
    thumbnailUrl: e.thumbnailUrl || "",
    backgroundUrl: e.backgroundUrl || "",
    ...(e.headerUrl ? { headerUrl: e.headerUrl } : {}),
    ...(e.image ? { image: e.image } : {}),
    ...(e.imageUrl ? { imageUrl: e.imageUrl } : {}),
    ...(e.bannerUrl ? { bannerUrl: e.bannerUrl } : {}),
    ...(e.fotoUrl ? { fotoUrl: e.fotoUrl } : {}),
    ...(e.lat !== undefined ? { lat: e.lat } : {}),
    ...(e.lng !== undefined ? { lng: e.lng } : {}),
    ...(e.latitude !== undefined ? { latitude: e.latitude } : {}),
    ...(e.longitude !== undefined ? { longitude: e.longitude } : {}),
    ...(e.wijkSlug ? { wijkSlug: e.wijkSlug } : {}),
    ...(e.wijkNaam ? { wijkNaam: e.wijkNaam } : {}),
    ...(e.category ? { category: e.category } : {}),
    isPublic: e.isPublic !== false,
    isPublished: e.isPublished !== false,
    isCancelled: Boolean(e.isCancelled),
    ...(e.maxAttendees !== undefined ? { maxAttendees: e.maxAttendees } : {}),
    ...(e.maxParticipants !== undefined ? { maxParticipants: e.maxParticipants } : {}),
    nonMemberPrice: typeof e.nonMemberPrice === "number" ? e.nonMemberPrice : Number(e.nonMemberPrice) || 0,
    ...(e.ticketNotes ? { ticketNotes: e.ticketNotes } : {}),
    locationHiddenUntil12h: e.locationHiddenUntil12h !== false,
    attendeesCount: Array.isArray(e.attendees) ? e.attendees.length : 0,
    ...(e.createdAt ? { createdAt: e.createdAt } : {}),
    ...(e.updatedAt ? { updatedAt: e.updatedAt } : {}),
  };
  return result;
}

function stripInternalAuditFields(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const {
    createdBy: _cb,
    createdByUsername: _cbu,
    createdById: _cbi,
    updatedBy: _ub,
    updatedByUsername: _ubu,
    editedBy: _eb,
    authorUsername: _au,
    password: _pw,
    passwordHash: _pwh,
    salt: _salt,
    twoFactorSecret: _tfa,
    token: _tok,
    refreshToken: _rtok,
    cancellations: _canc,
    attendees: _att,
    tickets: _tkt,
    guestRegistrations: _gr,
    ...rest
  } = obj;
  return rest;
}

export function sanitizeMemberPhotoForSnapshot(member: any): any {
  if (!member) return member;
  const copy = stripInternalAuditFields({ ...member });
  delete copy.username;
  const def = DEFAULT_FRACTIELEDEN.find(
    (d) =>
      String(d.id) === String(copy.id) ||
      (d.name && copy.name && d.name.toLowerCase() === copy.name.toLowerCase())
  );
  if (!copy.imgUrl && def?.imgUrl) {
    copy.imgUrl = def.imgUrl;
  }
  if (typeof copy.imgUrl === "string" && copy.imgUrl.startsWith("/assets/") && /\.(png|jpg|jpeg)$/i.test(copy.imgUrl)) {
    copy.imgUrl = copy.imgUrl.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  }
  if (!copy.cutoutImageUrl && def?.cutoutImageUrl) {
    copy.cutoutImageUrl = def.cutoutImageUrl;
  }
  if (copy.beloftes === undefined && def?.beloftes) {
    copy.beloftes = def.beloftes;
  }
  return copy;
}

export function buildPublicSiteSnapshot(db: any, forceNewVersion = false): PublicSiteSnapshot {
  if (forceNewVersion) {
    snapshotVersionCounter = Date.now();
  }
  const version = `v_${snapshotVersionCounter}`;
  const generatedAt = new Date().toISOString();

  // Collect known internal admin usernames that should never leak into public author fields
  const blockedInternalUsernames = new Set<string>(INTERNAL_ADMIN_USERNAMES);
  if (Array.isArray(db?.users)) {
    for (const u of db.users) {
      if (u && u.username && (u.role === "admin" || u.role === "superadmin" || u.role === "key-user")) {
        const uname = String(u.username).trim().toLowerCase();
        const fName = String(u.fullName || "").trim().toLowerCase();
        if (uname && uname !== fName) {
          blockedInternalUsernames.add(uname);
        }
      }
    }
  }
  const cleanPublicAuthor = (val?: string) => {
    if (!val || typeof val !== "string") return "";
    const trimmed = val.trim();
    if (!trimmed) return "";
    const lower = trimmed.toLowerCase();
    if (blockedInternalUsernames.has(lower) || lower.startsWith("tempadmin")) {
      return "Onafhankelijk Steenwijkerland";
    }
    return trimmed;
  };

  // 1. Fractieleden
  const rawMembers =
    db?.fractieleden && Array.isArray(db.fractieleden) && db.fractieleden.length > 0
      ? db.fractieleden
      : DEFAULT_FRACTIELEDEN;
  const fractieleden = rawMembers.map(sanitizeMemberPhotoForSnapshot);

  // 2. Videos (with static pre-baked .webp and .jpg URLs)
  const rawVideos = Array.isArray(db?.videos) ? db.videos : [];
  const videos = rawVideos.map((v: any) => {
    const defSp = DEFAULT_VIDEO_STANDPUNTEN[String(v.id)];
    const cleanedV = stripInternalAuditFields(v);
    const enriched =
      defSp && cleanedV.hoofdstukNr === undefined && cleanedV.standpuntNr === undefined
        ? {
            ...cleanedV,
            hoofdstukNr: defSp.hoofdstukNr,
            standpuntNr: defSp.standpuntNr,
            standpuntTitel: cleanedV.standpuntTitel || defSp.standpuntTitel,
          }
        : { ...cleanedV };

    const cleanId = String(enriched.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const memberId =
      enriched.fractieledenIds && enriched.fractieledenIds.length > 0
        ? enriched.fractieledenIds[0]
        : enriched.personId || "";
    let linkedMember = memberId
      ? fractieleden.find((m: any) => String(m.id) === String(memberId))
      : null;
    if (!linkedMember && enriched.title) {
      for (const m of fractieleden) {
        if (m.name && enriched.title.toLowerCase().includes(m.name.toLowerCase())) {
          linkedMember = m;
          break;
        }
      }
    }
    const memberCutout = linkedMember?.cutoutImageUrl || linkedMember?.photoNoBgUrl;
    const memberVer = memberCutout
      ? path.basename(memberCutout)
      : linkedMember?.imgUrl
        ? path.basename(linkedMember.imgUrl)
        : version;

    const needsAutoThumb =
      !enriched.thumbnailUrl ||
      enriched.thumbnailUrl.includes("ytimg") ||
      enriched.thumbnailUrl.includes("hqdefault") ||
      enriched.thumbnailUrl.includes("/api/videos/") ||
      enriched.thumbnailUrl.includes("/api/thumbnail/") ||
      enriched.thumbnailUrl.includes("/uploads/thumbnails/video-");

    const staticWebpUrl = `/uploads/thumbnails/video-${cleanId}.webp?v=${encodeURIComponent(memberVer)}_${snapshotVersionCounter}`;
    const staticJpgUrl = `/uploads/thumbnails/video-${cleanId}.jpg?v=${encodeURIComponent(memberVer)}_${snapshotVersionCounter}`;

    return {
      ...enriched,
      ...(enriched.author ? { author: cleanPublicAuthor(enriched.author) } : {}),
      ...(enriched.authorName ? { authorName: cleanPublicAuthor(enriched.authorName) } : {}),
      thumbnailUrl: needsAutoThumb ? staticWebpUrl : enriched.thumbnailUrl,
      posterJpgUrl: needsAutoThumb ? staticJpgUrl : enriched.thumbnailUrl,
    };
  });

  // 3. News Summaries & Full Article RAM Cache
  articleMemoryCache.clear();
  const rawNews = Array.isArray(db?.news) ? db.news : [];
  const sortedNews = [...rawNews].sort((a: any, b: any) => {
    const timeA = new Date(a.createdAt || a.date || 0).getTime();
    const timeB = new Date(b.createdAt || b.date || 0).getTime();
    if (isNaN(timeA) || isNaN(timeB) || timeA === timeB) {
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    }
    return timeB - timeA;
  });

  const newsSummaries: any[] = [];
  for (const rawItem of sortedNews) {
    if (!rawItem || !rawItem.id) continue;
    const n = stripInternalAuditFields(rawItem);
    const safeAuthor = cleanPublicAuthor(n.author);
    const safeAuthorName = cleanPublicAuthor(n.authorName);
    const sanitizedArticle = {
      ...n,
      ...(n.author !== undefined ? { author: safeAuthor } : {}),
      ...(n.authorName !== undefined ? { authorName: safeAuthorName } : {}),
    };
    articleMemoryCache.set(String(n.id), sanitizedArticle);
    if (n.slug) {
      articleMemoryCache.set(String(n.slug).toLowerCase(), sanitizedArticle);
    }
    if (n.isHidden || n.isHidden === "true") continue;

    const plainExcerpt =
      n.excerpt ||
      n.description ||
      stripHtmlTags(n.content).slice(0, 220);

    const { content: _fullContent, ...restWithoutContent } = sanitizedArticle;
    newsSummaries.push({
      ...restWithoutContent,
      excerpt: plainExcerpt,
      description: n.description || plainExcerpt,
      hasInteractiveDossier: Boolean(
        typeof n.content === "string" &&
          (n.content.includes("data-dataproduct") ||
            n.content.includes("<!DOCTYPE html") ||
            n.content.includes("<html"))
      ),
    });
  }

  // 4. Public-Only Events, Wijken, Categories, FAQs, Stemgedrag, Podcasts (Strict Allowlist — ZERO PII)
  const events = Array.isArray(db?.events)
    ? db.events
        .filter((e: any) => e && e.isPublished !== false && e.isPublic !== false)
        .map((e: any) => sanitizePublicEventForSnapshot(e, true))
    : [];
  const rawWijken =
    Array.isArray(db?.wijken) && db.wijken.length > 0 ? db.wijken : BUURTKAART_43_WIJKEN;
  const wijken = rawWijken.map((w: any) => {
    if (!w || typeof w !== "object") return w;
    const normBanner =
      typeof w.bannerUrl === "string" && w.bannerUrl.startsWith("/assets/") && /\.(png|jpg|jpeg)$/i.test(w.bannerUrl)
        ? w.bannerUrl.replace(/\.(png|jpg|jpeg)$/i, ".webp")
        : w.bannerUrl;
    const normHero =
      typeof w.heroBannerUrl === "string" && w.heroBannerUrl.startsWith("/assets/") && /\.(png|jpg|jpeg)$/i.test(w.heroBannerUrl)
        ? w.heroBannerUrl.replace(/\.(png|jpg|jpeg)$/i, ".webp")
        : w.heroBannerUrl;
    return normBanner !== w.bannerUrl || normHero !== w.heroBannerUrl
      ? { ...w, bannerUrl: normBanner, heroBannerUrl: normHero }
      : w;
  });
  const categories = Array.isArray(db?.categories)
    ? db.categories.map(stripInternalAuditFields)
    : [];
  const faqs = Array.isArray(db?.faqs)
    ? db.faqs.filter((f: any) => f && f.published !== false).map(stripInternalAuditFields)
    : [];
  const stemgedrag = Array.isArray(db?.stemgedrag) ? db.stemgedrag.map(stripInternalAuditFields) : [];
  const podcasts = Array.isArray(db?.podcasts)
    ? db.podcasts.map((p: any) => {
        const cleaned = stripInternalAuditFields(p);
        return {
          ...cleaned,
          ...(cleaned.author !== undefined ? { author: cleanPublicAuthor(cleaned.author) } : {}),
          ...(cleaned.authorName !== undefined ? { authorName: cleanPublicAuthor(cleaned.authorName) } : {}),
        };
      })
    : [];

  // 5. Compact Bootstrap Payload injected directly into index.html for 0ms First Load (Zero PII)
  const inlinePayload = {
    version,
    generatedAt,
    fractieleden,
    videos: videos.map((v: any) => ({
      ...v,
      description: v.description ? String(v.description).slice(0, 2000) : "",
    })),
    newsSummaries: newsSummaries.slice(0, 36),
    events: events.slice(0, 16).map((e: any) => sanitizePublicEventForSnapshot(e, false)),
    categories,
    faqs,
    podcasts,
  };

  // Safe JSON serialization for inline <script> tag (escapes </script> and unicode separators)
  const serializedInline = JSON.stringify(inlinePayload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  const inlineBootstrapScript = `<script id="__INITIAL_PUBLIC_SNAPSHOT__">window.__INITIAL_PUBLIC_SNAPSHOT__=${serializedInline};</script>`;

  const etagHash = crypto
    .createHash("sha1")
    .update(`${version}_${fractieleden.length}_${videos.length}_${newsSummaries.length}_${podcasts.length}`)
    .digest("hex")
    .slice(0, 16);

  activeSnapshot = {
    version,
    etag: `"snap-${etagHash}"`,
    generatedAt,
    fractieleden,
    videos,
    newsSummaries,
    events,
    wijken,
    categories,
    faqs,
    stemgedrag,
    podcasts,
    inlineBootstrapScript,
  };

  // Clear HTML page cache whenever snapshot changes
  htmlPageCache.clear();

  return activeSnapshot;
}

export function getPublicSiteSnapshot(dbFn: () => any): PublicSiteSnapshot {
  if (!activeSnapshot) {
    return buildPublicSiteSnapshot(dbFn(), false);
  }
  return activeSnapshot;
}

export function getCachedNewsArticleById(id: string, dbFn: () => any): any | null {
  if (!activeSnapshot) {
    buildPublicSiteSnapshot(dbFn(), false);
  }
  const key = String(id || "");
  return articleMemoryCache.get(key) || articleMemoryCache.get(key.toLowerCase()) || null;
}

export function getCachedHtmlPage(cacheKey: string): { html: string; etag: string } | null {
  const entry = htmlPageCache.get(cacheKey);
  if (!entry) return null;
  return { html: entry.html, etag: entry.etag };
}

export function setCachedHtmlPage(cacheKey: string, html: string, etag: string): void {
  if (htmlPageCache.size > 300) {
    // Evict oldest entries if cache exceeds 300 unique URLs
    const firstKey = htmlPageCache.keys().next().value;
    if (firstKey) htmlPageCache.delete(firstKey);
  }
  htmlPageCache.set(cacheKey, { html, etag, createdAt: Date.now() });
}

export function invalidatePublicSiteSnapshot(db?: any): void {
  snapshotVersionCounter = Date.now();
  htmlPageCache.clear();
  articleMemoryCache.clear();
  if (db) {
    buildPublicSiteSnapshot(db, true);
  } else {
    activeSnapshot = null;
  }
}

export function getServerCacheDiagnostics(dbFn: () => any) {
  const snap = getPublicSiteSnapshot(dbFn);
  const thumbStats = getPrebakedThumbnailStats();
  const cfConfigured = Boolean(
    process.env.CLOUDFLARE_ZONE_ID && process.env.CLOUDFLARE_API_TOKEN
  );

  return {
    snapshotVersion: snap.version,
    etag: snap.etag,
    generatedAt: snap.generatedAt,
    lastCachePurgeAt,
    cachedHtmlPagesCount: htmlPageCache.size,
    cachedArticlesCount: articleMemoryCache.size,
    counts: {
      fractieleden: snap.fractieleden.length,
      videos: snap.videos.length,
      newsSummaries: snap.newsSummaries.length,
      events: snap.events.length,
      wijken: snap.wijken.length,
    },
    thumbnails: thumbStats,
    cloudflare: {
      configured: cfConfigured,
      zoneIdPreview: process.env.CLOUDFLARE_ZONE_ID
        ? `${process.env.CLOUDFLARE_ZONE_ID.slice(0, 6)}...`
        : null,
    },
  };
}

/**
 * Forces a complete server-side cache purge, snapshot rebuild, static thumbnail regeneration,
 * and optional Cloudflare CDN edge purge.
 */
export async function forcePurgeAllCaches(
  db: any,
  options: { rebuildThumbnails?: boolean } = { rebuildThumbnails: true }
): Promise<{
  success: boolean;
  snapshotVersion: string;
  generatedAt: string;
  thumbnailsRebuilt: number;
  thumbnailDurationMs: number;
  cloudflarePurged: boolean;
  cloudflareMessage: string;
}> {
  lastCachePurgeAt = new Date().toISOString();
  htmlPageCache.clear();
  articleMemoryCache.clear();

  let thumbnailsRebuilt = 0;
  let thumbnailDurationMs = 0;

  if (options.rebuildThumbnails !== false) {
    invalidateVideoThumbnailCache();
    const bakeRes = await prebakeAllVideoThumbnails(db, true);
    thumbnailsRebuilt = bakeRes.count;
    thumbnailDurationMs = bakeRes.durationMs;
  }

  const freshSnap = buildPublicSiteSnapshot(db, true);

  // Optional Cloudflare CDN Edge Purge if credentials are present in .env
  let cloudflarePurged = false;
  let cloudflareMessage =
    "Cloudflare Edge Cache wordt automatisch ververst via nieuwe versie-hash (?v=...) en Cache-Control headers.";

  const cfZoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const cfToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (cfZoneId && cfToken) {
    try {
      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(cfZoneId)}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ purge_everything: true }),
        }
      );
      const cfData: any = await cfRes.json().catch(() => ({}));
      if (cfRes.ok && cfData?.success) {
        cloudflarePurged = true;
        cloudflareMessage = "Cloudflare Edge Cache (purge_everything) succesvol geleegd!";
      } else {
        cloudflareMessage = `Cloudflare API melding: ${cfData?.errors?.[0]?.message || cfRes.statusText}`;
      }
    } catch (cfErr: any) {
      cloudflareMessage = `Cloudflare purge verbindingsfout: ${cfErr?.message || String(cfErr)}`;
    }
  }

  return {
    success: true,
    snapshotVersion: freshSnap.version,
    generatedAt: freshSnap.generatedAt,
    thumbnailsRebuilt,
    thumbnailDurationMs,
    cloudflarePurged,
    cloudflareMessage,
  };
}
