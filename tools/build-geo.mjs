/**
 * Génère docs/js/data/geo/france.json : les 13 régions et 96 départements de
 * France métropolitaine, prêts à afficher (tracés SVG, une seule projection
 * partagée), plus la position/population de chaque préfecture déjà apprise.
 *
 * Source des tracés : IGN / INSEE (Admin Express COG), via le dépôt public
 * https://github.com/gregoiredavid/france-geojson — Licence Ouverte / Open
 * Licence, réutilisation libre avec attribution (voir docs/README.md).
 * On utilise directement les fichiers déjà simplifiés par ce dépôt
 * (`*-version-simplifiee.geojson`) plutôt que de re-simplifier nous-mêmes :
 * c'est un travail déjà fait, publié, et review par la communauté qui
 * maintient ce jeu de données.
 *
 * Pourquoi un script plutôt que de servir le GeoJSON brut : même simplifiés,
 * les fichiers sources pèsent ~800 Ko à eux deux, avec des propriétés et une
 * précision de coordonnées inutiles ici. Ce script les réduit à un format
 * compact (chemins SVG déjà projetés, arrondis à une décimale) et calcule au
 * passage tout ce que l'app ne doit pas recalculer à l'exécution : la boîte
 * englobante de chaque région et département (utile pour "zoomer" dessus).
 *
 * Utilisation :  node tools/build-geo.mjs
 * Dépendance de build uniquement (jamais expédiée dans docs/) :
 * @etalab/decoupage-administratif, installée dans tools/ — voir
 * tools/package.json. Sert uniquement à savoir à quelle région appartient
 * chaque département (absent des fichiers geojson).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(HERE, '..', 'docs', 'js', 'data', 'geo', 'france.json');

const REGIONS_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions-version-simplifiee.geojson';
const DEPARTEMENTS_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson';
/** Uniquement pour localiser les 12 préfectures déjà apprises (voir plus bas) — pas besoin du national. */
const NOUVELLE_AQUITAINE_COMMUNES_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/nouvelle-aquitaine/communes-nouvelle-aquitaine.geojson';

/** Code INSEE de la commune chef-lieu de chaque département déjà appris. */
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
 * Population de la commune préfecture (source : INSEE, via
 * @etalab/decoupage-administratif — relevé manuel pour n'en garder que ces
 * 12 valeurs plutôt que de dépendre du paquet à l'exécution).
 */
const POPULATION_BY_DEPARTEMENT = {
  '16': 41908, '17': 79851, '19': 13401, '23': 12955, '24': 29055, '33': 267991,
  '40': 31592, '47': 32801, '64': 80441, '79': 59854, '86': 89916, '87': 129937,
};

/** Bord long (en unités de viewBox) attribué à la plus grande dimension de la France métropolitaine. */
const TARGET_LONG_EDGE = 400;
const PADDING = 8;

async function fetchJson(url) {
  console.log(`téléchargement : ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return response.json();
}

function readLocalJson(relativePath) {
  return JSON.parse(readFileSync(join(HERE, relativePath), 'utf8'));
}

/** Polygon/MultiPolygon → tableau d'anneaux extérieurs (une entrée par îlot). */
function outerRings(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((rings) => rings[0]);
}

function polygonCentroid(rings) {
  // Centroïde pondéré par aire (formule du "shoelace"), sur le plus grand
  // anneau si plusieurs (une commune associée détachée ne doit pas décaler
  // le point).
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
    if (absArea > best.area) best = { area: absArea, cx: cx / (6 * area), cy: cy / (6 * area) };
  }
  return [best.cx, best.cy];
}

async function main() {
  const [regionsGeoJson, departementsGeoJson, communesGeoJson] = await Promise.all([
    fetchJson(REGIONS_URL),
    fetchJson(DEPARTEMENTS_URL),
    fetchJson(NOUVELLE_AQUITAINE_COMMUNES_URL),
  ]);

  const departementsRef = readLocalJson('node_modules/@etalab/decoupage-administratif/data/departements.json');
  const regionCodeByDepartement = new Map(departementsRef.map((d) => [d.code, d.region]));

  // --- Projection : équirectangulaire avec correction de latitude (cos),
  // calculée UNE FOIS sur l'emprise nationale et partagée par régions et
  // départements. C'est ce qui permet de "zoomer" d'une vue à l'autre en
  // changeant juste le viewBox du SVG, sans reprojeter quoi que ce soit.
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const feature of regionsGeoJson.features) {
    for (const ring of outerRings(feature.geometry)) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  const cosMeanLat = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const rawWidth = (maxLon - minLon) * cosMeanLat;
  const rawHeight = maxLat - minLat;
  const scale = TARGET_LONG_EDGE / Math.max(rawWidth, rawHeight);
  const viewBoxWidth = Math.round(rawWidth * scale + 2 * PADDING);
  const viewBoxHeight = Math.round(rawHeight * scale + 2 * PADDING);

  function project([lon, lat]) {
    const x = (lon - minLon) * cosMeanLat * scale + PADDING;
    const y = (maxLat - lat) * scale + PADDING;
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  }

  /** Construit le chemin SVG + la boîte englobante d'une géométrie Polygon/MultiPolygon. */
  function buildShape(geometry) {
    let bMinX = Infinity;
    let bMinY = Infinity;
    let bMaxX = -Infinity;
    let bMaxY = -Infinity;

    const subpaths = outerRings(geometry).map((ring) => {
      const projected = ring.map(project);
      for (const [x, y] of projected) {
        if (x < bMinX) bMinX = x;
        if (x > bMaxX) bMaxX = x;
        if (y < bMinY) bMinY = y;
        if (y > bMaxY) bMaxY = y;
      }
      return `M${projected.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
    });

    return {
      path: subpaths.join(' '),
      bbox: [Number(bMinX.toFixed(1)), Number(bMinY.toFixed(1)), Number(bMaxX.toFixed(1)), Number(bMaxY.toFixed(1))],
    };
  }

  const regions = regionsGeoJson.features.map((feature) => {
    const { path, bbox } = buildShape(feature.geometry);
    return { code: feature.properties.code, nom: feature.properties.nom, path, bbox };
  });

  // Préfectures déjà apprises : centroïde de leur commune chef-lieu, dans la
  // MÊME projection nationale (donc directement compatible avec le reste).
  const chefLieuCodes = new Set(Object.values(CHEF_LIEU_BY_DEPARTEMENT));
  const communeByCode = new Map(
    communesGeoJson.features.filter((f) => chefLieuCodes.has(f.properties.code)).map((f) => [f.properties.code, f]),
  );

  function prefectureFor(depCode) {
    const communeCode = CHEF_LIEU_BY_DEPARTEMENT[depCode];
    if (!communeCode) return null; // pas encore de contenu pour ce département

    const commune = communeByCode.get(communeCode);
    if (!commune) throw new Error(`commune chef-lieu ${communeCode} introuvable (dép. ${depCode})`);
    const rings = outerRings(commune.geometry);
    const [lon, lat] = polygonCentroid(rings);
    const [x, y] = project([lon, lat]);

    return {
      nom: commune.properties.nom,
      population: POPULATION_BY_DEPARTEMENT[depCode],
      x,
      y,
      // Rempli plus tard, voir docs/README.md § blasons. Tant que c'est null,
      // l'UI affiche un espace réservé plutôt qu'une image cassée.
      blason: null,
    };
  }

  const departements = departementsGeoJson.features.map((feature) => {
    const code = feature.properties.code;
    const regionCode = regionCodeByDepartement.get(code);
    if (!regionCode) throw new Error(`région introuvable pour le département ${code}`);

    const { path, bbox } = buildShape(feature.geometry);
    return {
      code,
      nom: feature.properties.nom,
      regionCode,
      path,
      bbox,
      prefecture: prefectureFor(code),
    };
  });

  const output = {
    source: 'IGN / INSEE (Admin Express COG), via github.com/gregoiredavid/france-geojson — Licence Ouverte',
    viewBox: { width: viewBoxWidth, height: viewBoxHeight },
    regions,
    departements,
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(output));

  const withContent = departements.filter((d) => d.prefecture).length;
  console.log(`écrit ${OUT_FILE}`);
  console.log(
    `${regions.length} régions, ${departements.length} départements (${withContent} avec contenu), ` +
      `${(JSON.stringify(output).length / 1024).toFixed(1)} Ko`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
