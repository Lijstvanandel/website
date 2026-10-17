/**
 * Performance Monitor & Network Diagnostics Utility
 * Measures page load times, SPA route transitions, component render times,
 * and monitors fetch calls for Bad Gateways (502) and network failures.
 */

export interface TrackedFetchEvent {
  url: string;
  method?: string;
  status: number;
  statusText?: string;
  durationMs: number;
  timestamp: number;
  ok: boolean;
  isBadGateway: boolean;
  isServerError: boolean;
  isFetchError: boolean;
  errorMessage?: string;
}

export interface ClientPerformancePayload {
  visitorId: string;
  sessionId: string;
  navigationType: "initial_load" | "route_change" | "reload";
  path: string;
  fromPath?: string;
  pageTitle?: string;
  pageLoadDurationMs: number;
  fetchDurationMs: number;
  renderDurationMs: number;
  ttfbMs?: number;
  domInteractiveMs?: number;
  domContentLoadedMs?: number;
  componentsBuilt?: { name: string; durationMs: number }[];
  fetchCallsCount: number;
  failedFetchCount: number;
  hasBadGateway: boolean;
  hasServerError: boolean;
  hasFetchError: boolean;
  status: "success" | "warning" | "error" | "bad_gateway";
  httpStatusCode?: number;
  errorDetails?: {
    url: string;
    status?: number;
    statusText?: string;
    durationMs?: number;
    errorMessage?: string;
  }[];
  deviceType?: "desktop" | "mobile" | "tablet";
  browser?: string;
  viewportWidth?: number;
  viewportHeight?: number;
}

// Global state for in-flight and recent fetch events
const recentFetchEvents: TrackedFetchEvent[] = [];
let isFetchIntercepted = false;

/**
 * Get or create an anonymous, persistent visitor ID
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const key = "lva_vis_id";
    let id = localStorage.getItem(key);
    if (!id || !id.startsWith("vis_")) {
      id = `vis_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "vis_anoniem";
  }
}

/**
 * Get or create a session ID for the current browser session
 */
export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const key = "lva_sess_id";
    let id = sessionStorage.getItem(key);
    if (!id || !id.startsWith("sess_")) {
      id = `sess_${Math.random().toString(36).substring(2, 10)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "sess_anoniem";
  }
}

/**
 * Detect client device environment
 */
export function getClientEnvironment(): {
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  viewportWidth: number;
  viewportHeight: number;
} {
  if (typeof window === "undefined") {
    return { deviceType: "desktop", browser: "Server", viewportWidth: 1920, viewportHeight: 1080 };
  }

  const width = window.innerWidth || document.documentElement.clientWidth || 1024;
  const height = window.innerHeight || document.documentElement.clientHeight || 768;

  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  if (width < 768) {
    deviceType = "mobile";
  } else if (width <= 1024) {
    deviceType = "tablet";
  }

  const ua = navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/")) browser = "Safari";
  else if (ua.includes("Opera/") || ua.includes("OPR/")) browser = "Opera";

  return {
    deviceType,
    browser,
    viewportWidth: width,
    viewportHeight: height,
  };
}

/**
 * Setup global network monitoring to track performance and catch 502 Bad Gateway / errors.
 * Uses W3C PerformanceObserver (safe, non-invasive) and optionally patches window.fetch if writable.
 */
export function initGlobalNetworkMonitoring(): void {
  if (isFetchIntercepted || typeof window === "undefined") return;
  isFetchIntercepted = true;

  // 1. Hook into PerformanceObserver for resource timings (read-only W3C standard, 100% safe in all iframes & sandboxes)
  try {
    if (typeof PerformanceObserver !== "undefined") {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resEntry = entry as PerformanceResourceTiming;
          const url = resEntry.name || "";
          if (url.includes("/api/telemetry/performance-logs")) continue;

          const durationMs = Math.round(resEntry.duration * 10) / 10;
          // In Chromium browsers, responseStatus is available on PerformanceResourceTiming
          const status = (resEntry as any).responseStatus || 200;
          const isBadGateway = status === 502 || status === 503 || status === 504;
          const isServerError = status >= 500;
          const isOk = status >= 200 && status < 400;

          recordFetchEvent({
            url,
            method: "GET",
            status,
            statusText: isBadGateway ? "Bad Gateway" : isServerError ? "Server Error" : "OK",
            durationMs,
            timestamp: Date.now(),
            ok: isOk,
            isBadGateway,
            isServerError,
            isFetchError: false,
          });
        }
      });

      // Try observing resource timings
      try {
        observer.observe({ type: "resource", buffered: true });
      } catch {
        observer.observe({ entryTypes: ["resource"] });
      }
    }
  } catch (_poErr) {
    // Ignore if PerformanceObserver is not supported
  }

  // 2. Safely attempt to patch window.fetch (only if writable; never crash if read-only getter)
  try {
    const originalFetch = window.fetch;
    if (typeof originalFetch === "function") {
      const interceptedFetch = async function (
        input: RequestInfo | URL,
        init?: RequestInit
      ): Promise<Response> {
        const startTime = performance.now();
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input?.url || "";
        const method = init?.method ? init.method.toUpperCase() : "GET";

        if (url.includes("/api/telemetry/performance-logs")) {
          return originalFetch.apply(window, [input, init]);
        }

        try {
          const response = await originalFetch.apply(window, [input, init]);
          const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
          const status = response.status;
          const isBadGateway = status === 502 || status === 503 || status === 504;
          const isServerError = status >= 500;
          const isOk = response.ok;

          recordFetchEvent({
            url,
            method,
            status,
            statusText: response.statusText,
            durationMs,
            timestamp: Date.now(),
            ok: isOk,
            isBadGateway,
            isServerError,
            isFetchError: false,
          });

          return response;
        } catch (err: unknown) {
          const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
          const errorMsg = err instanceof Error ? err.message : "Netwerkfout / Failed to fetch";

          recordFetchEvent({
            url,
            method,
            status: 0,
            statusText: "Fetch Failed (Netwerkfout / Bad Gateway)",
            durationMs,
            timestamp: Date.now(),
            ok: false,
            isBadGateway: true,
            isServerError: true,
            isFetchError: true,
            errorMessage: errorMsg,
          });

          throw err;
        }
      };

      // Check property descriptor before attempting assignment
      const descriptor = Object.getOwnPropertyDescriptor(window, "fetch");
      if (!descriptor || descriptor.writable || descriptor.set) {
        try {
          Object.defineProperty(window, "fetch", {
            value: interceptedFetch,
            writable: true,
            configurable: true,
          });
        } catch {
          try {
            (window as any).fetch = interceptedFetch;
          } catch {
            // Read-only getter: PerformanceObserver handles the tracking
          }
        }
      }
    }
  } catch (err) {
    // Gracefully ignore if sandbox prevents fetch patching
    console.debug("[PerformanceTracker] Global fetch interception skipped:", err);
  }
}

export function recordFetchEvent(event: TrackedFetchEvent): void {
  recentFetchEvents.push(event);
  // Keep last 150 events in memory
  if (recentFetchEvents.length > 150) {
    recentFetchEvents.shift();
  }
}

/**
 * Get fetch events that occurred during a specific time interval
 */
export function getFetchEventsSince(sinceTimeMs: number): TrackedFetchEvent[] {
  return recentFetchEvents.filter((e) => e.timestamp >= sinceTimeMs);
}

/**
 * Dispatch performance report to server
 */
export function sendPerformanceReport(payload: ClientPerformancePayload): void {
  if (typeof window === "undefined") return;

  try {
    const jsonString = JSON.stringify(payload);

    // Try Beacon API first (safest during page unload or quick transitions)
    if (navigator.sendBeacon) {
      const blob = new Blob([jsonString], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/telemetry/performance-logs", blob);
      if (sent) return;
    }

    // Fallback to fetch with keepalive
    fetch("/api/telemetry/performance-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonString,
      keepalive: true,
    }).catch(() => {
      // Silently fail if network drops
    });
  } catch {
    // Fail silently in telemetry
  }
}
