---
name: conventions-ui
description: Conventions visuelles d'Atlas — Apple Human Interface Guidelines appliquées en React Native, sobriété et lisibilité pour un usage tôt le matin. À consulter avant d'écrire ou de modifier un écran (/screens) ou un composant (/components).
---

# Conventions UI d'Atlas

Atlas se lit **le matin, tôt, l'œil pas encore réveillé**, à la place de
scroller les réseaux sociaux. C'est la contrainte produit qui prime sur
tout le reste : mieux vaut un écran un peu austère mais lisible en un
regard, qu'un écran joli mais qui demande de plisser les yeux.

## Pourquoi les HIG même en React Native

L'app tourne sur iPhone (Expo Go). On n'a pas de composants natifs Apple,
mais on peut respecter les mêmes règles de lisibilité et d'ergonomie que les
HIG imposent — ce sont des règles humaines (contraste, taille de cible
tactile), pas des règles de framework. Un utilisateur iOS attend ce
comportement même dans une app React Native.

## Jetons de style : `components/theme.ts`

Toute couleur, tout espacement, toute taille de police vit dans
`components/theme.ts` (`colors`, `spacing`, `typography`, `radius`,
`MIN_TOUCH_TARGET`). **Ne jamais écrire une couleur ou une taille en dur
dans un écran ou un composant** — importer les jetons. Si une valeur
manque, l'ajouter dans `theme.ts`, pas à l'endroit où on en a besoin.

## Règles concrètes

### Contraste et couleur
- Texte principal : `colors.text` sur `colors.background` (contraste élevé,
  jamais de gris clair sur blanc).
- Le texte secondaire (`colors.textMuted`) reste au-dessus d'un ratio de
  contraste de 4.5:1 sur fond blanc — c'est déjà calibré dans `theme.ts`,
  ne pas l'assombrir encore mais ne pas non plus l'éclaircir.
- `colors.danger` (erreur/réponse fausse) n'est **jamais** le seul signal :
  toujours accompagné d'un texte ou d'une icône, pas seulement une pastille
  rouge (accessibilité daltonisme).

### Typographie
- Corps de texte : 17pt minimum (`typography.body`), c'est le minimum HIG
  pour une lecture confortable sans zoomer.
- Le contenu le plus important à l'écran (la question d'une flashcard) est
  toujours la plus grande taille de texte visible sur l'écran
  (`typography.question`, 26pt).
- Pas plus de 2 poids de police par écran (regular + un accent en 600/700).
  Pas d'italique pour du contenu fonctionnel.

### Tailles de cibles tactiles
- Tout élément cliquable (bouton, département sur la carte, carte à
  retourner) fait **au moins `MIN_TOUCH_TARGET` (44pt)** de haut et de
  large, zone de padding comprise — pas seulement le texte visible.
- Sur la carte interactive, si un département est visuellement plus petit
  que 44pt (ex: la Corrèze), agrandir sa zone cliquable au-delà de son
  tracé visible plutôt que de réduire la cible.

### Sobriété
- Pas d'animation décorative sans fonction (pas de confettis, pas de
  rebonds). Une transition n'existe que si elle aide à comprendre un
  changement d'état (ex: une carte qui se retourne).
- Un écran = une action principale évidente. Si un écran a besoin de plus
  de 2-3 boutons d'action, c'est probablement deux écrans.
- Thème clair uniquement en V1 (`app.json` : `userInterfaceStyle: "light"`).
  Ne pas introduire de couleurs qui supposent un mode sombre tant que ce
  n'est pas explicitement demandé.

## Où regarder avant d'écrire un écran

1. `components/theme.ts` pour les jetons disponibles.
2. Un écran existant proche (`screens/HomeScreen.tsx` etc.) pour le style
   de mise en page déjà en place.
3. Ce skill, si un cas n'est couvert par aucun des deux.
