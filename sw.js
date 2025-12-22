importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log('Workbox is loaded');

  // 1. Force immediate activation
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // 2. Cache the "Shell" (The HTML and core files)
  // NetworkFirst ensures we try to get the latest version if online, 
  // but fallback to cache immediately if offline.
  workbox.routing.registerRoute(
    ({request}) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'offline-html',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
        }),
      ],
    })
  );

  // 3. Cache CSS, JS, and Workers (StaleWhileRevalidate)
  // This serves from cache fast, then updates the cache in background
  workbox.routing.registerRoute(
    ({request}) => 
      request.destination === 'script' || 
      request.destination === 'style' ||
      request.url.includes('esm.sh') ||
      request.url.includes('cdn.tailwindcss.com'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'assets',
    })
  );

  // Cache Fonts (CacheFirst)
  workbox.routing.registerRoute(
    ({request}) => request.destination === 'font' || request.url.includes('fonts.googleapis.com'),
    new workbox.strategies.CacheFirst({
      cacheName: 'fonts',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        }),
      ],
    })
  );

  // Cache Images
  workbox.routing.registerRoute(
    ({request}) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
        }),
      ],
    })
  );

  // 4. Catch-all for Offline Refresh (The "Nuclear" Fallback)
  // If we are offline and the user refreshes a sub-page (e.g., /pos), 
  // and it's not in cache, show the cached index.html.
  workbox.routing.setCatchHandler(async ({event}) => {
    if (event.request.mode === 'navigate') {
      return caches.match('/index.html') || caches.match('/');
    }
    return Response.error();
  });
} else {
  console.error('Workbox failed to load');
}
