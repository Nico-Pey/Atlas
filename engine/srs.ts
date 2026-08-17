/**
 * Moteur de répétition espacée (SRS).
 *
 * Module PUR : pas d'import React, pas d'accès SQLite, pas de `new Date()`
 * caché dans une fonction (la date "aujourd'hui" est toujours reçue en
 * paramètre). Ça permet de tester chaque règle sans lancer l'app, et de
 * ne jamais avoir deux endroits du code qui appliquent la règle différemment.
 *
 * La règle complète est documentée dans .claude/skills/moteur-srs/ —
 * ce fichier en est l'unique implémentation.
 *
 * Résumé de la règle :
 *  - une carte entre dans le suivi quand elle est vue en leçon (markSeen) ;
 *  - elle n'apparaît au quiz que si sa date de révision (nextReviewAt) est
 *    aujourd'hui ou passée ;
 *  - réussie au quiz → +3 jours avant de revenir ;
 *  - ratée au quiz → revient dès le lendemain (+1 jour) ;
 *  - le pool (nouvelle / en_cours / connue) est un statut d'affichage,
 *    calculé à partir du nombre de tentatives et de la série de réussites
 *    d'affilée (streak) — voir getPool.
 */

import { addDays, type ISODate } from './date';

export type Pool = 'nouvelle' | 'en_cours' | 'connue';

/** Nombre de réussites d'affilée à partir duquel une carte est "connue". */
const CONNUE_STREAK_THRESHOLD = 2;

const INTERVAL_DAYS_ON_SUCCESS = 3;
const INTERVAL_DAYS_ON_FAILURE = 1;

/** État de suivi d'une carte pour un utilisateur donné. */
export interface CardProgress {
  cardId: string;
  /** Date à laquelle la carte a été vue pour la première fois en leçon. */
  seenAt: ISODate;
  /** Nombre total de passages au quiz (réussis + ratés). */
  attempts: number;
  /** Réussites d'affilée les plus récentes ; remise à 0 au premier échec. */
  streak: number;
  /** Prochaine date à laquelle la carte redevient due. */
  nextReviewAt: ISODate;
}

/**
 * Marque une carte comme vue en leçon : elle entre dans le suivi et devient
 * immédiatement due (elle peut apparaître au quiz dès aujourd'hui).
 * Ne fait rien de spécial si la carte était déjà suivie : à l'appelant
 * (storage) de ne pas écraser une progression existante.
 */
export function markSeen(cardId: string, seenAt: ISODate): CardProgress {
  return {
    cardId,
    seenAt,
    attempts: 0,
    streak: 0,
    nextReviewAt: seenAt,
  };
}

/**
 * Applique le résultat d'une révision au quiz et retourne le nouvel état.
 * Ne modifie pas `progress` : renvoie toujours un nouvel objet.
 */
export function reviewCard(
  progress: CardProgress,
  success: boolean,
  reviewedAt: ISODate,
): CardProgress {
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
 * Pool d'affichage d'une carte (pour l'écran Progression) :
 *  - "nouvelle"  : vue en leçon, jamais encore passée au quiz ;
 *  - "en_cours"  : au moins une tentative, mais moins de deux réussites
 *                  d'affilée (inclut une carte qui vient d'être ratée) ;
 *  - "connue"    : au moins deux réussites d'affilée.
 */
export function getPool(progress: CardProgress): Pool {
  if (progress.attempts === 0) return 'nouvelle';
  return progress.streak >= CONNUE_STREAK_THRESHOLD ? 'connue' : 'en_cours';
}

/** Une carte est due si sa prochaine révision est aujourd'hui ou passée. */
export function isDue(progress: CardProgress, on: ISODate): boolean {
  return progress.nextReviewAt <= on;
}

/** Filtre une liste de progressions pour ne garder que les cartes dues. */
export function getDueCardIds(allProgress: CardProgress[], on: ISODate): string[] {
  return allProgress.filter((p) => isDue(p, on)).map((p) => p.cardId);
}
