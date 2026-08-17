import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../components/theme';

/**
 * Écran de progression : combien de cartes connues, en cours, jamais vues.
 */
export default function ProgressScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progression</Text>
      <Text style={styles.body}>Les statistiques arrivent ici.</Text>
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
