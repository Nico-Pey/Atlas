/**
 * Chargement paresseux de la géométrie de France (régions + départements).
 *
 * Un seul fichier national (docs/js/data/geo/france.json), généré par
 * tools/build-geo.mjs — voir docs/README.md § 6. Il pèse plusieurs centaines
 * de Ko : on ne le télécharge qu'une fois, à la première fois où un écran en
 * a besoin (accueil, leçon ou quiz), pas au démarrage de l'app. Une fois
 * chargé, il reste en mémoire pour le reste de la session (et en cache
 * hors-ligne via le service worker).
 *
 * @typedef {object} Prefecture
 * @property {string} nom
 * @property {number} population
 * @property {number} x
 * @property {number} y
 * @property {string | null} blason  Chemin vers l'image, ou null si pas
 *           encore fourni (voir docs/README.md § blasons).
 *
 * @typedef {object} DepartementGeo
 * @property {string} code        Code INSEE, identique au `mapId` d'une carte.
 * @property {string} nom
 * @property {string} regionCode  Code INSEE de la région à laquelle il appartient.
 * @property {string} path        Attribut `d` prêt à poser sur un <path> SVG.
 * @property {[number, number, number, number]} bbox  [minX, minY, maxX, maxY].
 * @property {Prefecture | null} prefecture  null si aucun contenu appris pour ce département.
 *
 * @typedef {object} RegionGeo
 * @property {string} code
 * @property {string} nom
 * @property {string} path
 * @property {[number, number, number, number]} bbox
 *
 * @typedef {object} FranceGeo
 * @property {string} source
 * @property {{ width: number, height: number }} viewBox
 * @property {RegionGeo[]} regions
 * @property {DepartementGeo[]} departements
 */

/** @type {Promise<FranceGeo> | null} */
let cache = null;

/** @returns {Promise<FranceGeo>} */
export function loadFranceGeo() {
  if (!cache) {
    const url = new URL('./geo/france.json', import.meta.url);
    cache = fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`géométrie de France introuvable (HTTP ${response.status})`);
      }
      return response.json();
    });
  }
  return cache;
}

/** Boîte englobante agrandie d'une marge, pour laisser un peu d'air autour d'une forme "zoomée". */
export function padBbox([minX, minY, maxX, maxY], margin) {
  return [minX - margin, minY - margin, maxX + margin, maxY + margin];
}

/** Convertit une boîte englobante en chaîne "minX minY width height" pour l'attribut viewBox. */
export function bboxToViewBox([minX, minY, maxX, maxY]) {
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}
