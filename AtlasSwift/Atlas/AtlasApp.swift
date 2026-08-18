import SwiftUI

/// Point d'entrée de l'app.
///
/// ⚠️ Xcode génère lui aussi un fichier `<NomDuProjet>App.swift` avec un
/// `@main` quand tu crées le projet. Il ne peut y en avoir qu'UN : supprime
/// celui généré par Xcode (ainsi que `ContentView.swift`) et garde celui-ci.
/// Voir AtlasSwift/README.md, étape 4.
@main
struct AtlasApp: App {

    /// Créé une seule fois pour toute la durée de vie de l'app, et partagé à
    /// toutes les vues via `environmentObject`. C'est lui qui ouvre SQLite.
    @StateObject private var store = ProgressStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
        }
    }
}

/// Les trois onglets du bas.
struct RootView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Apprendre", systemImage: "map") }

            QuizView()
                .tabItem { Label("Quiz", systemImage: "questionmark.circle") }

            StatsView()
                .tabItem { Label("Progression", systemImage: "chart.bar") }
        }
        .accentColor(AtlasColor.accent)
    }
}
