const CACHE_NAME = 'craven-v1';
const OFFLINE_URL = '/';

const STATIC_CACHE = [
  '/',
  '/index.html',
  '/craven-logo.png',
  '/manifest.json'
];

// Helper function to safely check if cache storage is available
function isCacheStorageAvailable() {
  try {
    return typeof caches !== 'undefined';
  } catch (e) {
    return false;
  }
}

// Helper function to safely open cache
async function safeCacheOpen(cacheName) {
  if (!isCacheStorageAvailable()) {
    return null;
  }
  try {
    return await caches.open(cacheName);
  } catch (err) {
    // If cache fails, return null to indicate caching is disabled
    // Don't log warnings - this is expected in private browsing or when storage is disabled
    return null;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await safeCacheOpen(CACHE_NAME);
        if (cache) {
          try {
            await cache.addAll(STATIC_CACHE);
          } catch (err) {
            // Silently ignore cache failures - caching is optional
          }
        }
      } catch (err) {
        // Silently ignore cache initialization failures
      }
      // Always skip waiting, even if cache fails
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        if (isCacheStorageAvailable()) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames
                .filter((name) => name !== CACHE_NAME)
                .map((name) => 
                  caches.delete(name).catch((err) => {
                    // Silently ignore cache deletion failures
                    return Promise.resolve();
                  })
                )
            );
          } catch (cacheError) {
            // CacheStorage operations can fail in private browsing or when storage is disabled
            // Silently continue - caching is optional
          }
        }
      } catch (err) {
        // Silently ignore all cache-related errors
      }
      // Always claim clients, even if cache cleanup fails
      self.clients.claim();
    })()
  );
});

// Fetch strategy: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome extensions and dev tools
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(
    (async () => {
      try {
        // Try network first
        const response = await fetch(event.request);
        
        // Try to cache successful responses (but don't fail if caching fails)
        if (response.status === 200 && isCacheStorageAvailable()) {
          const responseClone = response.clone();
          safeCacheOpen(CACHE_NAME)
            .then((cache) => {
              if (cache) {
                cache.put(event.request, responseClone).catch(() => {
                  // Silently fail - caching is optional
                });
              }
            })
            .catch(() => {
              // Cache failed - that's okay, continue without caching
            });
        }
        
        return response;
      } catch (networkError) {
        // Network failed, try cache
        if (!isCacheStorageAvailable()) {
          return new Response('Offline - Cache unavailable', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          });
        }
        
        try {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Try offline page
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) {
            return offlinePage;
          }
          
          return new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          });
        } catch (cacheError) {
          // Silently handle cache match failures
          return new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          });
        }
      }
    })()
  );
});

// Handle incoming push messages with enhanced processing
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || "Crave'N";
    const message = data.message || 'You have a new notification';
    const payload = data.data || {};

    // Enhanced notification options for better visibility
    const options = {
      body: message,
      icon: '/craven-logo.png',
      badge: '/craven-logo.png',
      data: payload,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      silent: false,
      tag: payload.type || 'general',
      renotify: true,
      actions: [
        { action: 'open', title: 'Open App', icon: '/craven-logo.png' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      // iOS specific settings
      sound: 'default'
    };

    // For order assignments, add more urgent settings
    if (payload.type === 'order_assignment' || payload.type === 'test_order_assignment') {
      options.vibrate = [200, 100, 200, 100, 200, 100, 200];
      options.requireInteraction = true;
      options.silent = false;
      options.tag = 'order-' + (payload.orderId || Date.now());
      options.renotify = true;
    }

    // Show the notification
    const showNotificationPromise = self.registration.showNotification(title, options);
    
    // Also try to play sound if possible (limited support)
    event.waitUntil(
      showNotificationPromise.then(() => {
        console.log('Push notification displayed successfully');
        
        // Try to wake up the app if it's minimized
        return self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
          .then(clients => {
            if (clients.length > 0) {
              // Send message to app to play sound
              clients.forEach(client => {
                client.postMessage({
                  type: 'push_notification_received',
                  data: { title, message, payload }
                });
              });
            }
          });
      }).catch(err => {
        console.error('Error showing push notification:', err);
      })
    );
  } catch (err) {
    console.error('Push event error:', err);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Crave\'N', {
        body: 'You have a new notification',
        icon: '/craven-logo.png',
        badge: '/craven-logo.png',
        requireInteraction: true,
        vibrate: [200, 100, 200]
      })
    );
  }
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  if (action === 'dismiss') {
    return;
  }
  
  // Handle notification click - focus or open app
  const urlToOpen = data.orderId ? `/?orderId=${data.orderId}` : '/';
  
  event.waitUntil(
    (async () => {
      try {
        const allClients = await self.clients.matchAll({ 
          includeUncontrolled: true, 
          type: 'window' 
        });
        
        let client = allClients.find(c => c.url.includes(self.location.origin));
        
        if (client) {
          // Focus existing window and send message
          await client.focus();
          client.postMessage({ 
            type: 'notification_click', 
            data,
            action 
          });
        } else {
          // Open new window
          await self.clients.openWindow(urlToOpen);
        }
      } catch (error) {
        console.error('Error handling notification click:', error);
        // Fallback - just open the app
        try {
          await self.clients.openWindow('/');
        } catch (e) {
          console.error('Failed to open window:', e);
        }
      }
    })()
  );
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);
  
  event.waitUntil(
    (async () => {
      try {
        // Re-subscribe with new subscription
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY' // This will be replaced by the client
        });
        
        // Send new subscription to server
        // This would need to be implemented with proper user context
        console.log('New subscription:', subscription);
      } catch (error) {
        console.error('Error handling push subscription change:', error);
      }
    })()
  );
});
