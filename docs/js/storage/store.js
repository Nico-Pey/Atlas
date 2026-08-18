/**
 * Persistance de la progression.
 *
 * Seul module qui touche au stockage du navigateur. Tout le reste de l'app
 * passe par ces fonctions, jamais par localStorage directement.
 *
 * Choix technique : localStorage plutôt qu'IndexedDB. Les données sont
 * minuscules (une ligne par carte vue) et l'API est synchrone, donc le code
 * appelant reste simple à lire. Si un jour le volume grossit beaucoup, seul ce
 * fichier serait à réécrire.
 *
 * ⚠️ Ces données vivent sur l'appareil, dans le navigateur. Elles survivent
 * aux redémarrages et au mode hors-ligne, mais disparaissent si tu supprimes
 * l'app de l'écran d'accueil ou vides les données de Safari.
 */

import { getDueCardIds, markSeen, reviewCard } from '../engine/srs.js';

/**
 * @typedef {import('../engine/srs.js').CardProgress} CardProgress
 * @typedef {import('../engine/date.js').ISODate} ISODate
 */

/** Le suffixe de version permettra de migrer proprement si le format change. */
const STORAGE_KEY = 'atlas.progress.v1';

/**
 * Lit toute la progression.
 * @returns {Record<string, CardProgress>}
 */
function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Garde-fou : si le contenu est corrompu, on repart d'une base vide
    // plutôt que de faire planter l'app au démarrage.
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Atlas : progression illisible, remise à zéro.', error);
    return {};
  }
}

/** @param {Record<string, CardProgress>} all */
function writeAll(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (error) {
    // Peut arriver si le stockage est plein ou désactivé (navigation privée).
    console.warn("Atlas : impossible d'enregistrer la progression.", error);
  }
}

/** @returns {CardProgress[]} */
export function getAllProgress() {
  return Object.values(readAll());
}

/**
 * @param {string} cardId
 * @returns {CardProgress | null}
 */
export function getProgress(cardId) {
  return readAll()[cardId] ?? null;
}

/**
 * Marque une carte comme vue en leçon : c'est ce qui la fait entrer dans le
 * pool du quiz. Sans effet si elle est déjà suivie — revoir une carte en leçon
 * ne doit jamais remettre sa progression à zéro.
 *
 * @param {string} cardId
 * @param {ISODate} seenAt
 */
export function markCardSeen(cardId, seenAt) {
  const all = readAll();
  if (all[cardId]) return;
  all[cardId] = markSeen(cardId, seenAt);
  writeAll(all);
}

/**
 * Enregistre une réponse au quiz et retourne la nouvelle progression.
 * Retourne null si la carte n'a jamais été vue en leçon (elle n'aurait alors
 * pas pu apparaître au quiz).
 *
 * @param {string} cardId
 * @param {boolean} success
 * @param {ISODate} reviewedAt
 * @returns {CardProgress | null}
 */
export function recordReview(cardId, success, reviewedAt) {
  const all = readAll();
  const existing = all[cardId];
  if (!existing) return null;

  const updated = reviewCard(existing, success, reviewedAt);
  all[cardId] = updated;
  writeAll(all);
  return updated;
}

/**
 * Identifiants des cartes dues ce jour-là, parmi celles vues en leçon.
 * @param {ISODate} on
 * @returns {string[]}
 */
export function getDueCardIdsToday(on) {
  return getDueCardIds(getAllProgress(), on);
}

/** Efface toute la progression. */
export function resetAllProgress() {
  writeAll({});
}
