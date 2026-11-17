// Memory Palace service worker. Plain JS served from the site root, scope "./".
// Caches the app shell and every same-origin GET that loads. Never caches cross-origin requests.
// The save lives in the page's localStorage; this worker never reads or writes it.
// ponytail: runtime cache, not a build-time precache list. Ceiling: a first visit cannot work offline,
// and old hashed assets stay until CACHE changes. Upgrade to a precache manifest if that matters.
const CACHE = 'memory-palace-v1';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  // No skipWaiting here: a new version waits until the page asks (the "New version ready" line),
  // so the game never reloads under a player in the middle of a drill.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? navigate(request) : asset(request));
});

// Network first; the cached shell answers when offline.
async function navigate(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put('./index.html', response.clone());
    return response;
  } catch {
    return (await cache.match('./index.html')) ?? Response.error();
  }
}

// Cache first. Hashed build assets never change, so a cached copy is always right.
async function asset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}
