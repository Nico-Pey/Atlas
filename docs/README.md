# Atlas — version web installable (PWA)

Même app qu'ailleurs dans le repo (Thème → Leçon → Carte, répétition espacée,
Nouvelle-Aquitaine), mais en **application web installable** : elle s'ajoute à
l'écran d'accueil de l'iPhone avec une icône, s'ouvre en plein écran sans barre
Safari, et fonctionne sans connexion.

**Pourquoi c'est la meilleure option ici** : tu développes sous Windows, sans
Mac, sans compte développeur Apple, sans expiration au bout de 7 jours. Et
contrairement aux deux autres versions, **celle-ci a réellement été testée** :
8 tests du moteur + 39 vérifications dans un navigateur simulant un iPhone
(navigation, enregistrement de la progression, règles SRS, service worker).

Aucune étape de compilation : ce sont des fichiers HTML/CSS/JS lus directement
par le navigateur. Tu peux modifier un fichier et recharger, c'est tout.

---

## 1. Tester sur ton PC Windows

⚠️ **Ne double-clique pas sur `index.html`.** Ouvert en `file://`, le
navigateur bloque les modules JavaScript et le service worker : la page
resterait blanche. Il faut un petit serveur local — une ligne de commande.

Ouvre un terminal (PowerShell) **dans le dossier du projet**, puis :

```bash
# Si tu as Node.js (installé pour la version Expo) :
npx serve docs

# Ou si tu as Python :
cd docs
python -m http.server 8000
```

Ouvre ensuite l'adresse affichée (`http://localhost:3000` ou
`http://localhost:8000`) dans Chrome ou Edge.

**Astuce** : dans Chrome, `F12` → icône téléphone en haut à gauche du panneau →
choisis « iPhone 14 Pro ». Tu verras exactement le rendu mobile.

---

## 2. Mettre en ligne gratuitement (GitHub Pages)

Une fois cette branche fusionnée dans `main` :

1. Sur GitHub, va dans **Settings** du repo → **Pages** (menu de gauche).
2. **Source** : `Deploy from a branch`.
3. **Branch** : `main`, et **dossier** : `/docs`. Clique **Save**.
4. Attends 1 à 2 minutes. L'adresse apparaît en haut de la page :

   **https://nico-pey.github.io/Atlas/**

C'est pour ça que l'app est dans un dossier nommé `docs/` : c'est le seul nom
de sous-dossier que GitHub Pages accepte sans configuration supplémentaire.

Tous les chemins de l'app sont relatifs (`./js/app.js` et non `/js/app.js`),
donc elle fonctionne aussi bien à cette adresse `/Atlas/` qu'à la racine d'un
domaine. C'est vérifié par les tests.

---

## 3. Installer sur l'iPhone

1. Ouvre l'adresse **dans Safari** (obligatoire — depuis Chrome iOS, l'option
   d'installation n'existe pas).
2. Touche le bouton **Partager** (le carré avec une flèche vers le haut).
3. Fais défiler et choisis **« Sur l'écran d'accueil »**.
4. Valide. L'icône apparaît sur ton écran d'accueil.

Lancée depuis cette icône, l'app s'ouvre **en plein écran**, sans barre
d'adresse : à l'usage, rien ne la distingue d'une app installée. Elle
fonctionne aussi **sans connexion** (le service worker garde tout en cache),
donc dans le métro le matin, ça marche.

---

## 4. Mettre à jour l'app plus tard

Quand tu modifies un fichier :

1. Commit + push sur `main`. GitHub Pages se met à jour tout seul en ~1 minute.
2. **Incrémente `CACHE_NAME` dans `docs/sw.js`** (`atlas-v1` → `atlas-v2`).
   Sans ça, les iPhones qui ont déjà installé l'app continueront de servir
   l'ancienne version depuis leur cache.
3. Sur l'iPhone, ferme complètement l'app et rouvre-la (parfois deux fois : le
   service worker installe la nouvelle version au premier lancement et la sert
   au suivant).

---

## 5. Ce que la version web ne peut pas faire

- **Notifications quotidiennes** : c'est la seule vraie perte par rapport à une
  app native. iOS sait envoyer des notifications à une PWA depuis iOS 16.4,
  mais ça exige un serveur qui les envoie — donc plus de « tout est local ».
  En attendant, un rappel dans l'app Horloge fait le même travail.
- **Sauvegarde de la progression** : elle vit dans le navigateur, sur
  l'appareil. Elle survit aux redémarrages et au mode avion, mais disparaît si
  tu supprimes l'app de l'écran d'accueil ou vides les données de Safari. Rien
  n'est synchronisé entre appareils (il n'y a pas de serveur).

---

## 6. Structure du code

```
docs/
  index.html      Page unique. Toutes les balises spécifiques à iOS sont ici.
  app.css         Styles + jetons (couleurs, espacements) partagés.
  sw.js           Service worker : met l'app en cache pour le hors-ligne.
  manifest.webmanifest   Nom, icône, couleurs de l'app installée.
  icons/          Icônes PNG (générées par tools/generate-icons.mjs).
  js/
    data/themes.js     Contenu figé : thèmes, leçons, cartes.
    engine/            Moteur SRS PUR : ni DOM, ni stockage, ni horloge.
    storage/store.js   Seul module qui touche au stockage du navigateur.
    ui/                Écrans et composants.
    app.js             Routage par ancre + barre d'onglets.
```

Mêmes principes que les autres versions : la règle de répétition espacée
n'existe qu'à un seul endroit (`js/engine/srs.js`, décrit dans
`.claude/skills/moteur-srs/`), et les écrans ne connaissent aucune région en
dur — ajouter une leçon se fait uniquement dans `js/data/themes.js`.

## 7. Lancer les tests

```bash
node --test "tests/**/*.test.js"
```

Vérifie les règles du moteur : +3 jours si réussi, +1 si raté, passage en
« connue » après deux réussites d'affilée, changements de mois et années
bissextiles.
