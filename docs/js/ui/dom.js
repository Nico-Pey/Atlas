/**
 * Micro-outils pour construire des éléments HTML/SVG.
 *
 * Pas de framework, pas d'étape de compilation : l'app se lit directement dans
 * le navigateur. Ces trois fonctions suffisent à tout construire.
 *
 * On construit des éléments plutôt que d'assembler des chaînes HTML : le texte
 * passe par `textContent`, donc aucun contenu ne peut être interprété comme du
 * code par accident.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Crée un élément HTML.
 *
 * @param {string} tag
 * @param {object} [props] class, text, onClick, aria-*, data-*, style…
 * @param {(Node | string | null | false | undefined)[]} [children]
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  applyProps(node, props);
  appendChildren(node, children);
  return node;
}

/**
 * Crée un élément SVG (namespace différent du HTML, d'où la fonction séparée).
 *
 * @param {string} tag
 * @param {object} [props]
 * @param {(Node | string | null | false | undefined)[]} [children]
 * @returns {SVGElement}
 */
export function svg(tag, props = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  applyProps(node, props);
  appendChildren(node, children);
  return node;
}

/** Vide un élément de tous ses enfants. @param {Element} node */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function applyProps(node, props) {
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;

    if (key === 'text') {
      node.textContent = String(value);
    } else if (key === 'class') {
      node.setAttribute('class', value);
    } else if (key === 'onClick') {
      node.addEventListener('click', value);
    } else {
      node.setAttribute(key, String(value));
    }
  }
}

function appendChildren(node, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}
