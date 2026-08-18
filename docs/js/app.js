/**
 * Point d'entrée : routage, barre d'onglets, enregistrement du service worker.
 *
 * Routage par ancre (#/quiz) plutôt que par chemin : ça fonctionne sur
 * n'importe quel hébergement statique, GitHub Pages compris, sans aucune
 * configuration de serveur.
 */

import { clear, el, svg } from './ui/dom.js';
import { homeScreen } from './ui/home.js';
import { lessonScreen } from './ui/lesson.js';
import { progressScreen } from './ui/progress.js';
import { quizScreen } from './ui/quiz.js';

const screenRoot = document.getElementById('screen');
const tabsRoot = document.getElementById('tabs');

const TABS = [
  { route: '#/', label: 'Apprendre', icon: 'globe' },
  { route: '#/quiz', label: 'Quiz', icon: 'cards' },
  { route: '#/progression', label: 'Progression', icon: 'bars' },
];

/**
 * Icônes dessinées en SVG plutôt qu'en emoji : elles prennent la couleur du
 * texte (donc le vert d'Atlas quand l'onglet est actif) et gardent le même
 * rendu sur tous les appareils.
 *
 * @param {'globe' | 'cards' | 'bars'} name
 * @returns {SVGElement}
 */
function icon(name) {
  const common = {
    class: 'tab-icon',
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.8',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };

  if (name === 'globe') {
    return svg('svg', common, [
      svg('circle', { cx: 12, cy: 12, r: 9 }),
      svg('ellipse', { cx: 12, cy: 12, rx: 4, ry: 9 }),
      svg('path', { d: 'M3 12h18' }),
    ]);
  }

  if (name === 'cards') {
    return svg('svg', common, [
      svg('rect', { x: 3, y: 7.5, width: 12.5, height: 12.5, rx: 2.5 }),
      svg('path', { d: 'M8 4h10.5A2.5 2.5 0 0 1 21 6.5V16' }),
    ]);
  }

  return svg('svg', { ...common, fill: 'currentColor', stroke: 'none' }, [
    svg('rect', { x: 4, y: 13, width: 3.5, height: 7, rx: 1 }),
    svg('rect', { x: 10.25, y: 9, width: 3.5, height: 11, rx: 1 }),
    svg('rect', { x: 16.5, y: 4, width: 3.5, height: 16, rx: 1 }),
  ]);
}

/** @param {string} route */
function navigate(route) {
  if (window.location.hash === route) {
    // Même route qu'actuellement : `hashchange` ne se déclenchera pas, on
    // redessine donc à la main (cas de la réinitialisation de progression).
    render();
  } else {
    window.location.hash = route;
  }
}

/** Onglet à surligner : une leçon reste dans l'onglet "Apprendre". */
function activeTabRoute(hash) {
  if (hash.startsWith('#/quiz')) return '#/quiz';
  if (hash.startsWith('#/progression')) return '#/progression';
  return '#/';
}

function renderTabs(hash) {
  const active = activeTabRoute(hash);
  clear(tabsRoot);

  for (const tab of TABS) {
    tabsRoot.appendChild(
      el(
        'button',
        {
          class: tab.route === active ? 'tab tab-active' : 'tab',
          type: 'button',
          'aria-current': tab.route === active ? 'page' : null,
          onClick: () => navigate(tab.route),
        },
        [icon(tab.icon), el('span', { class: 'tab-label', text: tab.label })],
      ),
    );
  }
}

function render() {
  const hash = window.location.hash || '#/';
  clear(screenRoot);

  if (hash.startsWith('#/lesson/')) {
    const lessonId = decodeURIComponent(hash.slice('#/lesson/'.length));
    screenRoot.appendChild(lessonScreen(lessonId, navigate));
  } else if (hash.startsWith('#/quiz')) {
    screenRoot.appendChild(quizScreen());
  } else if (hash.startsWith('#/progression')) {
    screenRoot.appendChild(progressScreen(navigate));
  } else {
    screenRoot.appendChild(homeScreen(navigate));
  }

  renderTabs(hash);
  // Chaque écran repart du haut, comme une vraie app.
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
render();

// Service worker : permet d'ouvrir l'app sans connexion, une fois installée.
// Chemin relatif pour fonctionner aussi bien à la racine d'un domaine que
// dans un sous-dossier (cas de GitHub Pages : /Atlas/).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Atlas : service worker non enregistré.', error);
    });
  });
}
