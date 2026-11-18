import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Precaches all assets injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST || []);

// Listen for SKIP_WAITING message from frontend
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Clean up any legacy LvA caches on service worker activation
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name.toLowerCase().includes("lva"))
          .map((name) => caches.delete(name))
      )
    )
  );
});

// Web Push Notification Handler
self.addEventListener("push", (event: PushEvent) => {
  let data = {
    title: "Onafhankelijk Steenwijkerland",
    body: "Nieuwe notificatie ontvangen",
    url: "/dashboard",
    tag: "osl-belafspraak",
    icon: "/pwa-192x192.png?v=osl2",
    badge: "/pwa-192x192.png?v=osl2",
  };

  try {
    if (event.data) {
      const json = event.data.json();
      data = { ...data, ...json };
    }
  } catch (_err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || "/pwa-192x192.png?v=osl2",
    badge: data.badge || "/pwa-192x192.png?v=osl2",
    tag: data.tag || "osl-belafspraak",
    data: {
      url: data.url || "/dashboard",
      dateOfArrival: Date.now(),
    },
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Handler - Focuses or opens the PWA window to /dashboard or belafspraak
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
