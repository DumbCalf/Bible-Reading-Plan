// Service Worker for 300 Day Catholic Bible Reading Plan PWA
const CACHE_NAME = 'bible-reading-v7-no-emojis-' + Date.now();
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/readingPlan.js',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_CACHE_URLS.map(url => {
                    return new Request(url, { 
                        cache: 'reload',
                        mode: 'no-cors'
                    });
                })).catch(error => {
                    console.warn('Service Worker: Some files failed to cache', error);
                    // Cache what we can, don't fail entirely
                    return Promise.all(
                        STATIC_CACHE_URLS.map(url => {
                            return cache.add(url).catch(err => {
                                console.warn(`Failed to cache ${url}:`, err);
                            });
                        })
                    );
                });
            })
            .then(() => {
                console.log('Service Worker: Installation complete');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            return cacheName !== CACHE_NAME;
                        })
                        .map((cacheName) => {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('Service Worker: Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
    // Only handle same-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached version if available
                if (cachedResponse) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return cachedResponse;
                }

                // Otherwise fetch from network
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        // Add to cache for future offline use
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch((error) => {
                        console.log('Service Worker: Fetch failed, serving offline page', error);
                        
                        // For HTML requests, serve a custom offline page
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html');
                        }
                        
                        // For other requests, let them fail naturally
                        throw error;
                    });
            })
    );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
    if (event.tag === 'bible-reading-sync') {
        console.log('Service Worker: Background sync triggered');
        event.waitUntil(
            // Sync reading progress when back online
            syncReadingProgress()
        );
    }
});

// Push notifications for daily reminders
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: 'Time for your daily Bible reading! 📖',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'daily-reminder',
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Read Now',
                icon: '/icon-192x192.png'
            },
            {
                action: 'later',
                title: 'Remind Later',
                icon: '/icon-192x192.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Daily Bible Reading', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked', event);
    
    event.notification.close();

    if (event.action === 'open') {
        // Open the app
        event.waitUntil(
            clients.openWindow('/bible_300/')
        );
    } else if (event.action === 'later') {
        // Schedule another reminder in 2 hours
        console.log('Service Worker: Reminder snoozed for 2 hours');
        // This would integrate with a push service
    } else {
        // Default action - open app
        event.waitUntil(
            clients.openWindow('/bible_300/')
        );
    }
});

// Handle message events from the main app
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    } else if (event.data && event.data.type === 'SYNC_PROGRESS') {
        // Sync reading progress
        syncReadingProgress();
    }
});

// Function to sync reading progress (placeholder for future backend integration)
async function syncReadingProgress() {
    try {
        // This would sync with a backend service if available
        console.log('Service Worker: Syncing reading progress...');
        
        // For now, just log that we would sync
        // In a full implementation, this would:
        // 1. Get progress from localStorage
        // 2. Send to backend API
        // 3. Handle conflicts/merging
        
        return Promise.resolve();
    } catch (error) {
        console.error('Service Worker: Failed to sync progress', error);
        throw error;
    }
}

// Periodic background sync (for browsers that support it)
// Note: This check should be done in the main app, not in the service worker
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'REGISTER_SYNC') {
        // Only register if sync is supported
        if ('sync' in self.registration) {
            self.registration.sync.register('bible-reading-sync');
        }
    }
});