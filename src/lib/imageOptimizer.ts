const STATIC_RESPONSIVE_BASES = new Set([
  "sammy",
  "lisa",
  "nathan",
  "chris",
]);

const SPEERPUNT_RESPONSIVE_BASES = new Set([
  "speerpunt-voorrang",
  "speerpunt-natuur",
  "speerpunt-boeren",
  "speerpunt-lasten",
  "speerpunt-kernen",
]);

/**
 * Normalizes legacy /assets/*.png|jpg paths to their WebP counterparts when available.
 */
export function normalizeStaticAssetWebp(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("/assets/") && /\.(png|jpg|jpeg)(\?.*)?$/i.test(trimmed)) {
    return trimmed.replace(/\.(png|jpg|jpeg)(\?.*)?$/i, ".webp$2");
  }
  return trimmed;
}

export interface ResponsiveImageAttrs {
  src: string;
  srcSet?: string;
  sizes?: string;
  fallbackSrc: string;
}

/**
 * Builds responsive WebP src/srcSet attributes for both static /assets/ portraits
 * and user-uploaded /uploads/ images (via /api/image/view?w=...&fmt=webp).
 */
export function getResponsiveImageAttrs(
  rawUrl?: string | null,
  options: {
    sizes?: string;
    widths?: number[];
    defaultWidth?: number;
    fallback?: string;
  } = {}
): ResponsiveImageAttrs {
  const {
    sizes = "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 320px",
    widths = [400, 640, 960],
    defaultWidth = 640,
    fallback = "/assets/silhouette.webp",
  } = options;

  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { src: fallback, fallbackSrc: fallback };
  }

  const clean = normalizeStaticAssetWebp(rawUrl.trim());

  // 1. Static /assets/ fractieleden portraits with pre-generated -480.webp & -768.webp
  const staticMatch = clean.match(/^\/assets\/([a-z0-9-]+)\.webp(\?.*)?$/i);
  if (staticMatch) {
    const base = staticMatch[1].toLowerCase();
    const qs = staticMatch[2] || "";
    if (STATIC_RESPONSIVE_BASES.has(base)) {
      return {
        src: `/assets/${base}-480.webp${qs}`,
        srcSet: `/assets/${base}-480.webp${qs} 480w, /assets/${base}-768.webp${qs} 768w, /assets/${base}.webp${qs} 960w`,
        sizes,
        fallbackSrc: clean,
      };
    }
    if (SPEERPUNT_RESPONSIVE_BASES.has(base)) {
      return {
        src: `/assets/${base}-400.webp${qs}`,
        srcSet: `/assets/${base}-400.webp${qs} 400w, /assets/${base}.webp${qs} 600w`,
        sizes,
        fallbackSrc: clean,
      };
    }
    return { src: clean, fallbackSrc: clean };
  }

  // 2. Uploaded images under /uploads/ or uploads/ (route through /api/image/view with WebP & width)
  const isLocalUpload =
    (clean.startsWith("/uploads/") || clean.startsWith("uploads/")) &&
    /\.(png|jpe?g|webp)(\?.*)?$/i.test(clean);

  if (isLocalUpload) {
    const pathOnly = clean.split("?")[0];
    const encoded = encodeURIComponent(pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`);
    const sortedWidths = [...widths].sort((a, b) => a - b);
    const srcSet = sortedWidths
      .map((w) => `/api/image/view?file=${encoded}&w=${w}&fmt=webp ${w}w`)
      .join(", ");
    return {
      src: `/api/image/view?file=${encoded}&w=${defaultWidth}&fmt=webp`,
      srcSet,
      sizes,
      fallbackSrc: clean,
    };
  }

  // 3. Optimize remote Unsplash URLs (serve WebP + appropriate width instead of huge 1920px JPEGs)
  if (/^https:\/\/images\.unsplash\.com\//i.test(clean)) {
    try {
      const u = new URL(clean);
      const sortedWidths = [...widths].sort((a, b) => a - b);
      const makeUnsplash = (w: number) => {
        const nu = new URL(u.toString());
        nu.searchParams.set("w", String(w));
        nu.searchParams.set("fm", "webp");
        nu.searchParams.set("q", "75");
        nu.searchParams.set("auto", "format");
        nu.searchParams.set("fit", "crop");
        return nu.toString();
      };
      return {
        src: makeUnsplash(defaultWidth),
        srcSet: sortedWidths.map((w) => `${makeUnsplash(w)} ${w}w`).join(", "),
        sizes,
        fallbackSrc: clean,
      };
    } catch {
      return { src: clean, fallbackSrc: clean };
    }
  }

  return { src: clean, fallbackSrc: clean };
}
