/**
 * Helper to record a document view event to the audit backend
 */
export async function logDocumentView(params: {
  filename: string;
  title: string;
  dossierName?: string;
  documentId?: string | null;
  source?: string;
}) {
  if (!params.filename) return;

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
        filename: params.filename,
        title: params.title || params.filename,
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
