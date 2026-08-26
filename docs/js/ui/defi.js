/**
 * Écran Défi : placer des départements sur la carte, contre ses vies.
 *
 * Le principe, en une phrase : on donne un nom de département, il faut le
 * trouver sur la carte — d'abord sa région, puis le département à l'intérieur.
 * Bien placé, on passe au suivant ; mal placé, on perd une vie et on
 * recommence le même. Zéro vie : la partie s'arrête.
 *
 * Deux différences volontaires avec le Quiz :
 *
 * 1. **Le Défi ne touche pas au SRS.** C'est un jeu libre : y placer
 *    trente départements ne fait pas croire à la répétition espacée qu'on
 *    les a révisés (voir .claude/skills/moteur-srs/). Le Quiz reste le seul
 *    écran qui écrit la progression.
 * 2. **Il pioche dans les 96 départements**, pas seulement dans ceux déjà
 *    vus en leçon — sinon l'option « tous » ne voudrait rien dire. C'est
 *    l'endroit où l'on découvre ; le Quiz est celui où l'on révise.
 *
 * En cas d'erreur, seule la forme touchée est peinte en rouge : la bonne
 * réponse n'est révélée qu'à la fin de la partie. La montrer avant
 * supprimerait tout l'intérêt du deuxième essai.
 */

import { loadFranceGeo } from '../data/geo.js';
import { carteRegions, cartePlacementDepartements } from './carte.js';
import { clear, el } from './dom.js';

/** Le temps de voir le retour vert/rouge avant d'enchaîner. */
const FEEDBACK_MS = { correct: 650, wrong: 1200 };
/** Plus long après un « Passer » : on découvre la réponse, il faut le temps de la lire. */
const SKIP_REVEAL_MS = 1800;

/** Vies au choix. `Infinity` = on joue sans pression. */
const VIES = [
  { label: '3 vies', value: 3 },
  { label: '2 vies', value: 2 },
  { label: 'Illimitées', value: Infinity },
];

/** Longueur de la partie. `Infinity` sera ramené au nombre de départements. */
const LONGUEURS = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: 'Tous', value: Infinity },
];

/** @returns {HTMLElement} */
export function defiScreen() {
  const root = el('section', { class: 'screen' });
  // Le `gap` de .screen sépare les enfants de la section — pas ceux d'un div
  // intermédiaire. L'écran étant entièrement redessiné dans ce conteneur, il
  // lui faut son propre espacement, sinon les réglages se touchent.
  const slot = el('div', { class: 'defi-slot' });
  root.appendChild(slot);

  /** @type {import('../data/geo.js').FranceGeo | null} */
  let geo = null;

  // Réglages, conservés d'une partie à l'autre pendant la session.
  let vies = VIES[0].value;
  let longueur = LONGUEURS[0].value;
  /** Régions dans lesquelles on pioche. Toutes au départ. @type {Set<string>} */
  let regionsChoisies = new Set();

  /** 'reglages' | 'partie' | 'fin' */
  let phase = 'reglages';

  /** @type {import('../data/geo.js').DepartementGeo[]} */
  let cibles = [];
  /** Position dans la liste : avance sur une réussite ET sur un « Passer ». */
  let index = 0;
  /** Départements réellement trouvés — c'est le score, et ce qui reste en vert. */
  let trouvees = new Set();
  let viesRestantes = 0;
  /** Étape en cours : choisir la région, puis le département. */
  let etape = 'region';
  /** Retour visuel courant : { picked, correct } — `correct` seulement à la fin. */
  let reveal = null;
  /** Verrouille la carte pendant l'affichage du retour visuel. */
  let busy = false;

  /** Les départements jouables : ceux des régions retenues. */
  function pioche() {
    return geo.departements.filter((d) => regionsChoisies.has(d.regionCode));
  }

  function commencer() {
    const disponibles = pioche();
    if (disponibles.length === 0) return;

    // Une partie ne peut pas être plus longue que ce qu'on a retenu : garder
    // 20 alors qu'on n'a coché que la Corse donnerait une partie de 2, et
    // c'est très bien — l'en-tête affichera « 1 / 2 », pas « 1 / 20 ».
    const total = longueur === Infinity ? disponibles.length : Math.min(longueur, disponibles.length);
    cibles = melange(disponibles).slice(0, total);
    index = 0;
    trouvees = new Set();
    viesRestantes = vies;
    etape = 'region';
    reveal = null;
    busy = false;
    phase = 'partie';
    render();
  }

  // ---- Réglages ----

  function renderReglages() {
    clear(slot);
    slot.appendChild(el('h1', { class: 'screen-title', text: 'Défi' }));
    slot.appendChild(
      el('p', { class: 'muted', text: 'On vous donne un département, vous le placez sur la carte.' }),
    );

    slot.appendChild(
      groupeReglage('Vies', VIES, vies, (valeur) => {
        vies = valeur;
        render();
      }),
    );
    slot.appendChild(
      groupeReglage('Départements', LONGUEURS, longueur, (valeur) => {
        longueur = valeur;
        render();
      }),
    );

    slot.appendChild(reglageRegions());

    const jouables = pioche().length;
    slot.appendChild(
      el('button', {
        class: 'defi-start-button',
        type: 'button',
        text: 'Commencer',
        // Aucune région retenue : rien à piocher, le bouton ne peut rien faire.
        disabled: jouables === 0 ? 'disabled' : null,
        onClick: commencer,
      }),
    );
  }

  /**
   * Carte des régions retenues. Toutes allumées au départ ; toucher une
   * région l'éteint, la retoucher la rallume — on ne sera plus interrogé sur
   * ses départements.
   */
  function reglageRegions() {
    const total = geo.regions.length;
    const retenues = regionsChoisies.size;
    const jouables = pioche().length;

    const bloc = el('div', { class: 'defi-reglage' }, [
      el('div', { class: 'defi-reglage-entete' }, [
        el('p', { class: 'defi-reglage-titre', text: 'Régions' }),
        // Raccourci utile dès qu'on en a éteint plusieurs : les rallumer une
        // par une serait fastidieux.
        retenues < total
          ? el('button', {
              class: 'defi-tout-button',
              type: 'button',
              text: 'Tout sélectionner',
              onClick: () => {
                regionsChoisies = new Set(geo.regions.map((r) => r.code));
                render();
              },
            })
          : null,
      ]),

      el('div', { class: 'carte-slot defi-carte-selection' }, [
        carteRegions({
          geo,
          activeRegionCodes: new Set(geo.regions.map((r) => r.code)),
          selectedRegionCodes: regionsChoisies,
          onSelect: (code) => {
            if (regionsChoisies.has(code)) regionsChoisies.delete(code);
            else regionsChoisies.add(code);
            render();
          },
        }),
      ]),

      el('p', {
        class: 'muted center defi-regions-compte',
        text:
          jouables === 0
            ? 'Touchez au moins une région pour jouer.'
            : `${retenues} région${retenues > 1 ? 's' : ''} sur ${total} — ${jouables} départements jouables.`,
      }),
    ]);

    return bloc;
  }

  /**
   * Un réglage = une ligne de boutons dont un seul est actif. `radiogroup`
   * plutôt que des boutons isolés : un lecteur d'écran annonce alors « 1 sur
   * 3 » et l'état sélectionné.
   */
  function groupeReglage(titre, options, valeurCourante, onPick) {
    const boutons = options.map((option) =>
      el('button', {
        class: option.value === valeurCourante ? 'defi-option defi-option-active' : 'defi-option',
        type: 'button',
        role: 'radio',
        'aria-checked': option.value === valeurCourante ? 'true' : 'false',
        text: option.label,
        onClick: () => onPick(option.value),
      }),
    );

    return el('div', { class: 'defi-reglage' }, [
      el('p', { class: 'defi-reglage-titre', id: `defi-${normaliseId(titre)}`, text: titre }),
      el('div', { class: 'defi-options', role: 'radiogroup', 'aria-labelledby': `defi-${normaliseId(titre)}` }, boutons),
    ]);
  }

  // ---- Partie ----

  function renderPartie() {
    const cible = cibles[index];
    clear(slot);

    slot.appendChild(
      el('div', { class: 'defi-head' }, [
        el('span', { class: 'defi-progres', text: `${index + 1} / ${cibles.length}` }),
        coeurs(viesRestantes, vies),
      ]),
    );

    slot.appendChild(el('p', { class: 'defi-consigne', text: 'Où se trouve…' }));
    slot.appendChild(el('h2', { class: 'defi-cible', text: cible.nom }));

    const carte = el('div', { class: 'carte-slot' });
    carte.appendChild(etape === 'region' ? carteDesRegions(cible) : carteDeLaRegion(cible));
    slot.appendChild(carte);

    slot.appendChild(
      el('p', {
        class: 'muted center defi-etape',
        text: etape === 'region' ? 'Touchez sa région.' : 'Touchez le département.',
      }),
    );

    slot.appendChild(
      el('div', { class: 'defi-passer' }, [
        el('button', {
          class: 'defi-passer-button',
          type: 'button',
          text: 'Passer ce département',
          disabled: busy ? 'disabled' : null,
          onClick: passer,
        }),
        el('p', {
          class: 'muted center defi-passer-note',
          text: 'Sans perdre de vie — mais il ne comptera pas comme trouvé.',
        }),
      ]),
    );
  }

  /**
   * Passer le département en cours.
   *
   * Ne coûte pas de vie : la sanction est ailleurs, le département ne sera
   * pas compté comme trouvé et le score final le dira. Punir deux fois
   * découragerait d'utiliser le bouton, or il est là pour éviter de perdre
   * bêtement sur un département qu'on ne connaît pas encore.
   *
   * On montre où il était avant d'enchaîner : c'est précisément ce qu'on ne
   * savait pas, autant l'apprendre.
   */
  function passer() {
    if (busy) return;
    busy = true;

    etape = 'departement';
    reveal = { picked: null, correct: cibles[index].code };
    render();

    window.setTimeout(() => {
      busy = false;
      reveal = null;
      index += 1;
      etape = 'region';
      if (index >= cibles.length) phase = 'fin';
      render();
    }, SKIP_REVEAL_MS);
  }

  function carteDesRegions(cible) {
    return carteRegions({
      geo,
      activeRegionCodes: new Set(geo.regions.map((r) => r.code)),
      correctCode: reveal ? reveal.correct : null,
      pickedCode: reveal ? reveal.picked : null,
      onSelect: busy ? null : (regionCode) => repondre(regionCode === cible.regionCode, regionCode),
    });
  }

  function carteDeLaRegion(cible) {
    return cartePlacementDepartements({
      geo,
      regionCode: cible.regionCode,
      correctCode: reveal ? reveal.correct : null,
      pickedCode: reveal ? reveal.picked : null,
      // Les départements déjà trouvés restent en vert clair : en revenant
      // dans une région, on voit ce qu'on y a déjà placé.
      solvedCodes: trouvees,
      onSelect: busy ? null : (code) => repondre(code === cible.code, code),
    });
  }

  /**
   * Une réponse, à l'une ou l'autre étape.
   *
   * Juste : la forme touchée passe au **vert**, puis on avance (région →
   * département, ou département → cible suivante).
   *
   * Faux : elle passe au **rouge**, une vie en moins, et on recommence la
   * même étape. `correct` reste nul dans ce cas : la bonne réponse n'est pas
   * révélée, sinon le deuxième essai serait offert. C'est la seule raison
   * pour laquelle les deux cas ne sont pas symétriques.
   */
  function repondre(juste, touche) {
    if (busy) return;
    busy = true;
    reveal = { picked: touche, correct: juste ? touche : null };
    render();

    window.setTimeout(() => {
      busy = false;
      reveal = null;

      if (juste) {
        if (etape === 'region') {
          etape = 'departement';
        } else {
          trouvees.add(cibles[index].code);
          index += 1;
          etape = 'region';
        }
        if (index >= cibles.length) phase = 'fin';
        render();
        return;
      }

      viesRestantes -= 1;
      if (viesRestantes <= 0) phase = 'fin';
      render();
    }, juste ? FEEDBACK_MS.correct : FEEDBACK_MS.wrong);
  }

  // ---- Fin de partie ----

  function renderFin() {
    // Deux fins distinctes : être allé au bout de la liste, ou avoir épuisé
    // ses vies en route. Le score, lui, est toujours le nombre de trouvés —
    // les départements passés n'en font pas partie.
    const termine = index >= cibles.length;
    const trouves = trouvees.size;
    const passes = index - trouves;
    const cible = termine ? null : cibles[index];
    clear(slot);

    slot.appendChild(
      el('div', { class: 'empty-state center' }, [
        el('h2', {
          class: 'empty-title',
          text: !termine ? 'Plus de vies.' : trouves === cibles.length ? 'Défi réussi.' : 'Défi terminé.',
        }),
        el('p', { class: 'quiz-score', text: `${trouves} / ${cibles.length}` }),
        el('p', {
          class: 'muted',
          text: !termine
            ? `Le département cherché était ${cible.nom}.`
            : trouves === cibles.length
              ? 'Tous les départements placés.'
              : `${passes} département${passes > 1 ? 's' : ''} passé${passes > 1 ? 's' : ''}.`,
        }),
      ]),
    );

    // Perdu : on montre enfin où il était. C'est le seul moment où la bonne
    // réponse apparaît en vert sans avoir été trouvée.
    if (!termine) {
      slot.appendChild(
        el('div', { class: 'carte-slot' }, [
          cartePlacementDepartements({
            geo,
            regionCode: cible.regionCode,
            correctCode: cible.code,
            solvedCodes: trouvees,
          }),
        ]),
      );
    }

    slot.appendChild(
      el('div', { class: 'defi-fin-actions' }, [
        el('button', { class: 'defi-start-button', type: 'button', text: 'Rejouer', onClick: commencer }),
        el('button', {
          class: 'defi-retour-button',
          type: 'button',
          text: 'Changer les réglages',
          onClick: () => {
            phase = 'reglages';
            render();
          },
        }),
      ]),
    );
  }

  function render() {
    if (!geo) {
      clear(slot);
      slot.appendChild(el('p', { class: 'muted', text: 'Chargement…' }));
      return;
    }
    if (phase === 'reglages') renderReglages();
    else if (phase === 'partie') renderPartie();
    else renderFin();
  }

  loadFranceGeo()
    .then((loadedGeo) => {
      geo = loadedGeo;
      regionsChoisies = new Set(geo.regions.map((r) => r.code));
      render();
    })
    .catch((error) => {
      console.warn('Atlas : défi indisponible.', error);
      clear(slot);
      slot.appendChild(
        el('p', { class: 'muted center', text: "Le défi n'a pas pu être chargé. Vérifie ta connexion." }),
      );
    });

  render();
  return root;
}

/** Les vies restantes, en cœurs pleins et vides. `Infinity` s'affiche « ∞ ». */
function coeurs(restantes, total) {
  if (total === Infinity) {
    return el('span', { class: 'defi-vies', 'aria-label': 'Vies illimitées' }, [
      el('span', { class: 'defi-infini', 'aria-hidden': 'true', text: '∞' }),
    ]);
  }

  const bloc = el('span', {
    class: 'defi-vies',
    'aria-label': `${Math.max(restantes, 0)} vie${restantes > 1 ? 's' : ''} restante${restantes > 1 ? 's' : ''}`,
  });
  for (let i = 0; i < total; i += 1) {
    bloc.appendChild(coeur(i < restantes));
  }
  return bloc;
}

/** Un cœur en SVG plutôt qu'en caractère : « ♥ » part en emoji sur iOS. */
function coeur(plein) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const node = document.createElementNS(svgNS, 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('class', plein ? 'defi-coeur defi-coeur-plein' : 'defi-coeur');
  node.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute(
    'd',
    'M12 20.7 4.6 13.3a4.8 4.8 0 0 1 6.8-6.8l.6.6.6-.6a4.8 4.8 0 0 1 6.8 6.8z',
  );
  path.setAttribute('fill', plein ? 'currentColor' : 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linejoin', 'round');
  node.appendChild(path);
  return node;
}

/** Copie mélangée (Fisher-Yates) — ne modifie pas l'original. */
function melange(items) {
  const copie = [...items];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

function normaliseId(texte) {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
