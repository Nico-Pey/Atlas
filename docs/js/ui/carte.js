/**
 * Rendus cartographiques : carte de France (régions), carte d'une région
 * (départements) pour la leçon, et sa variante neutre pour le quiz.
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
 * @param {Record<string, number>} [options.progressByRegion]  Avancement par région, de 0
 *   (jamais visitée → gris) à 1 (tous ses départements connus → vert plein).
 * @param {Set<string> | null} [options.selectedRegionCodes]  Bascule la carte en **carte de
 *   sélection** : les régions dedans sont allumées, les autres éteintes, et l'avancement
 *   n'est plus affiché. Sert à choisir sur quoi porte une partie (ui/defi.js).
 * @param {string | null} [options.correctCode]  Bonne réponse, en vert (retour visuel du quiz).
 * @param {string | null} [options.pickedCode]   Région touchée, en rouge si elle n'est pas la bonne.
 * @param {((regionCode: string) => void) | null} [options.onSelect]  Absent = carte non cliquable.
 * @returns {SVGElement}
 */
export function carteRegions({
  geo,
  activeRegionCodes,
  progressByRegion = {},
  selectedRegionCodes = null,
  correctCode = null,
  pickedCode = null,
  onSelect = null,
}) {
  // Deux façons de colorier une région, jamais les deux à la fois : montrer
  // l'avancement (accueil) ou montrer si elle est retenue (réglages du Défi).
  const enSelection = selectedRegionCodes !== null;
  const interactive = typeof onSelect === 'function';
  const mapHeight = geo.viewBox.height;

  const root = svg('svg', {
    viewBox: `0 0 ${geo.viewBox.width} ${geo.viewBox.height}`,
    class: 'carte',
    role: interactive ? 'group' : 'img',
    'aria-label': 'Carte des régions de France',
  });

  for (const region of geo.regions) {
    const isActive = activeRegionCodes.has(region.code);
    // Même code visuel que les départements dans une leçon : gris tant qu'on
    // n'y a pas mis les pieds, vert de plus en plus franc à mesure qu'on les
    // apprend. La carte de France devient ainsi une carte d'avancement, au
    // lieu d'être verte partout dès le premier lancement.
    const progress = progressByRegion[region.code] ?? 0;
    const retenue = enSelection ? selectedRegionCodes.has(region.code) : progress > 0;

    const group = svg('g', {
      class: isActive ? 'carte-region carte-region-active' : 'carte-region carte-region-inactive',
      role: interactive ? 'button' : null,
      tabindex: interactive ? '0' : null,
      // En mode sélection, chaque région est un interrupteur : `aria-pressed`
      // est ce qui le fait annoncer comme tel, et son état avec.
      'aria-pressed': enSelection ? String(retenue) : null,
      'aria-label': region.nom + (isActive ? '' : ' (bientôt disponible)'),
    });

    group.appendChild(
      svg('path', {
        d: region.path,
        // Fond neutre plein quand la région n'est pas allumée : une opacité
        // nulle sur la couleur d'accent laisserait voir le fond de la page
        // (même raison que pour les départements).
        fill: retenue ? 'var(--accent)' : 'var(--surface)',
        'fill-opacity': retenue ? (enSelection ? SELECTION_OPACITY : regionFillOpacity(progress)) : 1,
        stroke: retenue ? 'var(--accent)' : 'var(--separator)',
        'stroke-width': mapHeight * BORDER_RATIO,
        'stroke-linejoin': 'round',
      }),
    );

    if (interactive) {
      group.addEventListener('click', () => onSelect(region.code));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(region.code);
        }
      });
    }

    root.appendChild(group);
  }

  appendReveal(root, geo.regions, {
    correctCode,
    pickedCode,
    fillOpacity: 0.3,
    strokeWidth: mapHeight * ACCENT_BORDER_RATIO,
  });

  return root;
}

/**
 * Opacité minimale d'une région déjà visitée. Sans ce plancher, une région
 * dont une seule carte sur douze a été vue serait à peine distinguable du
 * gris "jamais visitée" — or c'est précisément ce qu'on veut voir d'un coup
 * d'œil depuis l'accueil.
 */
const REGION_MIN_OPACITY = 0.18;

/**
 * Opacité d'une région allumée en mode sélection. Franche, mais sous 1 : la
 * carte de sélection ne doit pas se confondre avec celle de l'accueil, où le
 * vert plein veut dire « région entièrement connue ».
 */
const SELECTION_OPACITY = 0.5;

/** @param {number} progress Avancement de 0 à 1. @returns {number} */
function regionFillOpacity(progress) {
  return REGION_MIN_OPACITY + (1 - REGION_MIN_OPACITY) * clamp(progress, 0, 1);
}

/**
 * Retour visuel d'une réponse donnée sur une carte : la forme **touchée** en
 * rouge (seulement si elle est fausse — inutile de la peindre deux fois quand
 * c'est la bonne) et la **bonne réponse** en vert.
 *
 * Montrer les deux est le seul moyen de comprendre son erreur : avec la seule
 * bonne réponse affichée, on ne sait pas où on a touché — d'autant que le tap
 * est rattrapé vers le département le plus proche (voir
 * attachDepartementTapHandler), donc la forme retenue n'est pas forcément
 * celle qu'on visait.
 *
 * Les deux sont redessinées par-dessus tout le reste : deux formes voisines
 * partagent une frontière, et la dernière dessinée peint son trait par-dessus
 * celui de l'autre. Le vert passe en dernier, pour que la bonne réponse ait
 * toujours un contour complet.
 *
 * @param {SVGElement} root
 * @param {{code: string, path: string}[]} shapes  Régions ou départements affichés.
 * @param {{correctCode: string | null, pickedCode: string | null, fillOpacity: number, strokeWidth: number}} options
 */
function appendReveal(root, shapes, { correctCode, pickedCode, fillOpacity, strokeWidth }) {
  const wrong = pickedCode && pickedCode !== correctCode ? shapes.find((s) => s.code === pickedCode) : null;
  const right = correctCode ? shapes.find((s) => s.code === correctCode) : null;

  for (const [shape, color] of [
    [wrong, 'var(--danger)'],
    [right, 'var(--success)'],
  ]) {
    if (!shape) continue;
    root.appendChild(
      svg('path', {
        d: shape.path,
        fill: color,
        'fill-opacity': fillOpacity,
        stroke: color,
        'stroke-width': strokeWidth,
        'stroke-linejoin': 'round',
        'pointer-events': 'none',
      }),
    );
  }
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
 * Épaisseur des traits, en fraction de la HAUTEUR de la carte affichée.
 *
 * Même raison que pour les points de préfecture : une épaisseur exprimée
 * directement en unités de projection change d'aspect selon le zoom. Le
 * viewBox de l'Île-de-France fait ~64 unités de haut contre ~193 pour la
 * Nouvelle-Aquitaine : un trait de 1 unité y faisait donc ~5,5 px à l'écran
 * contre 1,8 ailleurs, et les bordures noyaient complètement la petite
 * couronne. Exprimées en fraction de la hauteur, elles font la même épaisseur
 * partout (le SVG a une hauteur fixée en CSS, la largeur suit).
 */
const BORDER_RATIO = 0.0035;
/** Traits qui doivent ressortir : sélection, mise en évidence, retour du quiz. */
const ACCENT_BORDER_RATIO = 0.0085;

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
  const bbox = region ? padBbox(region.bbox, REGION_ZOOM_MARGIN) : [0, 0, geo.viewBox.width, geo.viewBox.height];
  const mapHeight = bbox[3] - bbox[1];

  const root = svg('svg', {
    viewBox: bboxToViewBox(bbox),
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
        'stroke-width': mapHeight * BORDER_RATIO,
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

  attachDepartementTapHandler(root, departements, onSelect);

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
        'stroke-width': mapHeight * ACCENT_BORDER_RATIO,
        'stroke-linejoin': 'round',
        'pointer-events': 'none',
      }),
    );
  }

  for (const dep of departements) {
    const depStatus = status[dep.code] ?? 'non_vue';
    if (depStatus === 'non_vue' || !dep.prefecture) continue; // pas encore appris : pas de point à révéler

    const radius = prefectureMarkerRadius(mapHeight, dep.code === selectedMapId);

    root.appendChild(
      svg('circle', {
        class: 'carte-prefecture',
        cx: dep.prefecture.x,
        cy: dep.prefecture.y,
        r: radius,
        // Centre blanc plutôt qu'un disque plein : le point doit rester
        // lisible aussi bien sur un département gris que sur un vert foncé
        // (« connue »), où un disque de la couleur d'accent disparaîtrait.
        fill: '#ffffff',
        stroke: 'var(--accent)',
        // Anneau fin : à ce rayon, un trait plus épais transformerait le
        // repère en pastille et masquerait les petits départements.
        'stroke-width': radius * 0.3,
        'pointer-events': 'none',
      }),
    );
  }

  return root;
}

/**
 * Rayon d'un point de préfecture, en fraction de la HAUTEUR de la carte
 * affichée.
 *
 * Le SVG a une hauteur fixée en CSS (`.carte { height: min(46vh, 400px) }`)
 * et une largeur qui suit : une fraction de la hauteur du viewBox donne donc
 * toujours le même diamètre à l'écran, quelle que soit la région. À 350 px de
 * haut, ça fait un point d'environ 9 px — un repère de ville lisible, qui ne
 * mange pas la carte.
 */
const PREFECTURE_MARKER_RADIUS_RATIO = 0.013;
/** Multiplicateur appliqué au rayon du département sélectionné. */
const PREFECTURE_MARKER_SELECTED_FACTOR = 1.35;

/**
 * Rayon du point de préfecture — **le même pour tous les départements d'une
 * carte**, seul celui du département sélectionné est légèrement grossi.
 *
 * Il était auparavant proportionné à la taille de chaque département. Le point
 * changeait donc de taille d'un département à l'autre (en Île-de-France, celui
 * de la Seine-et-Marne faisait plus de trois fois celui de Paris), ce qui se
 * lisait comme une information alors que ça n'en était pas une, et les gros
 * anneaux recouvraient la petite couronne. Un point est un repère de ville :
 * une ville n'est pas "plus grande" parce que son département l'est.
 *
 * @param {number} mapHeight Hauteur du viewBox de la carte, en unités de projection.
 * @param {boolean} isSelected
 */
function prefectureMarkerRadius(mapHeight, isSelected) {
  const radius = mapHeight * PREFECTURE_MARKER_RADIUS_RATIO;
  return isSelected ? radius * PREFECTURE_MARKER_SELECTED_FACTOR : radius;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Gère le clic sur une carte de départements, avec rattrapage du tap le plus
 * proche. Un seul écouteur au niveau du SVG : il a besoin de voir TOUS les
 * départements pour rattraper un tap qui manque un petit tracé.
 *
 * @param {SVGElement} root
 * @param {import('../data/geo.js').DepartementGeo[]} departements
 * @param {(code: string) => void} onSelect
 */
function attachDepartementTapHandler(root, departements, onSelect) {
  root.addEventListener('click', (event) => {
    const hit = event.target.closest('.carte-departement');
    if (hit) {
      onSelect(hit.dataset.code);
      return;
    }

    // Le tap n'est tombé pile sur aucun tracé — courant sur un petit
    // département (Paris fait ~29×15px une fois zoomé, bien en dessous d'un
    // doigt). On rattrape avec le département le plus proche, mais borné :
    // un tap loin de tout ne doit rien sélectionner.
    const point = toSvgPoint(root, event.clientX, event.clientY);
    const nearest = nearestDepartement(departements, point);
    if (nearest) onSelect(nearest.code);
  });
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

/**
 * Carte d'une région pour la facette "placement" du quiz : tous les
 * départements sont rendus **strictement à l'identique**.
 *
 * Contrairement à `carteDepartements`, aucune couleur ne dépend du statut
 * SRS et aucun point de préfecture n'est affiché : la carte ne doit donner
 * aucun indice sur la réponse attendue, ni même trahir quels départements
 * ont déjà été appris.
 *
 * @param {object} options
 * @param {import('../data/geo.js').FranceGeo} options.geo
 * @param {string} options.regionCode
 * @param {string | null} [options.correctCode]  Bonne réponse, en vert (retour visuel après réponse).
 * @param {string | null} [options.pickedCode]   Département touché, en rouge s'il n'est pas le bon.
 * @param {string | null} [options.highlightCode]  Département désigné en jaune : sert d'énoncé
 *   ("quel est CE département ?"), pas de retour visuel.
 * @param {((code: string) => void) | null} [options.onSelect]  Absent = carte purement illustrative.
 * @returns {SVGElement}
 */
export function cartePlacementDepartements({
  geo,
  regionCode,
  correctCode = null,
  pickedCode = null,
  highlightCode = null,
  onSelect = null,
}) {
  const region = geo.regions.find((r) => r.code === regionCode);
  const departements = geo.departements.filter((d) => d.regionCode === regionCode);
  const interactive = typeof onSelect === 'function';
  const bbox = region ? padBbox(region.bbox, REGION_ZOOM_MARGIN) : [0, 0, geo.viewBox.width, geo.viewBox.height];
  const mapHeight = bbox[3] - bbox[1];

  const root = svg('svg', {
    viewBox: bboxToViewBox(bbox),
    class: 'carte',
    role: interactive ? 'group' : 'img',
    'aria-label': region ? `Départements de ${region.nom}` : 'Départements',
  });

  for (const dep of departements) {
    const group = svg('g', {
      class: 'carte-departement',
      role: interactive ? 'button' : null,
      tabindex: interactive ? '0' : null,
      'data-code': dep.code,
      'aria-label': dep.nom,
    });

    group.appendChild(
      svg('path', {
        d: dep.path,
        fill: 'var(--surface)',
        stroke: 'var(--separator)',
        'stroke-width': mapHeight * BORDER_RATIO,
        'stroke-linejoin': 'round',
      }),
    );

    if (interactive) {
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(dep.code);
        }
      });
    }

    root.appendChild(group);
  }

  if (interactive) attachDepartementTapHandler(root, departements, onSelect);

  // Le département désigné par l'énoncé, en jaune. Redessiné par-dessus tout
  // le reste pour que son contour soit complet (deux voisins partagent une
  // frontière : le dernier dessiné recouvre le trait de l'autre).
  const highlighted = departements.find((d) => d.code === highlightCode);
  if (highlighted) {
    root.appendChild(
      svg('path', {
        d: highlighted.path,
        fill: 'var(--highlight)',
        stroke: 'var(--highlight-strong)',
        'stroke-width': mapHeight * ACCENT_BORDER_RATIO,
        'stroke-linejoin': 'round',
        'pointer-events': 'none',
      }),
    );
  }

  appendReveal(root, departements, {
    correctCode,
    pickedCode,
    fillOpacity: 0.35,
    strokeWidth: mapHeight * ACCENT_BORDER_RATIO,
  });

  return root;
}
