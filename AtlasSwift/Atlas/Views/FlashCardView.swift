import SwiftUI

/// Carte question/réponse qui se retourne au tap.
///
/// Ne connaît rien du SRS ni de la base : c'est la vue appelante (leçon ou
/// quiz) qui décide quoi faire du résultat.
struct FlashCardView: View {

    let question: String
    let answer: String
    /// Petit texte au-dessus de la question (ex : nom de la région).
    var label: String? = nil
    /// Si fourni, affiche les boutons "Je savais / Je ne savais pas" une fois
    /// la carte retournée (contexte quiz). Sinon la carte se contente de se
    /// retourner, sans notion de réussite (contexte leçon).
    var onAnswer: ((Bool) -> Void)? = nil

    @State private var revealed = false

    var body: some View {
        VStack(spacing: AtlasSpacing.md) {
            Button(action: { revealed.toggle() }) {
                cardFace
            }
            .buttonStyle(PlainButtonStyle())
            .accessibilityLabel(revealed ? answer : question)

            // Deux `if` imbriqués plutôt qu'une condition composée : c'est la
            // forme la mieux supportée par les versions anciennes de Swift.
            if revealed {
                if let onAnswer = onAnswer {
                    answerButtons(onAnswer)
                }
            }
        }
    }

    private var cardFace: some View {
        VStack(alignment: .leading, spacing: AtlasSpacing.sm) {
            if let label = label {
                Text(label)
                    .font(AtlasFont.caption)
                    .foregroundColor(AtlasColor.textMuted)
            }

            Text(question)
                .font(AtlasFont.question)
                .foregroundColor(AtlasColor.text)
                // Autorise la question à passer sur plusieurs lignes au lieu
                // d'être tronquée.
                .fixedSize(horizontal: false, vertical: true)

            if revealed {
                Rectangle()
                    .fill(AtlasColor.separator)
                    .frame(height: 1)
                    .padding(.vertical, AtlasSpacing.sm)

                Text(answer)
                    .font(AtlasFont.heading)
                    .foregroundColor(AtlasColor.accent)
            } else {
                Text("Touchez pour voir la réponse")
                    .font(AtlasFont.caption)
                    .foregroundColor(AtlasColor.textMuted)
                    .padding(.top, AtlasSpacing.sm)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AtlasSpacing.lg)
        .background(AtlasColor.surface)
        .cornerRadius(AtlasLayout.cardRadius)
    }

    private func answerButtons(_ onAnswer: @escaping (Bool) -> Void) -> some View {
        HStack(spacing: AtlasSpacing.sm) {
            Button(action: { onAnswer(false) }) {
                Text("Je ne savais pas")
                    .font(AtlasFont.body)
                    .fontWeight(.semibold)
                    .foregroundColor(AtlasColor.danger)
                    .frame(maxWidth: .infinity, minHeight: AtlasLayout.minTouchTarget)
                    .background(
                        RoundedRectangle(cornerRadius: AtlasLayout.buttonRadius)
                            .stroke(AtlasColor.danger, lineWidth: 1)
                    )
            }
            .buttonStyle(PlainButtonStyle())

            Button(action: { onAnswer(true) }) {
                Text("Je savais")
                    .font(AtlasFont.body)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity, minHeight: AtlasLayout.minTouchTarget)
                    .background(
                        RoundedRectangle(cornerRadius: AtlasLayout.buttonRadius)
                            .fill(AtlasColor.success)
                    )
            }
            .buttonStyle(PlainButtonStyle())
        }
    }
}
