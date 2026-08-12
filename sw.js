/**
 * Kids Learning App - Service Worker for Offline Caching & Auto Build Updates
 */

const CACHE_NAME = 'kids-learning-v1.0.31';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './lib/tesseract/tesseract.min.js',
  './lib/tesseract/worker.min.js',
  './lib/tesseract/tesseract-core-simd-lstm.wasm.js',
  './lib/tesseract/tesseract-core-lstm.wasm.js',
  './lib/tesseract/eng.traineddata',
  './src/app.js',
  './src/core/dom.js',
  './src/core/state.js',
  './src/utils/logger.js',
  './src/styles/main.css',
  './src/styles/base.css',
  './src/styles/header.css',
  './src/styles/home-view.css',
  './src/styles/scan-view.css',
  './src/styles/reader.css',
  './src/styles/player.css',
  './src/styles/modals.css',
  './src/services/storage/learning-db.js',
  './src/services/translator.js',
  './src/services/gemini/image-utils.js',
  './src/services/gemini/model-discovery.js',
  './src/services/gemini/response-parser.js',
  './src/services/gemini/gemini-engine.js',
  './src/services/ocr/image-preprocessor.js',
  './src/services/ocr/text-cleaner.js',
  './src/services/ocr/ocr-engine.js',
  './src/services/tts/voice-manager.js',
  './src/services/tts/speech-formatter.js',
  './src/services/tts/tts-engine.js',
  './src/views/navigation.js',
  './src/views/home-view.js',
  './src/views/scan-view.js',
  './src/views/reader-view.js',
  './src/controllers/audio-controller.js',
  './src/controllers/settings-controller.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.warn('[SW] Cache add warning for', url, err)))
      );
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
  // Only cache GET requests (bypass POST/PUT e.g. Gemini AI calls)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith('http')) {
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
