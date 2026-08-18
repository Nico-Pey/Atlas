import Foundation

// ⚠️ NE PAS AJOUTER CE DOSSIER AU PROJET XCODE.
//
// Un fichier nommé "main.swift" contient du code exécuté directement au
// lancement, ce qui entre en conflit avec le `@main` de AtlasApp.swift.
// Ce fichier sert uniquement à vérifier le moteur SRS en Terminal, sans Xcode.
//
// Depuis le dossier AtlasSwift/ :
//
//   swiftc Atlas/Engine/AtlasDate.swift Atlas/Engine/SRS.swift EngineTests/main.swift -o /tmp/atlas-srs-check && /tmp/atlas-srs-check
//
// Ça compile le moteur (qui n'utilise ni SwiftUI ni iOS) et lance les
// vérifications ci-dessous. Aucune ligne rouge = la règle SRS est respectée.

var failures = 0
var checks = 0

func check(_ label: String, _ actual: String, _ expected: String) {
    checks += 1
    if actual == expected {
        print("  ok   \(label)")
    } else {
        failures += 1
        print("  ÉCHEC \(label) — attendu \"\(expected)\", obtenu \"\(actual)\"")
    }
}

func check(_ label: String, _ actual: Int, _ expected: Int) {
    check(label, String(actual), String(expected))
}

func check(_ label: String, _ actual: Bool, _ expected: Bool) {
    check(label, String(actual), String(expected))
}

print("\nCalcul de dates")
check("+3 jours", AtlasDate.addDays("2026-08-17", 3), "2026-08-20")
check("+1 jour", AtlasDate.addDays("2026-08-17", 1), "2026-08-18")
check("changement de mois", AtlasDate.addDays("2026-08-30", 3), "2026-09-02")
check("changement d'année", AtlasDate.addDays("2026-12-31", 1), "2027-01-01")
check("année bissextile", AtlasDate.addDays("2024-02-28", 1), "2024-02-29")
check("année non bissextile", AtlasDate.addDays("2026-02-28", 1), "2026-03-01")

print("\nUne carte vue en leçon")
var progress = SRS.markSeen(cardId: "dep-33-prefecture", seenAt: "2026-08-17")
check("aucune tentative", progress.attempts, 0)
check("série à zéro", progress.streak, 0)
check("due le jour même", progress.nextReviewAt, "2026-08-17")
check("pool", SRS.pool(progress).rawValue, Pool.nouvelle.rawValue)
check("est due aujourd'hui", SRS.isDue(progress, on: "2026-08-17"), true)

print("\nPremière réussite")
progress = SRS.review(progress, success: true, on: "2026-08-17")
check("une tentative", progress.attempts, 1)
check("série à un", progress.streak, 1)
check("revient dans 3 jours", progress.nextReviewAt, "2026-08-20")
check("pool encore en cours", SRS.pool(progress).rawValue, Pool.enCours.rawValue)
check("pas due la veille", SRS.isDue(progress, on: "2026-08-19"), false)
check("due le jour dit", SRS.isDue(progress, on: "2026-08-20"), true)
check("due si on revient plus tard", SRS.isDue(progress, on: "2026-08-25"), true)

print("\nDeuxième réussite d'affilée")
progress = SRS.review(progress, success: true, on: "2026-08-20")
check("série à deux", progress.streak, 2)
check("pool connue", SRS.pool(progress).rawValue, Pool.connue.rawValue)
check("revient dans 3 jours", progress.nextReviewAt, "2026-08-23")

print("\nUn échec")
progress = SRS.review(progress, success: false, on: "2026-09-10")
check("série remise à zéro", progress.streak, 0)
check("revient dès demain", progress.nextReviewAt, "2026-09-11")
check("retombe en cours, pas en nouvelle", SRS.pool(progress).rawValue, Pool.enCours.rawValue)
check("trois tentatives au total", progress.attempts, 3)

print("\nFiltre des cartes dues")
let cards = [
    SRS.markSeen(cardId: "a", seenAt: "2026-08-17"),
    SRS.review(SRS.markSeen(cardId: "b", seenAt: "2026-08-17"), success: true, on: "2026-08-17"),
    SRS.review(SRS.markSeen(cardId: "c", seenAt: "2026-08-17"), success: false, on: "2026-08-17"),
]
check("le 17, seule la carte non tentée est due",
      SRS.dueCardIds(cards, on: "2026-08-17").joined(separator: ","), "a")
check("le 18, la carte ratée revient",
      SRS.dueCardIds(cards, on: "2026-08-18").sorted().joined(separator: ","), "a,c")
check("le 20, la carte réussie revient aussi",
      SRS.dueCardIds(cards, on: "2026-08-20").sorted().joined(separator: ","), "a,b,c")

print("")
if failures == 0 {
    print("✅ \(checks) vérifications passées.")
    exit(0)
} else {
    print("❌ \(failures) échec(s) sur \(checks) vérifications.")
    exit(1)
}
