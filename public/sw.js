const CACHE_NAME = 'space-defender-v2.0.0';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/game.js',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app assets');
        return cache.addAll(ASSETS);
      })
      .then(() => {
        console.log('Assets cached');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('Fetch failed:', error);
            return caches.match('/index.html');
          });
      })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
