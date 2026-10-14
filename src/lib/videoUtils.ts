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
  videoId?: string
): string | null {
  // If an explicit custom uploaded image is provided (not YouTube fallback), use it
  if (
    explicitThumbnail &&
    explicitThumbnail.trim() &&
    !explicitThumbnail.includes("ytimg") &&
    !explicitThumbnail.includes("hqdefault")
  ) {
    return explicitThumbnail.trim();
  }
  // Standardly use the automatically composed thumbnail (person cutout + wijk/hero bg + title)
  if (videoId) {
    return `/api/videos/${videoId}/thumbnail.jpg`;
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

export function getAutoVideoThumbnailUrl(
  videoId?: string,
  wijkSlug?: string,
  memberId?: string,
  title?: string
): string {
  if (videoId) {
    return `/api/videos/${videoId}/thumbnail.jpg`;
  }
  const params = new URLSearchParams();
  if (title) params.set("title", title);
  if (wijkSlug) params.set("wijk", wijkSlug);
  if (memberId) params.set("personId", memberId);
  return `/api/thumbnail/video/compose?${params.toString()}`;
}
