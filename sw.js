// Service worker: la app funciona sin conexión. Solo guarda los archivos de la app, nunca datos de clientas.
// Con internet, siempre pide la versión nueva (así las mejoras llegan solas); sin internet, usa la guardada.
const VERSION = 'deseu-v0.7.5';
const ARCHIVOS = [
  './', 'index.html', 'styles.css', 'datos.js', 'db.js', 'app.js', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/logo.png', 'icons/logo-negativo.png', 'icons/corazon.png',
  'fonts/DMSans.woff2', 'fonts/DMSerif-normal.woff2', 'fonts/DMSerif-italic.woff2', 'vendor/jspdf.umd.min.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(r, copia)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true })));
});
