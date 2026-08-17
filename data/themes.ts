/**
 * Contenu pédagogique d'Atlas.
 *
 * Format et conventions d'id détaillés dans
 * .claude/skills/format-contenu/SKILL.md — le lire avant d'ajouter un thème.
 *
 * V1 : un seul thème codé en dur ("Départements"), une seule leçon
 * ("Nouvelle-Aquitaine"), pour valider toute la chaîne (moteur SRS,
 * stockage, carte interactive, quiz) avant de généraliser à la France
 * entière.
 */

import type { Theme } from './types';

export const themes: Theme[] = [
  {
    id: 'departements',
    title: 'Départements',
    description: 'Les départements de France et leurs préfectures.',
    lessons: [
      {
        id: 'nouvelle-aquitaine',
        title: 'Nouvelle-Aquitaine',
        subtitle: '12 départements',
        cards: [
          {
            id: 'dep-16-prefecture',
            question: 'Quelle est la préfecture de la Charente ?',
            answer: 'Angoulême',
            mapId: '16',
          },
          {
            id: 'dep-17-prefecture',
            question: 'Quelle est la préfecture de la Charente-Maritime ?',
            answer: 'La Rochelle',
            mapId: '17',
          },
          {
            id: 'dep-19-prefecture',
            question: 'Quelle est la préfecture de la Corrèze ?',
            answer: 'Tulle',
            mapId: '19',
          },
          {
            id: 'dep-23-prefecture',
            question: 'Quelle est la préfecture de la Creuse ?',
            answer: 'Guéret',
            mapId: '23',
          },
          {
            id: 'dep-24-prefecture',
            question: 'Quelle est la préfecture de la Dordogne ?',
            answer: 'Périgueux',
            mapId: '24',
          },
          {
            id: 'dep-33-prefecture',
            question: 'Quelle est la préfecture de la Gironde ?',
            answer: 'Bordeaux',
            mapId: '33',
          },
          {
            id: 'dep-40-prefecture',
            question: 'Quelle est la préfecture des Landes ?',
            answer: 'Mont-de-Marsan',
            mapId: '40',
          },
          {
            id: 'dep-47-prefecture',
            question: 'Quelle est la préfecture du Lot-et-Garonne ?',
            answer: 'Agen',
            mapId: '47',
          },
          {
            id: 'dep-64-prefecture',
            question: 'Quelle est la préfecture des Pyrénées-Atlantiques ?',
            answer: 'Pau',
            mapId: '64',
          },
          {
            id: 'dep-79-prefecture',
            question: 'Quelle est la préfecture des Deux-Sèvres ?',
            answer: 'Niort',
            mapId: '79',
          },
          {
            id: 'dep-86-prefecture',
            question: 'Quelle est la préfecture de la Vienne ?',
            answer: 'Poitiers',
            mapId: '86',
          },
          {
            id: 'dep-87-prefecture',
            question: 'Quelle est la préfecture de la Haute-Vienne ?',
            answer: 'Limoges',
            mapId: '87',
          },
        ],
      },
    ],
  },
];

/** Retrouve une leçon par son id, tous thèmes confondus. */
export function findLesson(lessonId: string) {
  for (const theme of themes) {
    const lesson = theme.lessons.find((l) => l.id === lessonId);
    if (lesson) return lesson;
  }
  return undefined;
}

/** Retrouve une carte par son id, toutes leçons confondues. */
export function findCard(cardId: string) {
  for (const theme of themes) {
    for (const lesson of theme.lessons) {
      const card = lesson.cards.find((c) => c.id === cardId);
      if (card) return card;
    }
  }
  return undefined;
}
