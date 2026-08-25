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
import { defiScreen } from './ui/defi.js';
import { quizScreen } from './ui/quiz.js';
import { settingsScreen } from './ui/settings.js';

const screenRoot = document.getElementById('screen');
const tabsRoot = document.getElementById('tabs');

const TABS = [
  { route: '#/', label: 'Apprendre', icon: 'globe' },
  { route: '#/quiz', label: 'Quiz', icon: 'cards' },
  { route: '#/defi', label: 'Défi', icon: 'cible' },
  { route: '#/reglages', label: 'Réglages', icon: 'sliders' },
];

/**
 * Icônes dessinées en SVG plutôt qu'en emoji : elles prennent la couleur du
 * texte (donc le vert d'Atlas quand l'onglet est actif) et gardent le même
 * rendu sur tous les appareils.
 *
 * @param {'globe' | 'cards' | 'cible' | 'sliders'} name
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

  if (name === 'cible') {
    // Une cible : trois cercles concentriques, lisibles à 24 px.
    return svg('svg', common, [
      svg('circle', { cx: 12, cy: 12, r: 8.5 }),
      svg('circle', { cx: 12, cy: 12, r: 4.5 }),
      svg('circle', { cx: 12, cy: 12, r: 1.2, fill: 'currentColor' }),
    ]);
  }

  // Des curseurs plutôt qu'une roue crantée pour les Réglages : la roue
  // demande une dizaine de dents, donc un tracé long et illisible dans le
  // code, pour un dessin qui se brouille à 24 px.
  // Dernier cas : les curseurs des Réglages.
  return svg('svg', common, [
    svg('path', { d: 'M4 8.5h9' }),
    svg('circle', { cx: 16, cy: 8.5, r: 2.2 }),
    svg('path', { d: 'M19 8.5h1' }),
    svg('path', { d: 'M4 15.5h1' }),
    svg('circle', { cx: 8, cy: 15.5, r: 2.2 }),
    svg('path', { d: 'M11 15.5h9' }),
  ]);
}

/** @param {string} route */
function navigate(route) {
  if (window.location.hash === route) {
    // Même route qu'actuellement : `hashchange` ne se déclenchera pas, on
    // redessine donc à la main (cas de la remise à zéro dans Réglages).
    render();
  } else {
    window.location.hash = route;
  }
}

/** Onglet à surligner : une leçon reste dans l'onglet "Apprendre". */
function activeTabRoute(hash) {
  if (hash.startsWith('#/quiz')) return '#/quiz';
  if (hash.startsWith('#/defi')) return '#/defi';
  if (hash.startsWith('#/reglages')) return '#/reglages';
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
  } else if (hash.startsWith('#/defi')) {
    screenRoot.appendChild(defiScreen());
  } else if (hash.startsWith('#/reglages')) {
    screenRoot.appendChild(settingsScreen(navigate));
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
