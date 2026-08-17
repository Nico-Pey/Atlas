/**
 * Types du contenu pédagogique d'Atlas.
 *
 * Hiérarchie : Thème → Leçon → Carte.
 *   - un Thème regroupe des leçons qui parlent de la même chose ("Départements")
 *   - une Leçon = une région, apprise d'un bloc ("Nouvelle-Aquitaine")
 *   - une Carte = une question/réponse ("Gironde → Bordeaux")
 *
 * Ces types décrivent UNIQUEMENT le contenu figé, livré avec l'app.
 * Tout ce qui bouge (carte vue ? réussie ? à revoir quand ?) vit en base
 * SQLite et est décrit dans /engine et /storage. On ne mélange jamais les
 * deux : le contenu est en lecture seule, la progression est en écriture.
 */

/** Identifiant d'une carte, unique dans toute l'app (ex: "dep-33-prefecture"). */
export type CardId = string;

export interface Card {
  id: CardId;
  /** Ce qu'on affiche recto. Ex: "Quelle est la préfecture de la Gironde ?" */
  question: string;
  /** Ce qu'on affiche verso. Ex: "Bordeaux" */
  answer: string;
  /**
   * Identifiant du tracé SVG correspondant sur la carte interactive.
   * Permet de relier une carte à un département cliquable.
   * Optionnel : toutes les cartes ne sont pas forcément géolocalisées.
   */
  mapId?: string;
}

export interface Lesson {
  id: string;
  /** Ex: "Nouvelle-Aquitaine" */
  title: string;
  /** Une ligne de contexte affichée sous le titre. */
  subtitle?: string;
  cards: Card[];
}

export interface Theme {
  id: string;
  /** Ex: "Départements" */
  title: string;
  description?: string;
  lessons: Lesson[];
}
