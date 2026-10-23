// Push notification handlers (imported into the app service worker)
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
  const title = data.title || "🚨 নতুন রক্তের রিকোয়েস্ট";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      vibrate: [200, 100, 200, 100, 200],
      tag: data.tag || "blood-request",
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || "/admin" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});
