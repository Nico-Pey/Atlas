/**
 * Utilitaires de date, isolés du reste du moteur.
 *
 * On ne manipule que des chaînes "YYYY-MM-DD" (jamais d'heure). Deux raisons :
 *  - le SRS raisonne en jours : "demain" doit vouloir dire la même chose qu'on
 *    révise à 7h ou à 23h ;
 *  - deux chaînes "YYYY-MM-DD" se comparent directement avec < et <=
 *    (ordre alphabétique = ordre chronologique), donc aucun piège de fuseau
 *    horaire.
 *
 * @typedef {string} ISODate  Date au format "YYYY-MM-DD".
 */

/**
 * Date du jour dans le fuseau horaire de l'appareil.
 * @param {Date} [now] Injectable pour les tests.
 * @returns {ISODate}
 */
export function today(now = new Date()) {
  return toISODate(now);
}

/**
 * @param {Date} date
 * @returns {ISODate}
 */
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Ajoute `days` jours (valeur négative acceptée) à une date "YYYY-MM-DD".
 *
 * Le calcul se fait à midi UTC : ça évite de retomber sur le jour précédent ou
 * suivant lors d'un changement d'heure.
 *
 * @param {ISODate} date
 * @param {number} days
 * @returns {ISODate}
 */
export function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d, 12));
  next.setUTCDate(next.getUTCDate() + days);

  const y2 = next.getUTCFullYear();
  const m2 = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d2 = String(next.getUTCDate()).padStart(2, '0');
  return `${y2}-${m2}-${d2}`;
}
