// Service Worker for Personal Drive PWA

const CACHE_NAME = 'personal-drive-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/auth.js',
    '/preview.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap'
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and GitHub API calls
    if (event.request.method !== 'GET' || 
        event.request.url.includes('api.github.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version if found
                if (response) {
                    return response;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Don't cache if not a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Cache the new response
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    });
            })
    );
});

// Handle messages from client
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});