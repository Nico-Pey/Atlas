import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../components/theme';

/**
 * Écran d'accueil : le point d'entrée du matin.
 * Affichera la liste des thèmes et de leurs leçons (étape suivante).
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Atlas</Text>
      <Text style={styles.body}>Les thèmes et leçons arrivent ici.</Text>
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
