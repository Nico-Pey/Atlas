/**
 * Carte cliquable d'une région, département par département.
 *
 * IMPORTANT — simplification assumée : ce ne sont PAS les tracés géographiques
 * réels des départements. Aucune source de données cartographiques n'était
 * accessible pour cette V1. Chaque département est un rectangle arrondi placé
 * pour respecter grossièrement sa position relative réelle (nord/sud,
 * est/ouest) — assez pour que la carte soit lisible et cliquable, pas pour
 * représenter des frontières exactes.
 *
 * Remplacer ça par de vrais tracés (des <path> SVG) ne demandera de toucher
 * QUE ce fichier : les écrans ne manipulent qu'un `mapId` (le code INSEE).
 */

import { svg } from './dom.js';

const VIEW_BOX_WIDTH = 320;
const VIEW_BOX_HEIGHT = 420;

/** Positions approximatives des 12 départements de Nouvelle-Aquitaine. */
const DEPARTMENTS = [
  { mapId: '79', x: 90, y: 30, width: 70, height: 55 },   // Deux-Sèvres
  { mapId: '86', x: 190, y: 20, width: 70, height: 60 },  // Vienne
  { mapId: '23', x: 252, y: 70, width: 55, height: 55 },  // Creuse
  { mapId: '17', x: 40, y: 110, width: 65, height: 70 },  // Charente-Maritime
  { mapId: '16', x: 150, y: 110, width: 65, height: 60 }, // Charente
  { mapId: '87', x: 242, y: 140, width: 60, height: 60 }, // Haute-Vienne
  { mapId: '24', x: 176, y: 195, width: 75, height: 70 }, // Dordogne
  { mapId: '19', x: 270, y: 210, width: 60, height: 65 }, // Corrèze
  { mapId: '33', x: 60, y: 220, width: 90, height: 95 },  // Gironde
  { mapId: '47', x: 190, y: 280, width: 65, height: 55 }, // Lot-et-Garonne
  { mapId: '40', x: 70, y: 310, width: 75, height: 80 },  // Landes
  { mapId: '64', x: 60, y: 390, width: 70, height: 55 },  // Pyrénées-Atlantiques
];

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
 * @param {Record<string, string>} options.status   Statut par mapId ('non_vue', 'nouvelle'…).
 * @param {string | null} options.selectedMapId
 * @param {(mapId: string) => void} options.onSelect
 * @returns {SVGElement}
 */
export function carteInteractive({ status, selectedMapId, onSelect }) {
  const root = svg('svg', {
    viewBox: `0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`,
    class: 'carte',
    role: 'group',
    'aria-label': 'Carte des départements',
  });

  for (const dep of DEPARTMENTS) {
    const depStatus = status[dep.mapId] ?? 'non_vue';
    const opacity = OPACITY_BY_STATUS[depStatus] ?? 0;
    const isSelected = dep.mapId === selectedMapId;
    const isUnseen = depStatus === 'non_vue';

    // Fond neutre plein quand le département n'a jamais été vu : une opacité
    // nulle sur la couleur d'accent laisserait voir le fond de la page.
    const group = svg('g', {
      class: 'carte-departement',
      role: 'button',
      tabindex: '0',
      'aria-label': `Département ${dep.mapId}`,
    });

    group.appendChild(
      svg('rect', {
        x: dep.x - dep.width / 2,
        y: dep.y - dep.height / 2,
        width: dep.width,
        height: dep.height,
        rx: 10,
        fill: isUnseen ? 'var(--surface)' : 'var(--accent)',
        'fill-opacity': isUnseen ? 1 : opacity,
        stroke: isSelected ? 'var(--accent)' : 'var(--separator)',
        'stroke-width': isSelected ? 3 : 1,
      }),
    );

    group.appendChild(
      svg('text', {
        x: dep.x,
        y: dep.y + 4,
        'font-size': 13,
        'font-weight': '600',
        // Texte blanc dès que le fond est assez foncé, sombre sinon.
        fill: isUnseen ? 'var(--text-muted)' : opacity >= 0.55 ? '#FFFFFF' : 'var(--text)',
        'text-anchor': 'middle',
        text: dep.mapId,
      }),
    );

    group.addEventListener('click', () => onSelect(dep.mapId));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(dep.mapId);
      }
    });

    root.appendChild(group);
  }

  return root;
}
