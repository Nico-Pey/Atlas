/**
 * Génère docs/js/data/geo/france.json : les 13 régions et 96 départements de
 * France métropolitaine, prêts à afficher (tracés SVG, une seule projection
 * partagée), plus la position et la population de la préfecture de CHAQUE
 * département (source officielle, calculée pour les 96 — pas seulement ceux
 * qui ont déjà une leçon).
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
 * englobante de chaque région et département, et la position de chaque
 * préfecture.
 *
 * Utilisation :  node tools/build-geo.mjs
 * (à lancer avant tools/build-content.mjs, qui dépend de son résultat)
 *
 * Dépendance de build uniquement (jamais expédiée dans docs/) :
 * @etalab/decoupage-administratif, installée dans tools/ — voir
 * tools/package.json. Sert à savoir à quelle région appartient chaque
 * département, quelle commune est sa préfecture, et la population de
 * celle-ci (tout, sauf le tracé géographique lui-même).
 *
 * ⚠️ Ce script télécharge le fichier des communes de chacune des 13 régions
 * (~40 Mo au total) pour calculer la position exacte de chaque préfecture.
 * C'est lourd mais ponctuel : ça ne tourne que sur la machine du
 * développeur, jamais dans l'app.
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

/** "Provence-Alpes-Côte d'Azur" → "provence-alpes-cote-d-azur", le slug utilisé par le dépôt source. */
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // enlève les accents
    .replace(/'/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
  const [regionsGeoJson, departementsGeoJson] = await Promise.all([fetchJson(REGIONS_URL), fetchJson(DEPARTEMENTS_URL)]);

  const departementsRef = readLocalJson('node_modules/@etalab/decoupage-administratif/data/departements.json').filter(
    (d) => d.zone === 'metro',
  );
  const communesRef = readLocalJson('node_modules/@etalab/decoupage-administratif/data/communes.json');
  const regionsRef = readLocalJson('node_modules/@etalab/decoupage-administratif/data/regions.json').filter(
    (r) => r.zone === 'metro',
  );

  const regionCodeByDepartement = new Map(departementsRef.map((d) => [d.code, d.region]));
  const chefLieuByDepartement = new Map(departementsRef.map((d) => [d.code, d.chefLieu]));
  const communeByCode = new Map(communesRef.map((c) => [c.code, c]));

  // --- Communes chef-lieu, région par région : chaque fichier ne contient
  // que les communes de SA région, il faut donc en télécharger un par
  // région pour couvrir les 96 préfectures. On ne garde que les communes
  // chef-lieu de chaque fichier, tout le reste est jeté immédiatement.
  const neededCommuneCodes = new Set(chefLieuByDepartement.values());
  const communeGeometryByCode = new Map();

  await Promise.all(
    regionsRef.map(async (region) => {
      const slug = slugify(region.nom);
      const url = `https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/${slug}/communes-${slug}.geojson`;
      const geojson = await fetchJson(url);
      for (const feature of geojson.features) {
        if (neededCommuneCodes.has(feature.properties.code)) {
          communeGeometryByCode.set(feature.properties.code, feature.geometry);
        }
      }
    }),
  );

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

  function prefectureFor(depCode) {
    const communeCode = chefLieuByDepartement.get(depCode);
    const commune = communeByCode.get(communeCode);
    const geometry = communeGeometryByCode.get(communeCode);
    if (!commune || !geometry) {
      throw new Error(`préfecture introuvable pour le département ${depCode} (commune ${communeCode})`);
    }

    const [lon, lat] = polygonCentroid(outerRings(geometry));
    const [x, y] = project([lon, lat]);

    return {
      nom: commune.nom,
      population: commune.population,
      x,
      y,
      // Rempli plus tard, voir docs/README.md § blasons. Tant que c'est null,
      // l'UI affiche un espace réservé plutôt qu'une image cassée.
      blason: null,
    };
  }

  const departements = departementsGeoJson.features
    .filter((feature) => regionCodeByDepartement.has(feature.properties.code))
    .map((feature) => {
      const code = feature.properties.code;
      const { path, bbox } = buildShape(feature.geometry);
      return {
        code,
        nom: feature.properties.nom,
        regionCode: regionCodeByDepartement.get(code),
        path,
        bbox,
        prefecture: prefectureFor(code),
      };
    });

  if (departements.length !== 96) {
    throw new Error(`attendu 96 départements métropolitains, obtenu ${departements.length}`);
  }

  const output = {
    source: 'IGN / INSEE (Admin Express COG), via github.com/gregoiredavid/france-geojson — Licence Ouverte',
    viewBox: { width: viewBoxWidth, height: viewBoxHeight },
    regions,
    departements,
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(output));

  console.log(`écrit ${OUT_FILE}`);
  console.log(
    `${regions.length} régions, ${departements.length} départements (tous avec préfecture), ` +
      `${(JSON.stringify(output).length / 1024).toFixed(1)} Ko`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
