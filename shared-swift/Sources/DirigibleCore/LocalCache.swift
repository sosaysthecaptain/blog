import Foundation
import SQLite

/// LocalCache - SQLite-based local cache for instant reads
///
/// Architecture:
/// - Writes: SwiftUI → Firestore (direct) → LocalCache (mirror)
/// - Reads: SwiftUI → LocalCache (instant)
/// - Sync: Firestore listener → LocalCache (background)
public actor LocalCache {
    private var db: Connection?
    private let dbPath: URL

    // Tables
    private let notes = Table("notes")
    private let songs = Table("songs")

    // Note columns
    private let noteId = Expression<String>("id")
    private let noteType = Expression<String>("type")
    private let noteTitle = Expression<String>("title")
    private let noteParentId = Expression<String?>("parentId")
    private let noteContent = Expression<String?>("content")
    private let noteDate = Expression<String?>("date")
    private let noteTime = Expression<String?>("time")
    private let noteTags = Expression<String?>("tags")
    private let noteImages = Expression<String?>("images")
    private let noteEmbeddedMedia = Expression<String?>("embeddedMedia")
    private let noteGridSize = Expression<String?>("gridSize")
    private let noteSortMode = Expression<String?>("sortMode")
    private let noteMusicSortColumn = Expression<String?>("musicSortColumn")
    private let noteMusicSortDirection = Expression<String?>("musicSortDirection")
    private let notePublished = Expression<Bool>("published")
    private let noteSlug = Expression<String?>("slug")
    private let noteSortOrder = Expression<Int?>("sortOrder")
    private let noteCreatedAt = Expression<Double>("createdAt")
    private let noteUpdatedAt = Expression<Double>("updatedAt")

    // Song columns
    private let songId = Expression<String>("id")
    private let songLibraryId = Expression<String>("libraryId")
    private let songTitle = Expression<String>("title")
    private let songArtist = Expression<String>("artist")
    private let songAlbum = Expression<String>("album")
    private let songYear = Expression<Int?>("year")
    private let songTrackNumber = Expression<Int?>("trackNumber")
    private let songDiscNumber = Expression<Int?>("discNumber")
    private let songOriginalTrackNumber = Expression<Int?>("originalTrackNumber")
    private let songGenre = Expression<String>("genre")
    private let songDuration = Expression<Double>("duration")
    private let songFileSize = Expression<Int>("fileSize")
    private let songAlbumArtUrl = Expression<String?>("albumArtUrl")
    private let songAlbumArtThumbUrl = Expression<String?>("albumArtThumbUrl")
    private let songStorageUrl = Expression<String>("storageUrl")
    private let songStoragePath = Expression<String>("storagePath")
    private let songFileName = Expression<String>("fileName")
    private let songFileType = Expression<String>("fileType")
    private let songDateAdded = Expression<Double>("dateAdded")
    private let songCreatedAt = Expression<Double>("createdAt")
    private let songUpdatedAt = Expression<Double>("updatedAt")

    // Singleton
    public static let shared = LocalCache()

    private init() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dirigibleDir = appSupport.appendingPathComponent("Dirigible", isDirectory: true)

        // Create directory if needed
        try? FileManager.default.createDirectory(at: dirigibleDir, withIntermediateDirectories: true)

        self.dbPath = dirigibleDir.appendingPathComponent("cache.sqlite")
    }

    /// Initialize the database
    public func initialize() throws {
        db = try Connection(dbPath.path)

        // Create notes table
        try db?.run(notes.create(ifNotExists: true) { t in
            t.column(noteId, primaryKey: true)
            t.column(noteType)
            t.column(noteTitle)
            t.column(noteParentId)
            t.column(noteContent)
            t.column(noteDate)
            t.column(noteTime)
            t.column(noteTags)
            t.column(noteImages)
            t.column(noteEmbeddedMedia)
            t.column(noteGridSize)
            t.column(noteSortMode)
            t.column(noteMusicSortColumn)
            t.column(noteMusicSortDirection)
            t.column(notePublished)
            t.column(noteSlug)
            t.column(noteSortOrder)
            t.column(noteCreatedAt)
            t.column(noteUpdatedAt)
        })

        // Create index for parent queries
        try db?.run(notes.createIndex(noteParentId, ifNotExists: true))

        // Create songs table
        try db?.run(songs.create(ifNotExists: true) { t in
            t.column(songId, primaryKey: true)
            t.column(songLibraryId)
            t.column(songTitle)
            t.column(songArtist)
            t.column(songAlbum)
            t.column(songYear)
            t.column(songTrackNumber)
            t.column(songDiscNumber)
            t.column(songOriginalTrackNumber)
            t.column(songGenre)
            t.column(songDuration)
            t.column(songFileSize)
            t.column(songAlbumArtUrl)
            t.column(songAlbumArtThumbUrl)
            t.column(songStorageUrl)
            t.column(songStoragePath)
            t.column(songFileName)
            t.column(songFileType)
            t.column(songDateAdded)
            t.column(songCreatedAt)
            t.column(songUpdatedAt)
        })

        // Create index for library queries
        try db?.run(songs.createIndex(songLibraryId, ifNotExists: true))

        print("[LocalCache] SQLite initialized at \(dbPath.path)")
    }

    // MARK: - Notes

    /// Get all notes
    public func getAllNotes() throws -> [NoteItem] {
        guard let db else { throw CacheError.notInitialized }

        let query = notes.order(noteSortOrder.asc, noteCreatedAt.asc)
        return try db.prepare(query).map { row in
            try rowToNote(row)
        }
    }

    /// Get notes by parent ID
    public func getNotesByParent(_ parentId: String?) throws -> [NoteItem] {
        guard let db else { throw CacheError.notInitialized }

        let query: Table
        if let parentId {
            query = notes.filter(noteParentId == parentId).order(noteSortOrder.asc, noteCreatedAt.asc)
        } else {
            query = notes.filter(noteParentId == nil).order(noteSortOrder.asc, noteCreatedAt.asc)
        }

        return try db.prepare(query).map { row in
            try rowToNote(row)
        }
    }

    /// Get a single note by ID
    public func getNoteById(_ id: String) throws -> NoteItem? {
        guard let db else { throw CacheError.notInitialized }

        let query = notes.filter(noteId == id)
        guard let row = try db.pluck(query) else { return nil }
        return try rowToNote(row)
    }

    /// Upsert a note
    public func upsertNote(_ note: NoteItem) throws {
        guard let db else { throw CacheError.notInitialized }

        let encoder = JSONEncoder()
        let tagsJson = note.tags.map { try? encoder.encode($0) }.flatMap { $0.map { String(data: $0, encoding: .utf8) } } ?? nil
        let imagesJson = note.images.map { try? encoder.encode($0) }.flatMap { $0.map { String(data: $0, encoding: .utf8) } } ?? nil
        let embeddedMediaJson = note.embeddedMedia.map { try? encoder.encode($0) }.flatMap { $0.map { String(data: $0, encoding: .utf8) } } ?? nil

        try db.run(notes.upsert(
            noteId <- note.id,
            noteType <- note.type.rawValue,
            noteTitle <- note.title,
            noteParentId <- note.parentId,
            noteContent <- note.content,
            noteDate <- note.date,
            noteTime <- note.time,
            noteTags <- tagsJson,
            noteImages <- imagesJson,
            noteEmbeddedMedia <- embeddedMediaJson,
            noteGridSize <- note.gridSize?.rawValue,
            noteSortMode <- note.sortMode?.rawValue,
            noteMusicSortColumn <- note.musicSortColumn?.rawValue,
            noteMusicSortDirection <- note.musicSortDirection?.rawValue,
            notePublished <- (note.published ?? false),
            noteSlug <- note.slug,
            noteSortOrder <- note.sortOrder,
            noteCreatedAt <- note.createdAt.timeIntervalSince1970 * 1000,
            noteUpdatedAt <- note.updatedAt.timeIntervalSince1970 * 1000,
            onConflictOf: noteId
        ))
    }

    /// Bulk upsert notes
    public func upsertNotes(_ notes: [NoteItem]) throws {
        for note in notes {
            try upsertNote(note)
        }
    }

    /// Delete a note
    public func deleteNote(_ id: String) throws {
        guard let db else { throw CacheError.notInitialized }
        try db.run(notes.filter(noteId == id).delete())
    }

    private func rowToNote(_ row: Row) throws -> NoteItem {
        let decoder = JSONDecoder()

        var tags: [String]?
        if let tagsJson = row[noteTags], let data = tagsJson.data(using: .utf8) {
            tags = try? decoder.decode([String].self, from: data)
        }

        var images: [MoodboardImage]?
        if let imagesJson = row[noteImages], let data = imagesJson.data(using: .utf8) {
            images = try? decoder.decode([MoodboardImage].self, from: data)
        }

        var embeddedMedia: [EmbeddedMedia]?
        if let mediaJson = row[noteEmbeddedMedia], let data = mediaJson.data(using: .utf8) {
            embeddedMedia = try? decoder.decode([EmbeddedMedia].self, from: data)
        }

        return NoteItem(
            id: row[noteId],
            type: NoteType(rawValue: row[noteType]) ?? .note,
            title: row[noteTitle],
            parentId: row[noteParentId],
            createdAt: Date(timeIntervalSince1970: row[noteCreatedAt] / 1000),
            updatedAt: Date(timeIntervalSince1970: row[noteUpdatedAt] / 1000),
            content: row[noteContent],
            date: row[noteDate],
            time: row[noteTime],
            tags: tags,
            embeddedMedia: embeddedMedia,
            images: images,
            gridSize: row[noteGridSize].flatMap { GridSize(rawValue: $0) },
            sortMode: row[noteSortMode].flatMap { SortMode(rawValue: $0) },
            musicSortColumn: row[noteMusicSortColumn].flatMap { MusicSortColumn(rawValue: $0) },
            musicSortDirection: row[noteMusicSortDirection].flatMap { SortDirection(rawValue: $0) },
            published: row[notePublished],
            slug: row[noteSlug],
            sortOrder: row[noteSortOrder]
        )
    }

    // MARK: - Songs

    /// Get songs by library ID
    public func getSongsByLibrary(_ libraryId: String) throws -> [Song] {
        guard let db else { throw CacheError.notInitialized }

        let query = songs.filter(songLibraryId == libraryId)
        return try db.prepare(query).map { row in
            rowToSong(row)
        }
    }

    /// Get a single song by ID
    public func getSongById(_ id: String) throws -> Song? {
        guard let db else { throw CacheError.notInitialized }

        let query = songs.filter(songId == id)
        guard let row = try db.pluck(query) else { return nil }
        return rowToSong(row)
    }

    /// Upsert a song
    public func upsertSong(_ song: Song) throws {
        guard let db else { throw CacheError.notInitialized }

        try db.run(songs.upsert(
            songId <- song.id,
            songLibraryId <- song.libraryId,
            songTitle <- song.title,
            songArtist <- song.artist,
            songAlbum <- song.album,
            songYear <- song.year,
            songTrackNumber <- song.trackNumber,
            songDiscNumber <- song.discNumber,
            songOriginalTrackNumber <- song.originalTrackNumber,
            songGenre <- song.genre,
            songDuration <- song.duration,
            songFileSize <- song.fileSize,
            songAlbumArtUrl <- song.albumArtUrl,
            songAlbumArtThumbUrl <- song.albumArtThumbUrl,
            songStorageUrl <- song.storageUrl,
            songStoragePath <- song.storagePath,
            songFileName <- song.fileName,
            songFileType <- song.fileType,
            songDateAdded <- song.dateAdded.timeIntervalSince1970 * 1000,
            songCreatedAt <- song.createdAt.timeIntervalSince1970 * 1000,
            songUpdatedAt <- song.updatedAt.timeIntervalSince1970 * 1000,
            onConflictOf: songId
        ))
    }

    /// Bulk upsert songs
    public func upsertSongs(_ songs: [Song]) throws {
        for song in songs {
            try upsertSong(song)
        }
    }

    /// Delete a song
    public func deleteSong(_ id: String) throws {
        guard let db else { throw CacheError.notInitialized }
        try db.run(songs.filter(songId == id).delete())
    }

    /// Delete all songs in a library
    public func deleteSongsByLibrary(_ libraryId: String) throws {
        guard let db else { throw CacheError.notInitialized }
        try db.run(songs.filter(songLibraryId == libraryId).delete())
    }

    private func rowToSong(_ row: Row) -> Song {
        Song(
            id: row[songId],
            libraryId: row[songLibraryId],
            title: row[songTitle],
            artist: row[songArtist],
            album: row[songAlbum],
            year: row[songYear],
            trackNumber: row[songTrackNumber],
            discNumber: row[songDiscNumber],
            originalTrackNumber: row[songOriginalTrackNumber],
            genre: row[songGenre],
            duration: row[songDuration],
            fileSize: row[songFileSize],
            albumArtUrl: row[songAlbumArtUrl],
            albumArtThumbUrl: row[songAlbumArtThumbUrl],
            storageUrl: row[songStorageUrl],
            storagePath: row[songStoragePath],
            fileName: row[songFileName],
            fileType: row[songFileType],
            dateAdded: Date(timeIntervalSince1970: row[songDateAdded] / 1000),
            createdAt: Date(timeIntervalSince1970: row[songCreatedAt] / 1000),
            updatedAt: Date(timeIntervalSince1970: row[songUpdatedAt] / 1000)
        )
    }

    // MARK: - Utilities

    /// Clear all cached data
    public func clear() throws {
        guard let db else { throw CacheError.notInitialized }
        try db.run(notes.delete())
        try db.run(songs.delete())
        print("[LocalCache] Cleared all data")
    }

    /// Get cache statistics
    public func getStats() throws -> (notes: Int, songs: Int) {
        guard let db else { throw CacheError.notInitialized }
        let notesCount = try db.scalar(notes.count)
        let songsCount = try db.scalar(songs.count)
        return (notesCount, songsCount)
    }
}

// MARK: - Errors

public enum CacheError: Error, LocalizedError {
    case notInitialized

    public var errorDescription: String? {
        switch self {
        case .notInitialized:
            return "Local cache has not been initialized"
        }
    }
}
