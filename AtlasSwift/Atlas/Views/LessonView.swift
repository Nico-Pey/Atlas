import SwiftUI

/// Écran de leçon : carte interactive + flashcard de la région.
///
/// Toucher un département marque immédiatement sa carte comme "vue"
/// (`markSeen`) : c'est le SEUL endroit de l'app qui fait entrer une carte
/// dans le SRS, et donc dans le pool du quiz.
struct LessonView: View {

    let lesson: Lesson

    @EnvironmentObject private var store: ProgressStore
    @State private var selectedMapId: String? = nil

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AtlasSpacing.md) {
                if let subtitle = lesson.subtitle {
                    Text(subtitle)
                        .font(AtlasFont.caption)
                        .foregroundColor(AtlasColor.textMuted)
                }

                CarteInteractiveView(
                    poolByMapId: poolByMapId,
                    selectedMapId: selectedMapId,
                    onSelect: select
                )

                legend

                if let card = selectedCard {
                    FlashCardView(
                        question: card.question,
                        answer: card.answer,
                        label: lesson.title
                    )
                    // Force SwiftUI à recréer la vue (et donc à re-cacher la
                    // réponse) quand on passe à un autre département.
                    .id(card.id)
                } else {
                    Text("Touchez un département sur la carte pour l'apprendre.")
                        .font(AtlasFont.body)
                        .foregroundColor(AtlasColor.textMuted)
                        .frame(maxWidth: .infinity)
                        .padding(.top, AtlasSpacing.md)
                }
            }
            .padding(AtlasSpacing.lg)
        }
        .background(AtlasColor.background)
        .navigationTitle(lesson.title)
    }

    // MARK: - Données

    /// Pool de chaque département de la leçon, pour colorer la carte.
    private var poolByMapId: [String: Pool] {
        var result: [String: Pool] = [:]
        for card in lesson.cards {
            guard let mapId = card.mapId else { continue }
            if let pool = store.pool(for: card.id) {
                result[mapId] = pool
            }
        }
        return result
    }

    private var selectedCard: Card? {
        guard let selectedMapId = selectedMapId else { return nil }
        return lesson.cards.first { $0.mapId == selectedMapId }
    }

    private func select(_ mapId: String) {
        selectedMapId = mapId
        guard let card = lesson.cards.first(where: { $0.mapId == mapId }) else { return }
        store.markSeen(cardId: card.id, on: AtlasDate.today())
    }

    // MARK: - Légende

    /// Sans légende, l'opacité des départements ne veut rien dire.
    private var legend: some View {
        HStack(spacing: AtlasSpacing.md) {
            legendItem("Non vue", pool: nil)
            legendItem("Nouvelle", pool: .nouvelle)
            legendItem("En cours", pool: .enCours)
            legendItem("Connue", pool: .connue)
        }
        .frame(maxWidth: .infinity)
    }

    private func legendItem(_ label: String, pool: Pool?) -> some View {
        HStack(spacing: AtlasSpacing.xs) {
            Circle()
                .fill(pool == nil ? AtlasColor.surface : AtlasColor.accent)
                .opacity(pool == nil ? 1 : MapShapes.opacity(for: pool))
                .overlay(Circle().stroke(AtlasColor.separator, lineWidth: 1))
                .frame(width: 12, height: 12)

            Text(label)
                .font(AtlasFont.caption)
                .foregroundColor(AtlasColor.textMuted)
        }
    }
}
