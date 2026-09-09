/**
 * Helper to record a document view event to the audit backend
 */
export async function logDocumentView(params: {
  filename: string;
  title?: string;
  documentTitle?: string;
  dossierName?: string;
  documentId?: string | null;
  source?: string;
}) {
  const finalFilename = (params.filename || "").trim();
  if (!finalFilename) return;

  const token =
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  try {
    fetch("/api/council/audit/document-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        filename: finalFilename,
        title: params.title || params.documentTitle || finalFilename,
        dossierName: params.dossierName || "Overig",
        documentId: params.documentId || null,
        source: params.source || "viewer",
      }),
    }).catch(() => {
      // Fire-and-forget background audit
    });
  } catch {
    // Ignore network failure
  }
}

/**
 * Helper to record a search query event to the audit backend
 */
export async function logCouncilSearch(params: {
  query: string;
  resultsCount?: number;
  tookMs?: number;
  filters?: any;
}) {
  const trimmed = (params.query || "").trim();
  if (!trimmed) return;

  const token =
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  try {
    fetch("/api/council/audit/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: trimmed,
        totalHits: params.resultsCount ?? 0,
        tookMs: params.tookMs ?? 0,
        filters: params.filters || {},
      }),
    }).catch(() => {
      // Fire-and-forget background audit
    });
  } catch {
    // Ignore network failure
  }
}

