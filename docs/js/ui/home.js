/**
 * Accueil : carte de France, une région = un point d'entrée.
 *
 * Ne connaît aucune leçon en dur : une région est cliquable si une leçon de
 * data/themes.js déclare son `regionCode` (voir .claude/skills/format-contenu/).
 * Les autres sont visibles (pour que la carte ait l'air complète) mais
 * inertes : ajouter une région se fait uniquement en lui donnant du contenu,
 * jamais en touchant cet écran.
 */

import { findLessonByRegionCode, themes } from '../data/themes.js';
import { loadFranceGeo } from '../data/geo.js';
import { carteRegions } from './carte.js';
import { clear, el } from './dom.js';

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
      mapSlot.appendChild(carteRegions({ geo, activeRegionCodes, onSelect: handleSelect }));
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
