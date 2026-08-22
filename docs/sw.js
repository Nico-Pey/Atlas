/**
 * Service worker : rend l'app utilisable sans connexion.
 *
 * Deux stratégies de cache, pour deux besoins différents :
 *
 * 1. "Coquille" de l'app (ASSETS ci-dessous) : mise en cache d'un coup à
 *    l'installation. Sans ça, l'app entière ne s'ouvrirait pas hors-ligne.
 *    On y met le strict nécessaire pour que l'app démarre et fonctionne —
 *    HTML/CSS/JS, la géométrie de la carte, le contenu, les icônes.
 * 2. Tout le reste (les blasons, une fois ajoutés) : mis en cache "au fur
 *    et à mesure", la première fois qu'ils sont réellement demandés. Rien
 *    n'est précaché à l'installation pour ça : avec 96 départements, tout
 *    précacher rendrait le premier lancement long et lourd (des dizaines de
 *    Mo à télécharger avant de pouvoir utiliser l'app), pour des images que
 *    la plupart des sessions ne verront jamais toutes. Voir le gestionnaire
 *    "fetch" plus bas.
 *
 * ⚠️ Quand tu modifies un fichier de la coquille (ASSETS), incrémente
 * CACHE_NAME ci-dessous. Sans ça, les appareils qui ont déjà installé l'app
 * continueront de servir l'ancienne version depuis leur cache.
 */

const CACHE_NAME = 'atlas-v5';

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
  './js/data/geo.js',
  './js/data/geo/france.json',
  './js/engine/date.js',
  './js/engine/srs.js',
  './js/storage/store.js',
  './js/ui/carte.js',
  './js/ui/dom.js',
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

      return fetch(event.request)
        .then((response) => {
          // Cache "au fur et à mesure" : la première fois qu'un fichier qui
          // n'est pas dans ASSETS est demandé (un blason, par exemple), on
          // le range dans le cache pour la prochaine fois — y compris
          // hors-ligne. On ne garde que les réponses valides : une 404 ou
          // une erreur réseau ne doit pas se retrouver mise en cache comme
          // si c'était le bon contenu.
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // Hors-ligne et pas en cache : pour une navigation, on retombe sur
          // la page d'accueil de l'app plutôt que sur l'erreur du navigateur.
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return Response.error();
        });
    }),
  );
});
