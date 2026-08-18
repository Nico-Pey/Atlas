import Foundation
import SQLite3

/// SQLite copie la chaîne qu'on lui passe au lieu de garder un pointeur dessus.
/// Cette constante existe en C mais n'est pas exposée telle quelle à Swift, il
/// faut donc la redéfinir. Sans elle, on lirait de la mémoire libérée.
private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

/// Seul objet du projet qui parle SQL.
///
/// Il tient toute la progression en mémoire (`progressByCardId`) et écrit dans
/// SQLite à chaque changement. C'est volontaire : le jeu de données est
/// minuscule (12 cartes aujourd'hui), et un dictionnaire `@Published` permet
/// aux vues SwiftUI de se rafraîchir toutes seules — pas besoin de recharger
/// à la main quand on revient sur un écran, contrairement à la version Expo.
///
/// La règle SRS n'est PAS réécrite ici : ce fichier appelle `SRS` et se
/// contente de persister le résultat. Un seul chemin possible pour modifier
/// la progression d'une carte.
final class ProgressStore: ObservableObject {

    @Published private(set) var progressByCardId: [String: CardProgress] = [:]

    private var database: OpaquePointer?

    /// - Parameter databaseName: nom du fichier SQLite dans le dossier
    ///   Documents de l'app. Passer un autre nom permet d'isoler les tests.
    init(databaseName: String = "atlas.sqlite") {
        openDatabase(named: databaseName)
        createTableIfNeeded()
        reload()
    }

    deinit {
        if database != nil {
            sqlite3_close(database)
        }
    }

    // MARK: - Lecture

    func progress(for cardId: String) -> CardProgress? {
        return progressByCardId[cardId]
    }

    /// Pool d'une carte, y compris celles jamais vues en leçon (`nil`).
    func pool(for cardId: String) -> Pool? {
        guard let progress = progressByCardId[cardId] else { return nil }
        return SRS.pool(progress)
    }

    /// Cartes dues aujourd'hui, parmi celles déjà vues en leçon.
    func dueCardIds(on day: ISODate) -> [String] {
        return SRS.dueCardIds(Array(progressByCardId.values), on: day).sorted()
    }

    // MARK: - Écriture

    /// Fait entrer une carte dans le SRS. Sans effet si elle est déjà suivie :
    /// revoir une carte en leçon ne doit jamais remettre sa progression à zéro.
    func markSeen(cardId: String, on day: ISODate) {
        guard progressByCardId[cardId] == nil else { return }
        let progress = SRS.markSeen(cardId: cardId, seenAt: day)
        progressByCardId[cardId] = progress
        save(progress)
    }

    /// Enregistre une réponse au quiz. Sans effet si la carte n'a jamais été
    /// vue en leçon — elle n'aurait alors pas pu apparaître au quiz.
    @discardableResult
    func recordReview(cardId: String, success: Bool, on day: ISODate) -> CardProgress? {
        guard let existing = progressByCardId[cardId] else { return nil }
        let updated = SRS.review(existing, success: success, on: day)
        progressByCardId[cardId] = updated
        save(updated)
        return updated
    }

    /// Efface toute la progression. Utile pour retester depuis zéro.
    func resetAll() {
        execute("DELETE FROM card_progress;")
        progressByCardId = [:]
    }

    // MARK: - SQLite

    private func openDatabase(named databaseName: String) {
        let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let path = folder.appendingPathComponent(databaseName).path

        if sqlite3_open_v2(path, &database, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, nil) != SQLITE_OK {
            print("Atlas: impossible d'ouvrir la base à \(path)")
            database = nil
        }
    }

    private func createTableIfNeeded() {
        execute("""
        CREATE TABLE IF NOT EXISTS card_progress (
            card_id TEXT PRIMARY KEY NOT NULL,
            seen_at TEXT NOT NULL,
            attempts INTEGER NOT NULL,
            streak INTEGER NOT NULL,
            next_review_at TEXT NOT NULL
        );
        """)
    }

    /// Recharge tout le contenu de la table en mémoire.
    private func reload() {
        var loaded: [String: CardProgress] = [:]
        var statement: OpaquePointer?

        let sql = "SELECT card_id, seen_at, attempts, streak, next_review_at FROM card_progress;"
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK else {
            print("Atlas: lecture impossible — \(lastErrorMessage())")
            return
        }
        defer { sqlite3_finalize(statement) }

        while sqlite3_step(statement) == SQLITE_ROW {
            guard let cardId = readText(statement, column: 0),
                  let seenAt = readText(statement, column: 1),
                  let nextReviewAt = readText(statement, column: 4) else {
                continue
            }
            let progress = CardProgress(
                cardId: cardId,
                seenAt: seenAt,
                attempts: Int(sqlite3_column_int(statement, 2)),
                streak: Int(sqlite3_column_int(statement, 3)),
                nextReviewAt: nextReviewAt
            )
            loaded[cardId] = progress
        }

        progressByCardId = loaded
    }

    /// Insère la carte, ou met à jour sa ligne si elle existe déjà.
    /// `seen_at` n'est volontairement pas mis à jour : la première vue en leçon
    /// est une date historique, elle ne doit jamais bouger.
    private func save(_ progress: CardProgress) {
        let sql = """
        INSERT INTO card_progress (card_id, seen_at, attempts, streak, next_review_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(card_id) DO UPDATE SET
            attempts = excluded.attempts,
            streak = excluded.streak,
            next_review_at = excluded.next_review_at;
        """

        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK else {
            print("Atlas: écriture impossible — \(lastErrorMessage())")
            return
        }
        defer { sqlite3_finalize(statement) }

        bindText(statement, index: 1, value: progress.cardId)
        bindText(statement, index: 2, value: progress.seenAt)
        sqlite3_bind_int(statement, 3, Int32(progress.attempts))
        sqlite3_bind_int(statement, 4, Int32(progress.streak))
        bindText(statement, index: 5, value: progress.nextReviewAt)

        if sqlite3_step(statement) != SQLITE_DONE {
            print("Atlas: écriture refusée — \(lastErrorMessage())")
        }
    }

    private func execute(_ sql: String) {
        if sqlite3_exec(database, sql, nil, nil, nil) != SQLITE_OK {
            print("Atlas: requête refusée — \(lastErrorMessage())")
        }
    }

    private func bindText(_ statement: OpaquePointer?, index: Int32, value: String) {
        sqlite3_bind_text(statement, index, (value as NSString).utf8String, -1, SQLITE_TRANSIENT)
    }

    private func readText(_ statement: OpaquePointer?, column: Int32) -> String? {
        guard let raw = sqlite3_column_text(statement, column) else { return nil }
        return String(cString: raw)
    }

    private func lastErrorMessage() -> String {
        guard let message = sqlite3_errmsg(database) else { return "erreur inconnue" }
        return String(cString: message)
    }
}
