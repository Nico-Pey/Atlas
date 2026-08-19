/**
 * Écran de quiz : la révision du jour, en deux temps par carte.
 *
 * 1. Deviner le département à partir de son seul contour (silhouette, sans
 *    couleur ni contexte) parmi 4 propositions.
 * 2. Une fois le département trouvé, deviner sa préfecture parmi 4
 *    propositions.
 *
 * Ne montre que des cartes déjà vues en leçon ET dues aujourd'hui
 * (storage.getDueCardIdsToday, qui applique la règle du moteur SRS — voir
 * .claude/skills/moteur-srs/). Réussir les DEUX étapes compte comme une
 * réussite pour le SRS (la carte sort du pool pendant 3 jours) ; se tromper
 * sur l'une ou l'autre compte comme un échec (retour dès demain) — inutile de
 * continuer jusqu'à la préfecture si le département n'est pas trouvé.
 *
 * Les 4 propositions viennent d'autres cartes de la MÊME leçon (via
 * data/themes.findLessonByCardId) : pas besoin de connaître une région en
 * dur ici, une future leçon fonctionnera pareil dès qu'elle a au moins
 * 4 cartes.
 */

import { findCard, findLessonByCardId } from '../data/themes.js';
import { today } from '../engine/date.js';
import { loadFranceGeo } from '../data/geo.js';
import { getDueCardIdsToday, recordReview } from '../storage/store.js';
import { silhouette } from './carte.js';
import { clear, el } from './dom.js';

/** Le temps de voir le retour (vert/rouge) avant de passer à la suite. */
const FEEDBACK_DELAY_MS = 1100;

/** @returns {HTMLElement} */
export function quizScreen() {
  const root = el('section', { class: 'screen' }, [
    el('h1', { class: 'screen-title', text: 'Quiz du jour' }),
  ]);
  const slot = el('div');
  root.appendChild(slot);

  /** @type {import('../data/geo.js').FranceGeo | null} */
  let geo = null;
  /** @type {import('../data/themes.js').Card[] | null} */
  let queue = null;
  let reviewedCount = 0;
  /** @type {'departement' | 'prefecture'} */
  let step = 'departement';
  /** Verrouille les boutons pendant l'affichage du retour visuel. */
  let answering = false;

  function renderLoading() {
    clear(slot);
    slot.appendChild(el('p', { class: 'muted', text: 'Chargement…' }));
  }

  function renderEmpty() {
    clear(slot);
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
  }

  function renderRound() {
    const card = queue[0];
    const depGeo = geo.departements.find((d) => d.code === card.mapId);
    const lesson = findLessonByCardId(card.id);
    if (!depGeo || !lesson) {
      // Contenu incohérent (ne devrait pas arriver) : on saute la carte
      // plutôt que de bloquer le quiz sur un écran cassé.
      advance(false);
      return;
    }

    const otherCards = lesson.cards.filter((c) => c.id !== card.id);

    clear(slot);
    slot.appendChild(el('p', { class: 'quiz-progress', text: `${reviewedCount + 1} / ${reviewedCount + queue.length}` }));

    if (step === 'departement') {
      const choices = shuffled([
        depGeo.nom,
        ...pickDistractorNames(otherCards, geo, 3),
      ]);
      slot.appendChild(
        el('div', { class: 'quiz-round' }, [
          el('p', { class: 'quiz-step-label', text: 'Quel est ce département ?' }),
          silhouette(depGeo),
          choiceGrid(choices, depGeo.nom, (success) => {
            if (success) {
              step = 'prefecture';
              renderRound();
            } else {
              advance(false);
            }
          }),
        ]),
      );
      return;
    }

    // step === 'prefecture'
    const choices = shuffled([card.answer, ...pickDistractorAnswers(otherCards, 3)]);
    slot.appendChild(
      el('div', { class: 'quiz-round' }, [
        el('p', { class: 'quiz-step-label' }, [
          el('span', { text: 'Département trouvé : ' }),
          el('strong', { text: depGeo.nom }),
        ]),
        el('p', { class: 'quiz-question', text: 'Quelle est sa préfecture ?' }),
        choiceGrid(choices, card.answer, (success) => advance(success)),
      ]),
    );
  }

  /**
   * Une grille de 4 boutons. Au tap : verrouille les boutons, colore la
   * bonne réponse en vert (et la mauvaise en rouge si ce n'est pas celle
   * choisie), puis prévient l'appelant après un court délai.
   *
   * @param {string[]} choices
   * @param {string} correct
   * @param {(success: boolean) => void} onDone
   */
  function choiceGrid(choices, correct, onDone) {
    const grid = el('div', { class: 'quiz-choices' });
    const buttons = choices.map((choice) =>
      el('button', { class: 'choice-button', type: 'button', text: choice }),
    );

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => {
        if (answering) return;
        answering = true;

        const success = choices[index] === correct;
        buttons.forEach((b, i) => {
          if (choices[i] === correct) b.classList.add('choice-correct');
          else if (i === index) b.classList.add('choice-wrong');
        });

        setTimeout(() => {
          answering = false;
          onDone(success);
        }, FEEDBACK_DELAY_MS);
      });
      grid.appendChild(button);
    });

    return grid;
  }

  /** @param {boolean} success */
  function advance(success) {
    const card = queue[0];
    recordReview(card.id, success, today());
    reviewedCount += 1;
    queue.shift();
    step = 'departement';
    render();
  }

  function render() {
    if (!geo || !queue) {
      renderLoading();
    } else if (queue.length === 0) {
      renderEmpty();
    } else {
      renderRound();
    }
  }

  Promise.all([loadFranceGeo(), Promise.resolve(getDueCardIdsToday(today()))])
    .then(([loadedGeo, dueCardIds]) => {
      geo = loadedGeo;
      queue = dueCardIds.map(findCard).filter((c) => c !== undefined);
      render();
    })
    .catch((error) => {
      console.warn('Atlas : quiz indisponible.', error);
      clear(slot);
      slot.appendChild(
        el('p', { class: 'muted center', text: "Le quiz n'a pas pu être chargé. Vérifie ta connexion." }),
      );
    });

  render();
  return root;
}

/** Copie mélangée d'un tableau (Fisher-Yates) — ne modifie pas l'original. */
function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** @param {number} n */
function sample(items, n) {
  return shuffled(items).slice(0, n);
}

/** Noms de département d'autres cartes, pour servir de propositions plausibles. */
function pickDistractorNames(otherCards, geo, n) {
  return sample(otherCards, n).map((card) => {
    const dep = geo.departements.find((d) => d.code === card.mapId);
    return dep ? dep.nom : card.answer;
  });
}

/** Réponses (préfectures) d'autres cartes, pour servir de propositions plausibles. */
function pickDistractorAnswers(otherCards, n) {
  return sample(otherCards, n).map((card) => card.answer);
}
