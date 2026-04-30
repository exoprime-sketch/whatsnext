const CACHE_NAME = 'whatsnext-shell-v0.1.0';
const SCOPE_URL = new URL(self.registration.scope);
const ROOT_URL = SCOPE_URL.pathname;
const INDEX_URL = new URL('./index.html', SCOPE_URL).pathname;
const MANIFEST_URL = new URL('./manifest.webmanifest', SCOPE_URL).pathname;
const SVG_ICON_URL = new URL('./icon.svg', SCOPE_URL).pathname;
const ICON_192_URL = new URL('./icon-192.png', SCOPE_URL).pathname;
const ICON_512_URL = new URL('./icon-512.png', SCOPE_URL).pathname;
const APPLE_TOUCH_ICON_URL = new URL('./apple-touch-icon.png', SCOPE_URL).pathname;
const APP_SHELL = [
  ROOT_URL,
  INDEX_URL,
  MANIFEST_URL,
  SVG_ICON_URL,
  ICON_192_URL,
  ICON_512_URL,
  APPLE_TOUCH_ICON_URL
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(INDEX_URL))
        .then((response) => response || caches.match(ROOT_URL))
    );
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
