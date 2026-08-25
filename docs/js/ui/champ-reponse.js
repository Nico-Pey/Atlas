/**
 * Champ de réponse libre, avec autocomplétion et propositions à la demande.
 *
 * Remplace le QCM à quatre boutons pour les trois questions qui attendent un
 * texte : le nom du département, son numéro, son chef-lieu. (Le placement sur
 * la carte garde sa carte cliquable, voir ui/quiz.js.)
 *
 * Pourquoi : avec quatre boutons, on reconnaît la bonne réponse au lieu de la
 * retrouver — et une chance sur quatre suffit parfois. En tapant, il faut
 * vraiment avoir le mot en tête. Les propositions restent accessibles d'un
 * bouton pour ne jamais rester bloqué, mais elles coûtent des points : c'est
 * là toute la différence entre « je sais » et « je reconnais ».
 *
 * Deux détails qui comptent :
 *
 * 1. L'autocomplétion propose parmi les **96 départements**, pas parmi les
 *    quatre du QCM. Sinon taper reviendrait à choisir, et la distinction
 *    n'aurait plus de sens.
 * 2. Une saisie qui ne correspond à **aucune** réponse connue n'est pas
 *    comptée comme une erreur : c'est une faute de frappe ou une réponse
 *    incomplète, on le signale et on laisse continuer. Seule une réponse
 *    valide mais fausse compte comme une erreur.
 */

import { clear, el } from './dom.js';

/** Suggestions affichées sous le champ. Au-delà, la liste couvre l'écran. */
const MAX_SUGGESTIONS = 5;

/**
 * Forme comparable d'un texte : sans accents, sans tirets, sans espaces, en
 * minuscules. « Côte-d'Or », « cote d or » et « COTEDOR » deviennent le même
 * mot — on corrige l'orthographe, on ne la sanctionne pas.
 *
 * @param {string} texte
 * @returns {string}
 */
export function normalise(texte) {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // les diacritiques isolés par NFD
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Suggestions pour une saisie : d'abord celles qui commencent par ce qui est
 * tapé, puis celles qui le contiennent ailleurs.
 *
 * @param {string} saisie
 * @param {string[]} candidates
 * @returns {string[]}
 */
export function suggestionsPour(saisie, candidates) {
  const cible = normalise(saisie);
  if (cible === '') return [];

  const debut = [];
  const ailleurs = [];
  for (const candidat of candidates) {
    const forme = normalise(candidat);
    if (forme.startsWith(cible)) debut.push(candidat);
    else if (forme.includes(cible)) ailleurs.push(candidat);
    if (debut.length >= MAX_SUGGESTIONS) break;
  }

  return [...debut, ...ailleurs].slice(0, MAX_SUGGESTIONS);
}

/**
 * @typedef {object} EtatReponse
 * @property {boolean} answered  La question a reçu une réponse définitive.
 * @property {boolean} correct
 * @property {boolean} helped    Les propositions ont été affichées avant de répondre.
 * @property {string} [given]    Ce qui a été répondu (pour le réafficher).
 */

/**
 * @param {object} options
 * @param {{correct: string, options: string[]}} options.choice  Les propositions du QCM de secours.
 * @param {string[]} options.candidates   Toutes les réponses possibles (les 96), pour l'autocomplétion.
 * @param {string} options.placeholder
 * @param {EtatReponse} options.state     Muté sur place : porte la réponse entre deux redessins.
 * @param {() => boolean} options.isBusy  Vrai pendant l'affichage d'un retour visuel.
 * @param {(success: boolean, helped: boolean) => void} options.onAnswer
 * @returns {HTMLElement}
 */
export function champReponse({ choice, candidates, placeholder, state, isBusy, onAnswer }) {
  const root = el('div', { class: 'quiz-champ' });

  if (state.answered) {
    root.appendChild(reponseFigee(choice, state));
    return root;
  }

  const message = el('p', { class: 'quiz-champ-message', role: 'status' });
  const suggestions = el('ul', { class: 'quiz-suggestions' });
  const propositions = el('div', { class: 'quiz-champ-propositions' });

  const input = el('input', {
    class: 'quiz-input',
    type: 'text',
    placeholder,
    // Le navigateur ne doit pas proposer ses propres complétions par-dessus
    // les nôtres, ni corriger « Gers » en « Gres ».
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'words',
    spellcheck: 'false',
    'aria-label': placeholder,
  });

  /** Termine la question, quel qu'ait été le moyen d'y répondre. */
  function repondre(valeur, helped) {
    if (isBusy()) return;
    state.answered = true;
    state.correct = normalise(valeur) === normalise(choice.correct);
    state.helped = helped;
    state.given = valeur;

    clear(root);
    root.appendChild(reponseFigee(choice, state));
    onAnswer(state.correct, helped);
  }

  function valider() {
    if (isBusy()) return;
    const saisie = input.value.trim();
    if (saisie === '') return;

    const connu = candidates.find((c) => normalise(c) === normalise(saisie));
    if (!connu) {
      // Faute de frappe ou réponse incomplète : on ne compte pas d'erreur.
      message.textContent = 'Aucune réponse connue ne correspond — vérifie l’orthographe.';
      return;
    }

    repondre(connu, state.helped === true);
  }

  function rafraichirSuggestions() {
    message.textContent = '';
    clear(suggestions);

    for (const candidat of suggestionsPour(input.value, candidates)) {
      const item = el('li', {}, [
        el('button', {
          class: 'quiz-suggestion',
          type: 'button',
          text: candidat,
          // Toucher une suggestion répond directement : sur un téléphone,
          // remplir puis valider ferait un geste de plus pour rien.
          onClick: () => repondre(candidat, state.helped === true),
        }),
      ]);
      suggestions.appendChild(item);
    }
  }

  input.addEventListener('input', rafraichirSuggestions);

  // Un vrai <form> : le clavier de l'iPhone affiche alors sa touche de
  // validation, qui envoie la réponse sans avoir à viser un bouton.
  const form = el('form', { class: 'quiz-champ-form', novalidate: 'novalidate' }, [
    input,
    el('button', { class: 'quiz-valider-button', type: 'submit', text: 'Valider' }),
  ]);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    valider();
  });

  /** Affiche le QCM de secours. Le passage est sans retour : il coûte des points. */
  function montrerPropositions() {
    if (isBusy() || state.helped) return;
    state.helped = true;
    clear(propositions);
    propositions.appendChild(
      el('p', { class: 'quiz-champ-aide', text: 'Réponse trouvée avec les propositions : 1 point au lieu de 2.' }),
    );
    propositions.appendChild(grilleDeChoix(choice, (valeur) => repondre(valeur, true), isBusy));
    revealButton.remove();
  }

  const revealButton = el('button', {
    class: 'quiz-reveal-button',
    type: 'button',
    text: 'Voir les propositions (−1 point)',
    onClick: montrerPropositions,
  });

  root.appendChild(form);
  root.appendChild(suggestions);
  root.appendChild(message);
  root.appendChild(revealButton);
  root.appendChild(propositions);

  // Question déjà « aidée » puis redessinée (l'autre question de la paire a
  // été répondue entre-temps) : on remet les propositions à l'écran.
  if (state.helped) montrerPropositions();

  return root;
}

/** Ce qu'on voit une fois la question répondue : sa réponse, la bonne, les points. */
function reponseFigee(choice, state) {
  const bloc = el('div', { class: 'quiz-reponse-figee' });

  bloc.appendChild(
    el('p', { class: state.correct ? 'quiz-reponse quiz-reponse-juste' : 'quiz-reponse quiz-reponse-fausse' }, [
      el('span', { text: state.given ?? '' }),
      el('span', {
        class: 'quiz-points',
        text: state.correct ? (state.helped ? '+1' : '+2') : '+0',
      }),
    ]),
  );

  if (!state.correct) {
    bloc.appendChild(el('p', { class: 'quiz-bonne-reponse', text: `Réponse : ${choice.correct}` }));
  }

  return bloc;
}

/**
 * Le QCM de secours. Verrouillé au premier tap, comme avant : il montre la
 * bonne réponse et celle qui a été touchée.
 *
 * @param {{correct: string, options: string[]}} choice
 * @param {(valeur: string) => void} onPick
 * @param {() => boolean} isBusy
 * @returns {HTMLElement}
 */
function grilleDeChoix(choice, onPick, isBusy) {
  const grid = el('div', { class: 'quiz-choices' });

  for (const option of choice.options) {
    grid.appendChild(
      el('button', {
        class: 'choice-button',
        type: 'button',
        text: option,
        onClick: () => {
          if (isBusy()) return;
          onPick(option);
        },
      }),
    );
  }

  return grid;
}
