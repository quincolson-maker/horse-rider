// v43 offline-friendly cache for repeat visits (public launch): the big, never-changing assets (horse / rider models, terrain
// textures, audio, three.js, peerjs) are served from the cache after the first visit, so the second load is fast even on a phone.
// The page itself is network-first (always the newest release when online); game scripts are versioned by tools/stamp.py (?v=),
// so a new release fetches fresh code and the old entries age out. Bump CACHE to drop everything.
const CACHE = 'horse-rider-v43';
const STATIC = /\/(assets|vendor|addons)\/|three\.module\.js|icon(-512)?\.png|apple-touch-icon\.png/;
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { const r = e.request; if (r.method !== 'GET') return; const u = new URL(r.url); if (u.origin !== location.origin) return; // lobby, peers, voice: never touched
  if (r.mode === 'navigate' || u.pathname.endsWith('.html') || u.pathname.endsWith('/') || u.pathname.endsWith('.webmanifest')) { // network-first
    e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); } return res; }).catch(() => caches.match(r))); return; }
  if (STATIC.test(u.pathname) || (u.pathname.endsWith('.js') && u.searchParams.has('v'))) { // cache-first (immutable / versioned)
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok && res.status === 200) { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); } return res; }))); } });
