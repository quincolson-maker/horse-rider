// v107 service worker: the second launch is near-instant.
//  - assets/ (models, textures, audio) and versioned scripts (?v=): cache first, refreshed in the background
//  - pages (index.html) and anything else: network first, with the cache only as an offline fallback
const C = 'hr-v2'; // v213: pages always revalidate (no stale index.html from the HTTP cache)
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => { const r = e.request; if (r.method !== 'GET') return; const u = new URL(r.url); if (u.origin !== location.origin) return;
  const asset = /\/assets\//.test(u.pathname) || /[?&]v=/.test(u.search) || /\/(three\.module|vendor\/)/.test(u.pathname);
  if (asset) { e.respondWith(caches.open(C).then(async c => { const hit = await c.match(r); const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    if (hit) { if (!/[?&]v=/.test(u.search)) e.waitUntil(net); return hit; } return net; })); return; }
  e.respondWith(fetch(r.mode === 'navigate' || u.pathname.endsWith('.html') || u.pathname.endsWith('/') ? new Request(r, { cache: 'no-cache' }) : r).then(res => { if (res && res.ok && (u.pathname.endsWith('/') || u.pathname.endsWith('.html'))) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r))); });
