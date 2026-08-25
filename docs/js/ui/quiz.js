/**
 * Écran de quiz : la révision du jour.
 *
 * Trois principes, décidés avec l'utilisateur :
 *
 * 1. **Au plus 10 départements par jour**, choisis parmi les cartes dues
 *    (voir engine/srs.selectDailyCardIds). Une session bornée est tenable
 *    tous les matins ; une liste qui s'allonge sans fin ne l'est pas.
 * 2. **Le lot du jour est figé, mais pas son ordre.** Refaire le quiz dans la
 *    même journée redonne les mêmes départements — et seule la première
 *    réponse de la journée compte pour le SRS (storage.recordDailyReview),
 *    les passages suivants sont de l'entraînement libre — mais l'ordre des
 *    manches est retiré à chaque ouverture de l'écran. Sinon la 3e position
 *    finit par se retenir aussi bien que le département qui s'y trouve, ce
 *    qui fausse la répétition : c'est le département qu'on veut apprendre,
 *    pas sa place dans la liste.
 * 3. **Une manche se joue en deux temps**, toujours dans le même ordre :
 *
 *      Temps 1 — retrouver le NOM du département, à partir d'un énoncé tiré
 *        au sort : son numéro, son emplacement (carte de sa région, le
 *        département en jaune) ou sa préfecture. La réponse se tape au
 *        clavier (ui/champ-reponse.js) ; les quatre propositions restent
 *        accessibles d'un bouton, mais coûtent un point.
 *      Temps 2 — les deux informations restantes, posées ensemble sur la
 *        même page. Ex. : énoncé "33" → temps 1 "Gironde" → temps 2
 *        emplacement + préfecture.
 *
 *    Se tromper au temps 1 **n'interrompt pas la manche** : le bon nom est
 *    affiché, et les deux questions suivantes sont quand même posées (on
 *    apprend aussi en se trompant). La manche ne compte comme réussie que si
 *    les trois réponses sont bonnes.
 *
 *    Même logique pour le retour visuel des questions sur la carte : on voit
 *    à la fois la forme touchée (rouge) et la bonne réponse (vert).
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
import { champReponse } from './champ-reponse.js';
import { clear, el } from './dom.js';

/**
 * Barème. Une manche pose trois questions, donc 6 points au maximum.
 *
 * Retrouver une réponse de tête et la reconnaître parmi quatre ne demandent
 * pas le même effort : le barème le dit. Ça ne change rien à la répétition
 * espacée — une carte répondue juste avec les propositions reste réussie et
 * ressort dans trois jours (voir .claude/skills/moteur-srs/). Les points
 * mesurent l'aisance, le SRS mesure la mémoire ; ce sont deux choses.
 */
const POINTS = { seul: 2, aide: 1, rate: 0 };
/** Questions par manche : le nom, puis les deux informations restantes. */
const QUESTIONS_PAR_MANCHE = 3;

/** @param {{correct: boolean, helped: boolean}} state @returns {number} */
function pointsFor(state) {
  if (!state || !state.correct) return POINTS.rate;
  return state.helped ? POINTS.aide : POINTS.seul;
}

/**
 * État d'une question, avant réponse. `helped` retient si les propositions
 * ont été demandées : c'est ce qui décide des points, et il doit survivre aux
 * redessins (répondre à une question du temps 2 redessine l'autre).
 */
function nouvelEtat() {
  return { answered: false, correct: false, helped: false, given: null, step: 'region', reveal: null };
}

/**
 * Temps d'affichage du retour vert/rouge avant de passer à la suite.
 *
 * Ce n'est **pas** un temps de calcul — tout est déjà en mémoire, la réponse
 * est connue à l'instant du tap : c'est une pause volontaire, pour qu'on ait
 * le temps de voir la couleur. D'où deux durées : quand c'est juste il n'y a
 * rien à apprendre, on enchaîne vite ; quand c'est faux il faut le temps de
 * lire la bonne réponse.
 */
const FEEDBACK_DELAY_MS = { correct: 450, wrong: 1000 };
/** Un peu plus long sur la carte : la zone à regarder est plus large qu'un bouton. */
const MAP_FEEDBACK_DELAY_MS = { correct: 650, wrong: 1400 };

/** @param {boolean} success @param {{correct: number, wrong: number}} delays */
function feedbackDelay(success, delays) {
  return success ? delays.correct : delays.wrong;
}

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
  let earnedPoints = 0;
  let maxPoints = 0;

  /** Toutes les réponses possibles, par facette — sert à l'autocomplétion. */
  let candidates = { nom: [], numero: [], chefLieu: [] };

  /** 'nom' = temps 1, 'paire' = temps 2. */
  let phase = 'nom';
  /** Réponse au temps 1 : sert de contexte au temps 2 et compte dans le score. */
  let nomState = nouvelEtat();
  /** Verrouille l'interface pendant l'affichage du retour visuel. */
  let answering = false;
  /** Mise en évidence temporaire sur la carte du temps 1. */
  let promptReveal = null;

  /** État des deux questions du temps 2, par facette. */
  let pairState = {};

  function resetRoundState() {
    phase = 'nom';
    nomState = nouvelEtat();
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
        el('p', { class: 'quiz-points-total', text: `${earnedPoints} / ${maxPoints} points` }),
        el('p', {
          class: 'muted quiz-practice-note',
          text:
            earnedPoints === maxPoints
              ? 'Le maximum : tout trouvé sans regarder les propositions.'
              : '2 points par réponse trouvée seul, 1 avec les propositions.',
        }),
        el('button', {
          class: 'replay-button',
          type: 'button',
          text: 'Refaire ce quiz',
          onClick: () => {
            const counted = new Set(getReviewedTodayCardIds(today()));
            // Même mélange qu'à l'ouverture de l'écran : "refaire le quiz"
            // ne doit pas redonner l'ordre qu'on vient tout juste de voir.
            rounds = shuffled(rounds.map((round) => buildRound(round.card, geo, counted.has(round.card.id))));
            index = 0;
            correctRounds = 0;
            earnedPoints = 0;
            maxPoints = 0;
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
      champReponse({
        choice: round.choices.nom,
        candidates: candidates.nom,
        placeholder: 'Nom du département',
        state: nomState,
        isBusy: () => answering,
        onAnswer: (success) => {
          answering = true;
          window.setTimeout(() => {
            answering = false;
            phase = 'paire';
            render();
          }, feedbackDelay(success, FEEDBACK_DELAY_MS));
        },
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
    if (!nomState.correct) {
      slot.appendChild(el('p', { class: 'quiz-context-wrong', text: 'Ce n’était pas la bonne réponse.' }));
    }

    const pair = el('div', { class: 'quiz-pair' });
    for (const facet of round.remaining) {
      pair.appendChild(pairItem(round, facet));
    }
    slot.appendChild(pair);
  }

  function pairItem(round, facet) {
    const state = pairState[facet] ?? nouvelEtat();
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
        champReponse({
          choice: round.choices[facet],
          candidates: candidates[facet],
          placeholder: facet === 'numero' ? 'Numéro' : 'Chef-lieu',
          state,
          isBusy: () => answering,
          onAnswer: (success) => {
            answering = true;
            window.setTimeout(() => {
              answering = false;
              afterPairAnswer();
            }, feedbackDelay(success, FEEDBACK_DELAY_MS));
          },
        }),
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

  /**
   * Placement : carte de France (choisir la région), puis carte de la région
   * (choisir le département).
   *
   * Le retour visuel montre **deux** formes : celle qu'on a touchée en rouge
   * et la bonne en vert (voir appendReveal dans carte.js). Ne montrer que la
   * bonne réponse ne disait pas où on s'était trompé — et comme un tap est
   * rattrapé vers le département le plus proche, on ne pouvait même pas
   * savoir quelle forme avait été retenue.
   */
  function placementBlock(round, state) {
    const wrap = el('div', { class: 'carte-slot quiz-placement' });
    const reveal = state.reveal;

    // Quelle carte afficher : celle du retour visuel s'il y en a un — y
    // compris une fois la question répondue, puisque c'est là que se lit
    // l'erreur — sinon celle de l'étape en cours.
    const scope = reveal ? reveal.scope : state.step;

    if (scope === 'region') {
      wrap.appendChild(
        carteRegions({
          geo,
          // Toutes les régions sont cliquables : n'en proposer qu'une partie
          // reviendrait à souffler la réponse.
          activeRegionCodes: new Set(geo.regions.map((r) => r.code)),
          correctCode: reveal ? reveal.correct : null,
          pickedCode: reveal ? reveal.picked : null,
          onSelect: state.answered
            ? null
            : (regionCode) => {
                if (answering) return;
                answering = true;

                const success = regionCode === round.dep.regionCode;
                state.reveal = { scope: 'region', correct: round.dep.regionCode, picked: regionCode };
                render();

                window.setTimeout(() => {
                  answering = false;
                  if (success) {
                    // Bonne région : on efface le retour visuel et on
                    // enchaîne sur ses départements.
                    state.reveal = null;
                    state.step = 'departement';
                    render();
                  } else {
                    // Mauvaise région : la question s'arrête là. On garde
                    // state.reveal pour que la carte reste affichée avec le
                    // rouge et le vert tant que l'autre question est ouverte.
                    state.answered = true;
                    state.correct = false;
                    afterPairAnswer();
                  }
                }, feedbackDelay(success, MAP_FEEDBACK_DELAY_MS));
              },
        }),
      );
      return wrap;
    }

    wrap.appendChild(
      cartePlacementDepartements({
        geo,
        regionCode: round.dep.regionCode,
        correctCode: reveal ? reveal.correct : null,
        pickedCode: reveal ? reveal.picked : null,
        onSelect: state.answered
          ? null
          : (code) => {
              if (answering) return;
              answering = true;

              const success = code === round.dep.code;
              state.reveal = { scope: 'departement', correct: round.dep.code, picked: code };
              render();

              window.setTimeout(() => {
                answering = false;
                state.answered = true;
                state.correct = success;
                afterPairAnswer();
              }, feedbackDelay(success, MAP_FEEDBACK_DELAY_MS));
            },
      }),
    );
    return wrap;
  }

  /** Fin de manche : c'est ici, et seulement ici, que le SRS est mis à jour. */
  function finishRound() {
    const round = rounds[index];
    const allPairCorrect = round.remaining.every((facet) => pairState[facet]?.correct);
    const roundSucceeded = nomState.correct && allPairCorrect;
    if (roundSucceeded) correctRounds += 1;

    // Les points sont indépendants du SRS : une carte trouvée avec les
    // propositions rapporte moins, mais reste réussie et ressort dans 3 jours.
    earnedPoints += pointsFor(nomState);
    for (const facet of round.remaining) earnedPoints += pointsFor(pairState[facet]);
    maxPoints += QUESTIONS_PAR_MANCHE * POINTS.seul;

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

      // L'autocomplétion propose parmi les 96 départements, pas parmi les
      // quatre du QCM de secours : sinon taper reviendrait à choisir, et la
      // distinction entre « je sais » et « je reconnais » n'existerait plus.
      candidates = {
        nom: geo.departements.map((d) => d.nom).sort((a, b) => a.localeCompare(b, 'fr')),
        numero: geo.departements.map((d) => d.code).sort((a, b) => a.localeCompare(b, 'fr')),
        chefLieu: geo.departements
          .filter((d) => d.prefecture)
          .map((d) => d.prefecture.nom)
          .sort((a, b) => a.localeCompare(b, 'fr')),
      };

      const day = today();
      const alreadyCounted = new Set(getReviewedTodayCardIds(day));
      // shuffled() : le contenu du lot est figé pour la journée (voir le
      // commentaire d'en-tête, point 2), pas son ordre — sinon la position
      // dans la liste finirait par se retenir aussi bien que la carte.
      rounds = shuffled(
        getDailyCardIds(day)
          .map(findCard)
          .filter((card) => card !== undefined)
          .map((card) => buildRound(card, geo, alreadyCounted.has(card.id)))
          .filter((round) => round !== null),
      );

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
