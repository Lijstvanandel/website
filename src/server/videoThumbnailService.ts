import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { BUURTKAART_43_WIJKEN } from "../data/defaultWijken.js";
import { DEFAULT_FRACTIELEDEN } from "../data/fractieleden.js";

// Bundled opentype engine for guaranteed zero-dependency vector text rendering on any VPS/host
// @ts-expect-error Bundled opentype CommonJS module
import opentypeModule from "./opentype-bundled.cjs";
const opentype: any = opentypeModule?.default || opentypeModule;

// Persistent disk directories for pre-baked static thumbnails & cutouts
const THUMBNAIL_PUBLIC_DIR = path.join(process.cwd(), "public", "uploads", "thumbnails");
const THUMBNAIL_DIST_DIR = path.join(process.cwd(), "dist", "uploads", "thumbnails");

function ensureThumbnailDirs() {
  try {
    if (!fs.existsSync(THUMBNAIL_PUBLIC_DIR)) {
      fs.mkdirSync(THUMBNAIL_PUBLIC_DIR, { recursive: true });
    }
    if (fs.existsSync(path.join(process.cwd(), "dist")) && !fs.existsSync(THUMBNAIL_DIST_DIR)) {
      fs.mkdirSync(THUMBNAIL_DIST_DIR, { recursive: true });
    }
  } catch (_e) {
    // ignore mkdir errors
  }
}
ensureThumbnailDirs();

// In-memory caches for ultra-fast serving (<1ms)
const thumbnailCache = new Map<string, { jpgBuffer: Buffer; webpBuffer: Buffer; expiresAt: number }>();
const personCutoutMemoryCache = new Map<string, { buffer: Buffer; width: number; height: number }>();
const bgResizeMemoryCache = new Map<string, Buffer>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in-memory TTL

let cachedBoldFont: any = null;
let cachedRegFont: any = null;

function getThumbnailFonts(): { bold: any; regular: any } {
  if (cachedBoldFont && cachedRegFont) {
    return { bold: cachedBoldFont, regular: cachedRegFont };
  }

  const boldCandidates = [
    path.join(process.cwd(), "public/assets/fonts/LiberationSans-Bold.ttf"),
    path.join(process.cwd(), "dist/assets/fonts/LiberationSans-Bold.ttf"),
    path.join(process.cwd(), "src/assets/fonts/LiberationSans-Bold.ttf"),
    path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf"),
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  ];

  const regCandidates = [
    path.join(process.cwd(), "public/assets/fonts/LiberationSans-Regular.ttf"),
    path.join(process.cwd(), "dist/assets/fonts/LiberationSans-Regular.ttf"),
    path.join(process.cwd(), "src/assets/fonts/LiberationSans-Regular.ttf"),
    path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf"),
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Regular.ttf",
  ];

  if (!cachedBoldFont && opentype && typeof opentype.parse === "function") {
    for (const fp of boldCandidates) {
      if (fs.existsSync(fp)) {
        try {
          const buf = fs.readFileSync(fp);
          cachedBoldFont = opentype.parse(
            buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
          );
          if (cachedBoldFont) break;
        } catch (_e) {
          /* ignore font load error */
        }
      }
    }
  }

  if (!cachedRegFont && opentype && typeof opentype.parse === "function") {
    for (const fp of regCandidates) {
      if (fs.existsSync(fp)) {
        try {
          const buf = fs.readFileSync(fp);
          cachedRegFont = opentype.parse(
            buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
          );
          if (cachedRegFont) break;
        } catch (_e) {
          /* ignore font load error */
        }
      }
    }
  }

  return { bold: cachedBoldFont, regular: cachedRegFont || cachedBoldFont };
}

function textToVectorPath(
  font: any,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fill = "#ffffff"
): string {
  if (!text) return "";
  if (font && typeof font.getPath === "function") {
    try {
      const p = font.getPath(text, x, y, fontSize);
      return `<path d="${p.toPathData(2)}" fill="${fill}" />`;
    } catch (_e) {
      /* fallback to SVG text element */
    }
  }
  return `<text x="${x}" y="${y}" font-family="sans-serif" font-weight="bold" font-size="${fontSize}" fill="${fill}">${escapeXml(text)}</text>`;
}

function measureTextWidth(font: any, text: string, fontSize: number): number {
  if (!text) return 0;
  if (font && typeof font.getAdvanceWidth === "function") {
    try {
      return font.getAdvanceWidth(text, fontSize);
    } catch (_e) {
      /* fallback estimation */
    }
  }
  return text.length * fontSize * 0.55;
}

export function invalidateVideoThumbnailCache(videoId?: string): void {
  ensureThumbnailDirs();
  if (videoId) {
    const cleanId = String(videoId).replace(/[^a-zA-Z0-9_-]/g, "");
    for (const key of thumbnailCache.keys()) {
      if (key === cleanId || key.startsWith(`${cleanId}_`)) {
        thumbnailCache.delete(key);
      }
    }
    const filesToDelete = [
      path.join(THUMBNAIL_PUBLIC_DIR, `video-${cleanId}.webp`),
      path.join(THUMBNAIL_PUBLIC_DIR, `video-${cleanId}.jpg`),
      path.join(THUMBNAIL_DIST_DIR, `video-${cleanId}.webp`),
      path.join(THUMBNAIL_DIST_DIR, `video-${cleanId}.jpg`),
    ];
    for (const f of filesToDelete) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch (_e) {
        // ignore
      }
    }
  } else {
    thumbnailCache.clear();
    personCutoutMemoryCache.clear();
    bgResizeMemoryCache.clear();
    for (const dir of [THUMBNAIL_PUBLIC_DIR, THUMBNAIL_DIST_DIR]) {
      if (fs.existsSync(dir)) {
        try {
          for (const entry of fs.readdirSync(dir)) {
            if (entry.startsWith("video-") || entry.startsWith("cutout-")) {
              try {
                fs.unlinkSync(path.join(dir, entry));
              } catch (_e) {
                // ignore
              }
            }
          }
        } catch (_e) {
          // ignore
        }
      }
    }
  }
}

export function getPrebakedThumbnailStats(): {
  diskWebpCount: number;
  diskJpgCount: number;
  diskCutoutCount: number;
  memoryCacheCount: number;
} {
  ensureThumbnailDirs();
  let diskWebpCount = 0;
  let diskJpgCount = 0;
  let diskCutoutCount = 0;
  try {
    if (fs.existsSync(THUMBNAIL_PUBLIC_DIR)) {
      const files = fs.readdirSync(THUMBNAIL_PUBLIC_DIR);
      for (const f of files) {
        if (f.startsWith("video-") && f.endsWith(".webp")) diskWebpCount++;
        else if (f.startsWith("video-") && f.endsWith(".jpg")) diskJpgCount++;
        else if (f.startsWith("cutout-") && f.endsWith(".png")) diskCutoutCount++;
      }
    }
  } catch (_e) {
    // ignore
  }
  return {
    diskWebpCount,
    diskJpgCount,
    diskCutoutCount,
    memoryCacheCount: thumbnailCache.size,
  };
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

function renderHeadlineByOffset(
  font: any,
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
    charOffset += 1;
  }
  return paths.join("\n");
}

// Automatically removes solid white or near-white studio backdrop to produce a true freestanding transparent cutout
async function autoCutoutIfNeeded(buf: Buffer): Promise<Buffer> {
  try {
    const meta = await sharp(buf).metadata();
    // Downscale huge portraits BEFORE running flood-fill so we never loop over 6+ million pixels on the main thread
    const workingBuf =
      (meta.width && meta.width > 700) || (meta.height && meta.height > 700)
        ? await sharp(buf).resize({ width: 560, height: 640, fit: "inside", withoutEnlargement: true }).toBuffer()
        : buf;

    const { data, info } = await sharp(workingBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info;

    if (meta.hasAlpha) {
      let transparentSampleCount = 0;
      const step = Math.max(1, Math.floor(data.length / 4000));
      for (let i = 3; i < data.length; i += step * 4) {
        if (data[i] < 60) {
          transparentSampleCount++;
          if (transparentSampleCount > 10) {
            return workingBuf;
          }
        }
      }
    }

    const isBg = (r: number, g: number, b: number, a: number) =>
      a > 0 && r > 190 && g > 190 && b > 190 && Math.abs(r - g) < 32 && Math.abs(r - b) < 32;

    const visited = new Uint8Array(width * height);
    const queue: number[] = [];

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
    return workingBuf;
  } catch (err) {
    console.warn("[VIDEO THUMBNAIL] autoCutout error:", err);
    return buf;
  }
}

async function loadSafeImageBuffer(
  imageSource?: string,
  fallbackRelativePath = "public/assets/steenwijk-aerial.webp"
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
    path.join(process.cwd(), "public/assets/steenwijk-aerial.webp"),
    path.join(process.cwd(), "src/assets/steenwijk-aerial.webp"),
    path.join(process.cwd(), "dist/assets/steenwijk-aerial.webp"),
    path.join(process.cwd(), "public/assets/steenwijk-aerial.jpg"),
    path.join(process.cwd(), "src/assets/steenwijk-aerial.jpg"),
    path.join(process.cwd(), "dist/assets/steenwijk-aerial.jpg"),
    path.join(process.cwd(), "public/assets/hero-banner.jpg"),
    path.join(process.cwd(), "src/assets/hero-banner.jpg"),
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

async function loadResizedBackgroundBuffer(effectiveBgUrl: string): Promise<Buffer> {
  const cached = bgResizeMemoryCache.get(effectiveBgUrl);
  if (cached) return cached;

  const rawBgBuffer = await loadSafeImageBuffer(
    effectiveBgUrl,
    "public/assets/steenwijk-aerial.webp"
  );
  const resized = await sharp(rawBgBuffer)
    .resize(1200, 630, { fit: "cover", position: "center" })
    .toBuffer();
  bgResizeMemoryCache.set(effectiveBgUrl, resized);
  return resized;
}

async function loadPersonCutoutBuffer(
  cutoutSource?: string
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  const cacheKey = (cutoutSource || "__default_silhouette__").trim();
  const memCached = personCutoutMemoryCache.get(cacheKey);
  if (memCached) return memCached;

  ensureThumbnailDirs();
  const cutoutHash = crypto.createHash("sha1").update(cacheKey).digest("hex").slice(0, 14);
  const diskCutoutPath = path.join(THUMBNAIL_PUBLIC_DIR, `cutout-${cutoutHash}.png`);

  if (fs.existsSync(diskCutoutPath)) {
    try {
      const diskBuf = fs.readFileSync(diskCutoutPath);
      const meta = await sharp(diskBuf).metadata();
      const resObj = {
        buffer: diskBuf,
        width: meta.width || 400,
        height: meta.height || 580,
      };
      personCutoutMemoryCache.set(cacheKey, resObj);
      return resObj;
    } catch (_e) {
      // fall through to regenerate
    }
  }

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
      const withoutPublic = relPath.startsWith("public/") ? relPath.slice(7) : relPath;
      const candidates = [
        path.join(process.cwd(), relPath),
        path.join(process.cwd(), withoutPublic),
        path.join(process.cwd(), "public", withoutPublic),
        path.join(process.cwd(), "dist", withoutPublic),
        path.join(process.cwd(), "dist/client", withoutPublic),
        path.join(process.cwd(), "dist/public", withoutPublic),
        path.join(process.cwd(), "src", withoutPublic),
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
    const resObj = {
      buffer: resized,
      width: meta.width || 400,
      height: meta.height || 580,
    };

    try {
      fs.writeFileSync(diskCutoutPath, resized);
    } catch (_e) {
      // ignore disk write error
    }

    personCutoutMemoryCache.set(cacheKey, resObj);
    return resObj;
  } catch (err) {
    console.warn("[VIDEO THUMBNAIL] Error resizing person cutout:", err);
    return null;
  }
}

export async function generateVideoThumbnailBothFormats(
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
): Promise<{ jpgBuffer: Buffer; webpBuffer: Buffer }> {
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

  // 3. Clean raw title and construct headline
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

  const effectiveBgUrl = wijkBackgroundUrl || "/assets/steenwijk-aerial.webp";
  const cacheKey = String(
    `${video.id || "preview"}_${cutoutUrl}_${effectiveBgUrl}_${fullHeadline}`
  );

  const cached = thumbnailCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { jpgBuffer: cached.jpgBuffer, webpBuffer: cached.webpBuffer };
  }

  // 4. Load Resized Background Image (cached in RAM)
  const bgBuffer = await loadResizedBackgroundBuffer(effectiveBgUrl);

  // 5. Load Person Cutout Image (cached on disk & RAM)
  const personRes = await loadPersonCutoutBuffer(cutoutUrl);

  // 6. Wrap Headline Text
  const titleLines = wrapThumbnailHeadline(fullHeadline, 24, 4);
  const fontSize = titleLines.length >= 4 ? 33 : titleLines.length === 3 ? 38 : 44;
  const lineHeight = titleLines.length >= 4 ? 42 : titleLines.length === 3 ? 48 : 54;
  const titleStartY = titleLines.length >= 4 ? 180 : titleLines.length === 3 ? 205 : 240;

  // 7. Get fonts for vector rendering
  const { bold: boldFont, regular: regFont } = getThumbnailFonts();

  // 8. Generate Vector SVG paths
  const lvaTextWidth = measureTextWidth(boldFont, "LvA", 14);
  const lvaX = 60 + (44 - lvaTextWidth) / 2;
  const partyBadgePaths = `
    <rect x="60" y="48" width="44" height="28" rx="6" fill="#f59e0b"/>
    ${textToVectorPath(boldFont, "LvA", lvaX, 48 + 19, 14, "#000000")}
    ${textToVectorPath(boldFont, "LIJST VAN ANDEL", 60 + 56, 48 + 20, 16, "#ffffff")}
  `;

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

  const headlinePaths = renderHeadlineByOffset(
    boldFont,
    titleLines,
    memberName,
    60,
    titleStartY,
    lineHeight,
    fontSize
  );

  const partyPrefixWidth = measureTextWidth(boldFont, "LIJST VAN ANDEL", 20);
  const speakerPaths = `
    ${textToVectorPath(boldFont, "LIJST VAN ANDEL", 60, 525, 20, "#f59e0b")}
    ${textToVectorPath(regFont, ` • ${memberRole}`, 60 + partyPrefixWidth, 525, 18, "#cbd5e1")}
    ${textToVectorPath(regFont, "Gemeenteraad Steenwijkerland", 60, 550, 14, "#94a3b8")}
  `;

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

  const fgSvg = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="textDrop" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <g filter="url(#textDrop)">
        ${partyBadgePaths}
      </g>
      <g filter="url(#textDrop)">
        ${badgesContent}
      </g>
      <g filter="url(#textDrop)">
        ${headlinePaths}
      </g>
      <g filter="url(#textDrop)">
        ${speakerPaths}
      </g>
      <circle cx="1130" cy="65" r="24" fill="rgba(239, 68, 68, 0.95)" filter="url(#textDrop)"/>
      <polygon points="1124,53 1142,65 1124,77" fill="#ffffff"/>
    </svg>
  `);

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

  const composed = sharp(bgBuffer).composite(compositeLayers);
  const [jpgBuffer, webpBuffer] = await Promise.all([
    composed.clone().jpeg({ quality: 88, mozjpeg: true }).toBuffer(),
    composed.clone().webp({ quality: 84, effort: 3 }).toBuffer(),
  ]);

  thumbnailCache.set(cacheKey, {
    jpgBuffer,
    webpBuffer,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return { jpgBuffer, webpBuffer };
}

/**
 * Pre-bakes a video's thumbnail to disk in both .webp and .jpg formats
 * so browser & Cloudflare CDN serve static files in < 2ms with zero CPU load.
 */
export async function prebakeVideoThumbnailToDisk(
  video: any,
  db?: any,
  force = false
): Promise<{ webpUrl: string; jpgUrl: string }> {
  ensureThumbnailDirs();
  const cleanId = String(video?.id || "preview").replace(/[^a-zA-Z0-9_-]/g, "");
  const pubWebp = path.join(THUMBNAIL_PUBLIC_DIR, `video-${cleanId}.webp`);
  const pubJpg = path.join(THUMBNAIL_PUBLIC_DIR, `video-${cleanId}.jpg`);

  if (!force && fs.existsSync(pubWebp) && fs.existsSync(pubJpg)) {
    return {
      webpUrl: `/uploads/thumbnails/video-${cleanId}.webp`,
      jpgUrl: `/uploads/thumbnails/video-${cleanId}.jpg`,
    };
  }

  const { jpgBuffer, webpBuffer } = await generateVideoThumbnailBothFormats(video, db);

  try {
    fs.writeFileSync(pubWebp, webpBuffer);
    fs.writeFileSync(pubJpg, jpgBuffer);
    if (fs.existsSync(path.join(process.cwd(), "dist"))) {
      if (!fs.existsSync(THUMBNAIL_DIST_DIR)) {
        fs.mkdirSync(THUMBNAIL_DIST_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(THUMBNAIL_DIST_DIR, `video-${cleanId}.webp`), webpBuffer);
      fs.writeFileSync(path.join(THUMBNAIL_DIST_DIR, `video-${cleanId}.jpg`), jpgBuffer);
    }
  } catch (err) {
    console.warn(`[VIDEO THUMBNAIL PREBAKE] Kon bestanden voor video ${cleanId} niet op schijf opslaan:`, err);
  }

  return {
    webpUrl: `/uploads/thumbnails/video-${cleanId}.webp`,
    jpgUrl: `/uploads/thumbnails/video-${cleanId}.jpg`,
  };
}

/**
 * Pre-bakes all videos in the database to static .webp and .jpg files on disk.
 */
export async function prebakeAllVideoThumbnails(
  db: any,
  force = false
): Promise<{ count: number; durationMs: number }> {
  const start = Date.now();
  const videos = Array.isArray(db?.videos) ? db.videos : [];
  let count = 0;

  for (const v of videos) {
    if (!v || !v.id) continue;
    try {
      await prebakeVideoThumbnailToDisk(v, db, force);
      count++;
    } catch (err) {
      console.warn(`[VIDEO THUMBNAIL PREBAKE] Fout bij video ${v.id}:`, err);
    }
  }

  return {
    count,
    durationMs: Date.now() - start,
  };
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
  db?: any,
  format: "jpeg" | "webp" = "jpeg"
): Promise<Buffer> {
  // Fast-path: if video has an ID and no custom ad-hoc title override, serve directly from pre-baked disk file if present
  if (video.id && !video.personId) {
    const cleanId = String(video.id).replace(/[^a-zA-Z0-9_-]/g, "");
    const diskPath = path.join(
      THUMBNAIL_PUBLIC_DIR,
      format === "webp" ? `video-${cleanId}.webp` : `video-${cleanId}.jpg`
    );
    if (fs.existsSync(diskPath)) {
      try {
        return fs.readFileSync(diskPath);
      } catch (_e) {
        // fall through
      }
    }
  }

  const { jpgBuffer, webpBuffer } = await generateVideoThumbnailBothFormats(video, db);

  // Persist to disk if this is a saved video ID
  if (video.id) {
    const cleanId = String(video.id).replace(/[^a-zA-Z0-9_-]/g, "");
    try {
      ensureThumbnailDirs();
      fs.writeFileSync(path.join(THUMBNAIL_PUBLIC_DIR, `video-${cleanId}.webp`), webpBuffer);
      fs.writeFileSync(path.join(THUMBNAIL_PUBLIC_DIR, `video-${cleanId}.jpg`), jpgBuffer);
      if (fs.existsSync(path.join(process.cwd(), "dist"))) {
        if (!fs.existsSync(THUMBNAIL_DIST_DIR)) {
          fs.mkdirSync(THUMBNAIL_DIST_DIR, { recursive: true });
        }
        fs.writeFileSync(path.join(THUMBNAIL_DIST_DIR, `video-${cleanId}.webp`), webpBuffer);
        fs.writeFileSync(path.join(THUMBNAIL_DIST_DIR, `video-${cleanId}.jpg`), jpgBuffer);
      }
    } catch (_e) {
      // ignore disk write error
    }
  }

  return format === "webp" ? webpBuffer : jpgBuffer;
}
