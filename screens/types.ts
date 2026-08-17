/**
 * Types de navigation.
 *
 * react-navigation a besoin de savoir quels écrans existent et quels
 * paramètres chacun attend. On le déclare ici une fois pour toutes :
 * TypeScript refusera ensuite un navigate() vers un écran inexistant ou
 * avec le mauvais paramètre.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Pile "Apprendre" : la liste des leçons, puis une leçon ouverte. */
export type LearnStackParamList = {
  Home: undefined;
  /** On ne passe que l'id : l'écran ira chercher le contenu dans /data. */
  Lesson: { lessonId: string };
};

/** Les trois onglets du bas. */
export type RootTabParamList = {
  Apprendre: undefined;
  Quiz: undefined;
  Progression: undefined;
};

/** Raccourci pour typer les props d'un écran de la pile "Apprendre". */
export type LearnStackScreenProps<T extends keyof LearnStackParamList> =
  NativeStackScreenProps<LearnStackParamList, T>;
