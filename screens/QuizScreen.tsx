import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../components/theme';

/**
 * Écran de quiz : la révision du jour.
 * Ne montrera QUE des cartes déjà vues en leçon et dues aujourd'hui.
 */
export default function QuizScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quiz du jour</Text>
      <Text style={styles.body}>Les cartes à réviser arrivent ici.</Text>
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
  title: { ...typography.title, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
});
