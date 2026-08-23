/**
 * Écran de quiz : la révision du jour.
 *
 * Trois principes, décidés avec l'utilisateur :
 *
 * 1. **Au plus 10 départements par jour**, choisis parmi les cartes dues
 *    (voir engine/srs.selectDailyCardIds). Une session bornée est tenable
 *    tous les matins ; une liste qui s'allonge sans fin ne l'est pas.
 * 2. **Le lot du jour est figé** : refaire le quiz dans la même journée
 *    redonne les mêmes départements, et seule la première réponse de la
 *    journée compte pour le SRS (storage.recordDailyReview). Les passages
 *    suivants sont de l'entraînement libre.
 * 3. **On interroge dans plusieurs sens.** Chaque manche part d'un énoncé
 *    tiré au sort (le numéro, le nom, ou la silhouette) puis pose 2 facettes
 *    parmi celles que l'énoncé n'a pas déjà révélées : nom, numéro,
 *    préfecture, ou placement sur la carte (région puis département).
 *    C'est ce croisement des sens qui fait retenir, plutôt que de toujours
 *    répondre à la même question dans la même direction.
 *
 * Une manche compte comme réussie seulement si **les deux facettes** sont
 * correctes ; sinon c'est un échec (retour dès demain, règle SRS inchangée —
 * voir .claude/skills/moteur-srs/).
 */

import { findCard, findLessonByCardId } from '../data/themes.js';
import { today } from '../engine/date.js';
import { loadFranceGeo } from '../data/geo.js';
import { getDailyCardIds, getReviewedTodayCardIds, recordDailyReview } from '../storage/store.js';
import { carteRegions, cartePlacementDepartements, silhouette } from './carte.js';
import { clear, el } from './dom.js';

/** Le temps de voir le retour (vert/rouge) avant de passer à la suite. */
const FEEDBACK_DELAY_MS = 1100;
/** Un peu plus long sur la carte : la zone à regarder est plus large qu'un bouton. */
const MAP_FEEDBACK_DELAY_MS = 1600;

/** Nombre de facettes posées par manche. */
const FACETS_PER_ROUND = 2;

/** Énoncés possibles : ce qui identifie le département au début de la manche. */
const PROMPTS = ['numero', 'nom', 'silhouette'];

/** Facette déjà révélée par l'énoncé — inutile de la redemander. */
const FACET_REVEALED_BY_PROMPT = { numero: 'numero', nom: 'nom', silhouette: null };

/** @returns {HTMLElement} */
export function quizScreen() {
  const root = el('section', { class: 'screen' }, [el('h1', { class: 'screen-title', text: 'Quiz du jour' })]);
  const slot = el('div');
  root.appendChild(slot);

  /** @type {import('../data/geo.js').FranceGeo | null} */
  let geo = null;
  /** @type {ReturnType<typeof buildRound>[] | null} */
  let rounds = null;
  let index = 0;
  let facetIndex = 0;
  let roundHasError = false;
  let correctRounds = 0;
  /** Verrouille l'interface pendant l'affichage du retour visuel. */
  let answering = false;

  /** Sous-étape de la facette "placement" : d'abord la région, puis le département. */
  let placementStep = 'region';
  /** Mise en évidence temporaire sur la carte pendant le retour visuel. */
  let reveal = null;

  function renderLoading() {
    clear(slot);
    slot.appendChild(el('p', { class: 'muted', text: 'Chargement…' }));
  }

  function renderEmpty() {
    clear(slot);
    slot.appendChild(
      el('div', { class: 'empty-state' }, [
        el('h2', { class: 'empty-title', text: "Rien à réviser pour l'instant." }),
        el('p', {
          class: 'muted',
          text: "Apprenez de nouvelles cartes dans l'onglet Apprendre, ou revenez demain.",
        }),
      ]),
    );
  }

  function renderSummary() {
    clear(slot);
    const total = rounds.length;
    slot.appendChild(
      el('div', { class: 'empty-state' }, [
        el('h2', { class: 'empty-title', text: "Terminé pour aujourd'hui." }),
        el('p', { class: 'quiz-score', text: `${correctRounds} / ${total}` }),
        el('p', {
          class: 'muted',
          text:
            correctRounds === total
              ? 'Tout juste. À demain pour de nouvelles cartes.'
              : 'Les cartes ratées reviendront dès demain.',
        }),
        el('button', {
          class: 'replay-button',
          type: 'button',
          text: 'Refaire ce quiz',
          onClick: () => {
            // Même lot, nouveaux énoncés et nouvelles facettes tirés au sort.
            // La progression SRS, elle, ne bougera plus aujourd'hui — d'où le
            // badge "entraînement", relu depuis le stockage plutôt que
            // supposé, au cas où une carte n'aurait pas encore été comptée.
            const counted = new Set(getReviewedTodayCardIds(today()));
            rounds = rounds.map((round) => buildRound(round.card, geo, counted.has(round.card.id)));
            index = 0;
            facetIndex = 0;
            roundHasError = false;
            correctRounds = 0;
            render();
          },
        }),
        el('p', {
          class: 'muted quiz-practice-note',
          text: 'Refaire le quiz aujourd’hui est un entraînement : la progression ne change plus jusqu’à demain.',
        }),
      ]),
    );
  }

  function renderRound() {
    const round = rounds[index];
    const facet = round.facets[facetIndex];

    clear(slot);
    slot.appendChild(
      el('div', { class: 'quiz-head' }, [
        el('span', { class: 'quiz-progress', text: `${index + 1} / ${rounds.length}` }),
        round.alreadyCounted
          ? el('span', { class: 'quiz-badge', text: 'entraînement' })
          : null,
      ]),
    );

    // La carte prend beaucoup de hauteur : sur cette facette, l'énoncé est
    // affiché en plus petit pour que la carte tienne dans l'écran sans avoir
    // à scroller au moment de répondre.
    const isPlacement = facet === 'placement';
    slot.appendChild(promptBlock(round, isPlacement));
    slot.appendChild(
      el('p', {
        class: 'quiz-question',
        text: facetQuestion(facet, round.prompt),
      }),
    );

    if (isPlacement) {
      slot.appendChild(placementBlock(round));
    } else {
      slot.appendChild(choiceGrid(round.choices[facet], (success) => finishFacet(success, FEEDBACK_DELAY_MS)));
    }
  }

  /** L'énoncé : ce qu'on donne au départ pour identifier le département. */
  function promptBlock(round, compact) {
    if (round.prompt === 'silhouette') {
      const wrap = el('div', { class: compact ? 'quiz-prompt-shape quiz-prompt-compact' : 'quiz-prompt-shape' });
      wrap.appendChild(silhouette(round.dep));
      return wrap;
    }
    return el('p', {
      class: compact ? 'quiz-prompt-text quiz-prompt-compact' : 'quiz-prompt-text',
      text: round.prompt === 'numero' ? round.dep.code : round.dep.nom,
    });
  }

  /** Grille de propositions. Verrouille au premier tap, montre la bonne réponse, puis avance. */
  function choiceGrid(choice, onDone) {
    const grid = el('div', { class: 'quiz-choices' });
    const buttons = choice.options.map((option) =>
      el('button', { class: 'choice-button', type: 'button', text: option }),
    );

    buttons.forEach((button, i) => {
      button.addEventListener('click', () => {
        if (answering) return;
        answering = true;

        const success = choice.options[i] === choice.correct;
        buttons.forEach((other, j) => {
          if (choice.options[j] === choice.correct) other.classList.add('choice-correct');
          else if (j === i) other.classList.add('choice-wrong');
        });

        onDone(success);
      });
      grid.appendChild(button);
    });

    return grid;
  }

  /** Facette "placement" : carte de France (région), puis carte de la région (département). */
  function placementBlock(round) {
    const wrap = el('div', { class: 'carte-slot quiz-placement' });

    if (placementStep === 'region') {
      wrap.appendChild(
        carteRegions({
          geo,
          // Toutes les régions sont cliquables : n'en proposer qu'une partie
          // reviendrait à souffler la réponse.
          activeRegionCodes: new Set(geo.regions.map((r) => r.code)),
          revealCode: reveal ? reveal.code : null,
          revealIsCorrect: reveal ? reveal.isCorrect : true,
          onSelect: (regionCode) => {
            if (answering) return;
            answering = true;

            const success = regionCode === round.dep.regionCode;
            reveal = { code: success ? regionCode : round.dep.regionCode, isCorrect: success };
            renderRound();

            window.setTimeout(() => {
              reveal = null;
              answering = false;
              if (success) {
                // Bonne région : on enchaîne sur le département, dans la région.
                placementStep = 'departement';
                renderRound();
              } else {
                finishFacet(false, 0);
              }
            }, MAP_FEEDBACK_DELAY_MS);
          },
        }),
      );
      return wrap;
    }

    wrap.appendChild(
      cartePlacementDepartements({
        geo,
        regionCode: round.dep.regionCode,
        revealCode: reveal ? reveal.code : null,
        revealIsCorrect: reveal ? reveal.isCorrect : true,
        onSelect: (code) => {
          if (answering) return;
          answering = true;

          const success = code === round.dep.code;
          reveal = { code: success ? code : round.dep.code, isCorrect: success };
          renderRound();

          window.setTimeout(() => {
            reveal = null;
            finishFacet(success, 0);
          }, MAP_FEEDBACK_DELAY_MS);
        },
      }),
    );
    return wrap;
  }

  /** Fin d'une facette : on passe à la suivante, ou on clôt la manche. */
  function finishFacet(success, delay) {
    if (!success) roundHasError = true;

    window.setTimeout(() => {
      answering = false;
      placementStep = 'region';
      reveal = null;

      if (facetIndex + 1 < rounds[index].facets.length) {
        facetIndex += 1;
        renderRound();
        return;
      }

      finishRound();
    }, delay);
  }

  /** Fin d'une manche : c'est ici, et seulement ici, que le SRS est mis à jour. */
  function finishRound() {
    const round = rounds[index];
    const roundSucceeded = !roundHasError;
    if (roundSucceeded) correctRounds += 1;

    recordDailyReview(round.card.id, roundSucceeded, today());

    index += 1;
    facetIndex = 0;
    roundHasError = false;
    render();
  }

  function render() {
    if (!geo || !rounds) {
      renderLoading();
    } else if (rounds.length === 0) {
      renderEmpty();
    } else if (index >= rounds.length) {
      renderSummary();
    } else {
      renderRound();
    }
    window.scrollTo(0, 0);
  }

  loadFranceGeo()
    .then((loadedGeo) => {
      geo = loadedGeo;

      const day = today();
      const alreadyCounted = new Set(getReviewedTodayCardIds(day));
      rounds = getDailyCardIds(day)
        .map(findCard)
        .filter((card) => card !== undefined)
        .map((card) => buildRound(card, geo, alreadyCounted.has(card.id)))
        .filter((round) => round !== null);

      render();
    })
    .catch((error) => {
      console.warn('Atlas : quiz indisponible.', error);
      clear(slot);
      slot.appendChild(
        el('p', { class: 'muted center', text: "Le quiz n'a pas pu être chargé. Vérifie ta connexion." }),
      );
    });

  render();
  return root;
}

/**
 * Prépare une manche : l'énoncé, les 2 facettes et leurs propositions sont
 * tirés au sort **une fois pour toutes** ici. Les redessins (retour visuel,
 * étape suivante du placement) ne doivent pas re-mélanger les propositions
 * sous les doigts de l'utilisateur.
 *
 * @returns {object | null} null si le contenu est incohérent (carte sans
 *   géométrie), auquel cas la manche est simplement ignorée.
 */
function buildRound(card, geo, alreadyCounted = false) {
  const dep = geo.departements.find((d) => d.code === card.mapId);
  const lesson = findLessonByCardId(card.id);
  if (!dep || !dep.prefecture || !lesson) return null;

  const prompt = pickOne(PROMPTS);
  const revealed = FACET_REVEALED_BY_PROMPT[prompt];
  const available = ['nom', 'numero', 'chefLieu', 'placement'].filter((facet) => facet !== revealed);
  const facets = sample(available, FACETS_PER_ROUND);

  // Départements de la même leçon : ils fournissent des propositions
  // plausibles (même région), sans qu'aucune région soit codée en dur ici.
  const siblings = lesson.cards
    .filter((c) => c.id !== card.id)
    .map((c) => geo.departements.find((d) => d.code === c.mapId))
    .filter((d) => d !== undefined && d.prefecture);

  const choices = {};
  for (const facet of facets) {
    if (facet === 'placement') continue;
    choices[facet] = buildChoice(facet, dep, siblings);
  }

  return { card, dep, prompt, facets, choices, alreadyCounted };
}

/** Une question à choix multiples : la bonne réponse, mélangée aux distracteurs. */
function buildChoice(facet, dep, siblings) {
  const valueOf = {
    nom: (d) => d.nom,
    numero: (d) => d.code,
    chefLieu: (d) => d.prefecture.nom,
  }[facet];

  const correct = valueOf(dep);
  const distractors = sample(siblings, 3).map(valueOf);
  return { correct, options: shuffled([correct, ...distractors]) };
}

function facetQuestion(facet, prompt) {
  if (facet === 'nom') return prompt === 'silhouette' ? 'Quel est ce département ?' : 'Quel département est-ce ?';
  if (facet === 'numero') return 'Quel est son numéro ?';
  if (facet === 'chefLieu') return 'Quelle est sa préfecture ?';
  return 'Où se situe-t-il ?';
}

/** Copie mélangée d'un tableau (Fisher-Yates) — ne modifie pas l'original. */
function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** n éléments tirés au hasard (moins si la source est plus petite). */
function sample(items, n) {
  return shuffled(items).slice(0, n);
}

function pickOne(items) {
  return items[Math.floor(Math.random() * items.length)];
}
