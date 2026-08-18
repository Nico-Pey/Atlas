# Atlas — version native Swift (dossier AtlasSwift/)

Portage natif de l'app Atlas, en parallèle de la version Expo qui vit à la
racine du repo. Les deux implémentent **la même app** : Thème → Leçon → Carte,
répétition espacée, contenu Nouvelle-Aquitaine.

Le guide d'installation destiné à l'utilisateur est dans `README.md` — c'est là
qu'il faut aller pour tout ce qui touche à Xcode, aux versions de macOS et au
déploiement sur iPhone.

## Contraintes de compatibilité (à ne pas casser)

- **Cible : iOS 14 minimum**, volontairement bas — l'utilisateur a un vieux Mac
  dont la version de macOS plafonne la version de Xcode. Xcode 12 (macOS 10.15
  Catalina) doit pouvoir compiler ce code.
- **Interdits** parce que trop récents : `NavigationStack` (iOS 16),
  `.task` (15), SwiftData et `@Observable` (17), `.tint` (15),
  `.foregroundStyle` (15), `Canvas` (15), `.buttonStyle(.borderedProminent)` (15).
- **Utilisés à la place** : `NavigationView` + `StackNavigationViewStyle`,
  `.onAppear`, `ObservableObject` + `@StateObject`, `.accentColor`,
  `RoundedRectangle`, SQLite via l'API C.
- Éviter les `let` intermédiaires directement dans le corps d'une vue : les
  extraire dans une fonction `private func ... -> some View` (compatible avec
  les Swift plus anciens).

## Structure

```
Atlas/AtlasApp.swift      Point d'entrée @main + les 3 onglets (RootView).
Atlas/Data/               Contenu figé : types + thèmes/leçons/cartes.
Atlas/Engine/             Moteur SRS PUR : ni SwiftUI, ni SQLite, ni Date()
                          caché (la date du jour est toujours un paramètre).
Atlas/Storage/            ProgressStore : seul objet qui parle SQL. Tient la
                          progression en mémoire (@Published) et écrit dans
                          SQLite à chaque changement.
Atlas/Views/              DesignTokens (couleurs/typos), HomeView, LessonView,
                          QuizView, StatsView, FlashCardView,
                          CarteInteractiveView.
EngineTests/main.swift    Vérification du moteur en Terminal. ⚠️ NE JAMAIS
                          ajouter au projet Xcode (conflit avec @main).
```

Noms à connaître : la vue de progression s'appelle `StatsView` et non
`ProgressView` (ce nom est déjà pris par SwiftUI), et le namespace du contenu
est `AtlasContent` et non `Content`.

## Règle SRS

Identique à la version Expo, et normative :
`../.claude/skills/moteur-srs/SKILL.md`.

- Une carte entre dans le suivi **uniquement** quand elle est vue en leçon
  (`markSeen`, déclenché en touchant un département dans `LessonView`).
- Réussie au quiz → revient dans **3 jours**. Ratée → revient **demain**.
- Le pool (`nouvelle` / `enCours` / `connue`) n'est pas stocké : il se
  recalcule depuis `attempts` et `streak`.

La règle n'est écrite qu'une fois, dans `Engine/SRS.swift`. `ProgressStore`
l'appelle et persiste le résultat ; les vues ne recalculent jamais rien
elles-mêmes.

Le schéma SQL (`card_progress`) et les identifiants de cartes
(`dep-<code INSEE>-prefecture`) sont **identiques** à la version Expo, exprès.

## État

- Code écrit, **jamais compilé ni exécuté** : produit sans accès à macOS ni
  Xcode. Des erreurs de compilation au premier lancement sont attendues.
- Seul `Engine/` est vérifiable hors Xcode, via `EngineTests/main.swift`
  (commande dans le README).
- Pas de notifications, une seule leçon, carte schématique — comme côté Expo.
