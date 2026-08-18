/**
 * Contenu pédagogique, figé et livré avec l'app.
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
      {
        id: 'nouvelle-aquitaine',
        title: 'Nouvelle-Aquitaine',
        subtitle: '12 départements',
        cards: [
          { id: 'dep-16-prefecture', question: 'Quelle est la préfecture de la Charente ?', answer: 'Angoulême', mapId: '16' },
          { id: 'dep-17-prefecture', question: 'Quelle est la préfecture de la Charente-Maritime ?', answer: 'La Rochelle', mapId: '17' },
          { id: 'dep-19-prefecture', question: 'Quelle est la préfecture de la Corrèze ?', answer: 'Tulle', mapId: '19' },
          { id: 'dep-23-prefecture', question: 'Quelle est la préfecture de la Creuse ?', answer: 'Guéret', mapId: '23' },
          { id: 'dep-24-prefecture', question: 'Quelle est la préfecture de la Dordogne ?', answer: 'Périgueux', mapId: '24' },
          { id: 'dep-33-prefecture', question: 'Quelle est la préfecture de la Gironde ?', answer: 'Bordeaux', mapId: '33' },
          { id: 'dep-40-prefecture', question: 'Quelle est la préfecture des Landes ?', answer: 'Mont-de-Marsan', mapId: '40' },
          { id: 'dep-47-prefecture', question: 'Quelle est la préfecture du Lot-et-Garonne ?', answer: 'Agen', mapId: '47' },
          { id: 'dep-64-prefecture', question: 'Quelle est la préfecture des Pyrénées-Atlantiques ?', answer: 'Pau', mapId: '64' },
          { id: 'dep-79-prefecture', question: 'Quelle est la préfecture des Deux-Sèvres ?', answer: 'Niort', mapId: '79' },
          { id: 'dep-86-prefecture', question: 'Quelle est la préfecture de la Vienne ?', answer: 'Poitiers', mapId: '86' },
          { id: 'dep-87-prefecture', question: 'Quelle est la préfecture de la Haute-Vienne ?', answer: 'Limoges', mapId: '87' },
        ],
      },
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
