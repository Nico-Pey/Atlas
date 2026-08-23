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
 * 3. **Une manche se joue en deux temps**, toujours dans le même ordre :
 *
 *      Temps 1 — retrouver le NOM du département, à partir d'un énoncé tiré
 *        au sort : son numéro, son emplacement (carte de sa région, le
 *        département en jaune) ou sa préfecture.
 *      Temps 2 — les deux informations restantes, posées ensemble sur la
 *        même page. Ex. : énoncé "33" → temps 1 "Gironde" → temps 2
 *        emplacement + préfecture.
 *
 *    Se tromper au temps 1 **n'interrompt pas la manche** : le bon nom est
 *    affiché, et les deux questions suivantes sont quand même posées (on
 *    apprend aussi en se trompant). La manche ne compte comme réussie que si
 *    les trois réponses sont bonnes.
 *
 * Pourquoi il n'y a plus de question sur la silhouette : quand l'énoncé
 * était le contour du département, la question "place-le sur la carte" se
 * résolvait en comparant les formes, sans rien connaître. L'énoncé
 * "emplacement" (le département en jaune sur la carte de sa région) le
 * remplace et demande, lui, de reconnaître le territoire.
 */

import { findCard, findLessonByCardId } from '../data/themes.js';
import { today } from '../engine/date.js';
import { loadFranceGeo } from '../data/geo.js';
import { getDailyCardIds, getReviewedTodayCardIds, recordDailyReview } from '../storage/store.js';
import { carteRegions, cartePlacementDepartements } from './carte.js';
import { clear, el } from './dom.js';

/** Le temps de voir le retour (vert/rouge) avant de passer à la suite. */
const FEEDBACK_DELAY_MS = 1100;
/** Un peu plus long sur la carte : la zone à regarder est plus large qu'un bouton. */
const MAP_FEEDBACK_DELAY_MS = 1600;

/** Énoncés possibles. Le nom, lui, n'est jamais un énoncé : c'est la question du temps 1. */
const PROMPTS = ['numero', 'emplacement', 'chefLieu'];

/** Les deux informations restantes, une fois l'énoncé et le nom écartés. */
const REMAINING_BY_PROMPT = {
  numero: ['emplacement', 'chefLieu'],
  emplacement: ['numero', 'chefLieu'],
  chefLieu: ['numero', 'emplacement'],
};

/** @returns {HTMLElement} */
export function quizScreen() {
  const root = el('section', { class: 'screen' }, [el('h1', { class: 'screen-title', text: 'Quiz du jour' })]);
  const slot = el('div');
  root.appendChild(slot);

  /** @type {import('../data/geo.js').FranceGeo | null} */
  let geo = null;
  /** @type {object[] | null} */
  let rounds = null;
  let index = 0;
  let correctRounds = 0;

  /** 'nom' = temps 1, 'paire' = temps 2. */
  let phase = 'nom';
  /** Le nom a-t-il été trouvé ? (sert de contexte au temps 2) */
  let nomWasCorrect = true;
  /** Verrouille l'interface pendant l'affichage du retour visuel. */
  let answering = false;
  /** Mise en évidence temporaire sur la carte du temps 1. */
  let promptReveal = null;

  /** État des deux questions du temps 2, par facette. */
  let pairState = {};

  function resetRoundState() {
    phase = 'nom';
    nomWasCorrect = true;
    answering = false;
    promptReveal = null;
    pairState = {};
  }

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
            const counted = new Set(getReviewedTodayCardIds(today()));
            rounds = rounds.map((round) => buildRound(round.card, geo, counted.has(round.card.id)));
            index = 0;
            correctRounds = 0;
            resetRoundState();
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

  function renderHead(round) {
    return el('div', { class: 'quiz-head' }, [
      el('span', { class: 'quiz-progress', text: `${index + 1} / ${rounds.length}` }),
      round.alreadyCounted ? el('span', { class: 'quiz-badge', text: 'entraînement' }) : null,
    ]);
  }

  // ---- Temps 1 : retrouver le nom ----

  function renderNomPhase() {
    const round = rounds[index];
    clear(slot);
    slot.appendChild(renderHead(round));
    slot.appendChild(promptBlock(round, round.prompt === 'emplacement'));
    slot.appendChild(el('p', { class: 'quiz-question', text: 'Quel est ce département ?' }));
    slot.appendChild(
      choiceGrid(round.choices.nom, (success) => {
        nomWasCorrect = success;
        window.setTimeout(() => {
          answering = false;
          phase = 'paire';
          render();
        }, FEEDBACK_DELAY_MS);
      }),
    );
  }

  /** L'énoncé : ce qui identifie le département sans donner son nom. */
  function promptBlock(round, compact) {
    if (round.prompt === 'emplacement') {
      // Carte de la région, département cherché en jaune. Non cliquable :
      // c'est un énoncé, pas une question.
      return el('div', { class: 'carte-slot quiz-placement' }, [
        cartePlacementDepartements({
          geo,
          regionCode: round.dep.regionCode,
          highlightCode: round.dep.code,
        }),
      ]);
    }
    return el('p', {
      class: compact ? 'quiz-prompt-text quiz-prompt-compact' : 'quiz-prompt-text',
      text: round.prompt === 'numero' ? round.dep.code : round.dep.prefecture.nom,
    });
  }

  // ---- Temps 2 : les deux informations restantes, sur la même page ----

  function renderPairPhase() {
    const round = rounds[index];
    clear(slot);
    slot.appendChild(renderHead(round));

    // Le nom sert de contexte aux deux questions : elles parlent de "lui".
    // Affiché même quand il a été raté — c'est justement là qu'il faut le voir.
    slot.appendChild(el('p', { class: 'quiz-context', text: round.dep.nom }));
    if (!nomWasCorrect) {
      slot.appendChild(el('p', { class: 'quiz-context-wrong', text: 'Ce n’était pas la bonne réponse.' }));
    }

    const pair = el('div', { class: 'quiz-pair' });
    for (const facet of round.remaining) {
      pair.appendChild(pairItem(round, facet));
    }
    slot.appendChild(pair);
  }

  function pairItem(round, facet) {
    const state = pairState[facet] ?? { answered: false, correct: false, step: 'region', reveal: null };
    pairState[facet] = state;

    // La classe "répondu" verrouille visuellement le bloc : les deux
    // questions cohabitent, il faut voir d'un coup d'œil laquelle reste.
    const item = el('div', {
      class: state.answered ? 'quiz-pair-item quiz-pair-item-answered' : 'quiz-pair-item',
    }, [el('p', { class: 'quiz-pair-question', text: pairQuestion(facet) })]);

    if (facet === 'emplacement') {
      item.appendChild(placementBlock(round, state));
    } else {
      item.appendChild(
        choiceGrid(
          round.choices[facet],
          (success) => {
            state.answered = true;
            state.correct = success;
            window.setTimeout(() => {
              answering = false;
              afterPairAnswer();
            }, FEEDBACK_DELAY_MS);
          },
          state,
        ),
      );
    }

    return item;
  }

  function pairQuestion(facet) {
    if (facet === 'numero') return 'Quel est son numéro ?';
    if (facet === 'chefLieu') return 'Quelle est sa préfecture ?';
    return 'Où se situe-t-il ?';
  }

  /** Quand les deux questions du temps 2 ont été répondues, la manche est finie. */
  function afterPairAnswer() {
    const round = rounds[index];
    const allAnswered = round.remaining.every((facet) => pairState[facet]?.answered);
    if (allAnswered) finishRound();
    else render();
  }

  /** Placement : carte de France (région), puis carte de la région (département). */
  function placementBlock(round, state) {
    const wrap = el('div', { class: 'carte-slot quiz-placement' });

    if (state.answered) {
      // Verrouillé : on garde la dernière carte affichée avec son retour visuel.
      wrap.appendChild(
        cartePlacementDepartements({
          geo,
          regionCode: round.dep.regionCode,
          revealCode: round.dep.code,
          revealIsCorrect: state.correct,
        }),
      );
      return wrap;
    }

    if (state.step === 'region') {
      wrap.appendChild(
        carteRegions({
          geo,
          // Toutes les régions sont cliquables : n'en proposer qu'une partie
          // reviendrait à souffler la réponse.
          activeRegionCodes: new Set(geo.regions.map((r) => r.code)),
          revealCode: state.reveal ? state.reveal.code : null,
          revealIsCorrect: state.reveal ? state.reveal.isCorrect : true,
          onSelect: (regionCode) => {
            if (answering) return;
            answering = true;

            const success = regionCode === round.dep.regionCode;
            state.reveal = { code: success ? regionCode : round.dep.regionCode, isCorrect: success };
            render();

            window.setTimeout(() => {
              state.reveal = null;
              answering = false;
              if (success) {
                state.step = 'departement';
                render();
              } else {
                state.answered = true;
                state.correct = false;
                afterPairAnswer();
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
        revealCode: state.reveal ? state.reveal.code : null,
        revealIsCorrect: state.reveal ? state.reveal.isCorrect : true,
        onSelect: (code) => {
          if (answering) return;
          answering = true;

          const success = code === round.dep.code;
          state.reveal = { code: success ? code : round.dep.code, isCorrect: success };
          render();

          window.setTimeout(() => {
            answering = false;
            state.answered = true;
            state.correct = success;
            afterPairAnswer();
          }, MAP_FEEDBACK_DELAY_MS);
        },
      }),
    );
    return wrap;
  }

  // ---- Grille de propositions ----

  /**
   * Verrouille au premier tap, montre la bonne réponse, puis prévient
   * l'appelant. `lockedState` permet de réafficher une question déjà répondue
   * dans son état final (temps 2 : l'autre question peut provoquer un redessin).
   */
  function choiceGrid(choice, onDone, lockedState = null) {
    const grid = el('div', { class: 'quiz-choices' });
    const buttons = choice.options.map((option) =>
      el('button', { class: 'choice-button', type: 'button', text: option }),
    );

    if (lockedState && lockedState.answered) {
      buttons.forEach((button, i) => {
        if (choice.options[i] === choice.correct) button.classList.add('choice-correct');
        else if (choice.options[i] === lockedState.picked) button.classList.add('choice-wrong');
        grid.appendChild(button);
      });
      return grid;
    }

    buttons.forEach((button, i) => {
      button.addEventListener('click', () => {
        if (answering) return;
        answering = true;

        const success = choice.options[i] === choice.correct;
        if (lockedState) lockedState.picked = choice.options[i];

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

  /** Fin de manche : c'est ici, et seulement ici, que le SRS est mis à jour. */
  function finishRound() {
    const round = rounds[index];
    const allPairCorrect = round.remaining.every((facet) => pairState[facet]?.correct);
    const roundSucceeded = nomWasCorrect && allPairCorrect;
    if (roundSucceeded) correctRounds += 1;

    recordDailyReview(round.card.id, roundSucceeded, today());

    index += 1;
    resetRoundState();
    render();
  }

  function render() {
    if (!geo || !rounds) {
      renderLoading();
    } else if (rounds.length === 0) {
      renderEmpty();
    } else if (index >= rounds.length) {
      renderSummary();
    } else if (phase === 'nom') {
      renderNomPhase();
    } else {
      renderPairPhase();
    }
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
 * Prépare une manche : l'énoncé et les propositions sont tirés au sort **une
 * fois pour toutes** ici. Le temps 2 redessine la page à chaque réponse (les
 * deux questions cohabitent) : re-mélanger les propositions à ce moment-là
 * les ferait bouger sous les doigts de l'utilisateur.
 *
 * @returns {object | null} null si le contenu est incohérent (carte sans
 *   géométrie), auquel cas la manche est simplement ignorée.
 */
function buildRound(card, geo, alreadyCounted = false) {
  const dep = geo.departements.find((d) => d.code === card.mapId);
  const lesson = findLessonByCardId(card.id);
  if (!dep || !dep.prefecture || !lesson) return null;

  const prompt = pickOne(PROMPTS);
  const remaining = REMAINING_BY_PROMPT[prompt];

  // Départements de la même leçon : ils fournissent des propositions
  // plausibles (même région), sans qu'aucune région soit codée en dur ici.
  const siblings = lesson.cards
    .filter((c) => c.id !== card.id)
    .map((c) => geo.departements.find((d) => d.code === c.mapId))
    .filter((d) => d !== undefined && d.prefecture);

  const choices = { nom: buildChoice('nom', dep, siblings) };
  for (const facet of remaining) {
    if (facet === 'emplacement') continue;
    choices[facet] = buildChoice(facet, dep, siblings);
  }

  return { card, dep, prompt, remaining, choices, alreadyCounted };
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
