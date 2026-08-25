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

Le pool est un statut **d'affichage** — il colore les départements sur la
carte d'une leçon, et les régions sur la carte de France de l'accueil — pas
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

## Le lot du jour (10 cartes maximum)

Le quiz ne propose pas toutes les cartes dues : il en retient **au plus 10**
(`DAILY_CARD_LIMIT`), les plus en retard d'abord. Une session bornée est
tenable tous les matins ; une liste qui s'allonge sans fin ne l'est pas.

- `selectDailyCardIds(allProgress, on, limit)` fait ce choix. Il est
  **déterministe** (aucun hasard) : même entrée, même sortie. C'est ce qui
  permet de refaire le quiz dans la journée avec exactement le même lot.
- Le lot est **figé pour la journée** et mémorisé par `/storage`
  (`getDailyCardIds`). Seule exception : s'il n'est pas plein, il se complète
  avec les cartes devenues dues entre-temps — typiquement une carte tout juste
  apprise en leçon, due immédiatement. Les cartes déjà dans le lot, elles, ne
  changent jamais avant le lendemain.
- Seul le **contenu** du lot est figé, pas son **ordre** : `ui/quiz.js`
  mélange les manches (`shuffled()`) à chaque ouverture de l'écran et à
  chaque "Refaire ce quiz". Sans ça, la position dans la liste finirait par
  se retenir aussi bien que le département qui s'y trouve — ce n'est pas ce
  qu'on veut apprendre.

## Une seule comptabilisation par carte et par jour

Refaire le quiz dans la même journée est un **entraînement libre** : ça
n'avance ni ne recule la progression. Seule la **première réponse de la
journée** pour une carte donnée met à jour son état SRS
(`storage.recordDailyReview`).

Sans cette règle, il suffirait de relancer le quiz jusqu'à tomber juste pour
s'auto-décerner un "connue" qui ne voudrait plus rien dire — l'inverse de ce
que mesure une répétition espacée.

## Ce qu'une "réussite" veut dire côté quiz

Une manche interroge un département sur ses **quatre informations** — nom,
numéro, chef-lieu, emplacement sur la carte — en **deux temps** :

1. **Le nom, toujours.** L'indice de départ est tiré au sort parmi les trois
   autres informations : le numéro, le chef-lieu, ou l'emplacement (la carte
   de la région avec le département colorié).
2. **Les deux informations restantes**, posées sur la même page : exactement
   celles que le temps 1 n'a pas déjà données.

Se tromper au temps 1 **n'interrompt pas la manche** : le bon nom est révélé
et sert de contexte, les deux questions suivantes sont quand même posées. La
carte n'est comptée comme réussie que si **les trois réponses** sont
correctes ; une seule erreur suffit à compter la manche comme un échec
(retour dès le lendemain).

Le SRS n'est mis à jour **qu'à la fin de la manche**, jamais question par
question : une carte = une réponse SRS par jour, quel que soit le nombre de
questions posées dessus.

### Le Défi n'est pas le SRS non plus

L'onglet Défi (`ui/defi.js`) est un jeu libre : il pioche dans les 96
départements, y compris ceux jamais vus en leçon, et **n'écrit rien** dans
`/storage`. Le Quiz reste le seul écran qui fait avancer la répétition
espacée — sinon une partie de Défi ferait croire au moteur qu'on a révisé
trente cartes.

### Les points ne sont pas le SRS

Les questions textuelles se répondent au clavier ; un bouton fait venir un QCM
à quatre choix quand on sèche. Trouver seul vaut 2 points, trouver avec les
propositions 1 point. **Ce barème n'a aucun effet sur la répétition espacée** :
une carte répondue juste avec les propositions est une réussite comme une
autre, elle sort du pool 3 jours. Les points mesurent l'aisance sur une
session, le SRS mesure la mémoire dans le temps — ne pas mélanger les deux
dans `engine/srs.js`, qui ne connaît que juste/faux.

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
- `selectDailyCardIds(allProgress, on, limit)` → le lot du jour, plafonné et
  déterministe (voir plus haut). Ne mute pas la liste reçue.
- `DAILY_CARD_LIMIT` → la valeur de ce plafond (10).

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
