/**
 * Génère docs/js/data/geo/nouvelle-aquitaine.json : les vraies frontières des
 * 12 départements de Nouvelle-Aquitaine, simplifiées pour rester légères dans
 * une PWA mobile, plus la position de chaque préfecture.
 *
 * Source des tracés : IGN / INSEE (Admin Express COG, millésime 2018), via
 * le dépôt public https://github.com/gregoiredavid/france-geojson
 * (Licence Ouverte / Open Licence — réutilisation libre avec attribution,
 * voir docs/README.md).
 *
 * Pourquoi un script plutôt que de servir le GeoJSON brut : le fichier des
 * communes de la région pèse plus de 6 Mo et chaque département a plus de
 * 1000 points de contour. Personne ne doit télécharger ça sur un iPhone au
 * réveil. Ce script tourne une fois (à la machine du développeur, où qu'elle
 * soit), le résultat — quelques dizaines de Ko — est commité dans le repo.
 *
 * Utilisation :  node tools/build-geo.mjs
 * À relancer uniquement si le contenu géographique change (nouvelle région,
 * tracés mis à jour).
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'js', 'data', 'geo');
const OUT_FILE = join(OUT_DIR, 'nouvelle-aquitaine.json');

const DEPARTEMENTS_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/nouvelle-aquitaine/departements-nouvelle-aquitaine.geojson';
const COMMUNES_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/nouvelle-aquitaine/communes-nouvelle-aquitaine.geojson';

/** Code INSEE de la commune chef-lieu de chaque département (préfecture). */
const CHEF_LIEU_BY_DEPARTEMENT = {
  '16': '16015', // Angoulême
  '17': '17300', // La Rochelle
  '19': '19272', // Tulle
  '23': '23096', // Guéret
  '24': '24322', // Périgueux
  '33': '33063', // Bordeaux
  '40': '40192', // Mont-de-Marsan
  '47': '47001', // Agen
  '64': '64445', // Pau
  '79': '79191', // Niort
  '86': '86194', // Poitiers
  '87': '87085', // Limoges
};

/**
 * Population de la commune préfecture (source : INSEE, via le paquet npm
 * @etalab/decoupage-administratif — relevé manuel, ce paquet n'étant pas
 * requis comme dépendance ici pour ne pas alourdir le projet). Millésime :
 * dernier recensement publié par ce paquet au moment de l'écriture.
 */
const POPULATION_BY_DEPARTEMENT = {
  '16': 41908, // Angoulême
  '17': 79851, // La Rochelle
  '19': 13401, // Tulle
  '23': 12955, // Guéret
  '24': 29055, // Périgueux
  '33': 267991, // Bordeaux
  '40': 31592, // Mont-de-Marsan
  '47': 32801, // Agen
  '64': 80441, // Pau
  '79': 59854, // Niort
  '86': 89916, // Poitiers
  '87': 129937, // Limoges
};

/** Cible de simplification : ~0.004° ≈ 350-400 m, assez fin pour rester
 * reconnaissable, assez grossier pour tenir en quelques dizaines de Ko. */
const SIMPLIFICATION_EPSILON_DEGREES = 0.004;

const TARGET_VIEWBOX_WIDTH = 320;
const TARGET_VIEWBOX_HEIGHT = 420;
const PADDING = 12;

async function fetchJson(url) {
  console.log(`téléchargement : ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return response.json();
}

/** Algorithme de Douglas-Peucker : réduit un contour en gardant sa silhouette. */
function simplify(points, epsilon) {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;
  const [startLon, startLat] = points[0];
  const [endLon, endLat] = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i += 1) {
    const dist = perpendicularDistance(points[i], [startLon, startLat], [endLon, endLat]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist <= epsilon) {
    return [points[0], points[points.length - 1]];
  }

  const left = simplify(points.slice(0, maxIndex + 1), epsilon);
  const right = simplify(points.slice(maxIndex), epsilon);
  return [...left.slice(0, -1), ...right];
}

function perpendicularDistance([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - ax, py - ay);

  const t = ((px - ax) * dx + (py - ay) * dy) / lengthSquared;
  const closestX = ax + Math.max(0, Math.min(1, t)) * dx;
  const closestY = ay + Math.max(0, Math.min(1, t)) * dy;
  return Math.hypot(px - closestX, py - closestY);
}

/** Ramène un Polygon/MultiPolygon à un tableau d'anneaux extérieurs simplifiés. */
function simplifiedRings(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  // On ne garde que l'anneau extérieur (index 0) de chaque polygone : les
  // départements de cette région n'ont pas d'enclave, et une île (ex :
  // Île de Ré) est un polygone séparé dans le MultiPolygon, pas un trou.
  return polygons.map((rings) => simplify(rings[0], SIMPLIFICATION_EPSILON_DEGREES));
}

function polygonCentroid(rings) {
  // Centroïde pondéré par aire (formule du "shoelace"), sur le plus grand
  // anneau si plusieurs (le chef-lieu peut avoir des communes associées
  // détachées, on veut le centre de la partie principale).
  let best = { area: 0, cx: 0, cy: 0 };

  for (const ring of rings) {
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[i + 1];
      const cross = x0 * y1 - x1 * y0;
      area += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
    area /= 2;
    const absArea = Math.abs(area);
    if (absArea > best.area) {
      best = { area: absArea, cx: cx / (6 * area), cy: cy / (6 * area) };
    }
  }

  return [best.cx, best.cy];
}

function boundsOf(allRingsPerDepartement) {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const rings of allRingsPerDepartement) {
    for (const ring of rings) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  return { minLon, maxLon, minLat, maxLat };
}

async function main() {
  const [departementsGeoJson, communesGeoJson] = await Promise.all([
    fetchJson(DEPARTEMENTS_URL),
    fetchJson(COMMUNES_URL),
  ]);

  const departementFeatures = departementsGeoJson.features.filter((f) =>
    Object.prototype.hasOwnProperty.call(CHEF_LIEU_BY_DEPARTEMENT, f.properties.code),
  );
  if (departementFeatures.length !== 12) {
    throw new Error(`attendu 12 départements, trouvé ${departementFeatures.length}`);
  }

  const ringsByDepartement = new Map();
  for (const feature of departementFeatures) {
    ringsByDepartement.set(feature.properties.code, simplifiedRings(feature.geometry));
  }

  // Position des préfectures : centroïde de la commune chef-lieu, non
  // simplifiée (elle est petite, la précision ne coûte rien).
  const chefLieuCodes = new Set(Object.values(CHEF_LIEU_BY_DEPARTEMENT));
  const communeByCode = new Map(
    communesGeoJson.features
      .filter((f) => chefLieuCodes.has(f.properties.code))
      .map((f) => [f.properties.code, f]),
  );

  const prefectureLonLatByDepartement = {};
  for (const [depCode, communeCode] of Object.entries(CHEF_LIEU_BY_DEPARTEMENT)) {
    const commune = communeByCode.get(communeCode);
    if (!commune) throw new Error(`commune chef-lieu ${communeCode} introuvable (dép. ${depCode})`);
    const rings = commune.geometry.type === 'Polygon' ? [commune.geometry.coordinates] : commune.geometry.coordinates;
    prefectureLonLatByDepartement[depCode] = polygonCentroid(rings.map((r) => r[0]));
  }

  // Projection : équirectangulaire avec correction de latitude (cos), tout à
  // fait adaptée à une région de cette taille (~450 km de large). On calcule
  // l'emprise sur les départements ET les préfectures pour que rien ne
  // déborde du viewBox.
  const allRings = [...ringsByDepartement.values(), Object.values(prefectureLonLatByDepartement).map((p) => [p, p])];
  const { minLon, maxLon, minLat, maxLat } = boundsOf(allRings);
  const meanLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const cosMeanLat = Math.cos(meanLatRad);

  function project([lon, lat]) {
    return [(lon - minLon) * cosMeanLat, maxLat - lat];
  }

  const projectedMaxX = (maxLon - minLon) * cosMeanLat;
  const projectedMaxY = maxLat - minLat;
  const availableWidth = TARGET_VIEWBOX_WIDTH - 2 * PADDING;
  const availableHeight = TARGET_VIEWBOX_HEIGHT - 2 * PADDING;
  const scale = Math.min(availableWidth / projectedMaxX, availableHeight / projectedMaxY);
  const offsetX = (TARGET_VIEWBOX_WIDTH - projectedMaxX * scale) / 2;
  const offsetY = (TARGET_VIEWBOX_HEIGHT - projectedMaxY * scale) / 2;

  function toSvg([lon, lat]) {
    const [x, y] = project([lon, lat]);
    return [Number((x * scale + offsetX).toFixed(1)), Number((y * scale + offsetY).toFixed(1))];
  }

  const departements = departementFeatures.map((feature) => {
    const code = feature.properties.code;
    const rings = ringsByDepartement.get(code);
    const path = rings
      .map((ring) => {
        const points = ring.map(toSvg);
        return `M${points.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
      })
      .join(' ');

    const [prefX, prefY] = toSvg(prefectureLonLatByDepartement[code]);

    return {
      code,
      nom: feature.properties.nom,
      path,
      // Rempli plus tard : voir docs/README.md § blasons. Tant que c'est
      // null, l'UI affiche un espace réservé plutôt qu'une image cassée.
      blason: null,
      prefecture: {
        nom: communeByCode.get(CHEF_LIEU_BY_DEPARTEMENT[code]).properties.nom,
        population: POPULATION_BY_DEPARTEMENT[code],
        x: prefX,
        y: prefY,
      },
    };
  });

  const output = {
    source: 'IGN / INSEE (Admin Express COG 2018), via github.com/gregoiredavid/france-geojson — Licence Ouverte',
    viewBox: { width: TARGET_VIEWBOX_WIDTH, height: TARGET_VIEWBOX_HEIGHT },
    departements,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(output));

  const totalPoints = departements.reduce(
    (sum, d) => sum + d.path.split('M').length - 1 + (d.path.match(/L/g) || []).length,
    0,
  );
  console.log(`écrit ${OUT_FILE}`);
  console.log(`${departements.length} départements, ~${totalPoints} points, ${(JSON.stringify(output).length / 1024).toFixed(1)} Ko`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
