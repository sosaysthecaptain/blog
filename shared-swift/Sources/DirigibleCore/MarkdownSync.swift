import Foundation
import Combine

/// MarkdownSync - Bidirectional sync between SQLite cache and local markdown folder
@MainActor
public class MarkdownSync: ObservableObject {
    public static let shared = MarkdownSync()

    @Published public private(set) var isEnabled = false
    @Published public private(set) var folderURL: URL?
    @Published public private(set) var lastSyncTime: Date?
    @Published public private(set) var syncError: Error?

    private var folderWatcher: DispatchSourceFileSystemObject?
    private var watchedDescriptor: Int32 = -1

    private init() {}

    // MARK: - Setup

    /// Set the notes folder location
    public func setFolder(_ url: URL) {
        folderURL = url

        // Save to user settings
        var settings = UserSettings.load()
        settings.notesFolder = url
        settings.save()

        // Create folder if needed
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
    }

    /// Start watching for file changes
    public func start() throws {
        guard let folderURL else {
            throw MarkdownSyncError.noFolderSet
        }

        isEnabled = true

        // Initial sync from cache to filesystem
        Task {
            await syncToFilesystem()
        }

        // Start watching the folder
        startWatching(folderURL)

        print("[MarkdownSync] Started watching \(folderURL.path)")
    }

    /// Stop watching for changes
    public func stop() {
        stopWatching()
        isEnabled = false
        print("[MarkdownSync] Stopped")
    }

    // MARK: - Sync: Cache → Filesystem

    /// Sync all notes from cache to markdown files
    public func syncToFilesystem() async {
        guard let folderURL else { return }

        do {
            let notes = try await LocalCache.shared.getAllNotes()
            let tree = buildTree(from: notes)

            // Write notes recursively
            try await writeTree(tree, to: folderURL)

            lastSyncTime = Date()
            print("[MarkdownSync] Synced \(notes.count) items to filesystem")
        } catch {
            syncError = error
            print("[MarkdownSync] Sync to filesystem failed: \(error)")
        }
    }

    /// Sync a single note to filesystem
    public func syncNoteToFilesystem(_ note: NoteItem) async {
        guard let folderURL else { return }

        do {
            let path = try await getNotePath(note, baseURL: folderURL)

            switch note.type {
            case .folder:
                try FileManager.default.createDirectory(at: path, withIntermediateDirectories: true)
            case .note:
                let markdown = noteToMarkdown(note)
                let fileURL = path.appendingPathExtension("md")
                try markdown.write(to: fileURL, atomically: true, encoding: .utf8)
            case .moodboard, .music:
                // Skip moodboards and music for now
                break
            }
        } catch {
            print("[MarkdownSync] Failed to sync note \(note.id): \(error)")
        }
    }

    // MARK: - Sync: Filesystem → Cache

    /// Scan filesystem and sync changes back to cache
    public func syncFromFilesystem() async {
        guard let folderURL else { return }

        do {
            let fileManager = FileManager.default
            let enumerator = fileManager.enumerator(
                at: folderURL,
                includingPropertiesForKeys: [.isDirectoryKey, .contentModificationDateKey],
                options: [.skipsHiddenFiles]
            )

            var processedIds = Set<String>()

            while let fileURL = enumerator?.nextObject() as? URL {
                guard fileURL.pathExtension == "md" else { continue }

                let content = try String(contentsOf: fileURL, encoding: .utf8)
                if let note = markdownToNote(content, fileURL: fileURL, baseURL: folderURL) {
                    // Check if local file is newer than cached version
                    let existingNote = try await LocalCache.shared.getNoteById(note.id)
                    if existingNote == nil || note.updatedAt > existingNote!.updatedAt {
                        try await LocalCache.shared.upsertNote(note)
                        // Also update Firestore
                        try await FirebaseSync.shared.updateNote(note)
                    }
                    processedIds.insert(note.id)
                }
            }

            lastSyncTime = Date()
        } catch {
            syncError = error
            print("[MarkdownSync] Sync from filesystem failed: \(error)")
        }
    }

    // MARK: - Markdown Conversion

    private func noteToMarkdown(_ note: NoteItem) -> String {
        var lines: [String] = []

        // YAML frontmatter
        lines.append("---")
        lines.append("id: \(note.id)")
        lines.append("title: \(escapeYaml(note.title))")
        if let date = note.date {
            lines.append("date: \(date)")
        }
        if let time = note.time {
            lines.append("time: \(time)")
        }
        if let tags = note.tags, !tags.isEmpty {
            lines.append("tags: [\(tags.map { escapeYaml($0) }.joined(separator: ", "))]")
        }
        if let published = note.published {
            lines.append("published: \(published)")
        }
        if let slug = note.slug {
            lines.append("slug: \(slug)")
        }
        lines.append("created: \(ISO8601DateFormatter().string(from: note.createdAt))")
        lines.append("updated: \(ISO8601DateFormatter().string(from: note.updatedAt))")
        lines.append("---")
        lines.append("")

        // Title as H1
        lines.append("# \(note.title)")
        lines.append("")

        // Content
        if let content = note.content {
            lines.append(content)
        }

        return lines.joined(separator: "\n")
    }

    private func markdownToNote(_ content: String, fileURL: URL, baseURL: URL) -> NoteItem? {
        // Parse YAML frontmatter
        guard content.hasPrefix("---") else { return nil }

        let parts = content.components(separatedBy: "---")
        guard parts.count >= 3 else { return nil }

        let frontmatter = parts[1].trimmingCharacters(in: .whitespacesAndNewlines)
        let body = parts.dropFirst(2).joined(separator: "---").trimmingCharacters(in: .whitespacesAndNewlines)

        // Parse frontmatter
        var metadata: [String: String] = [:]
        for line in frontmatter.split(separator: "\n") {
            let keyValue = line.split(separator: ":", maxSplits: 1)
            if keyValue.count == 2 {
                let key = String(keyValue[0]).trimmingCharacters(in: .whitespaces)
                let value = String(keyValue[1]).trimmingCharacters(in: .whitespaces)
                metadata[key] = value
            }
        }

        guard let id = metadata["id"],
              let title = metadata["title"]
        else { return nil }

        // Parse dates
        let dateFormatter = ISO8601DateFormatter()
        let createdAt = metadata["created"].flatMap { dateFormatter.date(from: $0) } ?? Date()
        let updatedAt = metadata["updated"].flatMap { dateFormatter.date(from: $0) } ?? Date()

        // Parse tags
        var tags: [String]?
        if let tagsStr = metadata["tags"] {
            // Parse [tag1, tag2] format
            let stripped = tagsStr.trimmingCharacters(in: CharacterSet(charactersIn: "[]"))
            tags = stripped.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        }

        // Extract body content (remove H1 title line if present)
        var noteContent = body
        if noteContent.hasPrefix("# ") {
            let lines = noteContent.split(separator: "\n", omittingEmptySubsequences: false)
            if lines.count > 1 {
                noteContent = lines.dropFirst().joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
            } else {
                noteContent = ""
            }
        }

        // Determine parent ID from folder structure
        let parentId = determineParentId(fileURL: fileURL, baseURL: baseURL)

        return NoteItem(
            id: id,
            type: .note,
            title: title,
            parentId: parentId,
            createdAt: createdAt,
            updatedAt: updatedAt,
            content: noteContent.isEmpty ? nil : noteContent,
            date: metadata["date"],
            time: metadata["time"],
            tags: tags,
            published: metadata["published"] == "true",
            slug: metadata["slug"]
        )
    }

    private func determineParentId(fileURL: URL, baseURL: URL) -> String? {
        // TODO: Map folder structure back to note IDs
        // For now, return nil (root level)
        return nil
    }

    private func escapeYaml(_ str: String) -> String {
        if str.contains(":") || str.contains("#") || str.contains("\"") {
            return "\"\(str.replacingOccurrences(of: "\"", with: "\\\""))\""
        }
        return str
    }

    // MARK: - File Watching

    private func startWatching(_ url: URL) {
        stopWatching()

        watchedDescriptor = open(url.path, O_EVTONLY)
        guard watchedDescriptor >= 0 else {
            print("[MarkdownSync] Failed to open folder for watching")
            return
        }

        let source = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: watchedDescriptor,
            eventMask: [.write, .delete, .rename],
            queue: .main
        )

        source.setEventHandler { [weak self] in
            Task { @MainActor in
                await self?.syncFromFilesystem()
            }
        }

        source.setCancelHandler { [weak self] in
            if let fd = self?.watchedDescriptor, fd >= 0 {
                close(fd)
            }
        }

        source.resume()
        folderWatcher = source
    }

    private func stopWatching() {
        folderWatcher?.cancel()
        folderWatcher = nil
        watchedDescriptor = -1
    }

    // MARK: - Tree Building

    private struct TreeNode {
        let note: NoteItem
        var children: [TreeNode]
    }

    private func buildTree(from notes: [NoteItem]) -> [TreeNode] {
        var nodeMap: [String: TreeNode] = [:]
        var roots: [TreeNode] = []

        // First pass: create all nodes
        for note in notes {
            nodeMap[note.id] = TreeNode(note: note, children: [])
        }

        // Second pass: build relationships
        for note in notes {
            if let parentId = note.parentId, var parent = nodeMap[parentId] {
                parent.children.append(nodeMap[note.id]!)
                nodeMap[parentId] = parent
            } else {
                roots.append(nodeMap[note.id]!)
            }
        }

        return roots
    }

    private func writeTree(_ nodes: [TreeNode], to baseURL: URL) async throws {
        for node in nodes {
            let note = node.note

            switch note.type {
            case .folder:
                let folderURL = baseURL.appendingPathComponent(sanitizeFilename(note.title))
                try FileManager.default.createDirectory(at: folderURL, withIntermediateDirectories: true)
                try await writeTree(node.children, to: folderURL)

            case .note:
                let markdown = noteToMarkdown(note)
                let filename = sanitizeFilename(note.title) + ".md"
                let fileURL = baseURL.appendingPathComponent(filename)
                try markdown.write(to: fileURL, atomically: true, encoding: .utf8)

            case .moodboard, .music:
                // Skip for now - could create index files later
                break
            }
        }
    }

    private func getNotePath(_ note: NoteItem, baseURL: URL) async throws -> URL {
        var pathComponents: [String] = []

        // Build path from parent chain
        var currentNote: NoteItem? = note
        while let n = currentNote {
            pathComponents.insert(sanitizeFilename(n.title), at: 0)
            if let parentId = n.parentId {
                currentNote = try await LocalCache.shared.getNoteById(parentId)
            } else {
                currentNote = nil
            }
        }

        var url = baseURL
        // All but last component are folders
        for component in pathComponents.dropLast() {
            url = url.appendingPathComponent(component)
        }

        // Last component is the note itself
        if let last = pathComponents.last {
            url = url.appendingPathComponent(last)
        }

        return url
    }

    private func sanitizeFilename(_ name: String) -> String {
        let invalidChars = CharacterSet(charactersIn: "/\\:*?\"<>|")
        return name
            .components(separatedBy: invalidChars)
            .joined()
            .trimmingCharacters(in: .whitespaces)
    }
}

// MARK: - Errors

public enum MarkdownSyncError: Error, LocalizedError {
    case noFolderSet

    public var errorDescription: String? {
        switch self {
        case .noFolderSet:
            return "No notes folder has been set"
        }
    }
}
