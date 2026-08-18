import SwiftUI

/// Écran de quiz : la révision du jour.
///
/// Ne montre que des cartes déjà vues en leçon ET dues aujourd'hui — c'est
/// `ProgressStore.dueCardIds` qui applique la règle du moteur SRS. Répondre
/// juste sort la carte du quiz pendant 3 jours, répondre faux la fait revenir
/// dès demain (donc elle ne réapparaît pas dans la session en cours).
struct QuizView: View {

    @EnvironmentObject private var store: ProgressStore
    @State private var queue: [Card] = []
    @State private var reviewedCount = 0

    var body: some View {
        NavigationView {
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .padding(AtlasSpacing.lg)
                .background(AtlasColor.background)
                .navigationTitle("Quiz du jour")
        }
        .navigationViewStyle(StackNavigationViewStyle())
        // Rechargé à chaque ouverture de l'onglet : une carte apprise
        // entre-temps en leçon, ou un nouveau jour, doivent se voir tout de suite.
        .onAppear(perform: loadQueue)
    }

    private var content: some View {
        Group {
            if let card = queue.first {
                VStack(alignment: .leading, spacing: AtlasSpacing.md) {
                    Text("\(reviewedCount + 1) / \(reviewedCount + queue.count)")
                        .font(AtlasFont.caption)
                        .foregroundColor(AtlasColor.textMuted)

                    FlashCardView(
                        question: card.question,
                        answer: card.answer,
                        onAnswer: { success in answer(card, success: success) }
                    )
                    .id(card.id)
                }
            } else {
                VStack(alignment: .leading, spacing: AtlasSpacing.md) {
                    Text(reviewedCount == 0
                         ? "Rien à réviser pour l'instant."
                         : "Terminé pour aujourd'hui.")
                        .font(AtlasFont.heading)
                        .foregroundColor(AtlasColor.text)

                    Text(reviewedCount == 0
                         ? "Apprenez de nouvelles cartes dans l'onglet Apprendre, ou revenez demain."
                         : "\(reviewedCount) carte(s) révisée(s). À demain.")
                        .font(AtlasFont.body)
                        .foregroundColor(AtlasColor.textMuted)
                }
            }
        }
    }

    private func loadQueue() {
        let dueIds = store.dueCardIds(on: AtlasDate.today())
        queue = dueIds.compactMap { AtlasContent.card(id: $0) }
        reviewedCount = 0
    }

    private func answer(_ card: Card, success: Bool) {
        store.recordReview(cardId: card.id, success: success, on: AtlasDate.today())
        reviewedCount += 1
        if !queue.isEmpty {
            queue.removeFirst()
        }
    }
}
