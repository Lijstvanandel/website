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

export const VisitorPerformanceTracker: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname + location.search;

  const previousPathRef = useRef<string | null>(null);
  const isInitialLoadReportedRef = useRef<boolean>(false);
  const navStartTimeRef = useRef<number>(performance.now());
  const pendingReportTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize network interception on first mount
  useEffect(() => {
    try {
      initGlobalNetworkMonitoring();
    } catch (e) {
      console.debug("[PerformanceTracker] Network monitoring init error:", e);
    }
  }, []);

  // 1. Initial Page Load Performance Measurement
  useEffect(() => {
    if (isInitialLoadReportedRef.current) return;

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
            pageTitle: document.title || "Lijst van Andel",
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

        const totalElapsedMs = Math.round((performance.now() - navStartTime) * 10) / 10;
        const finalPageLoadDuration = Math.max(componentRenderDuration, maxFetchDuration, totalElapsedMs);

        const payload: ClientPerformancePayload = {
          visitorId,
          sessionId,
          navigationType: "route_change",
          path: toPath,
          fromPath,
          pageTitle: document.title || "Lijst van Andel",
          pageLoadDurationMs: finalPageLoadDuration,
          fetchDurationMs: maxFetchDuration,
          renderDurationMs: Math.max(5, componentRenderDuration),
          componentsBuilt: [
            { name: "Route Resolver", durationMs: Math.min(10, Math.round(componentRenderDuration * 0.2)) },
            { name: "Doelpagina Opbouw", durationMs: Math.max(8, componentRenderDuration) },
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
