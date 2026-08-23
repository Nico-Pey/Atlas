/**
 * Moteur de répétition espacée (SRS).
 *
 * Module PUR : aucun accès au DOM, au stockage, ni à l'horloge (la date du
 * jour est toujours reçue en paramètre). C'est ce qui permet de le tester
 * seul — voir docs/js/engine/srs.test.js.
 *
 * Règle identique aux autres versions du projet
 * (voir .claude/skills/moteur-srs/SKILL.md, qui fait référence) :
 *  - une carte entre dans le suivi quand elle est vue en leçon ;
 *  - réussie au quiz → elle ressort du pool pendant 3 jours ;
 *  - ratée → elle revient dès le lendemain.
 */

import { addDays } from './date.js';

/**
 * @typedef {import('./date.js').ISODate} ISODate
 *
 * @typedef {'nouvelle' | 'en_cours' | 'connue'} Pool
 *
 * @typedef {object} CardProgress
 * @property {string} cardId
 * @property {ISODate} seenAt        Première vue en leçon.
 * @property {number} attempts       Passages au quiz (réussis + ratés).
 * @property {number} streak         Réussites d'affilée ; remis à 0 au premier échec.
 * @property {ISODate} nextReviewAt  Prochaine date où la carte redevient due.
 */

/** Réussites d'affilée à partir desquelles une carte est "connue". */
const CONNUE_STREAK_THRESHOLD = 2;

const INTERVAL_DAYS_ON_SUCCESS = 3;
const INTERVAL_DAYS_ON_FAILURE = 1;

/**
 * Fait entrer une carte dans le suivi. Elle devient due immédiatement : elle
 * peut donc tomber au quiz le jour même où elle a été apprise.
 *
 * @param {string} cardId
 * @param {ISODate} seenAt
 * @returns {CardProgress}
 */
export function markSeen(cardId, seenAt) {
  return {
    cardId,
    seenAt,
    attempts: 0,
    streak: 0,
    nextReviewAt: seenAt,
  };
}

/**
 * Applique le résultat d'une révision et retourne le nouvel état.
 * Ne modifie jamais l'objet reçu.
 *
 * @param {CardProgress} progress
 * @param {boolean} success
 * @param {ISODate} reviewedAt
 * @returns {CardProgress}
 */
export function reviewCard(progress, success, reviewedAt) {
  const streak = success ? progress.streak + 1 : 0;
  const intervalDays = success ? INTERVAL_DAYS_ON_SUCCESS : INTERVAL_DAYS_ON_FAILURE;

  return {
    ...progress,
    attempts: progress.attempts + 1,
    streak,
    nextReviewAt: addDays(reviewedAt, intervalDays),
  };
}

/**
 * Pool d'affichage. N'est pas stocké : se recalcule à partir du nombre de
 * tentatives et de la série de réussites.
 *
 * @param {CardProgress} progress
 * @returns {Pool}
 */
export function getPool(progress) {
  if (progress.attempts === 0) return 'nouvelle';
  return progress.streak >= CONNUE_STREAK_THRESHOLD ? 'connue' : 'en_cours';
}

/**
 * Une carte est due si sa prochaine révision est aujourd'hui ou passée.
 *
 * @param {CardProgress} progress
 * @param {ISODate} on
 * @returns {boolean}
 */
export function isDue(progress, on) {
  return progress.nextReviewAt <= on;
}

/**
 * @param {CardProgress[]} allProgress
 * @param {ISODate} on
 * @returns {string[]}
 */
export function getDueCardIds(allProgress, on) {
  return allProgress.filter((p) => isDue(p, on)).map((p) => p.cardId);
}

/**
 * Nombre maximum de cartes proposées au quiz dans une même journée.
 * Une session courte et bornée vaut mieux qu'une liste qui s'allonge sans
 * fin : c'est ce qui rend l'app tenable tous les matins.
 */
export const DAILY_CARD_LIMIT = 10;

/**
 * Sélectionne les cartes du jour parmi celles qui sont dues.
 *
 * Volontairement **déterministe** (aucun hasard) : même entrée, même sortie.
 * C'est ce qui permet de recalculer la même sélection à l'identique, et donc
 * de refaire le quiz plusieurs fois dans la journée avec les mêmes cartes.
 *
 * Priorité aux cartes les plus en retard (`nextReviewAt` le plus ancien),
 * pour qu'une carte due depuis longtemps ne reste pas indéfiniment derrière
 * des cartes tout juste dues. À date égale, l'ordre des identifiants
 * départage — arbitraire mais stable.
 *
 * @param {CardProgress[]} allProgress
 * @param {ISODate} on
 * @param {number} [limit]
 * @returns {string[]}
 */
export function selectDailyCardIds(allProgress, on, limit = DAILY_CARD_LIMIT) {
  return allProgress
    .filter((p) => isDue(p, on))
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt) || a.cardId.localeCompare(b.cardId))
    .slice(0, limit)
    .map((p) => p.cardId);
}
