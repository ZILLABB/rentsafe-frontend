/* Push handling, imported into the generated Workbox service worker.
 *
 * Kept as a separate plain-JS file and pulled in via `workbox.importScripts`
 * rather than switching the build to injectManifest: that would mean
 * hand-maintaining the precache and runtime-caching rules that generateSW
 * already produces correctly, and every one of those rules is load-bearing for
 * offline use on a patchy Lagos connection.
 */

self.addEventListener("push", (event) => {
  // A push with no data is a valid wake-up from some services. Show nothing
  // rather than an empty notification.
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const title = payload.title || "RentSafe";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Collapses repeats of the same kind rather than stacking six
      // notifications about the same area onto a lock screen.
      tag: payload.kind || "rentsafe",
      renotify: false,
      data: { url: payload.url || "/alerts" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/alerts";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Reuse an open tab if there is one — opening a second copy of the app
        // every time a notification is tapped is its own small annoyance.
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
