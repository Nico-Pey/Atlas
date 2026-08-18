import SwiftUI

/// Accueil : liste des thèmes et de leurs leçons.
///
/// Ne connaît aucune région en dur : tout vient d'AtlasContent, pour
/// qu'ajouter une leçon n'oblige jamais à toucher cette vue.
struct HomeView: View {

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: AtlasSpacing.lg) {
                    ForEach(AtlasContent.themes) { theme in
                        VStack(alignment: .leading, spacing: AtlasSpacing.sm) {
                            Text(theme.title)
                                .font(AtlasFont.heading)
                                .foregroundColor(AtlasColor.text)

                            if let description = theme.description {
                                Text(description)
                                    .font(AtlasFont.body)
                                    .foregroundColor(AtlasColor.textMuted)
                            }

                            ForEach(theme.lessons) { lesson in
                                NavigationLink(destination: LessonView(lesson: lesson)) {
                                    lessonRow(lesson)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                    }
                }
                .padding(AtlasSpacing.lg)
            }
            .background(AtlasColor.background)
            .navigationTitle("Atlas")
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }

    private func lessonRow(_ lesson: Lesson) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(lesson.title)
                    .font(AtlasFont.body)
                    .fontWeight(.semibold)
                    .foregroundColor(AtlasColor.text)

                if let subtitle = lesson.subtitle {
                    Text(subtitle)
                        .font(AtlasFont.caption)
                        .foregroundColor(AtlasColor.textMuted)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundColor(AtlasColor.textMuted)
        }
        .padding(.horizontal, AtlasSpacing.md)
        .frame(minHeight: AtlasLayout.minTouchTarget + AtlasSpacing.md)
        .background(AtlasColor.surface)
        .cornerRadius(AtlasLayout.cardRadius)
    }
}
