import { toast } from "sonner";

export function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  const token = localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
  if (!token || token === "null" || token === "undefined") return "";
  return token.trim();
}

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function safeJson<T = any>(res: Response, fallback: T = {} as T): Promise<T> {
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await res.json();
    }
    const text = await res.text();
    if (!text || text.trim().startsWith("<")) {
      return fallback;
    }
    return JSON.parse(text);
  } catch (_err) {
    return fallback;
  }
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});

  if (!headers.has("Authorization") && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const startTime = performance.now();
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input?.url || "";

  try {
    const response = await fetch(input, {
      ...init,
      headers,
    });

    const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
    const status = response.status;
    const isBadGateway = status === 502 || status === 503 || status === 504;
    const isServerError = status >= 500;

    // Dynamically record fetch event without hard dependency cycle
    try {
      import("@/utils/performanceMonitor").then((m) => {
        m.recordFetchEvent({
          url,
          method: init?.method || "GET",
          status,
          statusText: response.statusText,
          durationMs,
          timestamp: Date.now(),
          ok: response.ok,
          isBadGateway,
          isServerError,
          isFetchError: false,
        });
      }).catch(() => {});
    } catch {}

    if (response.status === 401) {
      console.warn("[API] 401 Unauthorized ontvangen voor:", typeof input === "string" ? input : "request");
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        
        const currentPath = window.location.pathname;
        if (currentPath.startsWith("/admin") || currentPath.startsWith("/dashboard")) {
          toast.error("Uw inlogsessie is verlopen of vernieuwd. Log alstublieft even opnieuw in.");
          setTimeout(() => {
            if (window.location.pathname !== "/login") {
              window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
            }
          }, 1200);
        }
      }
    }

    return response;
  } catch (err: unknown) {
    const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
    try {
      import("@/utils/performanceMonitor").then((m) => {
        m.recordFetchEvent({
          url,
          method: init?.method || "GET",
          status: 0,
          statusText: "Fetch Failed (Netwerkfout / Bad Gateway)",
          durationMs,
          timestamp: Date.now(),
          ok: false,
          isBadGateway: true,
          isServerError: true,
          isFetchError: true,
          errorMessage: err instanceof Error ? err.message : "Fetch mislukt",
        });
      }).catch(() => {});
    } catch {}
    throw err;
  }
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 2,
  backoffMs = 500
): Promise<Response> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithAuth(input, init);
      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}
