import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  initGlobalNetworkMonitoring,
  getVisitorId,
  getSessionId,
  getClientEnvironment,
  getFetchEventsSince,
  sendPerformanceReport,
  ClientPerformancePayload,
} from "@/utils/performanceMonitor";
function resolvePageTitle(path: string, currentDocTitle?: string): string {
  const p = path.split("?")[0].toLowerCase();
  if (p === "/" || p === "") return "Home | Lijst van Andel";
  if (p === "/admin") return "Beheer & Administratie | Lijst van Andel";
  if (p === "/dashboard") return "Mijn Dashboard | Lijst van Andel";
  if (p === "/fractie" || p === "/raadsleden") return "Fractieleden | Lijst van Andel";
  if (p.startsWith("/fractie/") && p.includes("video")) return "Fractielid Video's | Lijst van Andel";
  if (p === "/standpunten") return "Standpunten | Lijst van Andel";
  if (p === "/agenda") return "Agenda & Activiteiten | Lijst van Andel";
  if (p === "/nieuws") return "Nieuws & Actualiteiten | Lijst van Andel";
  if (p === "/wijken-en-kernen" || p === "/wijken") return "Wijken en Kernen | Lijst van Andel";
  if (p.startsWith("/wijken-en-kernen/")) {
    const slug = p.replace("/wijken-en-kernen/", "").replace(/-/g, " ");
    return `${slug.charAt(0).toUpperCase() + slug.slice(1)} (Wijk/Kern) | Lijst van Andel`;
  }
  if (p === "/contact") return "Contact | Lijst van Andel";
  return currentDocTitle || "Lijst van Andel";
}

function isTelemetryEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.location.search.includes("debug_perf=1")) return true;
    return window.localStorage.getItem("ENABLE_PERF_TELEMETRY") === "1";
  } catch {
    return false;
  }
}

export const VisitorPerformanceTracker: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname + location.search;
  const enabled = isTelemetryEnabled();

  const previousPathRef = useRef<string | null>(null);
  const isInitialLoadReportedRef = useRef<boolean>(false);
  const navStartTimeRef = useRef<number>(performance.now());
  const pendingReportTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize network interception on first mount ONLY if telemetry is explicitly enabled
  useEffect(() => {
    if (!enabled) return;
    try {
      initGlobalNetworkMonitoring();
    } catch (e) {
      console.debug("[PerformanceTracker] Network monitoring init error:", e);
    }
  }, [enabled]);

  // 1. Initial Page Load Performance Measurement
  useEffect(() => {
    if (!enabled || isInitialLoadReportedRef.current) return;

    const reportInitialLoad = () => {
      if (isInitialLoadReportedRef.current) return;
      isInitialLoadReportedRef.current = true;

      // Small delay to allow any initial data fetching to register
      setTimeout(() => {
        try {
          const env = getClientEnvironment();
          const visitorId = getVisitorId();
          const sessionId = getSessionId();

          let ttfbMs: number | undefined;
          let domInteractiveMs: number | undefined;
          let domContentLoadedMs: number | undefined;
          let totalPageLoadMs = Math.round(performance.now() * 10) / 10;

          // Attempt to extract high-precision W3C Navigation Timing
          const navEntries = performance.getEntriesByType("navigation");
          if (navEntries.length > 0) {
            const nav = navEntries[0] as PerformanceNavigationTiming;
            if (nav.responseStart > 0 && nav.requestStart > 0) {
              ttfbMs = Math.max(0, Math.round((nav.responseStart - nav.requestStart) * 10) / 10);
            }
            if (nav.domInteractive > 0) {
              domInteractiveMs = Math.max(0, Math.round(nav.domInteractive * 10) / 10);
            }
            if (nav.domContentLoadedEventEnd > 0) {
              domContentLoadedMs = Math.max(0, Math.round(nav.domContentLoadedEventEnd * 10) / 10);
            }
            if (nav.loadEventEnd > 0) {
              totalPageLoadMs = Math.max(0, Math.round(nav.loadEventEnd * 10) / 10);
            }
          }

          const fetchEvents = getFetchEventsSince(0);
          const failedFetches = fetchEvents.filter((f) => !f.ok);
          const hasBadGateway = fetchEvents.some((f) => f.isBadGateway);
          const hasServerError = fetchEvents.some((f) => f.isServerError);
          const hasFetchError = fetchEvents.some((f) => f.isFetchError);

          let maxFetchDuration = 0;
          for (const f of fetchEvents) {
            if (f.durationMs > maxFetchDuration) maxFetchDuration = f.durationMs;
          }

          const renderDurationMs = Math.round((performance.now() - (ttfbMs || 0)) * 10) / 10;

          const payload: ClientPerformancePayload = {
            visitorId,
            sessionId,
            navigationType: "initial_load",
            path: currentPath,
            pageTitle: resolvePageTitle(currentPath, document.title),
            pageLoadDurationMs: Math.max(totalPageLoadMs, maxFetchDuration),
            fetchDurationMs: maxFetchDuration,
            renderDurationMs: Math.max(10, renderDurationMs),
            ttfbMs,
            domInteractiveMs,
            domContentLoadedMs,
            componentsBuilt: [
              { name: "Layout & Root", durationMs: Math.round((domInteractiveMs || 50) * 0.4) },
              { name: "Navigatie & Header", durationMs: Math.round((domInteractiveMs || 50) * 0.2) },
              { name: "Pagina Componenten", durationMs: Math.max(15, renderDurationMs) },
            ],
            fetchCallsCount: fetchEvents.length,
            failedFetchCount: failedFetches.length,
            hasBadGateway,
            hasServerError,
            hasFetchError,
            status: hasBadGateway ? "bad_gateway" : hasServerError || hasFetchError ? "error" : "success",
            httpStatusCode: hasBadGateway ? 502 : hasServerError ? 500 : 200,
            errorDetails: failedFetches.map((f) => ({
              url: f.url,
              status: f.status,
              statusText: f.statusText,
              durationMs: f.durationMs,
              errorMessage: f.errorMessage,
            })),
            deviceType: env.deviceType,
            browser: env.browser,
            viewportWidth: env.viewportWidth,
            viewportHeight: env.viewportHeight,
          };

          sendPerformanceReport(payload);
          previousPathRef.current = currentPath;
        } catch (err) {
          console.debug("[PerformanceTracker] Error reporting initial load:", err);
        }
      }, 350);
    };

    if (document.readyState === "complete") {
      reportInitialLoad();
    } else {
      window.addEventListener("load", reportInitialLoad, { once: true });
      return () => window.removeEventListener("load", reportInitialLoad);
    }
  }, []);

  // 2. Client-side SPA Route Transition Performance Measurement
  // Triggers precisely when an external visitor switches pages in the app
  useEffect(() => {
    if (!enabled) return;
    // Skip if this is the very first render (handled by initial load reporter)
    if (!previousPathRef.current) {
      previousPathRef.current = currentPath;
      return;
    }

    // Only trigger if path actually changed
    if (previousPathRef.current === currentPath) return;

    const fromPath = previousPathRef.current;
    const toPath = currentPath;
    const navStartTime = performance.now();
    const navStartEpoch = Date.now();

    previousPathRef.current = toPath;

    if (pendingReportTimerRef.current) {
      clearTimeout(pendingReportTimerRef.current);
    }

    // Measure component layout and paint time using double requestAnimationFrame
    let componentRenderDuration = 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        componentRenderDuration = Math.round((performance.now() - navStartTime) * 10) / 10;
      });
    });

    // Allow route-specific fetches (e.g., /api/news, /api/videos, /api/wijken) to proceed
    pendingReportTimerRef.current = setTimeout(() => {
      try {
        const env = getClientEnvironment();
        const visitorId = getVisitorId();
        const sessionId = getSessionId();

        const fetchEvents = getFetchEventsSince(navStartEpoch);
        const failedFetches = fetchEvents.filter((f) => !f.ok);
        const hasBadGateway = fetchEvents.some((f) => f.isBadGateway);
        const hasServerError = fetchEvents.some((f) => f.isServerError);
        const hasFetchError = fetchEvents.some((f) => f.isFetchError);

        let maxFetchDuration = 0;
        for (const f of fetchEvents) {
          if (f.durationMs > maxFetchDuration) maxFetchDuration = f.durationMs;
        }

        // True user perception duration: time until both component layout and API fetches are completed
        const effectiveRenderTime = Math.max(5, componentRenderDuration);
        const finalPageLoadDuration = Math.max(effectiveRenderTime, maxFetchDuration);

        // Accurate page title resolver for SPA transitions
        const resolvedTitle = resolvePageTitle(toPath, document.title);

        const payload: ClientPerformancePayload = {
          visitorId,
          sessionId,
          navigationType: "route_change",
          path: toPath,
          fromPath,
          pageTitle: resolvedTitle,
          pageLoadDurationMs: Math.round(finalPageLoadDuration * 10) / 10,
          fetchDurationMs: Math.round(maxFetchDuration * 10) / 10,
          renderDurationMs: Math.round(effectiveRenderTime * 10) / 10,
          componentsBuilt: [
            { name: "Route Resolver", durationMs: Math.min(10, Math.round(effectiveRenderTime * 0.3)) },
            { name: "Doelpagina Opbouw", durationMs: Math.max(5, effectiveRenderTime) },
          ],
          fetchCallsCount: fetchEvents.length,
          failedFetchCount: failedFetches.length,
          hasBadGateway,
          hasServerError,
          hasFetchError,
          status: hasBadGateway ? "bad_gateway" : hasServerError || hasFetchError ? "error" : "success",
          httpStatusCode: hasBadGateway ? 502 : hasServerError ? 500 : 200,
          errorDetails: failedFetches.map((f) => ({
            url: f.url,
            status: f.status,
            statusText: f.statusText,
            durationMs: f.durationMs,
            errorMessage: f.errorMessage,
          })),
          deviceType: env.deviceType,
          browser: env.browser,
          viewportWidth: env.viewportWidth,
          viewportHeight: env.viewportHeight,
        };

        sendPerformanceReport(payload);
      } catch (err) {
        console.debug("[PerformanceTracker] Error reporting route transition:", err);
      }
    }, 600); // 600ms settling time captures page data fetching without delaying user interaction

    return () => {
      if (pendingReportTimerRef.current) {
        clearTimeout(pendingReportTimerRef.current);
      }
    };
  }, [currentPath]);

  // Headless component: no visual impact on user interface
  return null;
};
