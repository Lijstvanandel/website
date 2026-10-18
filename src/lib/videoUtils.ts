// Utility to extract thumbnails and parse video URLs (YouTube, Vimeo, uploads, etc.)
export function extractYouTubeId(rawUrl?: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const ytRegex = /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = rawUrl.trim().match(ytRegex);
  return match && match[1] ? match[1] : null;
}

export function getVideoThumbnail(
  videoUrl?: string,
  explicitThumbnail?: string,
  videoId?: string,
  _memberId?: string
): string | null {
  // If an explicit custom uploaded image or pre-baked static thumbnail is present, use it
  if (explicitThumbnail && explicitThumbnail.trim()) {
    const trimmed = explicitThumbnail.trim();
    if (
      !trimmed.includes("ytimg") &&
      !trimmed.includes("hqdefault") &&
      !trimmed.includes("/api/videos/")
    ) {
      return trimmed;
    }
  }
  // Use the pre-baked static WebP thumbnail on disk
  if (videoId) {
    const cleanId = String(videoId).replace(/[^a-zA-Z0-9_-]/g, "");
    return `/uploads/thumbnails/video-${cleanId}.webp`;
  }
  if (explicitThumbnail && explicitThumbnail.trim()) {
    return explicitThumbnail.trim();
  }
  const ytId = extractYouTubeId(videoUrl);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }
  return null;
}

export function getVideoThumbnailFallbackUrl(
  videoId?: string,
  memberId?: string,
  currentSrc?: string
): string {
  const cleanId = String(videoId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanId) return "/assets/markt-steenwijk.jpg";
  if (currentSrc && currentSrc.includes(".webp")) {
    return `/uploads/thumbnails/video-${cleanId}.jpg`;
  }
  if (currentSrc && currentSrc.includes("/uploads/thumbnails/")) {
    const memberParam = memberId ? `?personId=${encodeURIComponent(memberId)}` : "";
    return `/api/videos/${cleanId}/thumbnail.jpg${memberParam}`;
  }
  return "/assets/markt-steenwijk.jpg";
}

export function getAutoVideoThumbnailUrl(
  videoId?: string,
  wijkSlug?: string,
  memberId?: string,
  title?: string
): string {
  if (videoId) {
    const cleanId = String(videoId).replace(/[^a-zA-Z0-9_-]/g, "");
    return `/uploads/thumbnails/video-${cleanId}.webp`;
  }
  const params = new URLSearchParams();
  if (title) params.set("title", title);
  if (wijkSlug) params.set("wijk", wijkSlug);
  if (memberId) params.set("personId", memberId);
  return `/api/thumbnail/video/compose?${params.toString()}`;
}
