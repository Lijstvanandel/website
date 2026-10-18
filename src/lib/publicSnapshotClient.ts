export interface ClientPublicSnapshot {
  version: string;
  generatedAt: string;
  fractieleden: any[];
  videos: any[];
  newsSummaries: any[];
  events: any[];
  wijken?: any[];
  categories: any[];
  faqs: any[];
}

declare global {
  interface Window {
    __INITIAL_PUBLIC_SNAPSHOT__?: ClientPublicSnapshot;
  }
}

let cachedClientSnapshot: ClientPublicSnapshot | null = null;

/**
 * Returns the server-injected public snapshot immediately (0ms synchronous access)
 * if present in `window.__INITIAL_PUBLIC_SNAPSHOT__`.
 */
export function getInitialPublicSnapshot(): ClientPublicSnapshot | null {
  if (cachedClientSnapshot) {
    return cachedClientSnapshot;
  }
  if (typeof window !== "undefined" && window.__INITIAL_PUBLIC_SNAPSHOT__) {
    cachedClientSnapshot = window.__INITIAL_PUBLIC_SNAPSHOT__;
    return cachedClientSnapshot;
  }
  return null;
}

/**
 * Updates the client-side snapshot in memory (e.g. after an admin action or manual cache refresh).
 */
export function setClientPublicSnapshot(next: ClientPublicSnapshot | null): void {
  cachedClientSnapshot = next;
  if (typeof window !== "undefined") {
    if (next) {
      window.__INITIAL_PUBLIC_SNAPSHOT__ = next;
    } else {
      delete window.__INITIAL_PUBLIC_SNAPSHOT__;
    }
  }
}
