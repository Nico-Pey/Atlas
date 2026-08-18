# Atlas — version native Swift / SwiftUI

Portage natif d'Atlas, à côté de la version Expo qui vit à la racine du repo.
Même app, même règle de répétition espacée, même contenu (Nouvelle-Aquitaine),
mais en Swift avec SwiftUI et SQLite.

> **Statut : code écrit, jamais compilé.** Il a été produit sans accès à un Mac
> ni à Xcode. Attends-toi à devoir corriger une ou deux erreurs de compilation
> au premier lancement — c'est normal, Xcode te les montrera ligne par ligne.
> Le moteur SRS, lui, peut être vérifié tout de suite (voir tout en bas).

---

## Étape 0 — Savoir ce que ton Mac peut faire

Tout dépend de la version de macOS installée : elle plafonne la version de
Xcode, qui plafonne la version d'iOS que tu peux viser. Ouvre **Terminal**
(Applications → Utilitaires → Terminal) et colle :

```bash
sw_vers
system_profiler SPHardwareDataType | grep -E "Model Name|Model Identifier|Memory|Chip|Processor"
df -h /
```

Ça te donne la version de macOS, le modèle exact du Mac, la RAM et l'espace
disque libre. Note les trois, ils décident de la suite.

---

## Étape 1 — Le verdict

Version maximale de Xcode selon macOS (de mémoire, à confirmer par l'App Store
qui ne te proposera de toute façon que ce qui est compatible) :

| macOS installé | Xcode max | Suffisant pour ce code ? |
|---|---|---|
| 10.13 High Sierra ou plus ancien | 10.1 | ❌ non |
| 10.14 Mojave | 11.3.1 | ❌ non (pas de `@main` ni `@StateObject`) |
| **10.15 Catalina** | **12.4** | ✅ oui, tout juste |
| 11 Big Sur | 13.2.1 | ✅ oui |
| 12 Monterey | 14.2 | ✅ oui |
| 13 Ventura et au-delà | 15+ | ✅ oui, confortable |

Ce code vise **iOS 14 minimum**, volontairement bas pour maximiser tes chances.

**Règle de pouce sur le matériel** : un Mac de **2012 ou plus récent** peut
généralement monter jusqu'à Catalina, donc suffit. Un Mac de 2011 ou avant est
probablement hors-jeu.

- ✅ **Ton Mac fait Catalina ou mieux** → continue à l'étape 2.
- ❌ **Ton Mac est plus ancien** → dis-le-moi. Deux options : soit je réécris
  le code pour iOS 13 (faisable, un peu moins élégant), soit tu restes sur la
  version Expo, qui n'a pas ce problème du tout.

⚠️ **Il y a un piège plus sérieux que la compilation, lis ça avant de tout
télécharger** : pour installer l'app sur **ton iPhone réel**, il faut que Xcode
connaisse la version d'iOS de ton iPhone. Xcode 12 (Catalina) ne sait déployer
que jusqu'à iOS 14. Si ton iPhone est récent, un vieux Mac ne pourra donc
**pas** installer l'app dessus — tu seras limité au **simulateur** sur l'écran
du Mac. Il existe des bidouilles non officielles pour contourner ça, elles
marchent une fois sur deux.

Autrement dit : si ton but est de faire Atlas **sur ton téléphone chaque
matin**, la version Expo reste la seule voie fiable avec un vieux Mac. La
version Swift est surtout intéressante pour apprendre le natif, ou si tu as un
Mac récent. C'est une vraie différence, pas un détail.

---

## Étape 2 — Installer Xcode

**App Store** (le plus simple) : cherche "Xcode", installe. L'App Store te
proposera automatiquement la dernière version compatible avec ton macOS.

Si l'App Store refuse en disant qu'il faut un macOS plus récent : va sur
<https://developer.apple.com/download/all/>, connecte-toi avec un **Apple ID
gratuit** (pas besoin du compte développeur à 99 €/an), cherche la version de
Xcode du tableau ci-dessus, télécharge le `.xip`, double-clique pour l'extraire,
puis glisse `Xcode.app` dans Applications.

À prévoir : **10 à 15 Go de téléchargement**, et il faut à peu près autant
d'espace libre en plus pour l'extraction. Sur un vieux Mac avec un disque dur
mécanique, compte facilement une soirée. Lance Xcode une première fois et
laisse-le installer ses composants additionnels quand il le demande.

---

## Étape 3 — Créer le projet

Xcode ne sait pas ouvrir un dossier de fichiers `.swift` : il lui faut un
projet. On le crée avec l'assistant, puis on y ajoute mes fichiers.

1. Xcode → **File → New → Project…**
2. Onglet **iOS**, modèle **App**, bouton **Next**.
3. Remplis :
   - **Product Name** : `Atlas`
   - **Interface** : **SwiftUI** ← important
   - **Language** : **Swift**
   - **Organization Identifier** : `com.tonprenom` (n'importe quoi d'unique)
   - Décoche **Use Core Data** et **Include Tests** s'ils sont proposés.
4. **Next**, puis enregistre le projet **où tu veux sauf dans le dossier du
   repo** (ça évite de mélanger le projet Xcode avec les fichiers versionnés).

---

## Étape 4 — Ajouter les fichiers d'Atlas

1. Dans Xcode, à gauche, tu vois un dossier `Atlas` contenant `AtlasApp.swift`
   et `ContentView.swift` générés automatiquement.
   **Supprime ces deux fichiers** (clic droit → Delete → *Move to Trash*).
   Mon `AtlasApp.swift` les remplace : il ne peut y avoir qu'un seul `@main`
   dans une app, sinon Xcode refuse de compiler.
2. Dans le Finder, ouvre `AtlasSwift/Atlas/` de ce repo. Sélectionne les
   dossiers `Data`, `Engine`, `Storage`, `Views` **et** le fichier
   `AtlasApp.swift`.
3. Glisse-les dans la colonne de gauche de Xcode, sous le dossier `Atlas`.
4. Dans la fenêtre qui s'ouvre, coche :
   - ✅ **Copy items if needed**
   - ✅ **Create groups** (et non "Create folder references")
   - ✅ la case devant la cible **Atlas** dans *Add to targets*

⚠️ **N'ajoute PAS le dossier `EngineTests/`** au projet Xcode. Il contient un
fichier `main.swift` qui entrerait en conflit avec `@main`. Il sert uniquement
en Terminal (voir plus bas).

---

## Étape 5 — Régler la version d'iOS minimale

1. Clique sur le projet **Atlas** tout en haut de la colonne de gauche.
2. Onglet **General** → section **Minimum Deployments** (ou *Deployment Info*
   selon la version de Xcode).
3. Choisis **iOS 14.0**.

Si ton Xcode ne propose pas iOS 14 dans la liste, prends la plus basse
disponible et dis-moi laquelle.

---

## Étape 6 — Lancer dans le simulateur

1. En haut de la fenêtre, à droite du bouton ▶︎, choisis un appareil :
   **iPhone 11** ou **iPhone SE** (les modèles légers démarrent beaucoup plus
   vite sur un vieux Mac).
2. Appuie sur **⌘R** (ou le bouton ▶︎).
3. Le simulateur met souvent 1 à 3 minutes à démarrer la première fois. Ensuite
   c'est rapide.

Tu devrais voir les trois onglets, la carte de Nouvelle-Aquitaine cliquable,
et le quiz qui se remplit au fur et à mesure que tu touches des départements.

**Si ça ne compile pas** : Xcode affiche les erreurs en rouge dans le panneau
de gauche (icône ⚠️). Envoie-moi le texte exact de la première erreur et la
ligne concernée, je corrige. Ne t'attaque pas aux erreurs suivantes avant :
en Swift, une seule erreur en haut du fichier en provoque souvent dix autres.

---

## Étape 7 — Sur ton iPhone réel (si Xcode le permet)

Relis l'avertissement de l'étape 1 avant de t'y lancer.

1. Xcode → **Settings** (ou *Preferences*) → **Accounts** → **+** → ajoute ton
   **Apple ID gratuit**.
2. Sélectionne le projet → onglet **Signing & Capabilities** → coche
   *Automatically manage signing* → choisis ton nom dans **Team**.
3. Si Xcode râle sur le *Bundle Identifier*, change-le pour quelque chose
   d'unique : `com.tonprenom.atlas`.
4. Branche l'iPhone en USB, débloque-le, réponds **Se fier** à la question.
5. Choisis ton iPhone dans la liste des appareils en haut, puis **⌘R**.
6. Sur l'iPhone : **Réglages → Général → VPN et gestion de l'appareil** →
   fais confiance à ton certificat de développeur.

⚠️ Avec un Apple ID gratuit, l'app **expire au bout de 7 jours** : il faut la
réinstaller depuis Xcode chaque semaine. Là encore, Expo Go n'a pas cette
contrainte.

---

## Vérifier le moteur SRS sans même ouvrir Xcode

Le moteur de répétition espacée n'utilise ni SwiftUI ni iOS : il se compile et
se teste en Terminal, en quelques secondes. C'est le seul morceau que tu peux
valider tout de suite. Depuis le dossier `AtlasSwift/` du repo :

```bash
swiftc Atlas/Engine/AtlasDate.swift Atlas/Engine/SRS.swift EngineTests/main.swift -o /tmp/atlas-srs-check && /tmp/atlas-srs-check
```

(Il faut les outils en ligne de commande : si le Mac te le propose, accepte, ou
lance `xcode-select --install`.)

Tu devrais voir défiler une trentaine de vérifications puis
`✅ N vérifications passées.` — ça confirme les règles : +3 jours si réussi,
+1 jour si raté, passage en "connue" après deux réussites d'affilée, retour en
"en cours" après un échec, changements de mois et années bissextiles compris.

---

## Ce qui change par rapport à la version Expo

| | Expo (racine du repo) | Swift (ce dossier) |
|---|---|---|
| Test sur iPhone | Expo Go, QR code, sans Mac | Xcode + câble, Mac obligatoire |
| Rafraîchissement des écrans | rechargement manuel au focus | automatique (`@Published`) |
| Base de données | `expo-sqlite` | SQLite via l'API C, même table `card_progress` |
| Carte interactive | `react-native-svg` | formes SwiftUI |

La règle SRS, les identifiants de cartes et le schéma SQL sont **identiques**
des deux côtés, volontairement.

## Pas encore fait

- Notifications quotidiennes.
- Une seule leçon (Nouvelle-Aquitaine), comme côté Expo.
- Carte schématique, pas de tracés géographiques réels (voir le commentaire en
  tête de `Views/CarteInteractiveView.swift`).
- Aucun test sur appareil ni simulateur — rien de ce code n'a encore tourné.
