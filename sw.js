// Service worker: la app funciona sin conexión. Solo guarda los archivos de la app, nunca datos de clientas.
// Al publicar una versión nueva, cambia VERSION para que la tablet descargue los archivos nuevos.
const VERSION = 'deseu-v0.7.2';
const ARCHIVOS = [
  './', 'index.html', 'styles.css', 'datos.js', 'db.js', 'app.js', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/logo.png', 'icons/logo-negativo.png', 'icons/corazon.png',
  'fonts/DMSans.woff2', 'fonts/DMSerif-normal.woff2', 'fonts/DMSerif-italic.woff2'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
