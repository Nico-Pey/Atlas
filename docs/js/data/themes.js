/**
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
      {
        id: "occitanie",
        title: "Occitanie",
        subtitle: "13 départements",
        regionCode: "76",
        cards: [
          { id: "dep-09-prefecture", question: "Quelle est la préfecture du département « Ariège » ?", answer: "Foix", mapId: "09" },
          { id: "dep-11-prefecture", question: "Quelle est la préfecture du département « Aude » ?", answer: "Carcassonne", mapId: "11" },
          { id: "dep-12-prefecture", question: "Quelle est la préfecture du département « Aveyron » ?", answer: "Rodez", mapId: "12" },
          { id: "dep-30-prefecture", question: "Quelle est la préfecture du département « Gard » ?", answer: "Nîmes", mapId: "30" },
          { id: "dep-32-prefecture", question: "Quelle est la préfecture du département « Gers » ?", answer: "Auch", mapId: "32" },
          { id: "dep-31-prefecture", question: "Quelle est la préfecture du département « Haute-Garonne » ?", answer: "Toulouse", mapId: "31" },
          { id: "dep-65-prefecture", question: "Quelle est la préfecture du département « Hautes-Pyrénées » ?", answer: "Tarbes", mapId: "65" },
          { id: "dep-34-prefecture", question: "Quelle est la préfecture du département « Hérault » ?", answer: "Montpellier", mapId: "34" },
          { id: "dep-46-prefecture", question: "Quelle est la préfecture du département « Lot » ?", answer: "Cahors", mapId: "46" },
          { id: "dep-48-prefecture", question: "Quelle est la préfecture du département « Lozère » ?", answer: "Mende", mapId: "48" },
          { id: "dep-66-prefecture", question: "Quelle est la préfecture du département « Pyrénées-Orientales » ?", answer: "Perpignan", mapId: "66" },
          { id: "dep-81-prefecture", question: "Quelle est la préfecture du département « Tarn » ?", answer: "Albi", mapId: "81" },
          { id: "dep-82-prefecture", question: "Quelle est la préfecture du département « Tarn-et-Garonne » ?", answer: "Montauban", mapId: "82" }
        ],
      },
      {
        id: "auvergne-rhone-alpes",
        title: "Auvergne-Rhône-Alpes",
        subtitle: "12 départements",
        regionCode: "84",
        cards: [
          { id: "dep-01-prefecture", question: "Quelle est la préfecture du département « Ain » ?", answer: "Bourg-en-Bresse", mapId: "01" },
          { id: "dep-03-prefecture", question: "Quelle est la préfecture du département « Allier » ?", answer: "Moulins", mapId: "03" },
          { id: "dep-07-prefecture", question: "Quelle est la préfecture du département « Ardèche » ?", answer: "Privas", mapId: "07" },
          { id: "dep-15-prefecture", question: "Quelle est la préfecture du département « Cantal » ?", answer: "Aurillac", mapId: "15" },
          { id: "dep-26-prefecture", question: "Quelle est la préfecture du département « Drôme » ?", answer: "Valence", mapId: "26" },
          { id: "dep-43-prefecture", question: "Quelle est la préfecture du département « Haute-Loire » ?", answer: "Le Puy-en-Velay", mapId: "43" },
          { id: "dep-74-prefecture", question: "Quelle est la préfecture du département « Haute-Savoie » ?", answer: "Annecy", mapId: "74" },
          { id: "dep-38-prefecture", question: "Quelle est la préfecture du département « Isère » ?", answer: "Grenoble", mapId: "38" },
          { id: "dep-42-prefecture", question: "Quelle est la préfecture du département « Loire » ?", answer: "Saint-Étienne", mapId: "42" },
          { id: "dep-63-prefecture", question: "Quelle est la préfecture du département « Puy-de-Dôme » ?", answer: "Clermont-Ferrand", mapId: "63" },
          { id: "dep-69-prefecture", question: "Quelle est la préfecture du département « Rhône » ?", answer: "Lyon", mapId: "69" },
          { id: "dep-73-prefecture", question: "Quelle est la préfecture du département « Savoie » ?", answer: "Chambéry", mapId: "73" }
        ],
      },
      {
        id: "nouvelle-aquitaine",
        title: "Nouvelle-Aquitaine",
        subtitle: "12 départements",
        regionCode: "75",
        cards: [
          { id: "dep-16-prefecture", question: "Quelle est la préfecture du département « Charente » ?", answer: "Angoulême", mapId: "16" },
          { id: "dep-17-prefecture", question: "Quelle est la préfecture du département « Charente-Maritime » ?", answer: "La Rochelle", mapId: "17" },
          { id: "dep-19-prefecture", question: "Quelle est la préfecture du département « Corrèze » ?", answer: "Tulle", mapId: "19" },
          { id: "dep-23-prefecture", question: "Quelle est la préfecture du département « Creuse » ?", answer: "Guéret", mapId: "23" },
          { id: "dep-79-prefecture", question: "Quelle est la préfecture du département « Deux-Sèvres » ?", answer: "Niort", mapId: "79" },
          { id: "dep-24-prefecture", question: "Quelle est la préfecture du département « Dordogne » ?", answer: "Périgueux", mapId: "24" },
          { id: "dep-33-prefecture", question: "Quelle est la préfecture du département « Gironde » ?", answer: "Bordeaux", mapId: "33" },
          { id: "dep-87-prefecture", question: "Quelle est la préfecture du département « Haute-Vienne » ?", answer: "Limoges", mapId: "87" },
          { id: "dep-40-prefecture", question: "Quelle est la préfecture du département « Landes » ?", answer: "Mont-de-Marsan", mapId: "40" },
          { id: "dep-47-prefecture", question: "Quelle est la préfecture du département « Lot-et-Garonne » ?", answer: "Agen", mapId: "47" },
          { id: "dep-64-prefecture", question: "Quelle est la préfecture du département « Pyrénées-Atlantiques » ?", answer: "Pau", mapId: "64" },
          { id: "dep-86-prefecture", question: "Quelle est la préfecture du département « Vienne » ?", answer: "Poitiers", mapId: "86" }
        ],
      },
      {
        id: "grand-est",
        title: "Grand Est",
        subtitle: "10 départements",
        regionCode: "44",
        cards: [
          { id: "dep-08-prefecture", question: "Quelle est la préfecture du département « Ardennes » ?", answer: "Charleville-Mézières", mapId: "08" },
          { id: "dep-10-prefecture", question: "Quelle est la préfecture du département « Aube » ?", answer: "Troyes", mapId: "10" },
          { id: "dep-67-prefecture", question: "Quelle est la préfecture du département « Bas-Rhin » ?", answer: "Strasbourg", mapId: "67" },
          { id: "dep-68-prefecture", question: "Quelle est la préfecture du département « Haut-Rhin » ?", answer: "Colmar", mapId: "68" },
          { id: "dep-52-prefecture", question: "Quelle est la préfecture du département « Haute-Marne » ?", answer: "Chaumont", mapId: "52" },
          { id: "dep-51-prefecture", question: "Quelle est la préfecture du département « Marne » ?", answer: "Châlons-en-Champagne", mapId: "51" },
          { id: "dep-54-prefecture", question: "Quelle est la préfecture du département « Meurthe-et-Moselle » ?", answer: "Nancy", mapId: "54" },
          { id: "dep-55-prefecture", question: "Quelle est la préfecture du département « Meuse » ?", answer: "Bar-le-Duc", mapId: "55" },
          { id: "dep-57-prefecture", question: "Quelle est la préfecture du département « Moselle » ?", answer: "Metz", mapId: "57" },
          { id: "dep-88-prefecture", question: "Quelle est la préfecture du département « Vosges » ?", answer: "Épinal", mapId: "88" }
        ],
      },
      {
        id: "bourgogne-franche-comte",
        title: "Bourgogne-Franche-Comté",
        subtitle: "8 départements",
        regionCode: "27",
        cards: [
          { id: "dep-21-prefecture", question: "Quelle est la préfecture du département « Côte-d'Or » ?", answer: "Dijon", mapId: "21" },
          { id: "dep-25-prefecture", question: "Quelle est la préfecture du département « Doubs » ?", answer: "Besançon", mapId: "25" },
          { id: "dep-70-prefecture", question: "Quelle est la préfecture du département « Haute-Saône » ?", answer: "Vesoul", mapId: "70" },
          { id: "dep-39-prefecture", question: "Quelle est la préfecture du département « Jura » ?", answer: "Lons-le-Saunier", mapId: "39" },
          { id: "dep-58-prefecture", question: "Quelle est la préfecture du département « Nièvre » ?", answer: "Nevers", mapId: "58" },
          { id: "dep-71-prefecture", question: "Quelle est la préfecture du département « Saône-et-Loire » ?", answer: "Mâcon", mapId: "71" },
          { id: "dep-90-prefecture", question: "Quelle est la préfecture du département « Territoire de Belfort » ?", answer: "Belfort", mapId: "90" },
          { id: "dep-89-prefecture", question: "Quelle est la préfecture du département « Yonne » ?", answer: "Auxerre", mapId: "89" }
        ],
      },
      {
        id: "ile-de-france",
        title: "Île-de-France",
        subtitle: "8 départements",
        regionCode: "11",
        cards: [
          { id: "dep-91-prefecture", question: "Quelle est la préfecture du département « Essonne » ?", answer: "Évry-Courcouronnes", mapId: "91" },
          { id: "dep-92-prefecture", question: "Quelle est la préfecture du département « Hauts-de-Seine » ?", answer: "Nanterre", mapId: "92" },
          { id: "dep-75-prefecture", question: "Quelle est la préfecture du département « Paris » ?", answer: "Paris", mapId: "75" },
          { id: "dep-77-prefecture", question: "Quelle est la préfecture du département « Seine-et-Marne » ?", answer: "Melun", mapId: "77" },
          { id: "dep-93-prefecture", question: "Quelle est la préfecture du département « Seine-Saint-Denis » ?", answer: "Bobigny", mapId: "93" },
          { id: "dep-95-prefecture", question: "Quelle est la préfecture du département « Val-d'Oise » ?", answer: "Pontoise", mapId: "95" },
          { id: "dep-94-prefecture", question: "Quelle est la préfecture du département « Val-de-Marne » ?", answer: "Créteil", mapId: "94" },
          { id: "dep-78-prefecture", question: "Quelle est la préfecture du département « Yvelines » ?", answer: "Versailles", mapId: "78" }
        ],
      },
      {
        id: "centre-val-de-loire",
        title: "Centre-Val de Loire",
        subtitle: "6 départements",
        regionCode: "24",
        cards: [
          { id: "dep-18-prefecture", question: "Quelle est la préfecture du département « Cher » ?", answer: "Bourges", mapId: "18" },
          { id: "dep-28-prefecture", question: "Quelle est la préfecture du département « Eure-et-Loir » ?", answer: "Chartres", mapId: "28" },
          { id: "dep-36-prefecture", question: "Quelle est la préfecture du département « Indre » ?", answer: "Châteauroux", mapId: "36" },
          { id: "dep-37-prefecture", question: "Quelle est la préfecture du département « Indre-et-Loire » ?", answer: "Tours", mapId: "37" },
          { id: "dep-41-prefecture", question: "Quelle est la préfecture du département « Loir-et-Cher » ?", answer: "Blois", mapId: "41" },
          { id: "dep-45-prefecture", question: "Quelle est la préfecture du département « Loiret » ?", answer: "Orléans", mapId: "45" }
        ],
      },
      {
        id: "provence-alpes-cote-d-azur",
        title: "Provence-Alpes-Côte d'Azur",
        subtitle: "6 départements",
        regionCode: "93",
        cards: [
          { id: "dep-04-prefecture", question: "Quelle est la préfecture du département « Alpes-de-Haute-Provence » ?", answer: "Digne-les-Bains", mapId: "04" },
          { id: "dep-06-prefecture", question: "Quelle est la préfecture du département « Alpes-Maritimes » ?", answer: "Nice", mapId: "06" },
          { id: "dep-13-prefecture", question: "Quelle est la préfecture du département « Bouches-du-Rhône » ?", answer: "Marseille", mapId: "13" },
          { id: "dep-05-prefecture", question: "Quelle est la préfecture du département « Hautes-Alpes » ?", answer: "Gap", mapId: "05" },
          { id: "dep-83-prefecture", question: "Quelle est la préfecture du département « Var » ?", answer: "Toulon", mapId: "83" },
          { id: "dep-84-prefecture", question: "Quelle est la préfecture du département « Vaucluse » ?", answer: "Avignon", mapId: "84" }
        ],
      },
      {
        id: "hauts-de-france",
        title: "Hauts-de-France",
        subtitle: "5 départements",
        regionCode: "32",
        cards: [
          { id: "dep-02-prefecture", question: "Quelle est la préfecture du département « Aisne » ?", answer: "Laon", mapId: "02" },
          { id: "dep-59-prefecture", question: "Quelle est la préfecture du département « Nord » ?", answer: "Lille", mapId: "59" },
          { id: "dep-60-prefecture", question: "Quelle est la préfecture du département « Oise » ?", answer: "Beauvais", mapId: "60" },
          { id: "dep-62-prefecture", question: "Quelle est la préfecture du département « Pas-de-Calais » ?", answer: "Arras", mapId: "62" },
          { id: "dep-80-prefecture", question: "Quelle est la préfecture du département « Somme » ?", answer: "Amiens", mapId: "80" }
        ],
      },
      {
        id: "normandie",
        title: "Normandie",
        subtitle: "5 départements",
        regionCode: "28",
        cards: [
          { id: "dep-14-prefecture", question: "Quelle est la préfecture du département « Calvados » ?", answer: "Caen", mapId: "14" },
          { id: "dep-27-prefecture", question: "Quelle est la préfecture du département « Eure » ?", answer: "Évreux", mapId: "27" },
          { id: "dep-50-prefecture", question: "Quelle est la préfecture du département « Manche » ?", answer: "Saint-Lô", mapId: "50" },
          { id: "dep-61-prefecture", question: "Quelle est la préfecture du département « Orne » ?", answer: "Alençon", mapId: "61" },
          { id: "dep-76-prefecture", question: "Quelle est la préfecture du département « Seine-Maritime » ?", answer: "Rouen", mapId: "76" }
        ],
      },
      {
        id: "pays-de-la-loire",
        title: "Pays de la Loire",
        subtitle: "5 départements",
        regionCode: "52",
        cards: [
          { id: "dep-44-prefecture", question: "Quelle est la préfecture du département « Loire-Atlantique » ?", answer: "Nantes", mapId: "44" },
          { id: "dep-49-prefecture", question: "Quelle est la préfecture du département « Maine-et-Loire » ?", answer: "Angers", mapId: "49" },
          { id: "dep-53-prefecture", question: "Quelle est la préfecture du département « Mayenne » ?", answer: "Laval", mapId: "53" },
          { id: "dep-72-prefecture", question: "Quelle est la préfecture du département « Sarthe » ?", answer: "Le Mans", mapId: "72" },
          { id: "dep-85-prefecture", question: "Quelle est la préfecture du département « Vendée » ?", answer: "La Roche-sur-Yon", mapId: "85" }
        ],
      },
      {
        id: "bretagne",
        title: "Bretagne",
        subtitle: "4 départements",
        regionCode: "53",
        cards: [
          { id: "dep-22-prefecture", question: "Quelle est la préfecture du département « Côtes-d'Armor » ?", answer: "Saint-Brieuc", mapId: "22" },
          { id: "dep-29-prefecture", question: "Quelle est la préfecture du département « Finistère » ?", answer: "Quimper", mapId: "29" },
          { id: "dep-35-prefecture", question: "Quelle est la préfecture du département « Ille-et-Vilaine » ?", answer: "Rennes", mapId: "35" },
          { id: "dep-56-prefecture", question: "Quelle est la préfecture du département « Morbihan » ?", answer: "Vannes", mapId: "56" }
        ],
      },
      {
        id: "corse",
        title: "Corse",
        subtitle: "2 départements",
        regionCode: "94",
        cards: [
          { id: "dep-2A-prefecture", question: "Quelle est la préfecture du département « Corse-du-Sud » ?", answer: "Ajaccio", mapId: "2A" },
          { id: "dep-2B-prefecture", question: "Quelle est la préfecture du département « Haute-Corse » ?", answer: "Bastia", mapId: "2B" }
        ],
      }
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
