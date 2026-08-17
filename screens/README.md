# /screens — les écrans

Un fichier = un écran atteignable par la navigation.

- `HomeScreen` — liste des thèmes et leçons, point d'entrée du matin.
- `LessonScreen` — apprentissage d'une région (carte interactive + flashcards).
- `QuizScreen` — révision du jour, filtrée sur les cartes déjà vues en leçon.
- `ProgressScreen` — où j'en suis.

Les écrans orchestrent : ils lisent `/data`, appellent `/storage` et `/engine`,
et affichent des composants de `/components`. Ils ne contiennent ni SQL ni
règle de répétition espacée.
