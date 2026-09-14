/**
 * Document URL Helper
 * Safely routes document URLs through the /api/document/view endpoint to avoid
 * direct web server / reverse proxy (Nginx) static file interception and 404 errors.
 */

export function getSafeDocumentUrl(
  fileUrl?: string | null,
  fileName?: string | null,
  href?: string | null
): string {
  const raw = fileUrl || href || "";
  
  // If no explicit fileUrl/href provided, but fileName is present (e.g. default PDFs)
  if (!raw || raw.trim() === "" || raw === "#") {
    if (fileName && fileName.trim()) {
      const base = fileName.trim().split("/").pop() || fileName.trim();
      return `/api/document/view?file=${encodeURIComponent(base)}`;
    }
    return "";
  }

  const trimmed = raw.trim();

  // If already full web URL or data/blob
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // If already routed through /api/document/view
  if (trimmed.startsWith("/api/document/view")) {
    return trimmed;
  }

  // Extract base filename from path (e.g. /uploads/documents/abc.pdf -> abc.pdf)
  const cleanName = trimmed.split("/").pop() || trimmed;
  return `/api/document/view?file=${encodeURIComponent(cleanName)}`;
}
