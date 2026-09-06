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

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});

  if (!headers.has("Authorization") && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

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
}
