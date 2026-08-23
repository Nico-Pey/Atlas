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

import { DAILY_CARD_LIMIT, getDueCardIds, markSeen, reviewCard, selectDailyCardIds } from '../engine/srs.js';

/**
 * @typedef {import('../engine/srs.js').CardProgress} CardProgress
 * @typedef {import('../engine/date.js').ISODate} ISODate
 */

/** Le suffixe de version permettra de migrer proprement si le format change. */
const STORAGE_KEY = 'atlas.progress.v1';

/** Sélection du quiz du jour — voir getDailySelection. */
const DAILY_KEY = 'atlas.daily.v1';

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
  writeDaily(null);
}

// ---------------------------------------------------------------------------
// Sélection du quiz du jour
// ---------------------------------------------------------------------------

/**
 * @typedef {object} DailySelection
 * @property {ISODate} date
 * @property {string[]} cardIds        Les (au plus) 10 cartes du jour.
 * @property {string[]} reviewedCardIds  Celles déjà comptées pour le SRS aujourd'hui.
 */

/** @returns {DailySelection | null} */
function readDaily() {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.date !== 'string' || !Array.isArray(parsed.cardIds)) return null;
    return {
      date: parsed.date,
      cardIds: parsed.cardIds,
      reviewedCardIds: Array.isArray(parsed.reviewedCardIds) ? parsed.reviewedCardIds : [],
    };
  } catch (error) {
    console.warn('Atlas : sélection du jour illisible, elle sera recalculée.', error);
    return null;
  }
}

/** @param {DailySelection | null} daily */
function writeDaily(daily) {
  try {
    if (daily === null) localStorage.removeItem(DAILY_KEY);
    else localStorage.setItem(DAILY_KEY, JSON.stringify(daily));
  } catch (error) {
    console.warn("Atlas : impossible d'enregistrer la sélection du jour.", error);
  }
}

/**
 * Les cartes du quiz d'aujourd'hui — au plus DAILY_CARD_LIMIT.
 *
 * La sélection est **figée pour la journée** : refaire le quiz une deuxième
 * fois dans la même journée redonne exactement les mêmes cartes (c'est le but
 * — s'entraîner sur un lot stable), et elle se renouvelle le lendemain.
 *
 * Une exception volontaire : si le lot du jour n'est pas plein et que de
 * nouvelles cartes sont devenues dues depuis (typiquement des cartes tout
 * juste apprises en leçon, dues immédiatement d'après la règle SRS), on
 * complète le lot. Les cartes déjà sélectionnées, elles, ne changent jamais.
 *
 * @param {ISODate} today
 * @returns {string[]}
 */
export function getDailyCardIds(today) {
  const stored = readDaily();
  const eligible = selectDailyCardIds(getAllProgress(), today);

  if (!stored || stored.date !== today) {
    const fresh = { date: today, cardIds: eligible, reviewedCardIds: [] };
    writeDaily(fresh);
    return fresh.cardIds;
  }

  // Le lot du jour existe déjà : on le garde tel quel, en le complétant
  // seulement s'il reste de la place.
  if (stored.cardIds.length >= DAILY_CARD_LIMIT) return stored.cardIds;

  const additions = eligible.filter((id) => !stored.cardIds.includes(id));
  if (additions.length === 0) return stored.cardIds;

  const cardIds = [...stored.cardIds, ...additions].slice(0, DAILY_CARD_LIMIT);
  writeDaily({ ...stored, cardIds });
  return cardIds;
}

/**
 * Enregistre une réponse au quiz, **une seule fois par carte et par jour**.
 *
 * Refaire le quiz dans la journée est un entraînement libre : ça n'avance ni
 * ne recule la progression SRS, sinon on pourrait relancer le quiz jusqu'à
 * tomber juste et s'auto-décerner un "connue" qui ne veut plus rien dire.
 * Seule la première réponse de la journée compte.
 *
 * @param {string} cardId
 * @param {boolean} success
 * @param {ISODate} today
 * @returns {{ counted: boolean, progress: CardProgress | null }}
 */
export function recordDailyReview(cardId, success, today) {
  const stored = readDaily();
  const alreadyCounted = stored !== null && stored.date === today && stored.reviewedCardIds.includes(cardId);
  if (alreadyCounted) return { counted: false, progress: getProgress(cardId) };

  const progress = recordReview(cardId, success, today);
  if (progress === null) return { counted: false, progress: null };

  const base = stored !== null && stored.date === today ? stored : { date: today, cardIds: [], reviewedCardIds: [] };
  writeDaily({ ...base, reviewedCardIds: [...base.reviewedCardIds, cardId] });
  return { counted: true, progress };
}

/**
 * Cartes du jour déjà comptées pour le SRS — sert à afficher "entraînement"
 * plutôt que de laisser croire que la progression avance encore.
 * @param {ISODate} today
 * @returns {string[]}
 */
export function getReviewedTodayCardIds(today) {
  const stored = readDaily();
  return stored !== null && stored.date === today ? stored.reviewedCardIds : [];
}
