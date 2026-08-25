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
  const slot = el('div');
  root.appendChild(slot);

  /** @type {import('../data/geo.js').FranceGeo | null} */
  let geo = null;

  // Réglages, conservés d'une partie à l'autre pendant la session.
  let vies = VIES[0].value;
  let longueur = LONGUEURS[0].value;

  /** 'reglages' | 'partie' | 'fin' */
  let phase = 'reglages';

  /** @type {import('../data/geo.js').DepartementGeo[]} */
  let cibles = [];
  let index = 0;
  let viesRestantes = 0;
  /** Étape en cours : choisir la région, puis le département. */
  let etape = 'region';
  /** Retour visuel courant : { picked, correct } — `correct` seulement à la fin. */
  let reveal = null;
  /** Verrouille la carte pendant l'affichage du retour visuel. */
  let busy = false;

  function commencer() {
    const total = longueur === Infinity ? geo.departements.length : longueur;
    cibles = melange(geo.departements).slice(0, total);
    index = 0;
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

    slot.appendChild(
      el('button', { class: 'defi-start-button', type: 'button', text: 'Commencer', onClick: commencer }),
    );
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
      onSelect: busy ? null : (code) => repondre(code === cible.code, code),
    });
  }

  /**
   * Une réponse, à l'une ou l'autre étape.
   *
   * Juste : on avance (région → département, ou département → cible
   * suivante). Faux : une vie en moins, et on recommence **la même étape**
   * — la bonne réponse n'est pas montrée, sinon le deuxième essai serait
   * offert.
   */
  function repondre(juste, touche) {
    if (busy) return;
    busy = true;
    reveal = { picked: touche, correct: null };
    render();

    window.setTimeout(() => {
      busy = false;
      reveal = null;

      if (juste) {
        if (etape === 'region') {
          etape = 'departement';
        } else {
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
    const gagne = index >= cibles.length;
    const cible = gagne ? null : cibles[index];
    clear(slot);

    slot.appendChild(
      el('div', { class: 'empty-state center' }, [
        el('h2', { class: 'empty-title', text: gagne ? 'Défi réussi.' : 'Plus de vies.' }),
        el('p', { class: 'quiz-score', text: `${index} / ${cibles.length}` }),
        el('p', {
          class: 'muted',
          text: gagne
            ? 'Tous les départements placés.'
            : `Le département cherché était ${cible.nom}.`,
        }),
      ]),
    );

    // Perdu : on montre enfin où il était. C'est le seul moment où la bonne
    // réponse apparaît en vert.
    if (!gagne) {
      slot.appendChild(
        el('div', { class: 'carte-slot' }, [
          cartePlacementDepartements({ geo, regionCode: cible.regionCode, correctCode: cible.code }),
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
