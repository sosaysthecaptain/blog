import SwiftUI
import DirigibleCore

struct MainView: View {
    @EnvironmentObject var firebaseSync: FirebaseSync
    @StateObject private var viewModel = MainViewModel()

    var body: some View {
        NavigationSplitView {
            SidebarView(
                items: viewModel.rootItems,
                selectedId: $viewModel.selectedId,
                onCreateNote: { viewModel.createNote(parentId: nil) },
                onCreateFolder: { viewModel.createFolder(parentId: nil) }
            )
            .navigationSplitViewColumnWidth(min: 200, ideal: 240, max: 300)
        } detail: {
            if let selectedId = viewModel.selectedId,
               let item = viewModel.getItem(id: selectedId) {
                NoteDetailView(item: item, onUpdate: { viewModel.updateNote($0) })
            } else {
                EmptyStateView()
            }
        }
        .task {
            await viewModel.loadNotes()
        }
        .onChange(of: firebaseSync.lastSyncTime) {
            // Reload when sync completes
            Task {
                await viewModel.loadNotes()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .createNewNote)) { _ in
            viewModel.createNote(parentId: viewModel.selectedId)
        }
        .onReceive(NotificationCenter.default.publisher(for: .createNewFolder)) { _ in
            viewModel.createFolder(parentId: viewModel.selectedId)
        }
    }
}

// MARK: - View Model

@MainActor
class MainViewModel: ObservableObject {
    @Published var items: [NoteItem] = []
    @Published var selectedId: String?

    var rootItems: [NoteItem] {
        items.filter { $0.parentId == nil }
    }

    func getItem(id: String) -> NoteItem? {
        items.first { $0.id == id }
    }

    func getChildren(of parentId: String) -> [NoteItem] {
        items.filter { $0.parentId == parentId }
    }

    func loadNotes() async {
        do {
            items = try await LocalCache.shared.getAllNotes()
            print("[MainView] Loaded \(items.count) notes from cache")
            print("[MainView] Root items: \(rootItems.count)")
        } catch {
            print("[MainView] Failed to load notes: \(error)")
        }
    }

    func createNote(parentId: String?) {
        let note = NoteItem.newNote(title: "Untitled", parentId: parentId)
        items.append(note)
        selectedId = note.id

        Task {
            try? await FirebaseSync.shared.createNote(note)
        }
    }

    func createFolder(parentId: String?) {
        let folder = NoteItem.newFolder(title: "New Folder", parentId: parentId)
        items.append(folder)
        selectedId = folder.id

        Task {
            try? await FirebaseSync.shared.createNote(folder)
        }
    }

    func updateNote(_ note: NoteItem) {
        if let index = items.firstIndex(where: { $0.id == note.id }) {
            items[index] = note
        }

        Task {
            try? await FirebaseSync.shared.updateNote(note)
        }
    }

    func deleteNote(_ id: String) {
        items.removeAll { $0.id == id }
        if selectedId == id {
            selectedId = nil
        }

        Task {
            try? await FirebaseSync.shared.deleteNote(id)
        }
    }
}

// MARK: - Sidebar

struct SidebarView: View {
    let items: [NoteItem]
    @Binding var selectedId: String?
    let onCreateNote: () -> Void
    let onCreateFolder: () -> Void

    var body: some View {
        List(selection: $selectedId) {
            ForEach(sortedItems) { item in
                SidebarItemView(item: item)
                    .tag(item.id)
            }
        }
        .listStyle(.sidebar)
        .toolbar {
            ToolbarItemGroup {
                Button(action: onCreateFolder) {
                    Image(systemName: "folder.badge.plus")
                }
                .help("New Folder")

                Button(action: onCreateNote) {
                    Image(systemName: "square.and.pencil")
                }
                .help("New Note")
            }
        }
    }

    private var sortedItems: [NoteItem] {
        items.sorted { a, b in
            // Folders first, then by sortOrder, then by title
            if a.type == .folder && b.type != .folder { return true }
            if a.type != .folder && b.type == .folder { return false }
            if let aOrder = a.sortOrder, let bOrder = b.sortOrder {
                return aOrder < bOrder
            }
            return a.title.localizedCaseInsensitiveCompare(b.title) == .orderedAscending
        }
    }
}

struct SidebarItemView: View {
    let item: NoteItem

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: iconName)
                .foregroundColor(iconColor)
                .frame(width: 16)

            Text(item.title)
                .lineLimit(1)

            Spacer()

            if item.published == true {
                Circle()
                    .fill(.green)
                    .frame(width: 6, height: 6)
            }
        }
        .font(.system(size: 13))
    }

    private var iconName: String {
        switch item.type {
        case .folder: return "folder.fill"
        case .note: return "doc.text"
        case .moodboard: return "square.grid.2x2"
        case .music: return "music.note.list"
        }
    }

    private var iconColor: Color {
        switch item.type {
        case .folder: return .yellow
        case .note: return .secondary
        case .moodboard: return .purple
        case .music: return .pink
        }
    }
}

// MARK: - Note Detail

struct NoteDetailView: View {
    let item: NoteItem
    let onUpdate: (NoteItem) -> Void

    @State private var title: String = ""
    @State private var content: String = ""
    @FocusState private var isTitleFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Title
            TextField("Title", text: $title)
                .font(.system(size: 24, weight: .bold, design: .serif))
                .textFieldStyle(.plain)
                .focused($isTitleFocused)
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 16)

            Divider()
                .padding(.horizontal, 24)

            // Content
            TextEditor(text: $content)
                .font(.system(size: 14, design: .serif))
                .scrollContentBackground(.hidden)
                .padding(.horizontal, 20)
                .padding(.top, 16)
        }
        .background(Color(.textBackgroundColor))
        .onAppear {
            title = item.title
            content = item.content ?? ""
        }
        .onChange(of: item.id) {
            title = item.title
            content = item.content ?? ""
        }
        .onChange(of: title) {
            saveChanges()
        }
        .onChange(of: content) {
            saveChanges()
        }
    }

    private func saveChanges() {
        var updated = item
        updated.title = title
        updated.content = content.isEmpty ? nil : content
        updated.updatedAt = Date()
        onUpdate(updated)
    }
}

// MARK: - Empty State

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "doc.text")
                .font(.system(size: 48))
                .foregroundColor(.secondary.opacity(0.5))

            Text("Select a note")
                .font(.title3)
                .foregroundColor(.secondary)

            Text("Or press ⌘N to create a new one")
                .font(.caption)
                .foregroundColor(.secondary.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.textBackgroundColor))
    }
}

#Preview {
    MainView()
        .environmentObject(FirebaseSync.shared)
}
