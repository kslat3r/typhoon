const CACHE = 'typhoon-shell-__BUILD_ID__';

const SHELL = [
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          SHELL.map((path) => cache.add(new URL(path, self.registration.scope)).catch(() => undefined)),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isAppPath(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/typhoon/');
}

function isNavigation(request, url) {
  return request.mode === 'navigate' || url.pathname === '/typhoon/' || url.pathname === '/typhoon/index.html';
}

async function networkFirst(request, cacheKey) {
  const cache = await caches.open(CACHE);
  try {
    const response = request.mode === 'navigate'
      ? await fetch(request.url, { cache: 'no-store', credentials: 'same-origin' })
      : await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      await cache.put(cacheKey ?? request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = (await cache.match(cacheKey ?? request)) || (await cache.match(request));
    if (cached) {
      return cached;
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  // Spotify, the playback SDK, and anything else off-origin stay on the network.
  // Web Bluetooth is not a fetch. The OAuth return is a same-origin navigation and is handled below.
  if (!isAppPath(url)) {
    return;
  }

  // The Spotify redirect comes back as /typhoon/?code=... Do not cache that URL.
  if (url.searchParams.has('code') || url.searchParams.has('error')) {
    event.respondWith(fetch(request));
    return;
  }

  if (isNavigation(request, url)) {
    event.respondWith(networkFirst(request, new URL('index.html', self.registration.scope)));
    return;
  }

  event.respondWith(networkFirst(request));
});
