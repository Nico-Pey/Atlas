# Atlas — version web installable (PWA)

Même app qu'ailleurs dans le repo (Thème → Leçon → Carte, répétition espacée,
Nouvelle-Aquitaine), mais en **application web installable** : elle s'ajoute à
l'écran d'accueil de l'iPhone avec une icône, s'ouvre en plein écran sans barre
Safari, et fonctionne sans connexion.

**Pourquoi c'est la meilleure option ici** : tu développes sous Windows, sans
Mac, sans compte développeur Apple, sans expiration au bout de 7 jours. Et
contrairement aux deux autres versions, **celle-ci a réellement été testée** :
8 tests du moteur + 44 vérifications dans un navigateur simulant un iPhone
(navigation, enregistrement de la progression, règles SRS, vraies frontières
des départements, service worker).

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

## 6. Vraies frontières, préfectures et blasons

La carte affiche les **vraies frontières** des départements (pas des formes
schématiques) et le point exact de chaque préfecture, avec sa population.

**Source des tracés** : IGN / INSEE (Admin Express COG, millésime 2018), via
le dépôt public [gregoiredavid/france-geojson](https://github.com/gregoiredavid/france-geojson)
— Licence Ouverte / Open Licence, réutilisation libre avec attribution (voir
le crédit affiché dans l'app). Les tracés bruts pèsent plusieurs Mo ; ils sont
**simplifiés et pré-calculés** par `tools/build-geo.mjs` (algorithme de
Douglas-Peucker) en un fichier léger (~40 Ko) commité dans le repo :
`docs/js/data/geo/nouvelle-aquitaine.json`. L'app ne télécharge jamais les
données brutes — seul ce script, lancé une fois par un développeur, le fait.

Pour régénérer ce fichier (si les tracés changent, ou pour ajouter une
nouvelle région) :

```bash
node tools/build-geo.mjs
```

Ajouter une région avec de vraies frontières :

1. Dans `tools/build-geo.mjs`, dupliquer les constantes `DEPARTEMENTS_URL` /
   `COMMUNES_URL` (adapter le nom de région dans l'URL france-geojson) et la
   table `CHEF_LIEU_BY_DEPARTEMENT` (codes INSEE des préfectures — trouvables
   dans `@etalab/decoupage-administratif`, sans avoir besoin de l'installer
   comme dépendance du projet).
2. Lancer le script : il écrit `docs/js/data/geo/<région>.json`.
3. Ajouter la leçon dans `js/data/themes.js` avec le même `lessonId`.
4. Ajouter le fichier généré à `ASSETS` dans `docs/sw.js`, et incrémenter
   `CACHE_NAME`.

### Blasons

Chaque département a un champ `blason` dans le fichier généré, à `null` par
défaut : l'app affiche alors un espace réservé (le code du département dans
un cadre en pointillés) plutôt qu'une image cassée.

Pour les ajouter :

1. Télécharger le blason de chaque département (SVG de préférence) depuis
   Wikimedia Commons — domaine public ou licence libre selon le blason,
   vérifier la mention de licence sur la page de chaque fichier avant de
   l'utiliser.
2. Les enregistrer dans `docs/icons/blasons/<code>.svg` (ex : `33.svg`).
3. Dans `docs/js/data/geo/nouvelle-aquitaine.json`, remplacer `"blason": null`
   par `"blason": "./icons/blasons/33.svg"` pour chaque département — ou
   modifier `tools/build-geo.mjs` pour le faire automatiquement au prochain
   passage (une table `BLASON_BY_DEPARTEMENT` sur le même modèle que
   `CHEF_LIEU_BY_DEPARTEMENT` suffit).
4. Ajouter les fichiers à `ASSETS` dans `docs/sw.js`.

---

## 7. Structure du code

```
docs/
  index.html      Page unique. Toutes les balises spécifiques à iOS sont ici.
  app.css         Styles + jetons (couleurs, espacements) partagés.
  sw.js           Service worker : met l'app en cache pour le hors-ligne.
  manifest.webmanifest   Nom, icône, couleurs de l'app installée.
  icons/          Icônes PNG (générées par tools/generate-icons.mjs).
  js/
    data/themes.js     Contenu figé : thèmes, leçons, cartes.
    data/geo.js         Chargement paresseux des géométries régionales.
    data/geo/*.json     Tracés simplifiés + préfectures (voir § 6 ci-dessus).
    engine/            Moteur SRS PUR : ni DOM, ni stockage, ni horloge.
    storage/store.js   Seul module qui touche au stockage du navigateur.
    ui/                Écrans et composants.
    app.js             Routage par ancre + barre d'onglets.
tools/
  build-geo.mjs        Génère docs/js/data/geo/*.json (voir § 6).
  generate-icons.mjs   Génère docs/icons/*.png.
```

Mêmes principes que les autres versions : la règle de répétition espacée
n'existe qu'à un seul endroit (`js/engine/srs.js`, décrit dans
`.claude/skills/moteur-srs/`), et les écrans ne connaissent aucune région en
dur — ajouter une leçon se fait uniquement dans `js/data/themes.js` (+ sa
géométrie, voir § 6).

## 8. Lancer les tests

```bash
node --test "tests/**/*.test.js"
```

Vérifie les règles du moteur : +3 jours si réussi, +1 si raté, passage en
« connue » après deux réussites d'affilée, changements de mois et années
bissextiles.
