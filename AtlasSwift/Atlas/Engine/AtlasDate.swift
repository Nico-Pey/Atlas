import Foundation

/// Une date au format "YYYY-MM-DD", sans heure.
///
/// Le SRS raisonne en jours, jamais en heures : "demain" doit vouloir dire la
/// même chose qu'on révise à 7h ou à 23h. Et deux chaînes "YYYY-MM-DD" se
/// comparent directement avec < et <= (ordre alphabétique = ordre
/// chronologique), donc pas de piège de fuseau horaire.
typealias ISODate = String

/// Utilitaires de date du moteur. Aucune dépendance à SwiftUI ou à la base.
enum AtlasDate {

    /// Date du jour dans le fuseau horaire de l'appareil.
    ///
    /// `now` est un paramètre (et non un `Date()` caché dans le corps) pour
    /// que les tests puissent figer la date.
    static func today(_ now: Date = Date()) -> ISODate {
        let parts = Calendar.current.dateComponents([.year, .month, .day], from: now)
        return format(year: parts.year ?? 1970, month: parts.month ?? 1, day: parts.day ?? 1)
    }

    /// Ajoute `days` jours (valeur négative acceptée) à une date "YYYY-MM-DD".
    ///
    /// Le calcul se fait à midi UTC : ça évite de retomber sur le jour
    /// précédent ou suivant lors d'un changement d'heure (heure d'été).
    static func addDays(_ date: ISODate, _ days: Int) -> ISODate {
        guard let parsed = parse(date) else { return date }

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? calendar.timeZone

        var components = DateComponents()
        components.year = parsed.year
        components.month = parsed.month
        components.day = parsed.day
        components.hour = 12

        guard let base = calendar.date(from: components),
              let shifted = calendar.date(byAdding: .day, value: days, to: base) else {
            return date
        }

        let parts = calendar.dateComponents([.year, .month, .day], from: shifted)
        return format(year: parts.year ?? 1970, month: parts.month ?? 1, day: parts.day ?? 1)
    }

    /// Découpe "2026-08-18" en (2026, 8, 18). Retourne nil si le format est invalide.
    static func parse(_ date: ISODate) -> (year: Int, month: Int, day: Int)? {
        let parts = date.split(separator: "-")
        guard parts.count == 3,
              let year = Int(parts[0]),
              let month = Int(parts[1]),
              let day = Int(parts[2]) else {
            return nil
        }
        return (year, month, day)
    }

    static func format(year: Int, month: Int, day: Int) -> ISODate {
        return String(format: "%04d-%02d-%02d", year, month, day)
    }
}
