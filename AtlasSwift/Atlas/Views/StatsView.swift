import SwiftUI

/// Écran de progression : où j'en suis, leçon par leçon.
///
/// Nommé `StatsView` et pas `ProgressView` : `ProgressView` est déjà un
/// composant de SwiftUI (la roue de chargement), le nom aurait été ambigu.
struct StatsView: View {

    @EnvironmentObject private var store: ProgressStore

    /// Compteurs d'une leçon. `nonVue` = jamais ouverte en leçon.
    private struct Counts {
        var nonVue = 0
        var nouvelle = 0
        var enCours = 0
        var connue = 0
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: AtlasSpacing.lg) {
                    ForEach(AtlasContent.themes) { theme in
                        ForEach(theme.lessons) { lesson in
                            lessonBlock(lesson)
                        }
                    }
                }
                .padding(AtlasSpacing.lg)
            }
            .background(AtlasColor.background)
            .navigationTitle("Progression")
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }

    private func lessonBlock(_ lesson: Lesson) -> some View {
        let counts = countsFor(lesson)

        return VStack(alignment: .leading, spacing: AtlasSpacing.xs) {
            Text(lesson.title)
                .font(AtlasFont.heading)
                .foregroundColor(AtlasColor.text)

            Text("\(lesson.cards.count) cartes au total")
                .font(AtlasFont.caption)
                .foregroundColor(AtlasColor.textMuted)
                .padding(.bottom, AtlasSpacing.sm)

            statRow("Connues", counts.connue)
            statRow("En cours", counts.enCours)
            statRow("Nouvelles", counts.nouvelle)
            statRow("Pas encore vues", counts.nonVue)
        }
        .padding(AtlasSpacing.md)
        .background(AtlasColor.surface)
        .cornerRadius(AtlasLayout.cardRadius)
    }

    private func statRow(_ label: String, _ value: Int) -> some View {
        HStack {
            Text(label)
                .font(AtlasFont.body)
                .foregroundColor(AtlasColor.textMuted)
            Spacer()
            Text("\(value)")
                .font(AtlasFont.body)
                .fontWeight(.semibold)
                .foregroundColor(AtlasColor.text)
        }
    }

    private func countsFor(_ lesson: Lesson) -> Counts {
        var counts = Counts()
        for card in lesson.cards {
            switch store.pool(for: card.id) {
            case .none: counts.nonVue += 1
            case .some(.nouvelle): counts.nouvelle += 1
            case .some(.enCours): counts.enCours += 1
            case .some(.connue): counts.connue += 1
            }
        }
        return counts
    }
}
