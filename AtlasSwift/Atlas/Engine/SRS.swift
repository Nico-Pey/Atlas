import Foundation

/// Moteur de répétition espacée.
///
/// Module PUR : pas d'import SwiftUI, pas d'accès SQLite, aucun `Date()` lu en
/// cachette (la date du jour est toujours un paramètre). C'est ce qui permet de
/// le compiler et de le tester tout seul en Terminal, sans Xcode — voir
/// AtlasSwift/EngineTests/main.swift.
///
/// La règle est identique à celle de la version Expo du projet (engine/srs.ts) :
///  - une carte entre dans le suivi quand elle est vue en leçon ;
///  - réussie au quiz → elle ressort du pool pendant 3 jours ;
///  - ratée → elle revient dès le lendemain.

/// Pool d'affichage d'une carte (écran Progression).
enum Pool: String {
    /// Vue en leçon, jamais encore passée au quiz.
    case nouvelle
    /// Au moins une tentative, mais moins de 2 réussites d'affilée.
    case enCours
    /// Au moins 2 réussites d'affilée.
    case connue
}

/// État de suivi d'une carte. Le contenu de la carte (question/réponse) vit
/// ailleurs, dans AtlasContent : ici on ne manipule que des identifiants.
struct CardProgress: Equatable {
    let cardId: String
    /// Date de la première vue en leçon.
    let seenAt: ISODate
    /// Nombre total de passages au quiz (réussis + ratés).
    var attempts: Int
    /// Réussites d'affilée les plus récentes ; remis à 0 au premier échec.
    var streak: Int
    /// Prochaine date à laquelle la carte redevient due.
    var nextReviewAt: ISODate
}

enum SRS {

    /// Nombre de réussites d'affilée à partir duquel une carte est "connue".
    static let connueStreakThreshold = 2

    static let intervalDaysOnSuccess = 3
    static let intervalDaysOnFailure = 1

    /// Fait entrer une carte dans le suivi. Elle devient due immédiatement :
    /// elle peut donc tomber au quiz le jour même où elle a été apprise.
    static func markSeen(cardId: String, seenAt: ISODate) -> CardProgress {
        return CardProgress(
            cardId: cardId,
            seenAt: seenAt,
            attempts: 0,
            streak: 0,
            nextReviewAt: seenAt
        )
    }

    /// Applique le résultat d'une révision et retourne le nouvel état.
    /// Ne modifie pas l'objet reçu (les `struct` Swift sont copiées par valeur).
    static func review(_ progress: CardProgress, success: Bool, on reviewedAt: ISODate) -> CardProgress {
        var updated = progress
        updated.attempts = progress.attempts + 1
        updated.streak = success ? progress.streak + 1 : 0
        updated.nextReviewAt = AtlasDate.addDays(
            reviewedAt,
            success ? intervalDaysOnSuccess : intervalDaysOnFailure
        )
        return updated
    }

    /// Le pool n'est pas stocké : il se recalcule à partir des tentatives et
    /// de la série de réussites.
    static func pool(_ progress: CardProgress) -> Pool {
        if progress.attempts == 0 {
            return .nouvelle
        }
        return progress.streak >= connueStreakThreshold ? .connue : .enCours
    }

    /// Une carte est due si sa prochaine révision est aujourd'hui ou passée.
    static func isDue(_ progress: CardProgress, on day: ISODate) -> Bool {
        return progress.nextReviewAt <= day
    }

    static func dueCardIds(_ all: [CardProgress], on day: ISODate) -> [String] {
        return all.filter { isDue($0, on: day) }.map { $0.cardId }
    }
}
