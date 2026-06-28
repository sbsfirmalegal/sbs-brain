/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope;

// Precache de los assets generados por el build (PWA / offline)
precacheAndRoute(self.__WB_MANIFEST);

// SPA fallback: cualquier navegación (ej. /agenda, /reuniones) responde con index.html cacheado.
// Esto evita el 404 de Vercel cuando se reabre la PWA después de un rato.
const navigationHandler = createHandlerBoundToURL("/index.html");
const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: [/^\/api\//, /^\/assets\//],
});
registerRoute(navigationRoute);

// Activar el SW nuevo de inmediato
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── PUSH ───
interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: "SBS Cronograma", body: event.data?.text() ?? "" };
  }

  const title = payload.title || "SBS Cronograma";
  const options: NotificationOptions = {
    body: payload.body || "",
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
    data: { url: payload.url || "/" },
    tag: payload.tag,
    // @ts-expect-error vibrate no está tipado en todos los lib.dom
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── CLICK EN LA NOTIFICACIÓN ───
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla y navegar
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Si no, abrir una nueva
        return self.clients.openWindow(url);
      })
  );
});
