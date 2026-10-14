import fs from "fs";
import path from "path";
import sharp from "sharp";
import { BUURTKAART_43_WIJKEN } from "../data/defaultWijken.js";
import { DEFAULT_FRACTIELEDEN } from "../data/fractieleden.js";

// In-memory cache for ultra-fast serving (up to 200 thumbnails)
const thumbnailCache = new Map<string, { buffer: Buffer; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function invalidateVideoThumbnailCache(videoId?: string): void {
  if (videoId) {
    thumbnailCache.delete(String(videoId));
  } else {
    thumbnailCache.clear();
  }
}

export function escapeXml(unsafe: string): string {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapThumbnailHeadline(text: string, maxCharsPerLine = 24, maxLines = 4): string[] {
  const words = (text || "").trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [text || "Lijst van Andel"];
}

function buildHeadlineSpans(line: string, memberName: string): string {
  if (!memberName) return escapeXml(line);
  if (line.includes(memberName)) {
    const parts = line.split(memberName);
    return `${escapeXml(parts[0])}<tspan fill="#f59e0b">${escapeXml(memberName)}</tspan>${escapeXml(parts[1])}`;
  }
  const nameWords = memberName.split(/\s+/);
  for (let i = nameWords.length; i >= 1; i--) {
    const subName = nameWords.slice(0, i).join(" ");
    if (line.startsWith(subName)) {
      const rest = line.slice(subName.length);
      return `<tspan fill="#f59e0b">${escapeXml(subName)}</tspan>${escapeXml(rest)}`;
    }
  }
  return escapeXml(line);
}

async function loadSafeImageBuffer(
  imageSource?: string,
  fallbackRelativePath = "public/assets/hero-banner.jpg"
): Promise<Buffer> {
  if (imageSource && typeof imageSource === "string") {
    const clean = imageSource.trim();

    // 1. Remote HTTP/HTTPS URL
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(clean, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          return Buffer.from(ab);
        }
      } catch (e: any) {
        console.warn("[VIDEO THUMBNAIL] Remote BG fetch failed, falling back to hero:", clean, e?.message);
      }
    } else {
      // 2. Local File Candidates
      const relPath = clean.startsWith("/") ? clean.slice(1) : clean;
      const candidates = [
        path.join(process.cwd(), relPath),
        path.join(process.cwd(), "public", relPath),
        path.join(process.cwd(), "src", relPath),
      ];

      for (const p of candidates) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          try {
            return fs.readFileSync(p);
          } catch (_err) {
            // file read fallback
          }
        }
      }

      // Try alternate extension (.jpg / .webp / .png)
      if (clean.endsWith(".webp") || clean.endsWith(".jpg") || clean.endsWith(".png")) {
        const baseWithoutExt = clean.replace(/\.(webp|jpg|jpeg|png)$/i, "");
        for (const ext of [".jpg", ".png", ".webp"]) {
          const alt = (baseWithoutExt + ext).replace(/^\//, "");
          const p = path.join(process.cwd(), "public", alt);
          if (fs.existsSync(p) && fs.statSync(p).isFile()) {
            try {
              return fs.readFileSync(p);
            } catch (_err) {
              // alternate extension read fallback
            }
          }
        }
      }
    }
  }

  // Fallback to hero-banner.jpg
  const candidatesFallback = [
    path.join(process.cwd(), fallbackRelativePath),
    path.join(process.cwd(), "public/assets/hero-banner.jpg"),
    path.join(process.cwd(), "src/assets/hero-banner.jpg"),
    path.join(process.cwd(), "public/assets/hero-banner.webp"),
  ];

  for (const fb of candidatesFallback) {
    if (fs.existsSync(fb) && fs.statSync(fb).isFile()) {
      try {
        return fs.readFileSync(fb);
      } catch (_err) {
        // fallback banner read error
      }
    }
  }

  // Final synthetic fallback if assets were removed
  return await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: { r: 10, g: 22, b: 38 },
    },
  })
    .jpeg()
    .toBuffer();
}

async function loadPersonCutoutBuffer(
  cutoutSource?: string
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  let rawBuf: Buffer | null = null;

  if (cutoutSource && typeof cutoutSource === "string") {
    const clean = cutoutSource.trim();

    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(clean, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          rawBuf = Buffer.from(ab);
        }
      } catch (_err) {
        // network fetch error
      }
    } else {
      const relPath = clean.startsWith("/") ? clean.slice(1) : clean;
      const candidates = [
        path.join(process.cwd(), relPath),
        path.join(process.cwd(), "public", relPath),
        path.join(process.cwd(), "src", relPath),
        path.join(process.cwd(), "dist", relPath),
      ];

      for (const p of candidates) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          try {
            rawBuf = fs.readFileSync(p);
            break;
          } catch (_err) {
            // candidate read error
          }
        }
      }
    }
  }

  // Fallback to silhouette if no cutout was provided or found
  if (!rawBuf) {
    const silCandidates = [
      path.join(process.cwd(), "public/assets/silhouette.png"),
      path.join(process.cwd(), "src/assets/silhouette.png"),
      path.join(process.cwd(), "public/assets/silhouette.webp"),
    ];
    for (const sil of silCandidates) {
      if (fs.existsSync(sil) && fs.statSync(sil).isFile()) {
        try {
          rawBuf = fs.readFileSync(sil);
          break;
        } catch (_err) {
          // silhouette read error
        }
      }
    }
  }

  if (!rawBuf) return null;

  try {
    const resized = await sharp(rawBuf)
      .resize({ height: 580, width: 520, fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer();
    const meta = await sharp(resized).metadata();
    return {
      buffer: resized,
      width: meta.width || 400,
      height: meta.height || 580,
    };
  } catch (err) {
    console.warn("[VIDEO THUMBNAIL] Error resizing person cutout:", err);
    return null;
  }
}

export async function generateVideoThumbnailBuffer(
  video: {
    id?: string;
    title?: string;
    burgerraadslidTitle?: string;
    category?: string;
    wijkSlug?: string | null;
    fractieledenIds?: string[];
    personId?: string;
    date?: string;
  },
  db?: any
): Promise<Buffer> {
  const category = (video.category || "Raadsdebat").trim();
  const rawWijkSlug = (video.wijkSlug || "").trim().toLowerCase();

  // 1. Resolve Person and Cutout Image
  const targetMemberId =
    (video.fractieledenIds && video.fractieledenIds.length > 0
      ? String(video.fractieledenIds[0]).toLowerCase()
      : "") ||
    (video.personId ? String(video.personId).toLowerCase() : "");

  const allMembers =
    db?.fractieleden && db.fractieleden.length > 0 ? db.fractieleden : DEFAULT_FRACTIELEDEN;

  const foundMember = targetMemberId
    ? allMembers.find(
        (m: any) =>
          String(m.id).toLowerCase() === targetMemberId ||
          (m.name && m.name.toLowerCase() === targetMemberId) ||
          (m.firstName && m.firstName.toLowerCase() === targetMemberId)
      ) ||
      DEFAULT_FRACTIELEDEN.find(
        (m: any) =>
          String(m.id).toLowerCase() === targetMemberId ||
          m.name.toLowerCase().includes(targetMemberId)
      )
    : DEFAULT_FRACTIELEDEN[0]; // Default to Sammy van Andel (fractievoorzitter) if none specified

  const memberName = foundMember ? foundMember.name : "Lijst van Andel";
  const isBurger =
    foundMember?.type?.toLowerCase() === "burgerraadslid" ||
    foundMember?.role?.toLowerCase().includes("burgerraadslid");
  const memberRole = foundMember ? (isBurger ? "Burgerraadslid" : (foundMember.role || "Raadslid")) : "Gemeenteraad Steenwijkerland";

  // Find Cutout Image: prioritize cutoutImageUrl / photoNoBgUrl, then matching default png
  let cutoutUrl = foundMember?.cutoutImageUrl || foundMember?.photoNoBgUrl || "";
  if (!cutoutUrl && foundMember) {
    const defaultMatch = DEFAULT_FRACTIELEDEN.find(
      (df) =>
        String(df.id) === String(foundMember.id) ||
        df.name.toLowerCase() === foundMember.name.toLowerCase()
    );
    if (defaultMatch?.cutoutImageUrl) {
      cutoutUrl = defaultMatch.cutoutImageUrl;
    }
  }

  // 2. Resolve Wijk and background
  let wijkNaam = "";
  let wijkBackgroundUrl = "";

  if (rawWijkSlug) {
    const allWijken = db?.wijken && db.wijken.length > 0 ? db.wijken : BUURTKAART_43_WIJKEN;
    const foundWijk = allWijken.find(
      (w: any) =>
        (w.slug && w.slug.toLowerCase() === rawWijkSlug) ||
        (w.naam && w.naam.toLowerCase() === rawWijkSlug)
    );
    if (foundWijk) {
      wijkNaam = foundWijk.naam;
      wijkBackgroundUrl = foundWijk.bannerUrl || foundWijk.heroBannerUrl || "";
    }
  }

  // 3. Clean raw title and construct headline: '%naam%' over '%titel van de video%'
  let rawTitle = (video.burgerraadslidTitle || video.title || "").trim();
  if (rawTitle) {
    const nameOverRegex = new RegExp(`^${memberName}\\s+over\\s+`, "i");
    rawTitle = rawTitle.replace(nameOverRegex, "");
    const tussenkomstRegex = new RegExp(`^tussenkomst(?:\\s+van)?(?:\\s+${memberName})?\\s+over\\s+`, "i");
    rawTitle = rawTitle.replace(tussenkomstRegex, "");
    rawTitle = rawTitle.replace(/^(?:videobijdrage|video bijdrage|videobijdragen|video-bijdrage|bijdrage|inbreng|toelichting)\s*(?:over\s*)?/i, "");
    rawTitle = rawTitle.replace(/^['"‘“](.*)['"’”]$/, "$1").trim();
  }
  let cleanTitle = rawTitle;
  if (!cleanTitle || cleanTitle.toLowerCase() === "videobijdrage" || cleanTitle.toLowerCase() === "video bijdrage" || cleanTitle.toLowerCase() === "bijdrage") {
    cleanTitle = "het raadsvoorstel";
  }
  const fullHeadline = `${memberName} over ‘${cleanTitle}’`;

  // Dynamic Cache Key: accounts for cutoutUrl, wijk background, and headline
  const cacheKey = String(
    `${video.id || "preview"}_${cutoutUrl}_${wijkBackgroundUrl}_${fullHeadline}`
  );

  const cached = thumbnailCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.buffer;
  }

  // 4. Load Background Image
  // "de achtergrondfoto van de wijk- of kernpagina (indien gekoppeld) als er geen wijk of kern is gekoppeld moet de standaardfoto van de hero worden gepakt"
  const rawBgBuffer = await loadSafeImageBuffer(
    wijkBackgroundUrl || "/assets/hero-banner.jpg",
    "public/assets/hero-banner.jpg"
  );

  const bgBuffer = await sharp(rawBgBuffer)
    .resize(1200, 630, { fit: "cover", position: "center" })
    .toBuffer();

  // 5. Load Person Cutout Image (vrijstaande foto)
  const personRes = await loadPersonCutoutBuffer(cutoutUrl);

  // 6. Wrap Headline Text
  const titleLines = wrapThumbnailHeadline(fullHeadline, 24, 4);
  const fontSize = titleLines.length >= 4 ? 33 : titleLines.length === 3 ? 38 : 44;
  const lineHeight = titleLines.length >= 4 ? 42 : titleLines.length === 3 ? 48 : 54;
  const titleStartY = titleLines.length >= 4 ? 180 : titleLines.length === 3 ? 205 : 240;

  // 7. Generate Vector SVG Overlay
  const svgOverlay = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Horizontal gradient protecting title legibility on the left -->
        <linearGradient id="leftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#08101d" stop-opacity="0.97"/>
          <stop offset="38%" stop-color="#08101d" stop-opacity="0.92"/>
          <stop offset="60%" stop-color="#08101d" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#08101d" stop-opacity="0.10"/>
        </linearGradient>
        <!-- Bottom vignette for speaker badge -->
        <linearGradient id="bottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="55%" stop-color="#08101d" stop-opacity="0.0"/>
          <stop offset="100%" stop-color="#08101d" stop-opacity="0.85"/>
        </linearGradient>
        <!-- Subtle text drop shadow -->
        <filter id="textDrop" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.7"/>
        </filter>
      </defs>

      <!-- Gradient overlays -->
      <rect width="1200" height="630" fill="url(#leftGrad)"/>
      <rect width="1200" height="630" fill="url(#bottomGrad)"/>

      <!-- Party Branding Badge (Top Left) -->
      <g transform="translate(60, 48)">
        <rect width="44" height="28" rx="6" fill="#f59e0b"/>
        <text x="22" y="19" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="14" fill="#000000" text-anchor="middle">LvA</text>
        <text x="56" y="20" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="16" fill="#ffffff" letter-spacing="1.5">LIJST VAN ANDEL</text>
      </g>

      <!-- Context Badges: Wijk (if linked) & Categorie -->
      <g transform="translate(60, 96)">
        ${
          wijkNaam
            ? `
          <g>
            <rect width="${Math.min(260, Math.max(120, wijkNaam.length * 11 + 45))}" height="32" rx="16" fill="rgba(245, 158, 11, 0.22)" stroke="#f59e0b" stroke-width="1.5"/>
            <text x="${Math.min(130, Math.max(60, (wijkNaam.length * 11 + 45) / 2))}" y="21" font-family="'Inter', Arial, sans-serif" font-weight="700" font-size="13" fill="#fcd34d" text-anchor="middle">📍 ${escapeXml(wijkNaam)}</text>
          </g>
          <g transform="translate(${Math.min(270, Math.max(130, wijkNaam.length * 11 + 55))}, 0)">
            <rect width="${Math.min(180, Math.max(100, category.length * 9 + 30))}" height="32" rx="16" fill="rgba(255, 255, 255, 0.12)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1"/>
            <text x="${Math.min(90, Math.max(50, (category.length * 9 + 30) / 2))}" y="21" font-family="'Inter', Arial, sans-serif" font-weight="600" font-size="13" fill="#e2e8f0" text-anchor="middle">${escapeXml(category)}</text>
          </g>
        `
            : `
          <g>
            <rect width="${Math.min(180, Math.max(110, category.length * 9 + 30))}" height="32" rx="16" fill="rgba(245, 158, 11, 0.18)" stroke="#f59e0b" stroke-width="1.5"/>
            <text x="${Math.min(90, Math.max(55, (category.length * 9 + 30) / 2))}" y="21" font-family="'Inter', Arial, sans-serif" font-weight="700" font-size="13" fill="#fcd34d" text-anchor="middle">${escapeXml(category)}</text>
          </g>
          <g transform="translate(${Math.min(190, Math.max(120, category.length * 9 + 40))}, 0)">
            <rect width="180" height="32" rx="16" fill="rgba(255, 255, 255, 0.10)" stroke="rgba(255, 255, 255, 0.20)" stroke-width="1"/>
            <text x="90" y="21" font-family="'Inter', Arial, sans-serif" font-weight="600" font-size="12" fill="#cbd5e1" text-anchor="middle">Steenwijkerland</text>
          </g>
        `
        }
      </g>

      <!-- Video Headline: '%naam%' over '%titel van de video%' -->
      <g transform="translate(60, ${titleStartY})" filter="url(#textDrop)">
        ${titleLines
          .map(
            (line, idx) =>
              `<text x="0" y="${idx * lineHeight}" font-family="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="${fontSize}" fill="#ffffff">${buildHeadlineSpans(line, memberName)}</text>`
          )
          .join("\n")}
      </g>

      <!-- Speaker / Fractielid Badge (Bottom Left) -->
      <g transform="translate(60, 525)" filter="url(#textDrop)">
        <text x="0" y="0" font-family="'Inter', Arial, sans-serif" font-weight="700" font-size="20" fill="#f59e0b">LIJST VAN ANDEL <tspan fill="#cbd5e1" font-weight="500">• ${escapeXml(memberRole)}</tspan></text>
        <text x="0" y="24" font-family="'Inter', Arial, sans-serif" font-weight="500" font-size="14" fill="#94a3b8">Gemeenteraad Steenwijkerland</text>
      </g>

      <!-- Video Play Icon (Top Right) -->
      <circle cx="1130" cy="65" r="24" fill="rgba(239, 68, 68, 0.95)" filter="url(#textDrop)"/>
      <polygon points="1124,53 1142,65 1124,77" fill="#ffffff"/>
    </svg>
  `);

  // 7. Layer composition: background -> person cutout on right -> SVG text & badge overlay
  const compositeLayers: sharp.OverlayOptions[] = [];

  if (personRes) {
    const personLeft = Math.max(650, 1200 - personRes.width - 20);
    const personTop = 630 - personRes.height;
    compositeLayers.push({
      input: personRes.buffer,
      top: personTop,
      left: personLeft,
    });
  }

  // Overlay SVG on top of background and person cutout
  compositeLayers.push({ input: svgOverlay, top: 0, left: 0 });

  const resultBuffer = await sharp(bgBuffer)
    .composite(compositeLayers)
    .jpeg({ quality: 90 })
    .toBuffer();

  thumbnailCache.set(cacheKey, {
    buffer: resultBuffer,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return resultBuffer;
}
