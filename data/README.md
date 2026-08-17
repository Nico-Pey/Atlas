# /data — le contenu

Contenu pédagogique figé, livré avec l'app et **jamais modifié à l'exécution**.

- `types.ts` — la forme d'un thème, d'une leçon, d'une carte.
- `themes.ts` — la liste des thèmes disponibles.

Ajouter un thème = ajouter un objet ici, rien d'autre à toucher.
Le format exact est documenté dans `.claude/skills/format-contenu/`.

La progression de l'utilisateur (carte vue, réussie, prochaine révision) ne
vit **pas** ici : elle est en SQLite, voir `/storage`.
