/**
 * Écran d'accueil : liste des thèmes et de leurs leçons.
 *
 * Ne connaît aucune région en dur — tout vient de data/themes.js, pour
 * qu'ajouter une leçon n'oblige jamais à toucher cet écran.
 */

import { themes } from '../data/themes.js';
import { el } from './dom.js';

/** @param {(route: string) => void} navigate @returns {HTMLElement} */
export function homeScreen(navigate) {
  return el('section', { class: 'screen' }, [
    el('h1', { class: 'screen-title', text: 'Atlas' }),

    ...themes.map((theme) =>
      el('div', { class: 'theme-block' }, [
        el('h2', { class: 'theme-title', text: theme.title }),
        theme.description ? el('p', { class: 'theme-description', text: theme.description }) : null,

        ...theme.lessons.map((lesson) =>
          el(
            'button',
            {
              class: 'lesson-card',
              type: 'button',
              onClick: () => navigate(`#/lesson/${lesson.id}`),
            },
            [
              el('span', { class: 'lesson-card-texts' }, [
                el('span', { class: 'lesson-title', text: lesson.title }),
                lesson.subtitle ? el('span', { class: 'lesson-subtitle', text: lesson.subtitle }) : null,
              ]),
              el('span', { class: 'chevron', 'aria-hidden': 'true', text: '›' }),
            ],
          ),
        ),
      ]),
    ),
  ]);
}
