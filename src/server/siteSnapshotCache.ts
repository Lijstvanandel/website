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

export function sanitizeMemberPhotoForSnapshot(member: any): any {
  if (!member) return member;
  const copy = { ...member };
  const def = DEFAULT_FRACTIELEDEN.find(
    (d) =>
      String(d.id) === String(copy.id) ||
      (d.name && copy.name && d.name.toLowerCase() === copy.name.toLowerCase())
  );
  if (!copy.imgUrl && def?.imgUrl) {
    copy.imgUrl = def.imgUrl;
  }
  if (!copy.cutoutImageUrl && def?.cutoutImageUrl) {
    copy.cutoutImageUrl = def.cutoutImageUrl;
  }
  return copy;
}

export function buildPublicSiteSnapshot(db: any, forceNewVersion = false): PublicSiteSnapshot {
  if (forceNewVersion) {
    snapshotVersionCounter = Date.now();
  }
  const version = `v_${snapshotVersionCounter}`;
  const generatedAt = new Date().toISOString();

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
    const enriched =
      defSp && v.hoofdstukNr === undefined && v.standpuntNr === undefined
        ? {
            ...v,
            hoofdstukNr: defSp.hoofdstukNr,
            standpuntNr: defSp.standpuntNr,
            standpuntTitel: v.standpuntTitel || defSp.standpuntTitel,
          }
        : { ...v };

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
  for (const n of sortedNews) {
    if (!n || !n.id) continue;
    articleMemoryCache.set(String(n.id), n);
    if (n.isHidden || n.isHidden === "true") continue;

    const plainExcerpt =
      n.excerpt ||
      n.description ||
      stripHtmlTags(n.content).slice(0, 220);

    const { content: _fullContent, ...restWithoutContent } = n;
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

  // 4. Events, Wijken, Categories, FAQs, Stemgedrag
  const events = Array.isArray(db?.events)
    ? db.events.filter((e: any) => e && e.isPublished !== false)
    : [];
  const wijken =
    Array.isArray(db?.wijken) && db.wijken.length > 0 ? db.wijken : BUURTKAART_43_WIJKEN;
  const categories = Array.isArray(db?.categories) ? db.categories : [];
  const faqs = Array.isArray(db?.faqs)
    ? db.faqs.filter((f: any) => f && f.published !== false)
    : [];
  const stemgedrag = Array.isArray(db?.stemgedrag) ? db.stemgedrag : [];

  // 5. Compact Bootstrap Payload injected directly into index.html for 0ms First Load
  const inlinePayload = {
    version,
    generatedAt,
    fractieleden,
    videos: videos.map((v: any) => ({
      ...v,
      description: v.description ? String(v.description).slice(0, 260) : "",
    })),
    newsSummaries: newsSummaries.slice(0, 36),
    events: events.slice(0, 16).map((e: any) => {
      const { description: _desc, attendees: _att, ...lightEvent } = e;
      return lightEvent;
    }),
    categories,
    faqs,
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
    .update(`${version}_${fractieleden.length}_${videos.length}_${newsSummaries.length}`)
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
  return articleMemoryCache.get(String(id)) || null;
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
