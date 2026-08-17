/**
 * Petits utilitaires de date, isolés du reste du moteur.
 *
 * On travaille uniquement avec des chaînes "YYYY-MM-DD" (jamais d'heure).
 * Deux raisons :
 *  - le SRS raisonne en jours, pas en heures : "demain" doit vouloir dire
 *    la même chose qu'on révise à 7h ou à 23h ;
 *  - comparer des dates "YYYY-MM-DD" avec les opérateurs < <= > >= marche
 *    directement, sans bug de fuseau horaire lié à l'objet Date.
 */

export type ISODate = string;

/** Date du jour, au format "YYYY-MM-DD", dans le fuseau horaire de l'appareil. */
export function today(): ISODate {
  return toISODate(new Date());
}

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Ajoute `days` jours (peut être négatif) à une date "YYYY-MM-DD". */
export function addDays(date: ISODate, days: number): ISODate {
  const [y, m, d] = date.split('-').map(Number);
  // On construit la date à midi UTC pour ne jamais retomber sur le jour
  // précédent/suivant à cause d'un changement d'heure (DST).
  const next = new Date(Date.UTC(y, m - 1, d, 12));
  next.setUTCDate(next.getUTCDate() + days);
  const y2 = next.getUTCFullYear();
  const m2 = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d2 = String(next.getUTCDate()).padStart(2, '0');
  return `${y2}-${m2}-${d2}`;
}
