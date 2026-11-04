const CACHE_NAME = "bca-sync-shell-v1";
const APP_ROOT = new URL("./", self.location.href).pathname;
self.addEventListener("install", event => { self.skipWaiting(); });
self.addEventListener("activate", event => {
  event.waitUntil((async()=>{ await self.clients.claim(); })());
});
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = {title:"BCA SYNC",body:event.data ? event.data.text() : "There is a new update."}; }
  const title = data.title || "BCA SYNC";
  const options = {
    body: data.body || data.message || "A new update is available.",
    icon: new URL("assets/bca-sync-logo.svg", self.registration.scope).href,
    badge: new URL("assets/bca-sync-logo.svg", self.registration.scope).href,
    tag: data.tag || "bca-sync-update",
    renotify: true,
    data: { url: data.url || APP_ROOT }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || APP_ROOT, self.registration.scope);
  if (target.origin !== self.location.origin) return;
  event.waitUntil((async()=>{
    const windows = await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for (const client of windows) {
      if (new URL(client.url).origin === target.origin) {
        await client.navigate(target.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(target.href);
  })());
});
