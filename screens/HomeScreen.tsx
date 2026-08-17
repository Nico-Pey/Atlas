import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, MIN_TOUCH_TARGET, radius, spacing, typography } from '../components/theme';
import { themes } from '../data/themes';
import type { LearnStackParamList } from './types';

/**
 * Accueil : liste des thèmes et de leurs leçons.
 * Ne connaît aucune leçon en dur — tout vient de data/themes.ts, pour
 * qu'ajouter une région n'oblige jamais à toucher cet écran
 * (voir .claude/skills/format-contenu/).
 */
export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LearnStackParamList>>();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Atlas</Text>

      {themes.map((theme) => (
        <View key={theme.id} style={styles.themeBlock}>
          <Text style={styles.themeTitle}>{theme.title}</Text>
          {theme.description ? <Text style={styles.themeDescription}>{theme.description}</Text> : null}

          {theme.lessons.map((lesson) => (
            <Pressable
              key={lesson.id}
              style={styles.lessonCard}
              onPress={() => navigation.navigate('Lesson', { lessonId: lesson.id })}
              accessibilityRole="button"
            >
              <View>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                {lesson.subtitle ? <Text style={styles.lessonSubtitle}>{lesson.subtitle}</Text> : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
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
  themeBlock: { gap: spacing.sm },
  themeTitle: { ...typography.heading, color: colors.text },
  themeDescription: { ...typography.body, color: colors.textMuted },
  lessonCard: {
    minHeight: MIN_TOUCH_TARGET + spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lessonTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  lessonSubtitle: { ...typography.caption, color: colors.textMuted },
  chevron: { ...typography.heading, color: colors.textMuted },
});
