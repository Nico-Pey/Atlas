/**
 * Écran de progression : où j'en suis, leçon par leçon.
 *
 * Comme les autres écrans, ne connaît aucune leçon en dur.
 */

import { themes } from '../data/themes.js';
import { getPool } from '../engine/srs.js';
import { getAllProgress, resetAllProgress } from '../storage/store.js';
import { el } from './dom.js';

const ROWS = [
  { key: 'connue', label: 'Connues' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'nouvelle', label: 'Nouvelles' },
  { key: 'non_vue', label: 'Pas encore vues' },
];

/** @param {(route: string) => void} navigate @returns {HTMLElement} */
export function progressScreen(navigate) {
  const progressByCardId = new Map(getAllProgress().map((p) => [p.cardId, p]));

  const lessonBlocks = themes.flatMap((theme) =>
    theme.lessons.map((lesson) => {
      const counts = { non_vue: 0, nouvelle: 0, en_cours: 0, connue: 0 };

      for (const card of lesson.cards) {
        const progress = progressByCardId.get(card.id);
        const status = progress ? getPool(progress) : 'non_vue';
        counts[status] += 1;
      }

      return el('div', { class: 'stats-block' }, [
        el('h2', { class: 'stats-title', text: lesson.title }),
        el('p', { class: 'stats-total', text: `${lesson.cards.length} cartes au total` }),

        ...ROWS.map((row) =>
          el('div', { class: 'stats-row' }, [
            el('span', { class: 'muted', text: row.label }),
            el('span', { class: 'stats-value', text: String(counts[row.key]) }),
          ]),
        ),
      ]);
    }),
  );

  return el('section', { class: 'screen' }, [
    el('h1', { class: 'screen-title', text: 'Progression' }),
    ...lessonBlocks,

    el('button', {
      class: 'reset-button',
      type: 'button',
      text: 'Réinitialiser ma progression',
      onClick: () => {
        // `confirm` est volontairement utilisé ici : c'est une action
        // destructrice et rare, une boîte native suffit.
        if (window.confirm('Effacer toute la progression ? Cette action est définitive.')) {
          resetAllProgress();
          navigate('#/progression');
        }
      },
    }),
  ]);
}
