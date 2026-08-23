/**
 * Accueil : carte de France, une région = un point d'entrée.
 *
 * Ne connaît aucune leçon en dur : une région est cliquable si une leçon de
 * data/themes.js déclare son `regionCode` (voir .claude/skills/format-contenu/).
 * Les autres sont visibles (pour que la carte ait l'air complète) mais
 * inertes : ajouter une région se fait uniquement en lui donnant du contenu,
 * jamais en touchant cet écran.
 *
 * La carte est aussi une carte d'avancement : une région jamais visitée est
 * grise, et verdit à mesure qu'on apprend ses départements — exactement comme
 * les départements à l'intérieur d'une leçon. C'est recalculé à chaque
 * affichage (app.js reconstruit l'écran à chaque navigation), donc revenir
 * d'une leçon suffit à voir la région changer de teinte.
 */

import { findLessonByRegionCode, themes } from '../data/themes.js';
import { loadFranceGeo } from '../data/geo.js';
import { getPool } from '../engine/srs.js';
import { getAllProgress } from '../storage/store.js';
import { carteRegions, OPACITY_BY_STATUS } from './carte.js';
import { clear, el } from './dom.js';

/**
 * Avancement de chaque région, de 0 (aucune carte vue) à 1 (toutes connues).
 *
 * L'échelle réutilisée est celle des départements (OPACITY_BY_STATUS) : une
 * carte "nouvelle" pèse moins qu'une carte "connue". La carte de France se lit
 * donc comme la carte d'une région, un cran au-dessus.
 *
 * @returns {Record<string, number>}
 */
function progressByRegion() {
  const progressByCardId = new Map(getAllProgress().map((p) => [p.cardId, p]));
  /** @type {Record<string, number>} */
  const byRegion = {};

  for (const lesson of themes.flatMap((theme) => theme.lessons)) {
    if (!lesson.regionCode || lesson.cards.length === 0) continue;

    const acquis = lesson.cards.reduce((sum, card) => {
      const progress = progressByCardId.get(card.id);
      return sum + OPACITY_BY_STATUS[progress ? getPool(progress) : 'non_vue'];
    }, 0);

    byRegion[lesson.regionCode] = acquis / lesson.cards.length;
  }

  return byRegion;
}

/** @param {(route: string) => void} navigate @returns {HTMLElement} */
export function homeScreen(navigate) {
  const activeRegionCodes = new Set(
    themes.flatMap((theme) => theme.lessons).map((lesson) => lesson.regionCode).filter(Boolean),
  );

  const mapSlot = el('div', { class: 'carte-slot' }, [
    el('p', { class: 'muted center', text: 'Chargement de la carte…' }),
  ]);
  const messageSlot = el('p', { class: 'muted center region-message' });

  function handleSelect(regionCode) {
    const lesson = findLessonByRegionCode(regionCode);
    if (lesson) {
      navigate(`#/lesson/${lesson.id}`);
      return;
    }
    messageSlot.textContent = 'Cette région arrive bientôt.';
  }

  loadFranceGeo()
    .then((geo) => {
      clear(mapSlot);
      mapSlot.appendChild(
        carteRegions({
          geo,
          activeRegionCodes,
          progressByRegion: progressByRegion(),
          onSelect: handleSelect,
        }),
      );
    })
    .catch((error) => {
      console.warn('Atlas : carte indisponible.', error);
      clear(mapSlot);
      mapSlot.appendChild(
        el('p', { class: 'muted center', text: "La carte n'a pas pu être chargée. Vérifie ta connexion." }),
      );
    });

  return el('section', { class: 'screen' }, [
    el('h1', { class: 'screen-title', text: 'Atlas' }),
    el('p', { class: 'muted', text: 'Touchez une région pour commencer à apprendre.' }),
    mapSlot,
    messageSlot,
    el('p', { class: 'map-credit', text: 'Fond de carte : IGN / INSEE — Licence Ouverte' }),
  ]);
}
