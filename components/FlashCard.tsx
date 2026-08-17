import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, MIN_TOUCH_TARGET, radius, spacing, typography } from './theme';

interface FlashCardProps {
  /** Ce qu'on affiche recto. */
  question: string;
  /** Ce qu'on affiche verso, une fois la carte retournée. */
  answer: string;
  /** Petit texte au-dessus de la question (ex: nom de la région). */
  label?: string;
  /**
   * Si fourni, affiche "Je savais / Je ne savais pas" après avoir retourné
   * la carte (contexte quiz). Si absent, la carte se contente de se
   * retourner sur tap, sans notion de réussite (contexte leçon).
   */
  onAnswer?: (success: boolean) => void;
}

/**
 * Carte question/réponse qui se retourne au tap.
 * Ne connaît rien du SRS ni du stockage : purement un composant d'affichage,
 * c'est l'écran appelant (Lesson ou Quiz) qui décide quoi faire du résultat.
 */
export default function FlashCard({ question, answer, label, onAnswer }: FlashCardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <View>
      <Pressable
        onPress={() => setRevealed((r) => !r)}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={revealed ? answer : question}
      >
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={styles.question}>{question}</Text>
        {revealed ? (
          <>
            <View style={styles.separator} />
            <Text style={styles.answer}>{answer}</Text>
          </>
        ) : (
          <Text style={styles.hint}>Touchez pour voir la réponse</Text>
        )}
      </Pressable>

      {revealed && onAnswer ? (
        <View style={styles.actions}>
          <Pressable
            onPress={() => onAnswer(false)}
            style={[styles.actionButton, styles.failureButton]}
          >
            <Text style={styles.failureButtonText}>Je ne savais pas</Text>
          </Pressable>
          <Pressable
            onPress={() => onAnswer(true)}
            style={[styles.actionButton, styles.successButton]}
          >
            <Text style={styles.successButtonText}>Je savais</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    minHeight: 160,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { ...typography.caption, color: colors.textMuted },
  question: { ...typography.question, color: colors.text },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginVertical: spacing.sm,
  },
  answer: { ...typography.heading, color: colors.accent },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureButton: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.danger },
  successButton: { backgroundColor: colors.success },
  failureButtonText: { ...typography.body, color: colors.danger, fontWeight: '600' },
  successButtonText: { ...typography.body, color: '#FFFFFF', fontWeight: '600' },
});
