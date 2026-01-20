import SwiftUI
import DirigibleCore

struct MainView: View {
    @EnvironmentObject var firebaseSync: FirebaseSync
    @StateObject private var viewModel = MainViewModel()

    var body: some View {
        NavigationSplitView {
            SidebarView(viewModel: viewModel)
                .navigationSplitViewColumnWidth(min: 200, ideal: 240, max: 300)
        } detail: {
            DetailView(viewModel: viewModel)
        }
        .task {
            await viewModel.loadNotes()
        }
        .onChange(of: firebaseSync.lastSyncTime) {
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
    @Published var expandedFolders: Set<String> = []

    var rootItems: [NoteItem] {
        items.filter { $0.parentId == nil }.sorted(by: sortItems)
    }

    func getItem(id: String) -> NoteItem? {
        items.first { $0.id == id }
    }

    func getChildren(of parentId: String) -> [NoteItem] {
        items.filter { $0.parentId == parentId }.sorted(by: sortItems)
    }

    private func sortItems(_ a: NoteItem, _ b: NoteItem) -> Bool {
        // Folders first
        if a.type == .folder && b.type != .folder { return true }
        if a.type != .folder && b.type == .folder { return false }
        // Then by sortOrder if available
        if let aOrder = a.sortOrder, let bOrder = b.sortOrder {
            return aOrder < bOrder
        }
        // Then by title
        return a.title.localizedCaseInsensitiveCompare(b.title) == .orderedAscending
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

    func toggleExpanded(_ id: String) {
        if expandedFolders.contains(id) {
            expandedFolders.remove(id)
        } else {
            expandedFolders.insert(id)
        }
    }

    func isExpanded(_ id: String) -> Bool {
        expandedFolders.contains(id)
    }

    func createNote(parentId: String?) {
        let note = NoteItem.newNote(title: "Untitled", parentId: parentId)
        items.append(note)
        selectedId = note.id

        // Expand parent if creating inside a folder
        if let parentId {
            expandedFolders.insert(parentId)
        }

        Task {
            try? await FirebaseSync.shared.createNote(note)
        }
    }

    func createFolder(parentId: String?) {
        let folder = NoteItem.newFolder(title: "New Folder", parentId: parentId)
        items.append(folder)
        selectedId = folder.id

        // Expand parent if creating inside a folder
        if let parentId {
            expandedFolders.insert(parentId)
        }

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
        // Also delete children recursively
        let childIds = items.filter { $0.parentId == id }.map { $0.id }
        for childId in childIds {
            deleteNote(childId)
        }

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
    @ObservedObject var viewModel: MainViewModel

    var body: some View {
        List(selection: $viewModel.selectedId) {
            ForEach(viewModel.rootItems) { item in
                TreeItemView(item: item, viewModel: viewModel, level: 0)
            }
        }
        .listStyle(.sidebar)
        .toolbar {
            ToolbarItemGroup {
                Button(action: { viewModel.createFolder(parentId: selectedParentId) }) {
                    Image(systemName: "folder.badge.plus")
                }
                .help("New Folder (⇧⌘N)")

                Button(action: { viewModel.createNote(parentId: selectedParentId) }) {
                    Image(systemName: "square.and.pencil")
                }
                .help("New Note (⌘N)")
            }
        }
    }

    // If a folder is selected, create inside it; otherwise at root
    private var selectedParentId: String? {
        guard let selectedId = viewModel.selectedId,
              let selected = viewModel.getItem(id: selectedId) else {
            return nil
        }
        return selected.type == .folder ? selectedId : selected.parentId
    }
}

// MARK: - Tree Item (Recursive)

struct TreeItemView: View {
    let item: NoteItem
    @ObservedObject var viewModel: MainViewModel
    let level: Int

    var body: some View {
        if item.type == .folder {
            FolderRowView(item: item, viewModel: viewModel, level: level)
        } else {
            ItemRowView(item: item, viewModel: viewModel, level: level)
                .tag(item.id)
        }
    }
}

struct FolderRowView: View {
    let item: NoteItem
    @ObservedObject var viewModel: MainViewModel
    let level: Int

    private var isExpanded: Bool {
        viewModel.isExpanded(item.id)
    }

    private var children: [NoteItem] {
        viewModel.getChildren(of: item.id)
    }

    var body: some View {
        DisclosureGroup(
            isExpanded: Binding(
                get: { isExpanded },
                set: { _ in viewModel.toggleExpanded(item.id) }
            )
        ) {
            ForEach(children) { child in
                TreeItemView(item: child, viewModel: viewModel, level: level + 1)
            }
        } label: {
            ItemRowView(item: item, viewModel: viewModel, level: level)
        }
        .tag(item.id)
    }
}

struct ItemRowView: View {
    let item: NoteItem
    @ObservedObject var viewModel: MainViewModel
    let level: Int

    private var isSelected: Bool {
        viewModel.selectedId == item.id
    }

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: iconName)
                .foregroundColor(isSelected ? .white : iconColor)
                .font(.system(size: DirigibleStyle.IconSize.sm))
                .frame(width: 16)

            Text(item.title.isEmpty ? "Untitled" : item.title)
                .font(DirigibleStyle.Typography.body)
                .foregroundColor(isSelected ? .white : DirigibleStyle.Colors.foreground)
                .lineLimit(1)

            Spacer()

            if item.published == true {
                Circle()
                    .fill(isSelected ? .white : DirigibleStyle.Colors.success)
                    .frame(width: 6, height: 6)
            }
        }
        .contentShape(Rectangle())
        .contextMenu {
            Button("New Note") {
                let parentId = item.type == .folder ? item.id : item.parentId
                viewModel.createNote(parentId: parentId)
            }
            Button("New Folder") {
                let parentId = item.type == .folder ? item.id : item.parentId
                viewModel.createFolder(parentId: parentId)
            }
            Divider()
            Button("Delete", role: .destructive) {
                viewModel.deleteNote(item.id)
            }
        }
    }

    private var iconName: String {
        switch item.type {
        case .folder: return "folder"
        case .note: return "doc"
        case .moodboard: return "square.grid.2x2"
        case .music: return "music.note"
        }
    }

    private var iconColor: Color {
        // All icons are muted gray, matching web app's Heroicons style
        DirigibleStyle.Colors.muted
    }
}

// MARK: - Detail View

struct DetailView: View {
    @ObservedObject var viewModel: MainViewModel

    var body: some View {
        if let selectedId = viewModel.selectedId,
           let item = viewModel.getItem(id: selectedId) {
            switch item.type {
            case .note:
                NoteDetailView(item: item, onUpdate: { viewModel.updateNote($0) })
            case .folder:
                FolderDetailView(item: item, viewModel: viewModel)
            case .moodboard:
                MoodboardDetailView(item: item, onUpdate: { viewModel.updateNote($0) })
            case .music:
                MusicLibraryDetailView(item: item, onUpdate: { viewModel.updateNote($0) })
            }
        } else {
            EmptyStateView()
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
                .font(DirigibleStyle.Typography.title)
                .foregroundColor(DirigibleStyle.Colors.foreground)
                .textFieldStyle(.plain)
                .focused($isTitleFocused)
                .padding(.horizontal, DirigibleStyle.Spacing.xl)
                .padding(.top, DirigibleStyle.Spacing.xl)
                .padding(.bottom, DirigibleStyle.Spacing.lg)

            Divider()
                .background(DirigibleStyle.Colors.border)
                .padding(.horizontal, DirigibleStyle.Spacing.xl)

            // Content
            TextEditor(text: $content)
                .font(DirigibleStyle.Typography.bodySerif)
                .foregroundColor(DirigibleStyle.Colors.foreground)
                .scrollContentBackground(.hidden)
                .padding(.horizontal, 20)
                .padding(.top, DirigibleStyle.Spacing.lg)
        }
        .background(DirigibleStyle.Colors.background)
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

// MARK: - Folder Detail

struct FolderDetailView: View {
    let item: NoteItem
    @ObservedObject var viewModel: MainViewModel
    @State private var hoveredId: String?

    private var children: [NoteItem] {
        viewModel.getChildren(of: item.id)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header bar (matches web's folder view header)
            HStack(spacing: DirigibleStyle.Spacing.sm) {
                Image(systemName: "folder")
                    .font(.system(size: DirigibleStyle.IconSize.md))
                    .foregroundColor(DirigibleStyle.Colors.muted)
                Text(item.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(DirigibleStyle.Colors.foreground)
                Spacer()
            }
            .padding(.horizontal, DirigibleStyle.Spacing.lg)
            .padding(.vertical, DirigibleStyle.Spacing.sm)
            .background(DirigibleStyle.Colors.sidebarBg)

            Divider()
                .background(DirigibleStyle.Colors.border)

            // Table header
            HStack(spacing: 0) {
                Text("Title")
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text("Date")
                    .frame(width: 100, alignment: .leading)
                Text("Tags")
                    .frame(width: 200, alignment: .leading)
            }
            .font(.system(size: 11, weight: .medium))
            .foregroundColor(DirigibleStyle.Colors.muted)
            .padding(.horizontal, DirigibleStyle.Spacing.lg)
            .padding(.vertical, 6)
            .background(DirigibleStyle.Colors.sidebarBg)

            Divider()
                .background(DirigibleStyle.Colors.border)

            // Table content
            if children.isEmpty {
                VStack(spacing: DirigibleStyle.Spacing.md) {
                    Spacer()
                    Text("Right-click to create")
                        .font(DirigibleStyle.Typography.body)
                        .foregroundColor(DirigibleStyle.Colors.muted)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(children) { child in
                            FolderTableRow(
                                item: child,
                                isHovered: hoveredId == child.id,
                                onTap: {
                                    viewModel.selectedId = child.id
                                    if child.type == .folder {
                                        viewModel.expandedFolders.insert(item.id)
                                    }
                                }
                            )
                            .onHover { isHovered in
                                hoveredId = isHovered ? child.id : nil
                            }
                        }
                    }
                }
            }
        }
        .background(DirigibleStyle.Colors.background)
    }
}

struct FolderTableRow: View {
    let item: NoteItem
    let isHovered: Bool
    let onTap: () -> Void

    var body: some View {
        HStack(spacing: 0) {
            // Title column with icon
            HStack(spacing: 6) {
                Image(systemName: iconName)
                    .font(.system(size: 12))
                    .foregroundColor(DirigibleStyle.Colors.muted)
                    .frame(width: 14)
                Text(item.title.isEmpty ? "Untitled" : item.title)
                    .font(.system(size: 13))
                    .foregroundColor(DirigibleStyle.Colors.foreground)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Date column
            Text(item.date ?? "—")
                .font(.system(size: 12).monospacedDigit())
                .foregroundColor(DirigibleStyle.Colors.muted)
                .frame(width: 100, alignment: .leading)

            // Tags column
            HStack(spacing: 4) {
                if let tags = item.tags, !tags.isEmpty {
                    ForEach(tags.prefix(3), id: \.self) { tag in
                        DirigibleTag(text: tag)
                    }
                    if tags.count > 3 {
                        Text("+\(tags.count - 3)")
                            .font(.system(size: 10))
                            .foregroundColor(DirigibleStyle.Colors.muted)
                    }
                }
            }
            .frame(width: 200, alignment: .leading)
        }
        .padding(.horizontal, DirigibleStyle.Spacing.lg)
        .padding(.vertical, 6)
        .background(isHovered ? DirigibleStyle.Colors.hover : Color.clear)
        .contentShape(Rectangle())
        .onTapGesture(perform: onTap)
    }

    private var iconName: String {
        switch item.type {
        case .folder: return "folder"
        case .note: return "doc"
        case .moodboard: return "square.grid.2x2"
        case .music: return "music.note"
        }
    }
}

// MARK: - Moodboard Detail (Placeholder)

struct MoodboardDetailView: View {
    let item: NoteItem
    let onUpdate: (NoteItem) -> Void

    var body: some View {
        VStack(spacing: DirigibleStyle.Spacing.md) {
            Image(systemName: "square.grid.2x2")
                .font(.system(size: 48))
                .foregroundColor(.purple.opacity(0.5))

            Text(item.title)
                .font(DirigibleStyle.Typography.heading)
                .foregroundColor(DirigibleStyle.Colors.foreground)

            Text("Moodboard view coming soon")
                .font(DirigibleStyle.Typography.caption)
                .foregroundColor(DirigibleStyle.Colors.muted)

            if let images = item.images {
                Text("\(images.count) images")
                    .font(DirigibleStyle.Typography.caption)
                    .foregroundColor(DirigibleStyle.Colors.muted)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DirigibleStyle.Colors.background)
    }
}

// MARK: - Music Library Detail (Placeholder)

struct MusicLibraryDetailView: View {
    let item: NoteItem
    let onUpdate: (NoteItem) -> Void

    var body: some View {
        VStack(spacing: DirigibleStyle.Spacing.md) {
            Image(systemName: "music.note.list")
                .font(.system(size: 48))
                .foregroundColor(.pink.opacity(0.5))

            Text(item.title)
                .font(DirigibleStyle.Typography.heading)
                .foregroundColor(DirigibleStyle.Colors.foreground)

            Text("Music library view coming soon")
                .font(DirigibleStyle.Typography.caption)
                .foregroundColor(DirigibleStyle.Colors.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DirigibleStyle.Colors.background)
    }
}

// MARK: - Empty State

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: DirigibleStyle.Spacing.md) {
            Image(systemName: "doc.text")
                .font(.system(size: 48))
                .foregroundColor(DirigibleStyle.Colors.muted.opacity(0.5))

            Text("Select a note")
                .font(DirigibleStyle.Typography.subheading)
                .foregroundColor(DirigibleStyle.Colors.muted)

            Text("Or press ⌘N to create a new one")
                .font(DirigibleStyle.Typography.caption)
                .foregroundColor(DirigibleStyle.Colors.muted.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DirigibleStyle.Colors.background)
    }
}

#Preview {
    MainView()
        .environmentObject(FirebaseSync.shared)
}
