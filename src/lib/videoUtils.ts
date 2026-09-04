// Utility to extract thumbnails and parse video URLs (YouTube, Vimeo, uploads, etc.)
export function extractYouTubeId(rawUrl?: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const ytRegex = /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = rawUrl.trim().match(ytRegex);
  return match && match[1] ? match[1] : null;
}

export function getVideoThumbnail(videoUrl?: string, explicitThumbnail?: string): string | null {
  if (explicitThumbnail && explicitThumbnail.trim()) {
    return explicitThumbnail.trim();
  }
  const ytId = extractYouTubeId(videoUrl);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }
  return null;
}
