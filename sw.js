const CACHE_NAME = 'hub-cache-v1';

// This is the exact list of files the app will download and save for offline use
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './rsvp-reader.html',
    './bionic-reader.html',
    './cognitive-chunker.html',
    './dyslexia-converter.html',
    './focus-mask.html',
    './exam-timer.html',
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
});

// Step 2: Intercept network requests and serve the offline cached files
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
