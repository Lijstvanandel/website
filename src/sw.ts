import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Precaches all assets injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST || []);

// Web Push Notification Handler
self.addEventListener("push", (event: PushEvent) => {
  let data = {
    title: "Lijst van Andel",
    body: "Nieuwe notificatie ontvangen",
    url: "/dashboard",
    tag: "lva-belafspraak",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
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
    icon: data.icon || "/pwa-192x192.png",
    badge: data.badge || "/pwa-192x192.png",
    tag: data.tag || "lva-belafspraak",
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
