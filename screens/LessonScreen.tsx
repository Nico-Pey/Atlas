import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import CarteInteractive, { type DepartmentStatus } from '../components/CarteInteractive';
import FlashCard from '../components/FlashCard';
import { colors, spacing, typography } from '../components/theme';
import { today } from '../engine/date';
import { getPool } from '../engine/srs';
import { findLesson } from '../data/themes';
import { getAllProgress, markCardSeen } from '../storage/db';
import type { LearnStackScreenProps } from './types';

/**
 * Écran de leçon : carte interactive + flashcards d'une région.
 *
 * Toucher un département sur la carte marque immédiatement sa carte comme
 * "vue" (voir .claude/skills/moteur-srs/) : c'est le seul endroit de l'app
 * qui fait entrer une carte dans le SRS, et donc dans le pool du quiz.
 */
export default function LessonScreen({ route }: LearnStackScreenProps<'Lesson'>) {
  const lesson = findLesson(route.params.lessonId);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [statusByMapId, setStatusByMapId] = useState<Record<string, DepartmentStatus>>({});

  const reloadProgress = useCallback(async () => {
    if (!lesson) return;
    const allProgress = await getAllProgress();
    const progressByCardId = new Map(allProgress.map((p) => [p.cardId, p]));

    const next: Record<string, DepartmentStatus> = {};
    for (const card of lesson.cards) {
      if (!card.mapId) continue;
      const progress = progressByCardId.get(card.id);
      next[card.mapId] = progress ? getPool(progress) : 'non_vue';
    }
    setStatusByMapId(next);
  }, [lesson]);

  // Recharge à chaque fois que l'écran redevient visible (retour du quiz
  // ou d'une autre leçon), pour refléter une progression faite ailleurs.
  useFocusEffect(
    useCallback(() => {
      reloadProgress();
    }, [reloadProgress]),
  );

  if (!lesson) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Leçon introuvable.</Text>
      </View>
    );
  }

  const selectedCard = lesson.cards.find((c) => c.mapId === selectedMapId) ?? null;

  async function handleSelect(mapId: string) {
    setSelectedMapId(mapId);
    const card = lesson!.cards.find((c) => c.mapId === mapId);
    if (!card) return;
    await markCardSeen(card.id, today());
    await reloadProgress();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>{lesson.title}</Text>
      {lesson.subtitle ? <Text style={styles.subtitle}>{lesson.subtitle}</Text> : null}

      <CarteInteractive status={statusByMapId} selectedMapId={selectedMapId} onSelect={handleSelect} />

      <Legend />

      {selectedCard ? (
        <FlashCard
          key={selectedCard.id}
          label={lesson.title}
          question={selectedCard.question}
          answer={selectedCard.answer}
        />
      ) : (
        <Text style={styles.hint}>Touchez un département sur la carte pour l'apprendre.</Text>
      )}
    </ScrollView>
  );
}

/** Légende des couleurs de la carte : sans elle, l'opacité ne veut rien dire. */
function Legend() {
  const items: { label: string; opacity: number }[] = [
    { label: 'Non vue', opacity: 0 },
    { label: 'Nouvelle', opacity: 0.25 },
    { label: 'En cours', opacity: 0.55 },
    { label: 'Connue', opacity: 1 },
  ];
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor: item.opacity === 0 ? colors.surface : colors.accent,
                opacity: item.opacity === 0 ? 1 : item.opacity,
                borderColor: colors.separator,
              },
            ]}
          />
          <Text style={styles.legendLabel}>{item.label}</Text>
        </View>
      ))}
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
  heading: { ...typography.heading, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: -spacing.sm },
  body: { ...typography.body, color: colors.textMuted },
  hint: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  legendLabel: { ...typography.caption, color: colors.textMuted },
});
