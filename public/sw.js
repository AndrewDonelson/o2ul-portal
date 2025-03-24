// file: /public/sw.js
// feature: PWA - Enhanced service worker with improved caching and offline support

/**
 * Service Worker for Progressive Web App capabilities
 * - Improved offline support with network-first strategy
 * - Better caching patterns for CSS and JS assets
 * - Fixed infinite loop navigation issues
 * - Enhanced push notification handling
 */

const APP_NAME = 'foch';  // App name for cache';
const APP_VERSION = '2025.03.16.2216';  // Version bumped for update

// Cache name with version for easy updates
const CACHE_NAME = `${APP_NAME}-offline-cache-${APP_VERSION}`;

// Flag to prevent infinite navigation loops
let isNavigatingToOffline = false;

// Core assets that should be cached immediately on install
const CORE_ASSETS = [
  '/offline',
  '/images/foch-logo.png',
  '/images/app/offline-image.svg',
  '/images/app/favicon-16x16.png',
  '/images/app/favicon-32x32.png',
  '/images/app/android-chrome-192x192.png',
  '/images/app/android-chrome-512x512.png',
  '/favicon.ico'
];

// Assets that should be cached when accessed
const CACHEABLE_TYPES = [
  'image', 'style', 'script', 'font'
];

/**
 * Checks if URL should be excluded from caching
 */
function shouldExcludeUrl(url) {
  // Skip Google Analytics, most API endpoints, etc.
  return url.includes('analytics') ||
    url.includes('chrome-extension') ||
    url.includes('edge-extension');
}

/**
 * Determine if a request has a cacheable file extension
 */
function hasCacheableExtension(url) {
  const extensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.woff', '.woff2', '.ttf', '.eot'];
  return extensions.some(ext => url.endsWith(ext));
}

/**
 * Determine if a request is for a cacheable resource type
 */
function hasCacheableDestination(request) {
  return CACHEABLE_TYPES.includes(request.destination);
}

/**
 * Cache a response from a request if it's valid
 */
async function cacheResponse(request, response) {
  if (!response || !response.ok || response.status !== 200) {
    return response;
  }

  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());

  return response;
}

/**
 * Helper function to create a fallback manifest
 */
function createFallbackManifest() {
  return new Response(JSON.stringify({
    name: APP_NAME,
    short_name: APP_NAME,
    start_url: '/',
    display: 'standalone',
    background_color: '#1f2937',
    theme_color: '#1f2937',
    icons: [
      {
        src: '/images/app/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/images/app/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }), {
    headers: { 'Content-Type': 'application/manifest+json' }
  });
}

/**
 * Helper function to create a basic offline page when the cached one isn't available
 */
function createBasicOfflinePage() {
  return new Response(
    `<!DOCTYPE html>
    <html>
    <head>
      <title>You're Offline</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: system-ui, sans-serif; display: flex; align-items: center; 
              justify-content: center; min-height: 100vh; margin: 0; padding: 20px;
              background-color: #f9fafb; color: #1f2937; }
        .container { max-width: 500px; text-align: center; }
        h1 { font-size: 1.5rem; margin-bottom: 1rem; }
        p { margin-bottom: 1.5rem; color: #4b5563; }
        .btn { display: inline-block; background-color: #2563eb; color: white;
              text-decoration: none; padding: 0.5rem 1rem; border-radius: 0.25rem;
              font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>You're Offline</h1>
        <p>Please check your internet connection and try again.</p>
        <a href="/" class="btn">Go to Homepage</a>
      </div>
    </body>
    </html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CACHE_CORE_ASSETS') {
    const assets = event.data.assets || CORE_ASSETS;
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching core assets on request:', assets);
        return Promise.all(
          assets.map(url =>
            fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                console.warn(`[Service Worker] Bad response for ${url}:`, response.status);
              })
              .catch(err => console.warn(`[Service Worker] Failed to fetch ${url} for caching:`, err))
          )
        );
      });
  } else if (event.data && event.data.type === 'CACHE_STYLESHEETS') {
    const cache = caches.open(CACHE_NAME);
    // Just log receipt of this message for now
    console.log('[Service Worker] Received stylesheet caching request');
  }
});

// Handle install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version:', APP_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching core assets');
        return cache.addAll(CORE_ASSETS)
          .catch(err => {
            console.error('[Service Worker] Failed to cache all core assets:', err);
            // Continue even with partial failure
            return Promise.resolve();
          });
      })
      .then(() => self.skipWaiting())
  );
});

// Handle activation - cleanup old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version:', APP_VERSION);

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('foch-') && name !== CACHE_NAME)
            .map(name => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),

      // Take control of clients immediately
      self.clients.claim().then(() => {
        console.log('[Service Worker] Claimed all clients');

        // Notify clients of activation
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: APP_VERSION
            });
          });
        });
      })
    ])
  );
});

// Main fetch handler with proper caching strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip excluded URLs (but not API/manifest)
  if (shouldExcludeUrl(url.toString())) {
    return;
  }

  // Special handling for manifest - Fix for manifest issue
  if (url.pathname.endsWith('manifest.webmanifest') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname === '/manifest' ||
    url.pathname === '/api/manifest') {

    event.respondWith(
      caches.match('/api/manifest')
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Try to fetch from network if online
          if (navigator.onLine !== false) {
            return fetch('/api/manifest')
              .then(response => {
                if (response.ok) {
                  const responseToCache = response.clone();
                  caches.open(CACHE_NAME).then(cache => {
                    cache.put('/api/manifest', responseToCache);
                  });
                  return response;
                }
                return createFallbackManifest();
              })
              .catch(() => createFallbackManifest());
          }

          // Offline fallback
          return createFallbackManifest();
        })
    );
    return;
  }

  // Improved handling of Next.js static assets - Fix for CSS/JS loading issues
  if (url.pathname.startsWith('/_next/') ||
    hasCacheableDestination(request) ||
    hasCacheableExtension(url.toString())) {

    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          // Return cached response immediately if available
          if (cachedResponse) {
            return cachedResponse;
          }

          // If we're online, try network and cache
          if (navigator.onLine !== false) {
            return fetch(request)
              .then(response => cacheResponse(request, response))
              .catch(error => {
                console.error(`[Service Worker] Failed to fetch: ${url.pathname}`, error);

                // Return appropriate empty content based on destination
                if (request.destination === 'style') {
                  return new Response('/* Empty CSS */', {
                    status: 200,
                    headers: { 'Content-Type': 'text/css' }
                  });
                } else if (request.destination === 'script') {
                  return new Response('// Empty JS', {
                    status: 200,
                    headers: { 'Content-Type': 'application/javascript' }
                  });
                }

                return new Response('', {
                  status: 200,
                  headers: { 'Content-Type': 'text/plain' }
                });
              });
          }

          // If offline and not cached, provide empty content
          console.log(`[Service Worker] Offline, providing empty content for: ${url.pathname}`);
          if (request.destination === 'style') {
            return new Response('/* Empty CSS */', {
              status: 200,
              headers: { 'Content-Type': 'text/css' }
            });
          } else if (request.destination === 'script') {
            return new Response('// Empty JS', {
              status: 200,
              headers: { 'Content-Type': 'application/javascript' }
            });
          }

          return new Response('', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // Image requests
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Try network if online
          if (navigator.onLine !== false) {
            return fetch(request)
              .then(response => cacheResponse(request, response))
              .catch(() => caches.match('/images/app/offline-image.svg')
                .then(offlineImg => {
                  if (offlineImg) return offlineImg;

                  // Fallback SVG if offline image isn't available
                  return new Response(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
                        <rect width="100%" height="100%" fill="#f0f0f0"/>
                        <text x="50%" y="50%" font-family="sans-serif" font-size="14" text-anchor="middle">Image Unavailable</text>
                      </svg>`,
                    {
                      status: 200,
                      headers: { 'Content-Type': 'image/svg+xml' }
                    }
                  );
                })
              );
          }

          // Offline fallback image
          return caches.match('/images/app/offline-image.svg')
            .then(offlineImg => {
              if (offlineImg) return offlineImg;

              return new Response(
                `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
                  <rect width="100%" height="100%" fill="#f0f0f0"/>
                  <text x="50%" y="50%" font-family="sans-serif" font-size="14" text-anchor="middle">Image Unavailable</text>
                </svg>`,
                {
                  status: 200,
                  headers: { 'Content-Type': 'image/svg+xml' }
                }
              );
            });
        })
    );
    return;
  }

  // Navigation requests with loop protection - Fix for infinite redirect issue
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Prevent infinite loops with offline page
          if (url.pathname === '/offline') {
            console.log('[Service Worker] Direct request for offline page');
            isNavigatingToOffline = true;
            const offlinePage = await caches.match('/offline');
            if (offlinePage) return offlinePage;
            return createBasicOfflinePage();
          }

          // If already navigating to offline page, don't redirect again
          if (isNavigatingToOffline) {
            console.log('[Service Worker] Already navigating to offline page');
            isNavigatingToOffline = false;  // Reset flag
            const offlinePage = await caches.match('/offline');
            if (offlinePage) return offlinePage;
            return createBasicOfflinePage();
          }

          // Try network first for navigation
          if (navigator.onLine !== false) {
            console.log(`[Service Worker] Online, fetching page: ${url.pathname}`);
            try {
              const networkResponse = await fetch(request);
              return cacheResponse(request, networkResponse);
            } catch (error) {
              console.log(`[Service Worker] Fetch failed for page: ${url.pathname}`, error);
              // Fall through to cache/offline handling
            }
          }

          // If online fetch failed or offline, try cache
          console.log(`[Service Worker] Trying cache for page: ${url.pathname}`);
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log(`[Service Worker] Found in cache: ${url.pathname}`);
            return cachedResponse;
          }

          // No cache, use offline page
          console.log(`[Service Worker] Not in cache, using offline page for: ${url.pathname}`);
          isNavigatingToOffline = true;
          const offlinePage = await caches.match('/offline');
          if (offlinePage) return offlinePage;
          return createBasicOfflinePage();
        } catch (error) {
          console.error('[Service Worker] Error in navigate handler:', error);

          isNavigatingToOffline = true;
          const offlinePage = await caches.match('/offline');
          return offlinePage || createBasicOfflinePage();
        } finally {
          // Reset navigation flag after a short delay
          setTimeout(() => {
            isNavigatingToOffline = false;
          }, 1000);
        }
      })()
    );
    return;
  }

  // Default behavior for other requests - network first, cache fallback
  event.respondWith(
    (async () => {
      try {
        // Try network first if online
        if (navigator.onLine !== false) {
          const response = await fetch(request);
          if (response.ok) {
            await cacheResponse(request, response.clone());
            return response;
          }
        }

        // Network failed or offline, try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Nothing found, return empty response
        return new Response('', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      } catch (error) {
        console.error(`[Service Worker] Error handling request: ${url.pathname}`, error);

        // Try cache as fallback for any error
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Nothing found, return empty response
        return new Response('', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

/**
 * Helper function to determine notification actions based on type
 */
function getNotificationActions(type) {
  return [];
}

/**
 * Push event handler
 */
self.addEventListener('push', function (event) {
  console.log('[Service Worker] Push received');

  if (!event.data) {
    console.warn('[Service Worker] Push event received but no data');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: APP_NAME,
      body: event.data.text(),
    };
  }

  const title = notificationData.title || APP_NAME;
  const options = {
    body: notificationData.body || 'New notification',
    icon: notificationData.icon || '/images/app/android-chrome-192x192.png',
    badge: '/images/app/android-chrome-192x192.png',
    tag: notificationData.tag || 'default',
    data: {
      url: notificationData.url || '/',
      ...(notificationData.data || {}),
      timestamp: Date.now()
    },
    vibrate: notificationData.vibrate || [100, 50, 100],
    requireInteraction: notificationData.requireInteraction || false,
    actions: getNotificationActions(notificationData.data?.type) || notificationData.actions || [],
    silent: notificationData.silent || false,
    renotify: notificationData.renotify || false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        // Notify clients of push notification
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then((clients) => {
            if (clients.length === 0) return;

            clients.forEach(client => {
              client.postMessage({
                type: 'PUSH_RECEIVED',
                title: title,
                body: notificationData.body || 'New notification',
                notificationType: notificationData.data?.type || 'basic',
                timestamp: Date.now(),
                data: notificationData.data || {}
              });
            });
          });
      })
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  // Handle specific action buttons
  if (event.action) {
    switch (event.action) {
      case 'dismiss':
        return;
    }
  }

  // Default behavior when notification body is clicked
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        // Focus existing window if available
        const matchingClient = windowClients.find(
          client => client.url === urlToOpen
        );

        if (matchingClient) {
          return matchingClient.focus();
        }

        // Otherwise open new window
        return self.clients.openWindow(urlToOpen);
      })
  );
});

/**
 * Push subscription change handler
 */
self.addEventListener('pushsubscriptionchange', function (event) {
  console.log('[Service Worker] Push subscription changed');

  const options = event.oldSubscription?.options || {
    userVisibleOnly: true,
    applicationServerKey: event.oldSubscription?.applicationServerKey
  };

  event.waitUntil(
    self.registration.pushManager.subscribe(options)
      .then(function (subscription) {
        // Update subscription on server
        return fetch('/api/notifications/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldEndpoint: event.oldSubscription?.endpoint,
            newSubscription: subscription
          }),
        });
      })
      .catch(function (error) {
        console.error('[Service Worker] Error updating subscription:', error);
      })
  );
});