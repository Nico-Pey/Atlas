import SwiftUI

/// Jetons de style partagés : un seul endroit pour les couleurs, espacements
/// et tailles de texte. Si une vue écrit une couleur en dur, c'est un bug de
/// style qui se répare ici.
///
/// Contraintes (identiques à la version Expo, skill "conventions-ui") :
///  - app utilisée tôt le matin → contrastes francs, texte grand ;
///  - Apple HIG : corps de texte à 17pt minimum, cibles tactiles ≥ 44pt ;
///  - thème clair uniquement en V1.

enum AtlasColor {
    static let background = Color.white
    static let surface = Color(red: 242 / 255, green: 242 / 255, blue: 247 / 255)
    /// Presque noir plutôt que noir pur : moins agressif à la lecture.
    static let text = Color(red: 28 / 255, green: 28 / 255, blue: 30 / 255)
    /// Reste au-dessus du ratio de contraste 4.5:1 sur fond blanc.
    static let textMuted = Color(red: 90 / 255, green: 90 / 255, blue: 95 / 255)
    /// L'accent d'Atlas : un vert profond et calme, pas un bleu iOS de plus.
    static let accent = Color(red: 10 / 255, green: 110 / 255, blue: 92 / 255)
    static let success = Color(red: 30 / 255, green: 122 / 255, blue: 60 / 255)
    /// Jamais utilisé seul : toujours doublé d'un texte (daltonisme).
    static let danger = Color(red: 179 / 255, green: 38 / 255, blue: 30 / 255)
    static let separator = Color(red: 209 / 255, green: 209 / 255, blue: 214 / 255)
}

/// Échelle d'espacement en multiples de 4 : évite les marges au pifomètre.
enum AtlasSpacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
}

enum AtlasFont {
    static let title = Font.system(size: 32, weight: .bold)
    static let heading = Font.system(size: 22, weight: .semibold)
    /// 17pt = minimum recommandé par les Human Interface Guidelines.
    static let body = Font.system(size: 17, weight: .regular)
    /// La question d'une flashcard : l'élément le plus important de l'app.
    static let question = Font.system(size: 26, weight: .semibold)
    static let caption = Font.system(size: 15, weight: .regular)
}

enum AtlasLayout {
    /// Taille minimale d'une zone tappable, imposée par les HIG.
    static let minTouchTarget: CGFloat = 44
    static let cardRadius: CGFloat = 16
    static let buttonRadius: CGFloat = 12
}
