/**
 * Accès SQLite (expo-sqlite). Seul fichier du projet qui écrit du SQL.
 *
 * Ce module fait le pont entre `CardProgress` (le type du moteur SRS pur,
 * `engine/srs.ts`) et une table SQLite. Les écrans n'appellent jamais
 * `engine/srs.ts` directement pour la progression : ils passent par les
 * fonctions ci-dessous, qui appliquent la règle SRS puis persistent le
 * résultat. Ça garantit qu'il n'existe qu'un seul chemin possible pour
 * modifier la progression d'une carte.
 */

import * as SQLite from 'expo-sqlite';

import { getDueCardIds, markSeen, reviewCard, type CardProgress } from '../engine/srs';
import type { ISODate } from '../engine/date';

const DATABASE_NAME = 'atlas.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Ouvre (ou réutilise) la connexion à la base et crée la table si besoin. */
function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS card_progress (
          card_id TEXT PRIMARY KEY NOT NULL,
          seen_at TEXT NOT NULL,
          attempts INTEGER NOT NULL,
          streak INTEGER NOT NULL,
          next_review_at TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

/** Convertit une ligne SQLite brute vers le type utilisé par le moteur SRS. */
interface CardProgressRow {
  card_id: string;
  seen_at: string;
  attempts: number;
  streak: number;
  next_review_at: string;
}

function fromRow(row: CardProgressRow): CardProgress {
  return {
    cardId: row.card_id,
    seenAt: row.seen_at,
    attempts: row.attempts,
    streak: row.streak,
    nextReviewAt: row.next_review_at,
  };
}

async function save(progress: CardProgress): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO card_progress (card_id, seen_at, attempts, streak, next_review_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(card_id) DO UPDATE SET
       attempts = excluded.attempts,
       streak = excluded.streak,
       next_review_at = excluded.next_review_at;`,
    [progress.cardId, progress.seenAt, progress.attempts, progress.streak, progress.nextReviewAt],
  );
}

/** Progression d'une seule carte, ou `null` si elle n'a jamais été vue. */
export async function getProgress(cardId: string): Promise<CardProgress | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CardProgressRow>(
    'SELECT * FROM card_progress WHERE card_id = ?;',
    [cardId],
  );
  return row ? fromRow(row) : null;
}

/** Toute la progression suivie (une entrée par carte déjà vue en leçon). */
export async function getAllProgress(): Promise<CardProgress[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CardProgressRow>('SELECT * FROM card_progress;');
  return rows.map(fromRow);
}

/**
 * Marque une carte comme vue en leçon.
 * Ne fait rien si elle est déjà suivie : voir une carte une deuxième fois
 * en leçon ne doit jamais remettre sa progression à zéro.
 */
export async function markCardSeen(cardId: string, seenAt: ISODate): Promise<void> {
  const existing = await getProgress(cardId);
  if (existing) return;
  await save(markSeen(cardId, seenAt));
}

/**
 * Enregistre le résultat d'une révision au quiz et retourne la nouvelle
 * progression. La carte doit déjà avoir été vue en leçon (donc déjà
 * suivie) — sinon elle n'aurait pas pu apparaître au quiz.
 */
export async function recordReview(
  cardId: string,
  success: boolean,
  reviewedAt: ISODate,
): Promise<CardProgress> {
  const existing = await getProgress(cardId);
  if (!existing) {
    throw new Error(`recordReview: carte "${cardId}" jamais vue en leçon.`);
  }
  const updated = reviewCard(existing, success, reviewedAt);
  await save(updated);
  return updated;
}

/** Ids des cartes dues aujourd'hui, parmi celles déjà vues en leçon. */
export async function getDueCardIdsToday(on: ISODate): Promise<string[]> {
  const allProgress = await getAllProgress();
  return getDueCardIds(allProgress, on);
}

/**
 * Réinitialise toute la progression. Réservé aux outils de développement
 * (pas exposé dans l'UI en V1) : utile pour rejouer le pool "nouvelle"
 * pendant les tests manuels.
 */
export async function resetAllProgress(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync('DELETE FROM card_progress;');
}
