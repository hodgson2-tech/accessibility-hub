const CACHE_NAME = 'hub-cache-v3';

// All files the app will download and save for offline use
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/tts.js',
    './js/word-predict.js',
    './rsvp-reader.html',
    './bionic-reader.html',
    './cognitive-chunker.html',
    './dyslexia-converter.html',
    './focus-mask.html',
    './exam-timer.html',
    './syllable-highlighter.html',
    './manifest.json'
];

// Step 1: Install the Service Worker and cache the files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    // Activate immediately instead of waiting for old tabs to close
    self.skipWaiting();
});

// Step 2: On activation, remove any outdated caches from previous versions
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('Removing old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Step 3: Intercept network requests and serve the offline cached files
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // If the file is in the cache, serve it immediately
                if (response) {
                    return response;
                }
                // Otherwise, try to fetch it from the network
                return fetch(event.request);
            })
    );
});
