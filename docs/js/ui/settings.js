/**
 * Écran Réglages : deux actions rares, mais qu'il faut pouvoir faire sans
 * réfléchir.
 *
 * 1. **Savoir quelle version on a, et aller chercher la dernière.**
 *
 *    Une app installée sur l'écran d'accueil est servie par le service worker
 *    (voir sw.js) : tant qu'il n'a pas vu passer une nouvelle version, il
 *    ressert celle qu'il a en cache, y compris avec une connexion parfaite.
 *    C'est le comportement voulu — c'est ce qui permet de réviser dans le
 *    métro — mais ça rend impossible de savoir, à l'œil, si on regarde la
 *    dernière version.
 *
 *    D'où le numéro affiché ici. Il n'est pas écrit en dur : c'est le nom du
 *    cache réellement utilisé sur l'appareil (`atlas-v9`), lu via l'API
 *    `caches`. Impossible qu'il mente ou qu'on oublie de le mettre à jour —
 *    il vient de l'installation elle-même.
 *
 * 2. **Effacer sa progression**, si on veut repartir de zéro.
 *
 * Ces deux actions vivaient ailleurs ou nulle part : la remise à zéro était
 * en bas de l'écran Progression, où elle n'avait rien à faire (on y va pour
 * regarder ses statistiques, pas pour les détruire).
 */

import { resetAllProgress } from '../storage/store.js';
import { clear, el } from './dom.js';

/** Nom des caches créés par sw.js : "atlas-v9" → 9. */
const CACHE_NAME_PATTERN = /^atlas-v(\d+)$/;

/** Temps laissé au navigateur pour installer une version qu'il vient de trouver. */
const UPDATE_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 250;
/** Le temps de lire "Nouvelle version installée" avant que la page se recharge. */
const RELOAD_DELAY_MS = 1200;

/**
 * Version installée sur cet appareil, lue dans le nom du cache du service
 * worker. `null` si l'app n'a pas encore été installée hors-ligne (première
 * visite, ou navigateur qui ne gère pas les service workers).
 *
 * On prend le plus grand numéro trouvé : pendant les quelques secondes d'une
 * mise à jour, l'ancien et le nouveau cache coexistent.
 *
 * @returns {Promise<number | null>}
 */
async function installedVersion() {
  if (!('caches' in window)) return null;

  try {
    const versions = (await caches.keys())
      .map((name) => CACHE_NAME_PATTERN.exec(name))
      .filter((match) => match !== null)
      .map((match) => Number(match[1]));

    return versions.length > 0 ? Math.max(...versions) : null;
  } catch (error) {
    console.warn('Atlas : version installée illisible.', error);
    return null;
  }
}

/** @param {number | null} version */
function versionLabel(version) {
  return version === null ? 'inconnue' : `atlas-v${version}`;
}

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Attend qu'une version plus récente que `before` soit installée.
 *
 * On surveille le cache plutôt que les événements du service worker : c'est
 * l'installation réelle qui nous intéresse, et elle se voit directement à
 * l'apparition d'un nouveau cache. Les événements (`updatefound`,
 * `statechange`) racontent la même histoire, mais leur ordre exact varie d'un
 * navigateur à l'autre.
 *
 * @param {number | null} before
 * @returns {Promise<number | null>} la nouvelle version, ou null si rien n'a bougé.
 */
async function waitForNewVersion(before) {
  const deadline = Date.now() + UPDATE_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const version = await installedVersion();
    if (version !== null && (before === null || version > before)) return version;
    await sleep(POLL_INTERVAL_MS);
  }

  return null;
}

/** @param {(text: string) => void} report @param {() => void} refreshVersion */
async function lookForUpdate(report, refreshVersion) {
  if (!('serviceWorker' in navigator)) {
    report("Ce navigateur ne garde pas Atlas hors-ligne : la page est déjà à jour à chaque ouverture.");
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    report("Atlas n'est pas encore installé hors-ligne. Recharge simplement la page.");
    return;
  }

  if (navigator.onLine === false) {
    report('Pas de connexion : impossible d’aller voir. Réessaie une fois en ligne.');
    return;
  }

  const before = await installedVersion();
  report('Recherche en cours…');

  try {
    // Redemande sw.js au serveur. Le navigateur le compare octet par octet à
    // celui qu'il a déjà : c'est pour ça que CACHE_NAME doit changer à chaque
    // version (voir l'avertissement en tête de sw.js).
    await registration.update();
  } catch (error) {
    console.warn('Atlas : recherche de mise à jour impossible.', error);
    report('La recherche a échoué. Vérifie ta connexion et réessaie.');
    return;
  }

  const found = await waitForNewVersion(before);
  refreshVersion();

  if (found === null) {
    report(
      `Tu as déjà la dernière version publiée (${versionLabel(before)}). ` +
        'Si tu viens de publier une modification, GitHub Pages met une ou deux minutes à la mettre en ligne.',
    );
    return;
  }

  report(`Nouvelle version installée (${versionLabel(found)}). Rechargement…`);
  window.setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
}

/**
 * @param {(route: string) => void} navigate
 * @returns {HTMLElement}
 */
export function settingsScreen(navigate) {
  const versionValue = el('p', { class: 'settings-version', text: '…' });
  // role="status" : VoiceOver annonce le résultat sans qu'on ait à le chercher.
  const message = el('p', { class: 'settings-message', role: 'status' });

  function refreshVersion() {
    installedVersion().then((version) => {
      versionValue.textContent = versionLabel(version);
    });
  }

  refreshVersion();

  const updateButton = el('button', {
    class: 'settings-button',
    type: 'button',
    text: 'Rechercher une mise à jour',
    onClick: () => {
      updateButton.disabled = true;
      lookForUpdate((text) => {
        message.textContent = text;
      }, refreshVersion).finally(() => {
        updateButton.disabled = false;
      });
    },
  });

  return el('section', { class: 'screen' }, [
    el('h1', { class: 'screen-title', text: 'Réglages' }),

    el('div', { class: 'settings-block' }, [
      el('h2', { class: 'settings-title', text: 'Version installée' }),
      versionValue,
      el('p', {
        class: 'muted settings-hint',
        text:
          'Ce numéro change à chaque nouvelle version publiée. S’il ne bouge pas ' +
          'après une mise à jour, c’est que ton iPhone sert encore l’ancienne.',
      }),
      updateButton,
      message,
    ]),

    el('div', { class: 'settings-block' }, [
      el('h2', { class: 'settings-title', text: 'Progression' }),
      el('p', {
        class: 'muted settings-hint',
        text:
          'Efface les cartes vues, les réussites et le quiz du jour. Les leçons ' +
          'et les cartes elles-mêmes ne bougent pas : tout est à réapprendre, rien n’est perdu.',
      }),
      el('button', {
        class: 'reset-button',
        type: 'button',
        text: 'Effacer ma progression',
        onClick: () => {
          // `confirm` est volontairement utilisé ici : action destructrice et
          // rare, une boîte native suffit et on est sûr qu'elle soit vue.
          if (window.confirm('Effacer toute la progression ? Cette action est définitive.')) {
            resetAllProgress();
            navigate('#/reglages');
          }
        },
      }),
    ]),
  ]);
}
