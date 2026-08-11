/**
 * Kids Learning App - Service Worker for Offline Caching & Auto Build Updates
 */

const CACHE_NAME = 'kids-learning-v1.0.16';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  './gemini.js',
  './ocr.js',
  './logger.js',
  './translator.js',
  './tts.js',
  './manifest.json',
  './tesseract.min.js',
  './worker.min.js',
  './tesseract-core-simd-lstm.wasm.js',
  './tesseract-core-lstm.wasm.js',
  './eng.traineddata'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match('./index.html'));
      })
  );
});
