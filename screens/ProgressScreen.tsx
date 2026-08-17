import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../components/theme';
import { getPool, type Pool } from '../engine/srs';
import { themes } from '../data/themes';
import { getAllProgress } from '../storage/db';

type Counts = Record<Pool, number> & { non_vue: number };

const EMPTY_COUNTS: Counts = { non_vue: 0, nouvelle: 0, en_cours: 0, connue: 0 };

interface LessonStats {
  lessonId: string;
  title: string;
  total: number;
  counts: Counts;
}

const STAT_ROWS: { key: keyof Counts; label: string }[] = [
  { key: 'connue', label: 'Connues' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'nouvelle', label: 'Nouvelles' },
  { key: 'non_vue', label: 'Pas encore vues' },
];

/**
 * Écran de progression : où j'en suis, leçon par leçon.
 * Comme les autres écrans, ne connaît aucune leçon en dur — tout vient de
 * data/themes.ts (voir .claude/skills/format-contenu/).
 */
export default function ProgressScreen() {
  const [stats, setStats] = useState<LessonStats[] | null>(null);

  const loadStats = useCallback(async () => {
    const allProgress = await getAllProgress();
    const progressByCardId = new Map(allProgress.map((p) => [p.cardId, p]));

    const next: LessonStats[] = [];
    for (const theme of themes) {
      for (const lesson of theme.lessons) {
        const counts: Counts = { ...EMPTY_COUNTS };
        for (const card of lesson.cards) {
          const progress = progressByCardId.get(card.id);
          const status = progress ? getPool(progress) : 'non_vue';
          counts[status] += 1;
        }
        next.push({ lessonId: lesson.id, title: lesson.title, total: lesson.cards.length, counts });
      }
    }
    setStats(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Progression</Text>

      {stats?.map((lessonStats) => (
        <View key={lessonStats.lessonId} style={styles.lessonBlock}>
          <Text style={styles.lessonTitle}>{lessonStats.title}</Text>
          <Text style={styles.lessonTotal}>{lessonStats.total} cartes au total</Text>

          {STAT_ROWS.map((row) => (
            <View key={row.key} style={styles.statRow}>
              <Text style={styles.statLabel}>{row.label}</Text>
              <Text style={styles.statValue}>{lessonStats.counts[row.key]}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: { ...typography.title, color: colors.text },
  lessonBlock: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
  },
  lessonTitle: { ...typography.heading, color: colors.text },
  lessonTotal: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { ...typography.body, color: colors.textMuted },
  statValue: { ...typography.body, color: colors.text, fontWeight: '600' },
});
