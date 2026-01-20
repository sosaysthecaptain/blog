import Foundation

// MARK: - Note Types

public enum NoteType: String, Codable, CaseIterable {
    case note
    case folder
    case moodboard
    case music
}

public enum GridSize: String, Codable {
    case small
    case medium
    case large
}

public enum SortMode: String, Codable {
    case chronological
    case manual
}

public enum MusicSortColumn: String, Codable {
    case title
    case artist
    case album
    case year
    case trackNumber
    case duration
    case fileSize
}

public enum SortDirection: String, Codable {
    case asc
    case desc
}

// MARK: - Moodboard Image

public struct MoodboardImage: Codable, Identifiable, Equatable {
    public let id: String
    public var url: String
    public var thumbnailUrl: String?
    public var caption: String?
    public var source: String?
    public var width: Int
    public var height: Int
    public var fileSize: Int
    public var order: Int
    public var createdAt: Date

    public init(
        id: String,
        url: String,
        thumbnailUrl: String? = nil,
        caption: String? = nil,
        source: String? = nil,
        width: Int,
        height: Int,
        fileSize: Int,
        order: Int,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.url = url
        self.thumbnailUrl = thumbnailUrl
        self.caption = caption
        self.source = source
        self.width = width
        self.height = height
        self.fileSize = fileSize
        self.order = order
        self.createdAt = createdAt
    }
}

// MARK: - Embedded Media

public enum MediaType: String, Codable {
    case image
    case file
}

public struct EmbeddedMedia: Codable, Identifiable, Equatable {
    public let id: String
    public var url: String
    public var path: String
    public var type: MediaType
    public var filename: String?
    public var fileSize: Int

    public init(
        id: String,
        url: String,
        path: String,
        type: MediaType,
        filename: String? = nil,
        fileSize: Int
    ) {
        self.id = id
        self.url = url
        self.path = path
        self.type = type
        self.filename = filename
        self.fileSize = fileSize
    }
}

// MARK: - Note Item

public struct NoteItem: Codable, Identifiable, Equatable {
    public let id: String
    public var type: NoteType
    public var title: String
    public var parentId: String?
    public var createdAt: Date
    public var updatedAt: Date

    // Note-specific fields
    public var content: String?
    public var date: String?
    public var time: String?
    public var tags: [String]?
    public var embeddedMedia: [EmbeddedMedia]?

    // Moodboard-specific fields
    public var images: [MoodboardImage]?
    public var gridSize: GridSize?
    public var sortMode: SortMode?

    // Music library-specific fields
    public var musicSortColumn: MusicSortColumn?
    public var musicSortDirection: SortDirection?

    // Publishing fields
    public var published: Bool?
    public var slug: String?

    // Sort order
    public var sortOrder: Int?

    public init(
        id: String,
        type: NoteType,
        title: String,
        parentId: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        content: String? = nil,
        date: String? = nil,
        time: String? = nil,
        tags: [String]? = nil,
        embeddedMedia: [EmbeddedMedia]? = nil,
        images: [MoodboardImage]? = nil,
        gridSize: GridSize? = nil,
        sortMode: SortMode? = nil,
        musicSortColumn: MusicSortColumn? = nil,
        musicSortDirection: SortDirection? = nil,
        published: Bool? = nil,
        slug: String? = nil,
        sortOrder: Int? = nil
    ) {
        self.id = id
        self.type = type
        self.title = title
        self.parentId = parentId
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.content = content
        self.date = date
        self.time = time
        self.tags = tags
        self.embeddedMedia = embeddedMedia
        self.images = images
        self.gridSize = gridSize
        self.sortMode = sortMode
        self.musicSortColumn = musicSortColumn
        self.musicSortDirection = musicSortDirection
        self.published = published
        self.slug = slug
        self.sortOrder = sortOrder
    }

    // Create a new note with a generated ID
    public static func newNote(
        title: String,
        parentId: String? = nil,
        content: String? = nil
    ) -> NoteItem {
        NoteItem(
            id: UUID().uuidString,
            type: .note,
            title: title,
            parentId: parentId,
            content: content
        )
    }

    // Create a new folder with a generated ID
    public static func newFolder(
        title: String,
        parentId: String? = nil
    ) -> NoteItem {
        NoteItem(
            id: UUID().uuidString,
            type: .folder,
            title: title,
            parentId: parentId
        )
    }

    // Create a new moodboard with a generated ID
    public static func newMoodboard(
        title: String,
        parentId: String? = nil
    ) -> NoteItem {
        NoteItem(
            id: UUID().uuidString,
            type: .moodboard,
            title: title,
            parentId: parentId,
            images: [],
            gridSize: .medium,
            sortMode: .chronological
        )
    }
}

// MARK: - Song

public struct Song: Codable, Identifiable, Equatable {
    public let id: String
    public var libraryId: String
    public var title: String
    public var artist: String
    public var album: String
    public var year: Int?
    public var trackNumber: Int?
    public var discNumber: Int?
    public var originalTrackNumber: Int?
    public var genre: String
    public var duration: Double
    public var fileSize: Int
    public var albumArtUrl: String?
    public var albumArtThumbUrl: String?
    public var storageUrl: String
    public var storagePath: String
    public var fileName: String
    public var fileType: String
    public var dateAdded: Date
    public var createdAt: Date
    public var updatedAt: Date

    public init(
        id: String,
        libraryId: String,
        title: String,
        artist: String,
        album: String,
        year: Int? = nil,
        trackNumber: Int? = nil,
        discNumber: Int? = nil,
        originalTrackNumber: Int? = nil,
        genre: String = "",
        duration: Double,
        fileSize: Int,
        albumArtUrl: String? = nil,
        albumArtThumbUrl: String? = nil,
        storageUrl: String,
        storagePath: String,
        fileName: String,
        fileType: String,
        dateAdded: Date = Date(),
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.libraryId = libraryId
        self.title = title
        self.artist = artist
        self.album = album
        self.year = year
        self.trackNumber = trackNumber
        self.discNumber = discNumber
        self.originalTrackNumber = originalTrackNumber
        self.genre = genre
        self.duration = duration
        self.fileSize = fileSize
        self.albumArtUrl = albumArtUrl
        self.albumArtThumbUrl = albumArtThumbUrl
        self.storageUrl = storageUrl
        self.storagePath = storagePath
        self.fileName = fileName
        self.fileType = fileType
        self.dateAdded = dateAdded
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    // Formatted duration string (MM:SS)
    public var formattedDuration: String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    // Formatted file size
    public var formattedFileSize: String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(fileSize))
    }
}

// MARK: - User Settings

public struct UserSettings: Codable {
    public var notesFolder: URL
    public var syncMedia: Bool
    public var hasCompletedOnboarding: Bool

    public init(
        notesFolder: URL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!.appendingPathComponent("dirigible"),
        syncMedia: Bool = false,
        hasCompletedOnboarding: Bool = false
    ) {
        self.notesFolder = notesFolder
        self.syncMedia = syncMedia
        self.hasCompletedOnboarding = hasCompletedOnboarding
    }

    private static let key = "dirigible.userSettings"

    public static func load() -> UserSettings {
        guard let data = UserDefaults.standard.data(forKey: key),
              let settings = try? JSONDecoder().decode(UserSettings.self, from: data)
        else {
            return UserSettings()
        }
        return settings
    }

    public func save() {
        if let data = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(data, forKey: UserSettings.key)
        }
    }
}
