import fs from "fs";
import path from "path";
import opentype from "opentype.js";
import sharp from "sharp";
import { BUURTKAART_43_WIJKEN } from "../data/defaultWijken.js";
import { DEFAULT_FRACTIELEDEN } from "../data/fractieleden.js";

// In-memory cache for ultra-fast serving
const thumbnailCache = new Map<string, { buffer: Buffer; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cachedBoldFont: opentype.Font | null = null;
let cachedRegFont: opentype.Font | null = null;

function getThumbnailFonts(): { bold: opentype.Font | null; regular: opentype.Font | null } {
  if (cachedBoldFont && cachedRegFont) {
    return { bold: cachedBoldFont, regular: cachedRegFont };
  }

  const boldCandidates = [
    path.join(process.cwd(), "public/assets/fonts/LiberationSans-Bold.ttf"),
    path.join(process.cwd(), "src/assets/fonts/LiberationSans-Bold.ttf"),
    path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf"),
    path.join(process.cwd(), "dist/assets/fonts/LiberationSans-Bold.ttf"),
  ];

  const regCandidates = [
    path.join(process.cwd(), "public/assets/fonts/LiberationSans-Regular.ttf"),
    path.join(process.cwd(), "src/assets/fonts/LiberationSans-Regular.ttf"),
    path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf"),
    path.join(process.cwd(), "dist/assets/fonts/LiberationSans-Regular.ttf"),
  ];

  if (!cachedBoldFont) {
    for (const fp of boldCandidates) {
      if (fs.existsSync(fp)) {
        try {
          const buf = fs.readFileSync(fp);
          cachedBoldFont = opentype.parse(
            buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
          );
          break;
        } catch (_e) {
          /* ignore font load error */
        }
      }
    }
  }

  if (!cachedRegFont) {
    for (const fp of regCandidates) {
      if (fs.existsSync(fp)) {
        try {
          const buf = fs.readFileSync(fp);
          cachedRegFont = opentype.parse(
            buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
          );
          break;
        } catch (_e) {
          /* ignore font load error */
        }
      }
    }
  }

  return { bold: cachedBoldFont, regular: cachedRegFont || cachedBoldFont };
}

function textToVectorPath(
  font: opentype.Font | null,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fill = "#ffffff"
): string {
  if (!text || !font) return "";
  try {
    const p = font.getPath(text, x, y, fontSize);
    return `<path d="${p.toPathData(2)}" fill="${fill}" />`;
  } catch (_e) {
    return "";
  }
}

function measureTextWidth(font: opentype.Font | null, text: string, fontSize: number): number {
  if (!text || !font) return text.length * fontSize * 0.55;
  try {
    return font.getAdvanceWidth(text, fontSize);
  } catch (_e) {
    return text.length * fontSize * 0.55;
  }
}

export function invalidateVideoThumbnailCache(videoId?: string): void {
  if (videoId) {
    const prefix = String(videoId);
    for (const key of thumbnailCache.keys()) {
      if (key === prefix || key.startsWith(`${prefix}_`)) {
        thumbnailCache.delete(key);
      }
    }
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

// Converts multi-line headline into exact SVG vector paths using OpenType.js.
// Highlights the member's name in amber (#f59e0b) and the remainder of the title in white (#ffffff).
function renderHeadlineByOffset(
  font: opentype.Font | null,
  lines: string[],
  memberName: string,
  startX: number,
  startY: number,
  lineHeight: number,
  fontSize: number
): string {
  if (!font) return "";
  const nameLen = memberName.length;
  let charOffset = 0;
  const paths: string[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const y = startY + lineIdx * lineHeight;
    let curX = startX;
    const words = line.split(" ");

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const word = words[wIdx];
      // If within memberName length boundary, render in amber; otherwise in white
      const isName = charOffset < nameLen;
      const fill = isName ? "#f59e0b" : "#ffffff";
      const p = font.getPath(word, curX, y, fontSize);
      paths.push(`<path d="${p.toPathData(2)}" fill="${fill}" />`);

      curX += font.getAdvanceWidth(word, fontSize);
      charOffset += word.length;
      if (wIdx < words.length - 1) {
        curX += font.getAdvanceWidth(" ", fontSize);
        charOffset += 1;
      }
    }
    charOffset += 1; // accounting for line break
  }
  return paths.join("\n");
}

// Automatically removes solid white or near-white studio backdrop to produce a true freestanding transparent cutout
async function autoCutoutIfNeeded(buf: Buffer): Promise<Buffer> {
  try {
    const meta = await sharp(buf).metadata();
    const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info;

    // Check if borders already have transparency (already an alpha cutout)
    const corners = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + (width - 1)) * 4];
    let hasTransparentCorner = false;
    for (const c of corners) {
      if (data[c + 3] === 0) {
        hasTransparentCorner = true;
        break;
      }
    }

    if (meta.hasAlpha && hasTransparentCorner) {
      return buf;
    }

    // Near-white or light grey studio background detector
    const isBg = (r: number, g: number, b: number, a: number) =>
      a > 0 && r > 190 && g > 190 && b > 190 && Math.abs(r - g) < 32 && Math.abs(r - b) < 32;

    const visited = new Uint8Array(width * height);
    const queue: number[] = [];

    // Seed outer borders
    for (let x = 0; x < width; x++) {
      queue.push(x, 0);
      queue.push(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      queue.push(0, y);
      queue.push(width - 1, y);
    }

    let head = 0;
    let clearedCount = 0;
    while (head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];
      const idx = y * width + x;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const pIdx = idx * 4;
      const r = data[pIdx];
      const g = data[pIdx + 1];
      const b = data[pIdx + 2];
      const a = data[pIdx + 3];

      if (isBg(r, g, b, a)) {
        data[pIdx + 3] = 0;
        clearedCount++;
        if (x > 0 && !visited[y * width + (x - 1)]) queue.push(x - 1, y);
        if (x < width - 1 && !visited[y * width + (x + 1)]) queue.push(x + 1, y);
        if (y > 0 && !visited[(y - 1) * width + x]) queue.push(x, y - 1);
        if (y < height - 1 && !visited[(y + 1) * width + x]) queue.push(x, y + 1);
      }
    }

    if (clearedCount > 50) {
      return await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
    }
    return buf;
  } catch (err) {
    console.warn("[VIDEO THUMBNAIL] autoCutout error:", err);
    return buf;
  }
}

async function loadSafeImageBuffer(
  imageSource?: string,
  fallbackRelativePath = "public/assets/hero-banner.jpg"
): Promise<Buffer> {
  if (imageSource && typeof imageSource === "string") {
    const clean = imageSource.trim();

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
      } catch (_err) {
        /* ignore fetch error */
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
            return fs.readFileSync(p);
          } catch (_err) {
            /* ignore read error */
          }
        }
      }
    }
  }

  const fallbackCandidates = [
    path.join(process.cwd(), fallbackRelativePath),
    path.join(process.cwd(), "public/assets/hero-banner.jpg"),
    path.join(process.cwd(), "src/assets/hero-banner.jpg"),
    path.join(process.cwd(), "dist/assets/hero-banner.jpg"),
    path.join(process.cwd(), "public/assets/markt-steenwijk.jpg"),
  ];

  for (const fp of fallbackCandidates) {
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      try {
        return fs.readFileSync(fp);
      } catch (_err) {
        /* ignore read error */
      }
    }
  }

  // Pure canvas gradient fallback if no images exist on disk
  return await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 10, g: 25, b: 47, alpha: 1 },
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
        /* ignore fetch error */
      }
    } else {
      const relPath = clean.startsWith("/") ? clean.slice(1) : clean;
      const candidates = [
        path.join(process.cwd(), relPath),
        path.join(process.cwd(), "public", relPath),
        path.join(process.cwd(), "dist", relPath),
        path.join(process.cwd(), "dist/client", relPath),
        path.join(process.cwd(), "dist/public", relPath),
        path.join(process.cwd(), "src", relPath),
      ];

      for (const p of candidates) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          try {
            rawBuf = fs.readFileSync(p);
            break;
          } catch (_err) {
            /* ignore read error */
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
      path.join(process.cwd(), "dist/assets/silhouette.png"),
    ];
    for (const sil of silCandidates) {
      if (fs.existsSync(sil) && fs.statSync(sil).isFile()) {
        try {
          rawBuf = fs.readFileSync(sil);
          break;
        } catch (_err) {
          /* ignore read error */
        }
      }
    }
  }

  if (!rawBuf) return null;

  try {
    const transparentCutoutBuf = await autoCutoutIfNeeded(rawBuf);

    const resized = await sharp(transparentCutoutBuf)
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
    memberId?: string;
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
    (video.personId ? String(video.personId).toLowerCase() : "") ||
    (video.memberId ? String(video.memberId).toLowerCase() : "");

  const allMembers =
    db?.fractieleden && db.fractieleden.length > 0 ? db.fractieleden : DEFAULT_FRACTIELEDEN;

  let foundMember = targetMemberId
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
    : null;

  // If no member ID was specified, check if the video title mentions a member
  if (!foundMember) {
    const rawT = (video.title || video.burgerraadslidTitle || "").toLowerCase();
    for (const m of allMembers) {
      if (m.name && rawT.includes(m.name.toLowerCase())) {
        foundMember = m;
        break;
      }
      if (m.firstName && rawT.includes(m.firstName.toLowerCase())) {
        foundMember = m;
        break;
      }
    }
  }

  // Default to Sammy van Andel (fractievoorzitter) if none resolved
  if (!foundMember) {
    foundMember = allMembers[0] || DEFAULT_FRACTIELEDEN[0];
  }

  const memberName = foundMember ? foundMember.name : "Lijst van Andel";
  const isBurger =
    foundMember?.type?.toLowerCase() === "burgerraadslid" ||
    foundMember?.role?.toLowerCase().includes("burgerraadslid");
  const memberRole = foundMember
    ? isBurger
      ? "Burgerraadslid"
      : foundMember.role || "Raadslid"
    : "Gemeenteraad Steenwijkerland";

  // Find Cutout Image: prioritize uploaded cutoutImageUrl / photoNoBgUrl, then uploaded imgUrl, then default match
  let cutoutUrl = foundMember?.cutoutImageUrl || foundMember?.photoNoBgUrl || "";
  if (!cutoutUrl && foundMember) {
    const defaultMatch = DEFAULT_FRACTIELEDEN.find(
      (df) =>
        String(df.id) === String(foundMember.id) ||
        df.name.toLowerCase() === (foundMember.name || "").toLowerCase()
    );
    if (defaultMatch?.cutoutImageUrl) {
      cutoutUrl = defaultMatch.cutoutImageUrl;
    }
  }
  if (!cutoutUrl && foundMember?.imgUrl) {
    cutoutUrl = foundMember.imgUrl;
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
    const tussenkomstRegex = new RegExp(
      `^tussenkomst(?:\\s+van)?(?:\\s+${memberName})?\\s+over\\s+`,
      "i"
    );
    rawTitle = rawTitle.replace(tussenkomstRegex, "");
    rawTitle = rawTitle.replace(
      /^(?:videobijdrage|video bijdrage|videobijdragen|video-bijdrage|bijdrage|inbreng|toelichting)\s*(?:over\s*)?/i,
      ""
    );
    rawTitle = rawTitle.replace(/^['"‘“](.*)['"’”]$/, "$1").trim();
  }
  let cleanTitle = rawTitle;
  if (
    !cleanTitle ||
    cleanTitle.toLowerCase() === "videobijdrage" ||
    cleanTitle.toLowerCase() === "video bijdrage" ||
    cleanTitle.toLowerCase() === "bijdrage"
  ) {
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
  // Background photo of the connected wijk/kern (or general hero-banner.jpg)
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

  // 7. Get fonts for vector rendering
  const { bold: boldFont, regular: regFont } = getThumbnailFonts();

  // 8. Generate Vector SVG paths (Zero OS font dependencies - immune to tofu □□□□ on Linux VPS)
  // Party badge
  const lvaTextWidth = measureTextWidth(boldFont, "LvA", 14);
  const lvaX = 60 + (44 - lvaTextWidth) / 2;
  const partyBadgePaths = `
    <rect x="60" y="48" width="44" height="28" rx="6" fill="#f59e0b"/>
    ${textToVectorPath(boldFont, "LvA", lvaX, 48 + 19, 14, "#000000")}
    ${textToVectorPath(boldFont, "LIJST VAN ANDEL", 60 + 56, 48 + 20, 16, "#ffffff")}
  `;

  // Badges: Wijk (if linked) & Category
  let badgesContent = "";
  if (wijkNaam) {
    const wTextWidth = measureTextWidth(boldFont, wijkNaam, 13);
    const wPillWidth = Math.min(270, Math.max(120, wTextWidth + 48));
    const cTextWidth = measureTextWidth(regFont, category, 13);
    const cPillWidth = Math.min(180, Math.max(90, cTextWidth + 30));
    const catX = 60 + wPillWidth + 10;

    badgesContent = `
      <g>
        <rect x="60" y="96" width="${wPillWidth}" height="32" rx="16" fill="rgba(245, 158, 11, 0.22)" stroke="#f59e0b" stroke-width="1.5"/>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 4.5 7 11 7 11s7-6.5 7-11c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" fill="#f59e0b" transform="translate(68, 101) scale(0.85)"/>
        ${textToVectorPath(boldFont, wijkNaam, 60 + 36, 96 + 21, 13, "#fcd34d")}
      </g>
      <g>
        <rect x="${catX}" y="96" width="${cPillWidth}" height="32" rx="16" fill="rgba(255, 255, 255, 0.12)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1"/>
        ${textToVectorPath(regFont, category, catX + 15, 96 + 21, 13, "#e2e8f0")}
      </g>
    `;
  } else {
    const cTextWidth = measureTextWidth(boldFont, category, 13);
    const cPillWidth = Math.min(180, Math.max(110, cTextWidth + 30));
    const subX = 60 + cPillWidth + 10;

    badgesContent = `
      <g>
        <rect x="60" y="96" width="${cPillWidth}" height="32" rx="16" fill="rgba(245, 158, 11, 0.18)" stroke="#f59e0b" stroke-width="1.5"/>
        ${textToVectorPath(boldFont, category, 60 + 15, 96 + 21, 13, "#fcd34d")}
      </g>
      <g>
        <rect x="${subX}" y="96" width="180" height="32" rx="16" fill="rgba(255, 255, 255, 0.10)" stroke="rgba(255, 255, 255, 0.20)" stroke-width="1"/>
        ${textToVectorPath(regFont, "Steenwijkerland", subX + 40, 96 + 21, 12, "#cbd5e1")}
      </g>
    `;
  }

  // Headline vector paths (member name highlighted in amber, title in white)
  const headlinePaths = renderHeadlineByOffset(
    boldFont,
    titleLines,
    memberName,
    60,
    titleStartY,
    lineHeight,
    fontSize
  );

  // Speaker badge vector paths
  const partyPrefixWidth = measureTextWidth(boldFont, "LIJST VAN ANDEL", 20);
  const speakerPaths = `
    ${textToVectorPath(boldFont, "LIJST VAN ANDEL", 60, 525, 20, "#f59e0b")}
    ${textToVectorPath(regFont, ` • ${memberRole}`, 60 + partyPrefixWidth, 525, 18, "#cbd5e1")}
    ${textToVectorPath(regFont, "Gemeenteraad Steenwijkerland", 60, 550, 14, "#94a3b8")}
  `;

  // Background Gradient Overlay (darkens background on left and bottom for perfect legibility, placed BEHIND person)
  const bgGradSvg = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgLeftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#08101d" stop-opacity="0.96"/>
          <stop offset="42%" stop-color="#08101d" stop-opacity="0.90"/>
          <stop offset="65%" stop-color="#08101d" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#08101d" stop-opacity="0.10"/>
        </linearGradient>
        <linearGradient id="bgBottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="55%" stop-color="#08101d" stop-opacity="0.0"/>
          <stop offset="100%" stop-color="#08101d" stop-opacity="0.85"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bgLeftGrad)"/>
      <rect width="1200" height="630" fill="url(#bgBottomGrad)"/>
    </svg>
  `);

  // Foreground Vector Overlay (Text, Badges & Play Icon on TOP of person cutout)
  const fgSvg = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="textDrop" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>

      <!-- Party Branding Badge (Top Left) -->
      <g filter="url(#textDrop)">
        ${partyBadgePaths}
      </g>

      <!-- Badges: Wijk & Categorie -->
      <g filter="url(#textDrop)">
        ${badgesContent}
      </g>

      <!-- Video Headline: '%naam%' over '%titel van de video%' -->
      <g filter="url(#textDrop)">
        ${headlinePaths}
      </g>

      <!-- Speaker / Fractielid Badge (Bottom Left) -->
      <g filter="url(#textDrop)">
        ${speakerPaths}
      </g>

      <!-- Video Play Icon (Top Right) -->
      <circle cx="1130" cy="65" r="24" fill="rgba(239, 68, 68, 0.95)" filter="url(#textDrop)"/>
      <polygon points="1124,53 1142,65 1124,77" fill="#ffffff"/>
    </svg>
  `);

  // Layer Composition:
  // 1. Background image
  // 2. Background darkening gradients (behind person)
  // 3. Person cutout (freestanding on the right, vibrant and unobstructed)
  // 4. Foreground text, badges, and icons
  const compositeLayers: sharp.OverlayOptions[] = [
    { input: bgGradSvg, top: 0, left: 0 },
  ];

  if (personRes) {
    const personLeft = Math.max(620, 1200 - personRes.width - 20);
    const personTop = 630 - personRes.height;
    compositeLayers.push({
      input: personRes.buffer,
      top: personTop,
      left: personLeft,
    });
  }

  compositeLayers.push({ input: fgSvg, top: 0, left: 0 });

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
