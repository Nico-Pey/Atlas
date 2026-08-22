/**
 * Rendus cartographiques : carte de France (régions), carte d'une région
 * (départements), silhouette isolée d'un département (quiz).
 *
 * Les tracés viennent de docs/js/data/geo/france.json, généré par
 * tools/build-geo.mjs à partir des données IGN/INSEE (voir ce fichier et
 * docs/README.md § 6 pour la source, la licence, et comment ajouter une
 * région). Ce module ne fait qu'afficher : aucune donnée géographique n'est
 * calculée ici, tout arrive déjà projeté dans un repère unique partagé par
 * la France entière — c'est ce qui permet de passer de la vue nationale à
 * une région en ne changeant que le viewBox du SVG, sans recalcul.
 */

import { bboxToViewBox, padBbox } from '../data/geo.js';
import { svg } from './dom.js';

/**
 * Carte de France, une région par forme cliquable.
 *
 * @param {object} options
 * @param {import('../data/geo.js').FranceGeo} options.geo
 * @param {Set<string>} options.activeRegionCodes  Régions qui ont du contenu.
 * @param {(regionCode: string) => void} options.onSelect
 * @returns {SVGElement}
 */
export function carteRegions({ geo, activeRegionCodes, onSelect }) {
  const root = svg('svg', {
    viewBox: `0 0 ${geo.viewBox.width} ${geo.viewBox.height}`,
    class: 'carte',
    role: 'group',
    'aria-label': 'Carte des régions de France',
  });

  for (const region of geo.regions) {
    const isActive = activeRegionCodes.has(region.code);
    const group = svg('g', {
      class: isActive ? 'carte-region carte-region-active' : 'carte-region carte-region-inactive',
      role: 'button',
      tabindex: '0',
      'aria-label': region.nom + (isActive ? '' : ' (bientôt disponible)'),
    });

    group.appendChild(
      svg('path', {
        d: region.path,
        fill: isActive ? 'var(--accent)' : 'var(--surface)',
        'fill-opacity': isActive ? 0.16 : 1,
        stroke: isActive ? 'var(--accent)' : 'var(--separator)',
        'stroke-width': 1,
        'stroke-linejoin': 'round',
      }),
    );

    group.addEventListener('click', () => onSelect(region.code));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(region.code);
      }
    });

    root.appendChild(group);
  }

  return root;
}

/**
 * Une seule teinte dont l'opacité augmente avec la maîtrise, plutôt qu'un code
 * rouge/vert : reste lisible sans dépendre de la perception des couleurs.
 * @type {Record<string, number>}
 */
export const OPACITY_BY_STATUS = {
  non_vue: 0,
  nouvelle: 0.25,
  en_cours: 0.55,
  connue: 1,
};

/** Marge (en unités de viewBox) laissée autour d'une région "zoomée". */
const REGION_ZOOM_MARGIN = 10;

/**
 * À quel point on tolère un tap "à côté" d'un département, en multiples de
 * son propre rayon (demi-diagonale de sa boîte englobante). Sert de filet de
 * sécurité pour les petits départements collés les uns aux autres (Paris et
 * la petite couronne, ~20-40px à l'écran une fois zoomé sur l'Île-de-France —
 * bien sous le minimum de 44pt des HIG, voir .claude/skills/conventions-ui/).
 * Un grand département n'en a presque jamais besoin : son tracé exact
 * couvre déjà largement plus que 44px.
 */
const TAP_TOLERANCE_RADII = 1.5;
/** Rayon plancher (unités de viewBox) sous lequel on ne réduit pas la tolérance,
 * pour qu'un département vraiment minuscule reste rattrapable. */
const MIN_HALF_DIAGONAL = 3;

/**
 * Carte d'une région, département par département — zoomée sur sa boîte
 * englobante (même repère que carteRegions, donc pas de recalcul, juste un
 * viewBox différent).
 *
 * @param {object} options
 * @param {import('../data/geo.js').FranceGeo} options.geo
 * @param {string} options.regionCode
 * @param {Record<string, string>} options.status   Statut par mapId ('non_vue', 'nouvelle'…).
 * @param {string | null} options.selectedMapId
 * @param {(mapId: string) => void} options.onSelect
 * @returns {SVGElement}
 */
export function carteDepartements({ geo, regionCode, status, selectedMapId, onSelect }) {
  const region = geo.regions.find((r) => r.code === regionCode);
  const departements = geo.departements.filter((d) => d.regionCode === regionCode);

  const root = svg('svg', {
    viewBox: region ? bboxToViewBox(padBbox(region.bbox, REGION_ZOOM_MARGIN)) : `0 0 ${geo.viewBox.width} ${geo.viewBox.height}`,
    class: 'carte',
    role: 'group',
    'aria-label': region ? `Carte des départements de ${region.nom}` : 'Carte des départements',
  });

  for (const dep of departements) {
    const depStatus = status[dep.code] ?? 'non_vue';
    const opacity = OPACITY_BY_STATUS[depStatus] ?? 0;
    const isUnseen = depStatus === 'non_vue';

    const group = svg('g', {
      class: 'carte-departement',
      role: 'button',
      tabindex: '0',
      'data-code': dep.code,
      'aria-label': `${dep.nom} (${dep.code})`,
    });

    group.appendChild(
      svg('path', {
        d: dep.path,
        // Fond neutre plein quand le département n'a jamais été vu : une
        // opacité nulle sur la couleur d'accent laisserait voir le fond de
        // la page.
        fill: isUnseen ? 'var(--surface)' : 'var(--accent)',
        'fill-opacity': isUnseen ? 1 : opacity,
        // Contour toujours fin et neutre ici, même pour le département
        // sélectionné : deux départements voisins partagent une frontière,
        // et celui dessiné en dernier peint son trait par-dessus celui de
        // l'autre à cet endroit. Avec un trait spécial par département, la
        // mise en évidence de la sélection ne "gagnait" que sur les bords
        // où elle se trouvait dessinée après son voisin — contour à moitié
        // épais, à moitié fin selon l'ordre, pas selon la sélection. Le
        // contour complet du département sélectionné est redessiné une
        // seule fois, par-dessus tout le reste, juste après cette boucle.
        stroke: 'var(--separator)',
        'stroke-width': 1,
        'stroke-linejoin': 'round',
      }),
    );

    // Le clic est géré une seule fois, au niveau du SVG entier (voir plus
    // bas) : il a besoin de voir TOUS les départements pour rattraper un tap
    // qui manque un petit tracé. Le clavier, lui, cible toujours exactement
    // l'élément avec le focus — pas d'ambiguïté, pas besoin de rattrapage.
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(dep.code);
      }
    });

    root.appendChild(group);
  }

  root.addEventListener('click', (event) => {
    const hit = event.target.closest('.carte-departement');
    if (hit) {
      onSelect(hit.dataset.code);
      return;
    }

    // Le tap n'est tombé pile sur aucun tracé — courant sur un petit
    // département (Paris fait ~20×40px une fois zoomé, bien en dessous d'un
    // doigt). On rattrape avec le département le plus proche, mais borné :
    // un tap loin de tout ne doit rien sélectionner.
    const point = toSvgPoint(root, event.clientX, event.clientY);
    const nearest = nearestDepartement(departements, point);
    if (nearest) onSelect(nearest.code);
  });

  // Contour du département sélectionné, redessiné par-dessus tout le reste
  // (voir le commentaire dans la boucle ci-dessus). `pointer-events: none`
  // pour que ce tracé purement décoratif ne vole pas les clics au groupe
  // cliquable qu'il recouvre.
  const selectedDep = departements.find((d) => d.code === selectedMapId);
  if (selectedDep) {
    root.appendChild(
      svg('path', {
        d: selectedDep.path,
        fill: 'none',
        stroke: 'var(--accent)',
        'stroke-width': 2.5,
        'stroke-linejoin': 'round',
        'pointer-events': 'none',
      }),
    );
  }

  for (const dep of departements) {
    const depStatus = status[dep.code] ?? 'non_vue';
    if (depStatus === 'non_vue' || !dep.prefecture) continue; // pas encore appris : pas de point à révéler

    const radius = prefectureMarkerRadius(dep, dep.code === selectedMapId);

    root.appendChild(
      svg('circle', {
        class: 'carte-prefecture',
        cx: dep.prefecture.x,
        cy: dep.prefecture.y,
        r: radius,
        fill: '#ffffff',
        stroke: 'var(--accent)',
        // Un trait fin proportionné au cercle : à ce rayon, 1.5 (la valeur
        // fixe d'avant) ferait un anneau épais et grossier.
        'stroke-width': Math.max(radius * 0.35, 0.6),
        'pointer-events': 'none',
      }),
    );
  }

  return root;
}

/** Rayons min/max (unités de viewBox) du point de préfecture. */
const PREFECTURE_MARKER_MIN_RADIUS = 0.9;
const PREFECTURE_MARKER_MAX_RADIUS = 3;
/** Multiplicateur appliqué au rayon du département sélectionné. */
const PREFECTURE_MARKER_SELECTED_FACTOR = 1.4;

/**
 * Rayon du point de préfecture, proportionné à la taille du département —
 * un rayon fixe engloutissait complètement les petits départements (Paris
 * ne fait que ~3.4 unités de haut ; un rayon fixe de 3, soit un diamètre de
 * 6, dépassait sa propre forme). On le limite à une fraction de sa plus
 * petite dimension, borné pour rester visible sur un très petit département
 * et raisonnable sur un très grand.
 */
function prefectureMarkerRadius(dep, isSelected) {
  const [minX, minY, maxX, maxY] = dep.bbox;
  const smallestSide = Math.min(maxX - minX, maxY - minY);
  const radius = clamp(smallestSide * 0.22, PREFECTURE_MARKER_MIN_RADIUS, PREFECTURE_MARKER_MAX_RADIUS);
  return isSelected ? Math.min(radius * PREFECTURE_MARKER_SELECTED_FACTOR, PREFECTURE_MARKER_MAX_RADIUS * PREFECTURE_MARKER_SELECTED_FACTOR) : radius;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Coordonnées d'un clic écran, converties dans le repère du viewBox du SVG. */
function toSvgPoint(svgRoot, clientX, clientY) {
  const point = svgRoot.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(svgRoot.getScreenCTM().inverse());
}

/**
 * Département dont le centre est le plus proche du point donné, en distance
 * normalisée par la taille du département (un petit département "attire"
 * donc un tap proportionnellement plus loin qu'un grand). Retourne `null` si
 * même le plus proche est hors de sa tolérance — pas de sélection surprise
 * sur un tap loin de tout tracé.
 */
function nearestDepartement(departements, point) {
  let best = null;
  let bestScore = Infinity;

  for (const dep of departements) {
    const [minX, minY, maxX, maxY] = dep.bbox;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const halfDiagonal = Math.max(Math.hypot(maxX - minX, maxY - minY) / 2, MIN_HALF_DIAGONAL);
    const distance = Math.hypot(point.x - cx, point.y - cy);
    const score = distance / halfDiagonal;

    if (score < bestScore) {
      bestScore = score;
      best = dep;
    }
  }

  return bestScore <= TAP_TOLERANCE_RADII ? best : null;
}

/** Marge (en unités de viewBox) laissée autour d'une silhouette isolée. */
const SILHOUETTE_MARGIN = 6;

/**
 * Silhouette d'un seul département, isolée et sans contexte — utilisée par
 * le quiz pour le faire deviner par sa forme. Aucune couleur ne dépend du
 * statut SRS ici : la carte ne doit donner aucun indice.
 *
 * @param {import('../data/geo.js').DepartementGeo} depGeo
 * @returns {SVGElement}
 */
export function silhouette(depGeo) {
  return svg(
    'svg',
    {
      viewBox: bboxToViewBox(padBbox(depGeo.bbox, SILHOUETTE_MARGIN)),
      class: 'silhouette',
      role: 'img',
      'aria-label': 'Contour du département à deviner',
    },
    [
      svg('path', {
        d: depGeo.path,
        fill: 'var(--surface)',
        stroke: 'var(--accent)',
        'stroke-width': 2.5,
        'stroke-linejoin': 'round',
      }),
    ],
  );
}
