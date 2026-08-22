/**
 * Génère docs/js/data/themes.js à partir de docs/js/data/geo/france.json.
 *
 * Le contenu "Départements → préfecture" est entièrement mécanique (une
 * question identique pour les 96 : "Quelle est la préfecture de X ?"), donc
 * dérivé des données officielles plutôt que retapé à la main — 96 entrées
 * copiées manuellement, c'est 96 occasions de faire une faute de frappe dans
 * un id qui doit rester stable à vie (voir .claude/skills/format-contenu/).
 *
 * Le fichier généré reste du JS lisible, pas un blob JSON : quelqu'un peut
 * l'ouvrir et comprendre le contenu sans repasser par ce script. Mais toute
 * modification manuelle sera écrasée au prochain lancement — pour un contenu
 * qui ne suit pas ce modèle mécanique (un futur thème avec des questions
 * rédigées à la main, par exemple), ajouter un Theme séparé plutôt que de
 * modifier celui-ci.
 *
 * Utilisation (après avoir régénéré la géométrie) :
 *   node tools/build-geo.mjs
 *   node tools/build-content.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GEO_FILE = join(HERE, '..', 'docs', 'js', 'data', 'geo', 'france.json');
const OUT_FILE = join(HERE, '..', 'docs', 'js', 'data', 'themes.js');

/** Ordre d'affichage des leçons : du nombre de départements le plus élevé au plus faible. */
function sortLessons(a, b) {
  return b.cards.length - a.cards.length || a.title.localeCompare(b.title, 'fr');
}

function jsString(value) {
  return JSON.stringify(value);
}

function main() {
  const geo = JSON.parse(readFileSync(GEO_FILE, 'utf8'));

  const departementsByRegion = new Map();
  for (const dep of geo.departements) {
    if (!departementsByRegion.has(dep.regionCode)) departementsByRegion.set(dep.regionCode, []);
    departementsByRegion.get(dep.regionCode).push(dep);
  }

  const lessons = geo.regions
    .filter((region) => departementsByRegion.has(region.code))
    .map((region) => {
      const deps = [...departementsByRegion.get(region.code)].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
      return {
        id: slugify(region.nom),
        title: region.nom,
        subtitle: `${deps.length} département${deps.length > 1 ? 's' : ''}`,
        regionCode: region.code,
        cards: deps.map((dep) => ({
          id: `dep-${dep.code}-prefecture`,
          // "du département « X »" plutôt que "de la/du/des X" : le français
          // exige un accord de genre et de nombre sur les noms de
          // départements qui a de vraies exceptions (le Rhône malgré le
          // "e", les Landes au pluriel, les Bouches-du-Rhône...). Deviner
          // cet accord pour 96 noms est le genre d'erreur qui passe
          // inaperçue à la relecture : cette formulation l'évite complètement.
          question: `Quelle est la préfecture du département « ${dep.nom} » ?`,
          answer: dep.prefecture.nom,
          mapId: dep.code,
        })),
      };
    })
    .sort(sortLessons);

  const lessonsSource = lessons.map((lesson) => renderLesson(lesson)).join(',\n');

  const source = `/**
 * Contenu pédagogique, figé et livré avec l'app.
 *
 * ⚠️ FICHIER GÉNÉRÉ — ne pas modifier les leçons du thème "departements" à la
 * main, elles seraient écrasées. Régénérer avec :
 *   node tools/build-geo.mjs && node tools/build-content.mjs
 * (voir tools/build-content.mjs et docs/README.md § 6). Un futur contenu qui
 * ne suit pas ce modèle mécanique (questions rédigées à la main) devrait
 * vivre dans un Theme séparé, écrit à la main celui-là.
 *
 * Hiérarchie : Thème → Leçon → Carte.
 * La progression (vue ? réussie ? à revoir quand ?) n'est PAS ici : elle vit
 * dans le stockage local, voir js/storage/store.js.
 *
 * Format et conventions d'identifiants détaillés dans
 * .claude/skills/format-contenu/SKILL.md.
 *
 * @typedef {object} Card
 * @property {string} id        "dep-<code INSEE>-prefecture", stable à vie :
 *                              c'est la clé de la progression enregistrée.
 * @property {string} question
 * @property {string} answer
 * @property {string} [mapId]   Code INSEE, relie la carte à sa forme sur la carte.
 *
 * @typedef {object} Lesson
 * @property {string} id
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} [regionCode]  Code INSEE de la région (relie la leçon à
 *           sa forme sur la carte de France — voir js/data/geo.js). Une leçon
 *           sans regionCode n'est pas accessible depuis la carte nationale.
 * @property {Card[]} cards
 *
 * @typedef {object} Theme
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {Lesson[]} lessons
 */

/** @type {Theme[]} */
export const themes = [
  {
    id: 'departements',
    title: 'Départements',
    description: 'Les départements de France et leurs préfectures.',
    lessons: [
${indent(lessonsSource, 6)}
    ],
  },
];

/** Toutes les cartes, tous thèmes confondus. @returns {Card[]} */
export function allCards() {
  return themes.flatMap((theme) => theme.lessons).flatMap((lesson) => lesson.cards);
}

/** @param {string} lessonId @returns {Lesson | undefined} */
export function findLesson(lessonId) {
  return themes.flatMap((theme) => theme.lessons).find((lesson) => lesson.id === lessonId);
}

/** @param {string} cardId @returns {Card | undefined} */
export function findCard(cardId) {
  return allCards().find((card) => card.id === cardId);
}

/**
 * Retrouve la leçon à laquelle appartient une carte. Utilisé par le quiz
 * pour piocher des propositions plausibles (d'autres cartes de la même
 * leçon) sans connaître de région en dur.
 * @param {string} cardId
 * @returns {Lesson | undefined}
 */
export function findLessonByCardId(cardId) {
  return themes
    .flatMap((theme) => theme.lessons)
    .find((lesson) => lesson.cards.some((card) => card.id === cardId));
}

/** @param {string} regionCode @returns {Lesson | undefined} */
export function findLessonByRegionCode(regionCode) {
  return themes.flatMap((theme) => theme.lessons).find((lesson) => lesson.regionCode === regionCode);
}
`;

  writeFileSync(OUT_FILE, source);
  const totalCards = lessons.reduce((sum, l) => sum + l.cards.length, 0);
  console.log(`écrit ${OUT_FILE}`);
  console.log(`${lessons.length} leçons, ${totalCards} cartes`);
}

function renderLesson(lesson) {
  const cardsSource = lesson.cards.map((card) => renderCard(card)).join(',\n');
  return [
    '{',
    `  id: ${jsString(lesson.id)},`,
    `  title: ${jsString(lesson.title)},`,
    `  subtitle: ${jsString(lesson.subtitle)},`,
    `  regionCode: ${jsString(lesson.regionCode)},`,
    '  cards: [',
    indent(cardsSource, 4),
    '  ],',
    '}',
  ].join('\n');
}

function renderCard(card) {
  return `{ id: ${jsString(card.id)}, question: ${jsString(card.question)}, answer: ${jsString(card.answer)}, mapId: ${jsString(card.mapId)} }`;
}

function indent(text, spaces) {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line.length ? pad + line : line))
    .join('\n');
}

/** Même règle de nommage que le dépôt source des tracés (voir tools/build-geo.mjs). */
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/'/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

main();
