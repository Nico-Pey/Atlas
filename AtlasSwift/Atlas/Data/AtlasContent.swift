import Foundation

/// Contenu pédagogique, figé et livré avec l'app. Jamais modifié à l'exécution.
///
/// Hiérarchie : Thème → Leçon → Carte.
/// La progression de l'utilisateur (vue ? réussie ? à revoir quand ?) n'est
/// PAS ici : elle vit en SQLite, voir ProgressStore.
///
/// Conventions d'identifiants (identiques à la version Expo) :
///  - `Card.id`   : "dep-<code INSEE>-prefecture", stable à vie — c'est la clé
///                  utilisée en base, la changer perdrait la progression.
///  - `Card.mapId`: le code INSEE seul, qui relie la carte à sa forme sur
///                  CarteInteractiveView.

struct Card: Identifiable, Equatable {
    let id: String
    /// Recto. Ex : "Quelle est la préfecture de la Gironde ?"
    let question: String
    /// Verso. Ex : "Bordeaux"
    let answer: String
    /// Code INSEE du département sur la carte, si la carte est géolocalisée.
    var mapId: String? = nil
}

struct Lesson: Identifiable, Equatable {
    let id: String
    let title: String
    var subtitle: String? = nil
    let cards: [Card]
}

struct Theme: Identifiable, Equatable {
    let id: String
    let title: String
    var description: String? = nil
    let lessons: [Lesson]
}

enum AtlasContent {

    static let themes: [Theme] = [
        Theme(
            id: "departements",
            title: "Départements",
            description: "Les départements de France et leurs préfectures.",
            lessons: [
                Lesson(
                    id: "nouvelle-aquitaine",
                    title: "Nouvelle-Aquitaine",
                    subtitle: "12 départements",
                    cards: [
                        Card(id: "dep-16-prefecture",
                             question: "Quelle est la préfecture de la Charente ?",
                             answer: "Angoulême", mapId: "16"),
                        Card(id: "dep-17-prefecture",
                             question: "Quelle est la préfecture de la Charente-Maritime ?",
                             answer: "La Rochelle", mapId: "17"),
                        Card(id: "dep-19-prefecture",
                             question: "Quelle est la préfecture de la Corrèze ?",
                             answer: "Tulle", mapId: "19"),
                        Card(id: "dep-23-prefecture",
                             question: "Quelle est la préfecture de la Creuse ?",
                             answer: "Guéret", mapId: "23"),
                        Card(id: "dep-24-prefecture",
                             question: "Quelle est la préfecture de la Dordogne ?",
                             answer: "Périgueux", mapId: "24"),
                        Card(id: "dep-33-prefecture",
                             question: "Quelle est la préfecture de la Gironde ?",
                             answer: "Bordeaux", mapId: "33"),
                        Card(id: "dep-40-prefecture",
                             question: "Quelle est la préfecture des Landes ?",
                             answer: "Mont-de-Marsan", mapId: "40"),
                        Card(id: "dep-47-prefecture",
                             question: "Quelle est la préfecture du Lot-et-Garonne ?",
                             answer: "Agen", mapId: "47"),
                        Card(id: "dep-64-prefecture",
                             question: "Quelle est la préfecture des Pyrénées-Atlantiques ?",
                             answer: "Pau", mapId: "64"),
                        Card(id: "dep-79-prefecture",
                             question: "Quelle est la préfecture des Deux-Sèvres ?",
                             answer: "Niort", mapId: "79"),
                        Card(id: "dep-86-prefecture",
                             question: "Quelle est la préfecture de la Vienne ?",
                             answer: "Poitiers", mapId: "86"),
                        Card(id: "dep-87-prefecture",
                             question: "Quelle est la préfecture de la Haute-Vienne ?",
                             answer: "Limoges", mapId: "87"),
                    ]
                )
            ]
        )
    ]

    /// Toutes les cartes, tous thèmes confondus.
    static var allCards: [Card] {
        return themes.flatMap { $0.lessons }.flatMap { $0.cards }
    }

    /// Retrouve une carte par son identifiant. Utilisé par le quiz, qui ne
    /// manipule que des identifiants (c'est tout ce que la base stocke).
    static func card(id: String) -> Card? {
        return allCards.first { $0.id == id }
    }
}
