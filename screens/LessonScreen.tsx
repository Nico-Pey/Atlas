import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../components/theme';
import type { LearnStackScreenProps } from './types';

/**
 * Écran de leçon : une région, sa carte interactive et ses flashcards.
 * Les cartes vues ici entrent dans le pool du quiz quotidien.
 */
export default function LessonScreen({ route }: LearnStackScreenProps<'Lesson'>) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Leçon {route.params.lessonId}</Text>
      <Text style={styles.body}>Carte interactive et flashcards à venir.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heading: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
});
