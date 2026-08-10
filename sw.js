// Einfacher Service Worker: cached das App-Gerüst beim ersten Besuch, damit
// die App danach auch ganz ohne Internetverbindung startet.
const CACHE_VERSION = 'v6';
const CACHE_NAME = 'gin-produktion-' + CACHE_VERSION;

const CORE_ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'Logo-Ginwerkstatt.svg',
  'css/styles.css',
  'css/print.css',
  'js/app.js',
  'js/db.js',
  'js/models.js',
  'js/ui.js',
  'js/util.js',
  'js/icons.js',
  'js/csv.js',
  'js/photo.js',
  'js/backup.js',
  'js/zip.js',
  'js/views/batchListView.js',
  'js/views/batchNeuView.js',
  'js/views/batchDetailView.js',
  'js/views/checklisteView.js',
  'js/views/batchDruckView.js',
  'js/views/archivView.js',
  'js/views/rezepteListView.js',
  'js/views/rezeptEditorView.js',
  'js/views/rezeptImportView.js',
  'js/views/backupView.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put('index.html', res.clone()));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          }
          return res;
        })
    )
  );
});
