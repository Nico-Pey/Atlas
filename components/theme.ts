/**
 * Jetons de style partagés (couleurs, espacements, typographie).
 *
 * Un seul endroit pour ces valeurs : si un écran écrit "#0A6E5C" en dur,
 * c'est un bug de style qui se répare ici.
 *
 * Contraintes assumées (voir .claude/skills/conventions-ui/) :
 *  - app utilisée à 7h du matin, œil pas encore réveillé → contrastes francs,
 *    texte grand, pas de gris clair sur blanc ;
 *  - Apple HIG : corps de texte à 17pt minimum, cibles tactiles ≥ 44pt ;
 *  - V1 en thème clair uniquement (app.json : userInterfaceStyle "light"),
 *    donc pas de gestion du mode sombre pour l'instant.
 */

export const colors = {
  /** Fond des écrans. */
  background: '#FFFFFF',
  /** Fond des cartes/listes posées sur le fond (iOS systemGroupedBackground). */
  surface: '#F2F2F7',
  /** Texte principal. Presque noir plutôt que noir pur : moins agressif. */
  text: '#1C1C1E',
  /** Texte secondaire. Reste au-dessus du ratio de contraste 4.5:1 sur blanc. */
  textMuted: '#5A5A5F',
  /** Couleur d'accent d'Atlas : un vert profond, calme, pas un bleu iOS de plus. */
  accent: '#0A6E5C',
  /** Réponse juste. */
  success: '#1E7A3C',
  /** Réponse fausse. Jamais utilisé seul : toujours doublé d'un texte. */
  danger: '#B3261E',
  /** Filets de séparation. */
  separator: '#D1D1D6',
} as const;

/** Échelle d'espacement, en multiples de 4 : évite les marges au pifomètre. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/**
 * Tailles de police. Volontairement au-dessus des valeurs iOS par défaut :
 * l'app se lit vite, de loin, à moitié réveillé.
 */
export const typography = {
  /** Titre d'écran. */
  title: { fontSize: 32, fontWeight: '700' },
  /** Titre de section ou de leçon. */
  heading: { fontSize: 22, fontWeight: '600' },
  /** Texte courant. 17pt = minimum recommandé par les HIG. */
  body: { fontSize: 17, fontWeight: '400' },
  /** Question d'une flashcard : c'est l'élément le plus important de l'app. */
  question: { fontSize: 26, fontWeight: '600' },
  /** Légendes, compteurs. */
  caption: { fontSize: 15, fontWeight: '400' },
} as const;

/** Taille minimale d'une zone tappable, imposée par les HIG. */
export const MIN_TOUCH_TARGET = 44;

export const radius = {
  card: 16,
  button: 12,
} as const;
