/**
 * Écran de leçon : carte de la région (zoomée depuis la carte de France) +
 * fiche du département touché.
 *
 * Toucher un département marque immédiatement sa carte comme "vue" : c'est le
 * SEUL endroit de l'app qui fait entrer une carte dans le SRS, et donc dans le
 * pool du quiz (voir .claude/skills/moteur-srs/SKILL.md).
 *
 * Contrairement au Quiz, la leçon montre l'information directement (pas de
 * choix à faire) : ici on apprend, on ne se teste pas. Le test à choix
 * multiples reste dans js/ui/quiz.js, avec le même contenu (question/réponse).
 */

import { findAnecdote } from '../data/anecdotes.js';
import { findLesson } from '../data/themes.js';
import { today } from '../engine/date.js';
import { loadFranceGeo } from '../data/geo.js';
import { getPool } from '../engine/srs.js';
import { getAllProgress, markCardSeen } from '../storage/store.js';
import { carteDepartements, OPACITY_BY_STATUS } from './carte.js';
import { clear, el } from './dom.js';

/**
 * @param {string} lessonId
 * @param {(route: string) => void} navigate
 * @returns {HTMLElement}
 */
export function lessonScreen(lessonId, navigate) {
  const lesson = findLesson(lessonId);

  if (!lesson || !lesson.regionCode) {
    return el('section', { class: 'screen' }, [
      el('p', { class: 'muted', text: 'Leçon introuvable.' }),
    ]);
  }

  /** @type {string | null} */
  let selectedMapId = null;
  /** @type {import('../data/geo.js').FranceGeo | null} */
  let geo = null;

  const mapSlot = el('div', { class: 'carte-slot' }, [
    el('p', { class: 'muted center', text: 'Chargement de la carte…' }),
  ]);
  const detailSlot = el('div', { class: 'detail-slot' });

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
    if (!geo) return;
    clear(mapSlot);
    mapSlot.appendChild(
      carteDepartements({
        geo,
        regionCode: lesson.regionCode,
        status: statusByMapId(),
        selectedMapId,
        onSelect: handleSelect,
      }),
    );
  }

  function renderDetail() {
    clear(detailSlot);

    if (!selectedMapId || !geo) {
      detailSlot.appendChild(
        el('p', {
          class: 'muted center',
          text: "Touchez un département sur la carte pour l'apprendre.",
        }),
      );
      return;
    }

    const depGeo = geo.departements.find((d) => d.code === selectedMapId);
    const card = lesson.cards.find((c) => c.mapId === selectedMapId);
    if (!depGeo || !card || !depGeo.prefecture) return;

    const anecdote = findAnecdote(depGeo.code);

    detailSlot.appendChild(
      el('div', { class: 'departement-detail' }, [
        el('div', { class: 'departement-detail-head' }, [
          blasonSlot(depGeo),
          el('div', { class: 'departement-detail-texts' }, [
            el('p', { class: 'departement-detail-label', text: lesson.title }),
            el('h2', { class: 'departement-detail-title', text: depGeo.nom }),
            el('p', { class: 'departement-detail-prefecture' }, [
              el('span', { class: 'departement-detail-prefecture-name', text: depGeo.prefecture.nom }),
              el('span', { text: ' — préfecture' }),
            ]),
          ]),
        ]),

        // Une phrase pour accrocher la mémoire (voir data/anecdotes.js). En
        // pleine largeur sous l'en-tête plutôt qu'à côté du numéro : une
        // phrase a besoin de place, la colonne de droite est trop étroite
        // sur un téléphone.
        anecdote &&
          el('div', { class: 'departement-anecdote' }, [
            el('p', { class: 'departement-anecdote-label', text: 'À retenir' }),
            el('p', { class: 'departement-anecdote-text', text: anecdote }),
          ]),
      ]),
    );
  }

  /**
   * Le blason du département quand on en a un, sinon son NUMÉRO.
   *
   * Le numéro n'est pas un pis-aller en attendant les blasons : c'est l'une
   * des trois informations que le quiz demande. Il est donc affiché en grand,
   * dans une pastille juste assez large pour lui — un cadre de la taille d'un
   * blason laissait « 40 » flotter au milieu du vide.
   */
  function blasonSlot(depGeo) {
    if (depGeo.prefecture.blason) {
      return el('img', {
        class: 'departement-blason',
        src: depGeo.prefecture.blason,
        alt: `Blason de ${depGeo.nom}`,
      });
    }
    return el('div', { class: 'departement-numero' }, [
      el('span', { class: 'sr-only', text: 'Département numéro ' }),
      el('span', { text: depGeo.code }),
    ]);
  }

  /** @param {string} mapId */
  function handleSelect(mapId) {
    selectedMapId = mapId;
    const card = lesson.cards.find((c) => c.mapId === mapId);
    if (card) markCardSeen(card.id, today());

    renderMap();
    renderDetail();

    // La fiche est sous la carte et la légende : sur un téléphone, elle
    // tombe en partie hors écran, et l'anecdote encore plus bas. `nearest`
    // fait défiler le strict minimum, pour que la carte reste visible et
    // qu'on puisse enchaîner sur un autre département.
    detailSlot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // La fiche est sous la carte, donc souvent hors écran sur un iPhone. On
    // l'amène dans le champ de vision : sinon il faudrait scroller à chaque
    // département touché, ce qui use vite quand on est à moitié réveillé.
    detailSlot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  loadFranceGeo()
    .then((loadedGeo) => {
      geo = loadedGeo;
      renderMap();
      renderDetail();
    })
    .catch((error) => {
      console.warn('Atlas : carte indisponible.', error);
      clear(mapSlot);
      mapSlot.appendChild(
        el('p', { class: 'muted center', text: "La carte n'a pas pu être chargée. Vérifie ta connexion." }),
      );
    });

  renderDetail();

  return el('section', { class: 'screen' }, [
    el('button', {
      class: 'back-button',
      type: 'button',
      text: '‹ France',
      onClick: () => navigate('#/'),
    }),

    el('h1', { class: 'screen-title', text: lesson.title }),
    lesson.subtitle ? el('p', { class: 'muted', text: lesson.subtitle }) : null,

    mapSlot,
    legend(),
    el('p', { class: 'map-credit', text: 'Fond de carte : IGN / INSEE — Licence Ouverte' }),
    detailSlot,
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
