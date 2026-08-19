/**
 * Chargement paresseux des géométries régionales.
 *
 * Les tracés (docs/js/data/geo/<lessonId>.json) pèsent plusieurs dizaines de
 * Ko : on ne les télécharge que quand une leçon qui en a besoin s'ouvre, pas
 * au démarrage de l'app. Une fois chargés, ils restent en mémoire pour le
 * reste de la session (et en cache hors-ligne via le service worker).
 *
 * @typedef {object} DepartementGeo
 * @property {string} code    Code INSEE, identique au `mapId` d'une carte.
 * @property {string} nom
 * @property {string} path    Attribut `d` prêt à poser sur un <path> SVG.
 * @property {string | null} blason  Chemin vers l'image du blason, ou null
 *           si pas encore fourni (voir docs/README.md § blasons).
 * @property {{ nom: string, population: number, x: number, y: number }} prefecture
 *
 * @typedef {object} RegionGeo
 * @property {string} source
 * @property {{ width: number, height: number }} viewBox
 * @property {DepartementGeo[]} departements
 */

/** @type {Map<string, Promise<RegionGeo>>} */
const cache = new Map();

/**
 * @param {string} lessonId  Doit correspondre à un fichier dans js/data/geo/.
 * @returns {Promise<RegionGeo>}
 */
export function loadRegionGeo(lessonId) {
  const cached = cache.get(lessonId);
  if (cached) return cached;

  const url = new URL(`./geo/${lessonId}.json`, import.meta.url);
  const promise = fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(`géométrie "${lessonId}" introuvable (HTTP ${response.status})`);
    }
    return response.json();
  });

  cache.set(lessonId, promise);
  return promise;
}
