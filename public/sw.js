self.addEventListener("push", (event) => {
  let payload = { title: "HomeAtlas", body: "", url: "/watched" };
  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) };
  } catch {
    payload.body = event.data ? event.data.text() : "";
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "HomeAtlas", {
      body: payload.body || "",
      data: { url: payload.url || "/watched" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/watched";
  event.waitUntil(self.clients.openWindow(url));
});
