/**
 * Tests du moteur de répétition espacée.
 *
 * Le moteur est un module JavaScript standard, sans dépendance au navigateur :
 * Node peut donc l'importer et le tester directement, sans outillage.
 *
 *   node --test tests/
 *
 * (Node 18 ou plus récent — le lanceur de tests est intégré.)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { addDays, toISODate } from '../docs/js/engine/date.js';
import { getDueCardIds, getPool, isDue, markSeen, reviewCard } from '../docs/js/engine/srs.js';

test('addDays gère les cas limites du calendrier', () => {
  assert.equal(addDays('2026-08-17', 3), '2026-08-20');
  assert.equal(addDays('2026-08-17', 1), '2026-08-18');
  assert.equal(addDays('2026-08-30', 3), '2026-09-02', 'changement de mois');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01', "changement d'année");
  assert.equal(addDays('2024-02-28', 1), '2024-02-29', 'année bissextile');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01', 'année non bissextile');
  assert.equal(addDays('2026-08-17', -1), '2026-08-16', 'valeur négative');
});

test('toISODate formate avec des zéros de remplissage', () => {
  assert.equal(toISODate(new Date(2026, 0, 5)), '2026-01-05');
});

test('une carte vue en leçon entre dans le suivi et est due tout de suite', () => {
  const progress = markSeen('dep-33-prefecture', '2026-08-17');

  assert.equal(progress.attempts, 0);
  assert.equal(progress.streak, 0);
  assert.equal(progress.nextReviewAt, '2026-08-17');
  assert.equal(getPool(progress), 'nouvelle');
  assert.equal(isDue(progress, '2026-08-17'), true);
});

test('une réussite repousse la carte de 3 jours', () => {
  const seen = markSeen('carte', '2026-08-17');
  const reviewed = reviewCard(seen, true, '2026-08-17');

  assert.equal(reviewed.attempts, 1);
  assert.equal(reviewed.streak, 1);
  assert.equal(reviewed.nextReviewAt, '2026-08-20');
  assert.equal(getPool(reviewed), 'en_cours', 'une seule réussite ne suffit pas pour "connue"');

  assert.equal(isDue(reviewed, '2026-08-19'), false, 'pas due la veille');
  assert.equal(isDue(reviewed, '2026-08-20'), true, 'due le jour dit');
  assert.equal(isDue(reviewed, '2026-08-25'), true, 'toujours due si on revient plus tard');
});

test('deux réussites d\'affilée font passer la carte en "connue"', () => {
  let progress = markSeen('carte', '2026-08-17');
  progress = reviewCard(progress, true, '2026-08-17');
  progress = reviewCard(progress, true, '2026-08-20');

  assert.equal(progress.streak, 2);
  assert.equal(getPool(progress), 'connue');
  assert.equal(progress.nextReviewAt, '2026-08-23');
});

test('un échec ramène la carte dès le lendemain et remet la série à zéro', () => {
  let progress = markSeen('carte', '2026-08-17');
  progress = reviewCard(progress, true, '2026-08-17');
  progress = reviewCard(progress, true, '2026-08-20');
  progress = reviewCard(progress, false, '2026-09-10');

  assert.equal(progress.streak, 0);
  assert.equal(progress.nextReviewAt, '2026-09-11');
  assert.equal(getPool(progress), 'en_cours', 'retombe en cours, jamais en nouvelle');
  assert.equal(progress.attempts, 3);
});

test('reviewCard ne modifie pas la progression reçue', () => {
  const original = markSeen('carte', '2026-08-17');
  const copy = { ...original };

  reviewCard(original, true, '2026-08-17');

  assert.deepEqual(original, copy);
});

test('getDueCardIds ne retient que les cartes dues ce jour-là', () => {
  const cards = [
    markSeen('a', '2026-08-17'),
    reviewCard(markSeen('b', '2026-08-17'), true, '2026-08-17'),
    reviewCard(markSeen('c', '2026-08-17'), false, '2026-08-17'),
  ];

  assert.deepEqual(getDueCardIds(cards, '2026-08-17'), ['a']);
  assert.deepEqual(getDueCardIds(cards, '2026-08-18').sort(), ['a', 'c'], 'la ratée revient demain');
  assert.deepEqual(getDueCardIds(cards, '2026-08-20').sort(), ['a', 'b', 'c'], 'la réussie revient à J+3');
});
