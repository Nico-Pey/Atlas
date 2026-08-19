@AGENTS.md

# Atlas

App iOS de géographie façon Anki/Duolingo, à faire chaque matin. Hiérarchie :
**Thème → Leçon → Carte**. Une leçon = une région, avec ses départements et
préfectures. Seules les cartes vues en leçon apparaissent au quiz quotidien,
qui utilise une répétition espacée simple.

## Deux implémentations dans ce repo

| | Où | État |
|---|---|---|
| **PWA web** (recommandée) | `docs/` | ✅ testée en navigateur (50+ vérifs) + 8 tests du moteur. Carte de France (régions) à l'accueil, zoom sur les départements, quiz à choix multiples. |
| Expo / React Native | racine (`App.tsx`, `screens/`…) | compile, jamais lancée sur appareil |

La **PWA est la voie retenue** : développement sous Windows, installation sur
l'écran d'accueil de l'iPhone via Safari (« Sur l'écran d'accueil »), plein
écran, hors-ligne, sans Mac ni compte développeur Apple ni expiration à 7 jours.
Déploiement gratuit par GitHub Pages depuis `docs/` — voir `docs/README.md`.

Une troisième version, native Swift/SwiftUI, existe sur la branche
`claude/atlas-swift-native` (dossier `AtlasSwift/`) : écrite mais jamais
compilée, abandonnée parce qu'un vieux Mac ne peut pas déployer sur un iPhone
récent.

Les trois partagent volontairement la **même règle SRS**, les **mêmes
identifiants de cartes** et le **même contenu**.

## Stack (version Expo)

- **Expo (React Native) + TypeScript**, SDK 57. Développé sous Windows,
  testé via l'app **Expo Go** sur iPhone — pas de Mac, pas de compte
  développeur Apple, pas de dossiers natifs `ios/`/`android/`.
- **Navigation** : `@react-navigation` (onglets Apprendre/Quiz/Progression,
  pile dans l'onglet Apprendre).
- **Carte interactive** : `react-native-svg`.
- **Stockage local** : `expo-sqlite` (API async moderne : `openDatabaseAsync`,
  `execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`).
- **Notifications quotidiennes** : `expo-notifications` — installé,
  **pas encore câblé** (voir État d'avancement).
- Pas de backend : tout est local sur l'appareil.

⚠️ `npx expo install` ne fonctionne pas dans un environnement Claude Code
distant (api.expo.dev est bloqué par la politique réseau) : les versions
compatibles ont été lues directement dans
`node_modules/expo/bundledNativeModules.json`. Sur une machine normale,
utiliser `npx expo install <paquet>` pour tout nouveau paquet natif.

## Structure de dossiers

```
/data        Contenu figé (thèmes/leçons/cartes), jamais modifié à l'exécution.
             types.ts (types), themes.ts (contenu), findLesson/findCard.
/engine      Moteur SRS PUR : aucun import React/SQLite, aucun new Date()
             caché (la date du jour est toujours un paramètre). srs.ts + date.ts.
/storage     Seul endroit qui parle SQL. db.ts fait le pont entre le type
             CardProgress du moteur et la table SQLite.
/screens     HomeScreen, LessonScreen, QuizScreen, ProgressScreen.
             Orchestrent /data + /storage + /engine, pas de SQL ni de règle
             SRS écrite en dur ici.
/components  CarteInteractive (carte SVG cliquable), FlashCard (recto/verso),
             theme.ts (couleurs/espacements/typos centralisés).
.claude/skills/   Règles projet détaillées (voir plus bas).
```

## Principe du moteur de répétition espacée

Détail complet et normatif : `.claude/skills/moteur-srs/SKILL.md`.
Résumé :

1. Une carte n'entre dans le suivi que **vue en leçon** (`markSeen`,
   déclenché en tapant un département dans LessonScreen). Une carte jamais
   vue en leçon n'apparaît jamais au quiz.
2. **Réussie au quiz** → sort du pool pendant **3 jours**.
   **Ratée** → revient dès **le lendemain**.
3. Le **pool d'affichage** (`nouvelle` / `en_cours` / `connue`) se recalcule
   à partir du nombre de tentatives et de la série de réussites d'affilée —
   ce n'est pas un état stocké séparément.

## État d'avancement

**Fait (étapes 1 à 4 du plan initial) :**
- Projet Expo TypeScript initialisé, navigation câblée, dépendances posées.
- Moteur SRS pur + tests manuels via typecheck (pas de suite de tests
  automatisée pour l'instant — pas demandée).
- Stockage SQLite (table `card_progress`) branché sur le moteur SRS.
- Un thème codé en dur : **Départements → Nouvelle-Aquitaine**, 12 cartes
  (département → préfecture).
- `CarteInteractive` : carte cliquable des 12 départements. **Simplification
  assumée** : formes schématiques (rectangles positionnés approximativement),
  pas de tracé géographique réel — aucune source de données cartographiques
  n'était accessible pour cette V1. Documenté en tête du fichier.
- Les 4 écrans sont branchés bout en bout : apprendre une carte en leçon →
  elle apparaît au quiz du jour → réussite/échec met à jour sa prochaine
  date de révision → visible dans Progression.
- Vérifié par `npm run typecheck` et `npx expo export --platform ios`
  (le bundle se construit). **Aucun test réel sur appareil n'a encore été
  fait** : cet environnement de développement n'a ni iPhone ni simulateur.

**Pas encore fait :**
- Notifications quotidiennes (`expo-notifications` installé, pas programmé).
- Un seul thème/une seule leçon : ajouter une région = suivre
  `.claude/skills/format-contenu/SKILL.md` (aucun code d'écran à toucher).
- Pas de suite de tests automatisée sur `engine/srs.ts` (le module est pur,
  donc facile à tester plus tard si besoin).
- `CarteInteractive` à remplacer par de vrais tracés SVG un jour (seul ce
  fichier serait à toucher, voir son commentaire d'en-tête).
- Validation réelle dans Expo Go sur iPhone, à faire dès qu'un ordinateur
  est disponible (`npm install` puis `npx expo start`, scanner le QR code).

## Skills projet (`.claude/skills/`)

- **moteur-srs** : règle exacte de répétition espacée, à consulter avant de
  toucher `engine/srs.ts`, `storage/db.ts`, ou tout écran lié à la
  progression.
- **conventions-ui** : HIG Apple appliquées en React Native, lisibilité tôt
  le matin (contrastes, tailles, cibles tactiles ≥44pt).
- **format-contenu** : structure exacte thème/leçon/carte dans `/data`, avec
  exemple, pour qu'ajouter une région reste trivial.
