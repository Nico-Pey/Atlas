import SwiftUI

/// Carte cliquable d'une région, département par département.
///
/// IMPORTANT — simplification assumée : ce ne sont PAS les tracés
/// géographiques réels des départements. Aucune source de données
/// cartographiques n'était accessible au moment d'écrire cette V1. Chaque
/// département est un rectangle arrondi placé pour respecter grossièrement sa
/// position relative réelle (nord/sud, est/ouest) — assez pour que la carte
/// soit lisible et cliquable, pas pour représenter des frontières exactes.
///
/// Remplacer ça par de vrais tracés (un `Path` SwiftUI par département, ou un
/// SVG converti) ne demandera de toucher QUE ce fichier : les vues appelantes
/// ne manipulent qu'un `mapId` (le code INSEE).

/// Un département sur la carte, dans le repère de `MapShapes` (320 × 420).
/// `x` et `y` sont le CENTRE du rectangle.
struct DepartmentShape: Identifiable {
    let id: String
    let x: CGFloat
    let y: CGFloat
    let width: CGFloat
    let height: CGFloat
}

enum MapShapes {
    static let viewBoxWidth: CGFloat = 320
    static let viewBoxHeight: CGFloat = 420

    /// Positions approximatives des 12 départements de Nouvelle-Aquitaine.
    static let nouvelleAquitaine: [DepartmentShape] = [
        DepartmentShape(id: "79", x: 90, y: 30, width: 70, height: 55),   // Deux-Sèvres
        DepartmentShape(id: "86", x: 190, y: 20, width: 70, height: 60),  // Vienne
        DepartmentShape(id: "23", x: 252, y: 70, width: 55, height: 55),  // Creuse
        DepartmentShape(id: "17", x: 40, y: 110, width: 65, height: 70),  // Charente-Maritime
        DepartmentShape(id: "16", x: 150, y: 110, width: 65, height: 60), // Charente
        DepartmentShape(id: "87", x: 242, y: 140, width: 60, height: 60), // Haute-Vienne
        DepartmentShape(id: "24", x: 176, y: 195, width: 75, height: 70), // Dordogne
        DepartmentShape(id: "19", x: 270, y: 210, width: 60, height: 65), // Corrèze
        DepartmentShape(id: "33", x: 60, y: 220, width: 90, height: 95),  // Gironde
        DepartmentShape(id: "47", x: 190, y: 280, width: 65, height: 55), // Lot-et-Garonne
        DepartmentShape(id: "40", x: 70, y: 310, width: 75, height: 80),  // Landes
        DepartmentShape(id: "64", x: 60, y: 390, width: 70, height: 55),  // Pyrénées-Atlantiques
    ]

    /// Une seule teinte dont l'opacité augmente avec la maîtrise, plutôt qu'un
    /// code rouge/vert : lisible sans dépendre de la perception des couleurs.
    static func opacity(for pool: Pool?) -> Double {
        guard let pool = pool else { return 0 }
        switch pool {
        case .nouvelle: return 0.25
        case .enCours: return 0.55
        case .connue: return 1
        }
    }
}

struct CarteInteractiveView: View {

    /// Pool de chaque département, par code INSEE. `nil` = jamais vu en leçon.
    let poolByMapId: [String: Pool]
    let selectedMapId: String?
    let onSelect: (String) -> Void

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .topLeading) {
                ForEach(MapShapes.nouvelleAquitaine) { department in
                    departmentView(
                        department,
                        scale: geometry.size.width / MapShapes.viewBoxWidth
                    )
                }
            }
        }
        .aspectRatio(MapShapes.viewBoxWidth / MapShapes.viewBoxHeight, contentMode: .fit)
    }

    /// Extrait dans une fonction plutôt qu'écrit dans le corps de la vue :
    /// on a besoin de calculer des valeurs (échelle, couleurs), ce qui ne se
    /// fait pas directement dans un bloc de construction de vue.
    private func departmentView(_ department: DepartmentShape, scale: CGFloat) -> some View {
        let pool = poolByMapId[department.id]
        let opacity = MapShapes.opacity(for: pool)
        let isSelected = department.id == selectedMapId
        // Fond neutre plein quand le département n'a jamais été vu : une
        // opacité nulle sur la couleur d'accent laisserait voir le fond blanc.
        let fill = pool == nil ? AtlasColor.surface : AtlasColor.accent
        // Texte lisible : blanc dès que le fond est assez foncé, sombre sinon.
        let labelColor: Color = pool == nil
            ? AtlasColor.textMuted
            : (opacity >= 0.55 ? .white : AtlasColor.text)

        return ZStack {
            RoundedRectangle(cornerRadius: 10)
                .fill(fill)
                .opacity(pool == nil ? 1 : opacity)

            RoundedRectangle(cornerRadius: 10)
                .stroke(
                    isSelected ? AtlasColor.accent : AtlasColor.separator,
                    lineWidth: isSelected ? 3 : 1
                )

            Text(department.id)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(labelColor)
        }
        .frame(width: department.width * scale, height: department.height * scale)
        .position(x: department.x * scale, y: department.y * scale)
        .onTapGesture { onSelect(department.id) }
        .accessibilityLabel("Département \(department.id)")
    }
}
