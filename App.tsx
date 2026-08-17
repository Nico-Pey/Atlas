/**
 * Point d'entrée de l'app : c'est ici qu'on branche la navigation.
 *
 * Deux niveaux :
 *  1. une barre d'onglets en bas (Apprendre / Quiz / Progression), la façon
 *     iOS habituelle de proposer des sections indépendantes ;
 *  2. dans l'onglet "Apprendre", une pile (stack) : la liste des leçons, puis
 *     une leçon poussée par-dessus avec le bouton retour automatique.
 *
 * Rien d'autre ne vit dans ce fichier : chaque écran est dans /screens.
 */

import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, typography } from './components/theme';
import HomeScreen from './screens/HomeScreen';
import LessonScreen from './screens/LessonScreen';
import ProgressScreen from './screens/ProgressScreen';
import QuizScreen from './screens/QuizScreen';
import type { LearnStackParamList, RootTabParamList } from './screens/types';

const LearnStack = createNativeStackNavigator<LearnStackParamList>();
const Tabs = createBottomTabNavigator<RootTabParamList>();

/** L'onglet "Apprendre" : liste des leçons → leçon ouverte. */
function LearnStackNavigator() {
  return (
    <LearnStack.Navigator
      screenOptions={{
        headerTitleStyle: { fontSize: typography.heading.fontSize },
        headerTintColor: colors.accent,
      }}
    >
      <LearnStack.Screen
        name="Home"
        component={HomeScreen}
        // Titre masqué : l'écran affiche déjà son propre grand titre.
        options={{ headerShown: false }}
      />
      <LearnStack.Screen
        name="Lesson"
        component={LessonScreen}
        options={{ title: 'Leçon' }}
      />
    </LearnStack.Navigator>
  );
}

export default function App() {
  return (
    // SafeAreaProvider : évite que le contenu passe sous l'encoche et sous
    // la barre d'accueil de l'iPhone.
    <SafeAreaProvider>
      <NavigationContainer>
        <Tabs.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarLabelStyle: { fontSize: 12 },
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={ICONS[route.name]} size={size} color={color} />
            ),
          })}
        >
          <Tabs.Screen name="Apprendre" component={LearnStackNavigator} />
          <Tabs.Screen name="Quiz" component={QuizScreen} />
          <Tabs.Screen name="Progression" component={ProgressScreen} />
        </Tabs.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

/** Icône de chaque onglet, dans le jeu Ionicons (proche du style iOS). */
const ICONS: Record<keyof RootTabParamList, React.ComponentProps<typeof Ionicons>['name']> = {
  Apprendre: 'map-outline',
  Quiz: 'help-circle-outline',
  Progression: 'stats-chart-outline',
};
