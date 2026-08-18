/**
 * Écran de quiz : la révision du jour.
 *
 * Ne montre que des cartes déjà vues en leçon ET dues aujourd'hui. Répondre
 * juste sort la carte du quiz pendant 3 jours, répondre faux la fait revenir
 * dès demain (donc elle ne réapparaît pas dans la session en cours).
 */

import { findCard } from '../data/themes.js';
import { today } from '../engine/date.js';
import { getDueCardIdsToday, recordReview } from '../storage/store.js';
import { clear, el } from './dom.js';
import { flashCard } from './flashcard.js';

/** @returns {HTMLElement} */
export function quizScreen() {
  const root = el('section', { class: 'screen' }, [
    el('h1', { class: 'screen-title', text: 'Quiz du jour' }),
  ]);

  const slot = el('div');
  root.appendChild(slot);

  // La file est calculée une fois à l'ouverture de l'écran : les cartes
  // apprises pendant le quiz n'y sont pas ajoutées en cours de route.
  const queue = getDueCardIdsToday(today())
    .map(findCard)
    .filter((card) => card !== undefined);

  let reviewedCount = 0;

  function render() {
    clear(slot);

    const card = queue[0];

    if (!card) {
      slot.appendChild(
        el('div', { class: 'empty-state' }, [
          el('h2', {
            class: 'empty-title',
            text: reviewedCount === 0 ? "Rien à réviser pour l'instant." : "Terminé pour aujourd'hui.",
          }),
          el('p', {
            class: 'muted',
            text:
              reviewedCount === 0
                ? "Apprenez de nouvelles cartes dans l'onglet Apprendre, ou revenez demain."
                : `${reviewedCount} carte${reviewedCount > 1 ? 's' : ''} révisée${reviewedCount > 1 ? 's' : ''}. À demain.`,
          }),
        ]),
      );
      return;
    }

    slot.appendChild(
      el('p', {
        class: 'quiz-progress',
        text: `${reviewedCount + 1} / ${reviewedCount + queue.length}`,
      }),
    );

    slot.appendChild(
      flashCard({
        question: card.question,
        answer: card.answer,
        onAnswer: (success) => {
          recordReview(card.id, success, today());
          reviewedCount += 1;
          queue.shift();
          render();
        },
      }),
    );
  }

  render();
  return root;
}
