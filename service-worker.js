/* Matika — small offline cache. Original source PDFs are never distributed. */
const CACHE = 'matika-textonly-20261024-b';
const CORE = ['./', './index.html', './style.css', './app.js', './content.json', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('matika-') && n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const u = new URL(event.request.url);
  if(u.origin !== self.location.origin || !u.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if(event.request.mode === 'navigate' || /\/(app\.js|content\.json|style\.css)$/.test(u.pathname)){
      try{
        const fresh=await fetch(event.request);
        if(fresh.ok) await cache.put(event.request, fresh.clone());
        return fresh;
      }catch(e){return await cache.match(event.request) || Response.error();}
    }
    const hit = await cache.match(event.request);
    if(hit) return hit;
    const res = await fetch(event.request);
    if(res.ok) await cache.put(event.request, res.clone());
    return res;
  })());
});
