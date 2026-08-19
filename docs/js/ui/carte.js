/**
 * Carte cliquable d'une région, avec les vraies frontières des départements.
 *
 * Les tracés viennent de docs/js/data/geo/<lessonId>.json, généré par
 * tools/build-geo.mjs à partir des données IGN/INSEE (voir ce fichier et
 * docs/README.md pour la source et la licence). Ce module ne fait que les
 * afficher : aucune donnée géographique n'est calculée ici.
 *
 * Étendre à une nouvelle région = lancer le générateur pour cette région et
 * lui donner le même mapId (code INSEE) que dans data/themes.js. Rien dans ce
 * fichier n'est spécifique à la Nouvelle-Aquitaine.
 */

import { svg } from './dom.js';

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

/**
 * @param {object} options
 * @param {import('../data/geo.js').RegionGeo} options.geo   Géométrie chargée via loadRegionGeo.
 * @param {Record<string, string>} options.status            Statut par mapId ('non_vue', 'nouvelle'…).
 * @param {string | null} options.selectedMapId
 * @param {(mapId: string) => void} options.onSelect
 * @returns {SVGElement}
 */
export function carteInteractive({ geo, status, selectedMapId, onSelect }) {
  const root = svg('svg', {
    viewBox: `0 0 ${geo.viewBox.width} ${geo.viewBox.height}`,
    class: 'carte',
    role: 'group',
    'aria-label': 'Carte des départements',
  });

  // Deux passes : d'abord tous les tracés, puis tous les points de préfecture
  // par-dessus. Sinon le tracé d'un département voisin, dessiné après,
  // recouvrirait le point d'un département déjà traité.
  for (const dep of geo.departements) {
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

  for (const dep of geo.departements) {
    const depStatus = status[dep.code] ?? 'non_vue';
    if (depStatus === 'non_vue') continue; // pas encore appris : pas de point à révéler

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
