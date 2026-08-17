import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import FlashCard from '../components/FlashCard';
import { colors, spacing, typography } from '../components/theme';
import { today } from '../engine/date';
import { findCard } from '../data/themes';
import type { Card } from '../data/types';
import { getDueCardIdsToday, recordReview } from '../storage/db';

/**
 * Écran de quiz : la révision du jour.
 *
 * Ne montre que des cartes déjà vues en leçon et dues aujourd'hui
 * (storage.getDueCardIdsToday, qui applique la règle du moteur SRS —
 * voir .claude/skills/moteur-srs/). Répondre juste sort la carte du quiz
 * pendant 3 jours ; répondre faux la fait revenir dès demain.
 */
export default function QuizScreen() {
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);

  const loadQueue = useCallback(async () => {
    const dueCardIds = await getDueCardIdsToday(today());
    const cards = dueCardIds.map(findCard).filter((c): c is Card => c !== undefined);
    setQueue(cards);
    setReviewedCount(0);
  }, []);

  // Recharge à chaque ouverture de l'onglet : une carte apprise entre-temps
  // en leçon, ou un nouveau jour, doivent se refléter immédiatement.
  useFocusEffect(
    useCallback(() => {
      loadQueue();
    }, [loadQueue]),
  );

  if (queue === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Chargement…</Text>
      </View>
    );
  }

  if (queue.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Quiz du jour</Text>
        <Text style={styles.body}>
          Rien à réviser pour l'instant. Apprenez de nouvelles cartes dans l'onglet Apprendre, ou
          revenez demain.
        </Text>
      </View>
    );
  }

  const current = queue[0];

  async function handleAnswer(success: boolean) {
    await recordReview(current.id, success, today());
    setReviewedCount((n) => n + 1);
    setQueue((prev) => (prev ? prev.slice(1) : prev));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quiz du jour</Text>
      <Text style={styles.progress}>
        {reviewedCount + 1} / {reviewedCount + queue.length}
      </Text>
      <FlashCard key={current.id} question={current.question} answer={current.answer} onAnswer={handleAnswer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.title, color: colors.text },
  progress: { ...typography.caption, color: colors.textMuted },
  body: { ...typography.body, color: colors.textMuted },
});
