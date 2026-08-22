---
name: format-contenu
description: Structure exacte d'un thème/leçon/carte dans Atlas, avec un exemple complet. À consulter avant d'ajouter ou modifier un thème dans /data — l'objectif est qu'ajouter une région reste une opération triviale et sans ambiguïté.
---

# Format du contenu (thème → leçon → carte)

Le contenu pédagogique d'Atlas est **du TypeScript (ou JS) typé**, pas du
JSON brut importé au runtime : on garde la vérification de type au moment
d'écrire le contenu, ça évite une faute de frappe silencieuse dans un id.
Les types de référence sont dans `data/types.ts` (Expo) — ce skill explique
comment les remplir.

⚠️ **Dans la version PWA (`docs/`), le thème "departements" est GÉNÉRÉ**
(`docs/js/data/themes.js`, par `tools/build-content.mjs` — voir
`docs/README.md` § 6), parce que ses 96 questions sont mécaniques et
identiques ("Quelle est la préfecture du département « X » ?"). Ne pas
éditer ses leçons à la main, elles seraient écrasées au prochain lancement
du script. La checklist "Ajouter une nouvelle région" ci-dessous s'applique
telle quelle à la version **Expo**, et à tout **nouveau thème** de la PWA qui
ne suit pas ce modèle mécanique (questions rédigées à la main) — celui-là
reste un `Theme` séparé, écrit à la main.

## Hiérarchie

```
Theme "Départements"
└── Lesson "Nouvelle-Aquitaine"
    ├── Card "dep-33-prefecture"  (Gironde → Bordeaux)
    ├── Card "dep-40-prefecture"  (Landes → Mont-de-Marsan)
    └── ...
```

- **Theme** : une catégorie de leçons qui se ressemblent (ex: tous les
  thèmes "une région = une leçon"). En pratique, un thème regroupe des
  leçons qui partagent le même type de question.
- **Lesson** : un bloc appris d'un coup (une région). C'est l'unité que
  l'utilisateur ouvre dans l'écran Leçon.
- **Card** : une seule question/réponse.

## Règles d'identifiants (important, ne pas improviser)

- `Card.id` : `"dep-<code INSEE du département>-prefecture"`, ex.
  `"dep-33-prefecture"` pour la Gironde. Unique dans **toute l'app**, pas
  seulement dans la leçon — c'est la clé utilisée en base SQLite
  (`storage/db.ts`), elle ne doit jamais changer une fois publiée (sinon
  la progression de l'utilisateur pour cette carte serait perdue).
- `Card.mapId` : le **code INSEE du département** tel quel (ex. `"33"`).
  C'est la clé qui relie une carte à sa forme sur `CarteInteractive`
  (voir `components/CarteInteractive.tsx`, qui attend exactement ces codes).
  Si une carte n'a pas de représentation sur la carte, omettre `mapId`.
- `Lesson.id` : slug de la région, en minuscules, tirets pour les espaces.
  Ex. `"nouvelle-aquitaine"`.
- `Theme.id` : slug court du thème. Ex. `"departements"`.
- `Lesson.regionCode` (PWA uniquement pour l'instant, `docs/js/data/themes.js`) :
  code INSEE de la région, ex. `"75"` pour Nouvelle-Aquitaine. C'est ce qui
  relie une leçon à sa région sur la carte de France de l'accueil (voir
  `docs/README.md` § 6) — une leçon sans `regionCode` n'apparaît pas comme
  cliquable sur cette carte.

## Exemple complet (extrait à 2 départements — le fichier réel en a 12)

```ts
// data/themes.ts
import type { Theme } from './types';

export const themes: Theme[] = [
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
          {
            id: 'dep-33-prefecture',
            question: 'Quelle est la préfecture de la Gironde ?',
            answer: 'Bordeaux',
            mapId: '33',
          },
          {
            id: 'dep-40-prefecture',
            question: 'Quelle est la préfecture des Landes ?',
            answer: 'Mont-de-Marsan',
            mapId: '40',
          },
        ],
      },
    ],
  },
];
```

## Ajouter une nouvelle région (checklist)

1. Ajouter un objet `Lesson` dans le thème concerné de `data/themes.ts`
   (ou créer un nouveau `Theme` si le sujet est différent des départements).
2. Une `Card` par élément à apprendre, avec un `id` stable et un `mapId`
   s'il existe une forme correspondante sur la carte interactive.
3. Si la région a besoin d'une nouvelle carte SVG, l'ajouter dans
   `components/CarteInteractive.tsx` (voir les commentaires de ce fichier
   pour le format des formes).
4. Rien d'autre à toucher : les écrans, le moteur SRS et le stockage lisent
   `data/themes.ts` dynamiquement, aucun ne connaît "Nouvelle-Aquitaine" en
   dur.

## Ce qui ne va PAS dans `/data`

La progression de l'utilisateur (carte vue, réussie, prochaine date de
révision) ne fait **jamais** partie du contenu. `/data` est figé et livré
avec l'app ; la progression vit exclusivement en SQLite (`/storage`). Ne
jamais ajouter de champ genre `vu: boolean` ou `prochaineRevision` sur un
`Card` ou une `Lesson`.
