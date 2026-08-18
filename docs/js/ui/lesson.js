/**
 * Écran de leçon : carte interactive + flashcard d'une région.
 *
 * Toucher un département marque immédiatement sa carte comme "vue" : c'est le
 * SEUL endroit de l'app qui fait entrer une carte dans le SRS, et donc dans le
 * pool du quiz (voir .claude/skills/moteur-srs/SKILL.md).
 */

import { findLesson } from '../data/themes.js';
import { today } from '../engine/date.js';
import { getPool } from '../engine/srs.js';
import { getAllProgress, markCardSeen } from '../storage/store.js';
import { carteInteractive, OPACITY_BY_STATUS } from './carte.js';
import { clear, el } from './dom.js';
import { flashCard } from './flashcard.js';

/**
 * @param {string} lessonId
 * @param {(route: string) => void} navigate
 * @returns {HTMLElement}
 */
export function lessonScreen(lessonId, navigate) {
  const lesson = findLesson(lessonId);

  if (!lesson) {
    return el('section', { class: 'screen' }, [
      el('p', { class: 'muted', text: 'Leçon introuvable.' }),
    ]);
  }

  /** @type {string | null} */
  let selectedMapId = null;

  const mapSlot = el('div', { class: 'carte-slot' });
  const cardSlot = el('div', { class: 'flashcard-slot' });

  function statusByMapId() {
    const progressByCardId = new Map(getAllProgress().map((p) => [p.cardId, p]));
    /** @type {Record<string, string>} */
    const status = {};
    for (const card of lesson.cards) {
      if (!card.mapId) continue;
      const progress = progressByCardId.get(card.id);
      status[card.mapId] = progress ? getPool(progress) : 'non_vue';
    }
    return status;
  }

  function renderMap() {
    clear(mapSlot);
    mapSlot.appendChild(
      carteInteractive({
        status: statusByMapId(),
        selectedMapId,
        onSelect: handleSelect,
      }),
    );
  }

  function renderCard() {
    clear(cardSlot);
    const card = lesson.cards.find((c) => c.mapId === selectedMapId);

    if (!card) {
      cardSlot.appendChild(
        el('p', {
          class: 'muted center',
          text: "Touchez un département sur la carte pour l'apprendre.",
        }),
      );
      return;
    }

    cardSlot.appendChild(
      flashCard({ question: card.question, answer: card.answer, label: lesson.title }),
    );
  }

  /** @param {string} mapId */
  function handleSelect(mapId) {
    selectedMapId = mapId;
    const card = lesson.cards.find((c) => c.mapId === mapId);
    if (card) markCardSeen(card.id, today());

    renderMap();
    renderCard();

    // La flashcard est sous la carte, donc souvent hors écran sur un iPhone.
    // On l'amène dans le champ de vision : sinon il faudrait scroller à chaque
    // département touché, ce qui use vite quand on est à moitié réveillé.
    cardSlot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  renderMap();
  renderCard();

  return el('section', { class: 'screen' }, [
    el('button', {
      class: 'back-button',
      type: 'button',
      text: '‹ Thèmes',
      onClick: () => navigate('#/'),
    }),

    el('h1', { class: 'screen-title', text: lesson.title }),
    lesson.subtitle ? el('p', { class: 'muted', text: lesson.subtitle }) : null,

    mapSlot,
    legend(),
    cardSlot,
  ]);
}

/** Sans légende, l'opacité des départements ne veut rien dire. */
function legend() {
  const items = [
    { label: 'Non vue', status: 'non_vue' },
    { label: 'Nouvelle', status: 'nouvelle' },
    { label: 'En cours', status: 'en_cours' },
    { label: 'Connue', status: 'connue' },
  ];

  return el(
    'div',
    { class: 'legend' },
    items.map((item) =>
      el('span', { class: 'legend-item' }, [
        el('span', {
          class: 'legend-dot',
          style:
            item.status === 'non_vue'
              ? 'background: var(--surface); opacity: 1;'
              : `background: var(--accent); opacity: ${OPACITY_BY_STATUS[item.status]};`,
        }),
        el('span', { text: item.label }),
      ]),
    ),
  );
}
