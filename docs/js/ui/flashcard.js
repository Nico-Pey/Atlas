/**
 * Carte question/réponse qui se retourne au tap.
 *
 * Ne connaît rien du SRS ni du stockage : l'écran appelant (leçon ou quiz)
 * décide quoi faire du résultat.
 */

import { el } from './dom.js';

/**
 * @param {object} options
 * @param {string} options.question
 * @param {string} options.answer
 * @param {string} [options.label]                 Petit texte au-dessus (ex : la région).
 * @param {(success: boolean) => void} [options.onAnswer]
 *        Si fourni, affiche "Je savais / Je ne savais pas" une fois la carte
 *        retournée (contexte quiz). Sinon la carte se contente de se retourner.
 * @returns {HTMLElement}
 */
export function flashCard({ question, answer, label, onAnswer }) {
  let revealed = false;

  const answerLine = el('p', { class: 'flashcard-answer', text: answer });
  const hint = el('p', { class: 'flashcard-hint', text: 'Touchez pour voir la réponse' });
  const separator = el('div', { class: 'flashcard-separator' });

  const face = el(
    'button',
    {
      class: 'flashcard-face',
      type: 'button',
      'aria-expanded': 'false',
    },
    [
      label ? el('p', { class: 'flashcard-label', text: label }) : null,
      el('p', { class: 'flashcard-question', text: question }),
      separator,
      answerLine,
      hint,
    ],
  );

  const actions = el('div', { class: 'flashcard-actions' }, [
    el('button', {
      class: 'button button-failure',
      type: 'button',
      text: 'Je ne savais pas',
      onClick: () => onAnswer && onAnswer(false),
    }),
    el('button', {
      class: 'button button-success',
      type: 'button',
      text: 'Je savais',
      onClick: () => onAnswer && onAnswer(true),
    }),
  ]);

  const root = el('div', { class: 'flashcard' }, [face, onAnswer ? actions : null]);

  function render() {
    face.setAttribute('aria-expanded', String(revealed));
    separator.hidden = !revealed;
    answerLine.hidden = !revealed;
    hint.hidden = revealed;
    if (onAnswer) actions.hidden = !revealed;
  }

  face.addEventListener('click', () => {
    revealed = !revealed;
    render();
  });

  render();
  return root;
}
