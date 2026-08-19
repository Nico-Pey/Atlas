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
    const isSelected = dep.code === selectedMapId;
    const isUnseen = depStatus === 'non_vue';

    const group = svg('g', {
      class: 'carte-departement',
      role: 'button',
      tabindex: '0',
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
        stroke: isSelected ? 'var(--accent)' : 'var(--separator)',
        'stroke-width': isSelected ? 2.5 : 1,
        'stroke-linejoin': 'round',
      }),
    );

    group.addEventListener('click', () => onSelect(dep.code));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(dep.code);
      }
    });

    root.appendChild(group);
  }

  for (const dep of departements) {
    const depStatus = status[dep.code] ?? 'non_vue';
    if (depStatus === 'non_vue' || !dep.prefecture) continue; // pas encore appris : pas de point à révéler

    root.appendChild(
      svg('circle', {
        class: 'carte-prefecture',
        cx: dep.prefecture.x,
        cy: dep.prefecture.y,
        r: dep.code === selectedMapId ? 4.5 : 3,
        fill: '#ffffff',
        stroke: 'var(--accent)',
        'stroke-width': 1.5,
        'pointer-events': 'none',
      }),
    );
  }

  return root;
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
