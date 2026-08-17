---
name: moteur-srs
description: Règle exacte de répétition espacée d'Atlas (pools nouvelle/en cours/connue, intervalles 1 jour / 3 jours). À consulter avant de toucher à engine/srs.ts, storage/db.ts, ou tout écran qui affiche/modifie la progression d'une carte.
---

# Moteur de répétition espacée (SRS) d'Atlas

Cette règle a **une seule implémentation** : `engine/srs.ts`. Ce skill décrit
la règle pour que tout code qui la touche (storage, écrans) reste cohérent
avec cette implémentation — ne jamais la réécrire ailleurs, même en partie.

## Principe

Une carte passe par trois étapes indépendantes :

1. **Contenu** (`/data`) : la carte existe, figée, livrée avec l'app.
2. **Vue en leçon** (`markSeen`) : l'utilisateur a vu la carte dans l'écran
   Leçon. C'est le seul déclencheur qui fait entrer une carte dans le SRS.
   **Une carte jamais vue en leçon n'apparaît jamais au quiz**, quoi qu'il
   arrive.
3. **Révisée au quiz** (`reviewCard`) : l'utilisateur répond juste ou faux.

## Les trois pools

Le pool est un statut **d'affichage** (utilisé sur l'écran Progression), pas
une mécanique séparée : il se recalcule à tout moment à partir de
`attempts` (nombre de passages au quiz) et `streak` (réussites d'affilée
les plus récentes, remise à 0 au premier échec).

| Pool | Condition | Sens |
|---|---|---|
| `nouvelle` | `attempts === 0` | vue en leçon, jamais encore passée au quiz |
| `en_cours` | `attempts > 0` et `streak < 2` | en cours d'apprentissage, ou vient d'être ratée |
| `connue` | `streak >= 2` | au moins deux réussites d'affilée |

Une carte "connue" qui échoue un jour retombe directement en `en_cours`
(jamais en `nouvelle` — `nouvelle` veut dire "jamais tentée", pas "difficile").

## Intervalles (règle imposée, ne pas changer sans validation utilisateur)

- **Réussie** → sort du pool de révision pendant **3 jours** (`nextReviewAt = aujourd'hui + 3`).
- **Ratée** → revient dès **le lendemain** (`nextReviewAt = aujourd'hui + 1`).
- Une carte est **due** (apparaît au quiz) si `nextReviewAt <= aujourd'hui`.
- Une carte tout juste vue en leçon est due **immédiatement**
  (`nextReviewAt = date de la leçon`) : elle peut apparaître au quiz du jour
  même où elle a été apprise.

Ces deux durées (1 jour / 3 jours) sont volontairement fixes, pas
progressives (pas de "1, 3, 7, 14 jours..." façon Anki classique) : c'est un
choix produit pour la V1, pas un oubli. Si on veut un jour des intervalles
progressifs, ça se discute avec l'utilisateur avant de toucher au code.

## Ce que ce module ne fait PAS

- Il ne lit jamais l'heure ou la date lui-même (`new Date()` interdit dans
  `engine/`). Toute fonction reçoit la date du jour en paramètre
  (`ISODate`, format `"YYYY-MM-DD"`), pour rester testable et prévisible.
- Il ne connaît rien de SQLite ni de React : `storage/db.ts` fait le pont
  entre `CardProgress` (le type de ce module) et la table SQL. Les écrans
  n'appellent jamais `engine/srs.ts` directement pour la persistance — ils
  passent par `/storage`, qui utilise `engine/srs.ts` en interne.

## Fonctions disponibles (`engine/srs.ts`)

- `markSeen(cardId, seenAt)` → crée la progression initiale d'une carte.
- `reviewCard(progress, success, reviewedAt)` → retourne la nouvelle
  progression après une réponse juste ou fausse. Ne mute jamais l'objet reçu.
- `getPool(progress)` → `'nouvelle' | 'en_cours' | 'connue'`.
- `isDue(progress, on)` → la carte doit-elle apparaître au quiz ce jour-là ?
- `getDueCardIds(allProgress, on)` → filtre une liste de progressions.

## Exemple

```ts
import { markSeen, reviewCard, getPool, isDue } from '../engine/srs';

let p = markSeen('dep-33-prefecture', '2026-08-17');
// p.nextReviewAt === '2026-08-17' → due dès aujourd'hui

p = reviewCard(p, true, '2026-08-17');
// p.streak === 1, p.nextReviewAt === '2026-08-20' (3 jours)
// getPool(p) === 'en_cours' (une seule réussite, pas encore 2)

p = reviewCard(p, true, '2026-08-20');
// p.streak === 2, getPool(p) === 'connue'

p = reviewCard(p, false, '2026-09-10');
// p.streak === 0, p.nextReviewAt === '2026-09-11' (1 jour)
// getPool(p) === 'en_cours'
```
