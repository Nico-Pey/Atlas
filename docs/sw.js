/**
 * Service worker : rend l'app utilisable sans connexion.
 *
 * Stratégie volontairement simple ("cache d'abord, réseau ensuite") : tous les
 * fichiers de l'app sont mis en cache à l'installation, puis servis depuis le
 * cache. C'est adapté ici parce que l'app est entièrement statique et que rien
 * ne vient d'un serveur à l'exécution.
 *
 * ⚠️ Quand tu modifies un fichier de l'app, incrémente CACHE_NAME ci-dessous.
 * Sans ça, les appareils qui ont déjà installé l'app continueront de servir
 * l'ancienne version depuis leur cache.
 */

const CACHE_NAME = 'atlas-v1';

/** Chemins relatifs : fonctionne aussi bien à la racine que dans /Atlas/. */
const ASSETS = [
  './',
  './index.html',
  './app.css',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/app.js',
  './js/data/themes.js',
  './js/engine/date.js',
  './js/engine/srs.js',
  './js/storage/store.js',
  './js/ui/carte.js',
  './js/ui/dom.js',
  './js/ui/flashcard.js',
  './js/ui/home.js',
  './js/ui/lesson.js',
  './js/ui/progress.js',
  './js/ui/quiz.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      // Prend la main sans attendre la fermeture des anciens onglets.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  // On ne s'occupe que des lectures simples ; le reste passe au réseau.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).catch(() => {
        // Hors-ligne et pas en cache : pour une navigation, on retombe sur la
        // page d'accueil de l'app plutôt que sur l'erreur du navigateur.
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return Response.error();
      });
    }),
  );
});
