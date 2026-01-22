import SwiftUI
import DirigibleCore

// MARK: - Moodboard Detail View

struct MoodboardDetailView: View {
    let item: NoteItem
    let onUpdate: (NoteItem) -> Void

    @State private var title: String = ""
    @State private var gridSize: GridSize = .medium
    @State private var sortMode: SortMode = .manual  // Default to moodboard mode
    @State private var selectedImageIndex: Int? = nil
    @State private var isDropTargeted = false
    @FocusState private var isTitleFocused: Bool

    private var sortedImages: [MoodboardImage] {
        guard let images = item.images else { return [] }
        switch sortMode {
        case .chronological:
            return images.sorted { $0.createdAt < $1.createdAt }
        case .manual:
            return images.sorted { $0.order < $1.order }
        }
    }

    var body: some View {
        ZStack {
            // Main content
            VStack(alignment: .leading, spacing: 0) {
                // Header
                header

                Divider()
                    .background(DirigibleStyle.Colors.border)

                // Image grid
                if sortedImages.isEmpty {
                    emptyState
                } else {
                    GeometryReader { geometry in
                        ScrollView {
                            if sortMode == .chronological {
                                // Album mode: Justified grid
                                JustifiedImageGrid(
                                    images: sortedImages,
                                    gridSize: gridSize,
                                    containerWidth: geometry.size.width - DirigibleStyle.Spacing.lg * 2,
                                    onImageTap: { index in
                                        selectedImageIndex = index
                                    },
                                    onImageDelete: { imageId in
                                        deleteImage(imageId)
                                    }
                                )
                                .padding(DirigibleStyle.Spacing.lg)
                            } else {
                                // Moodboard mode: Masonry grid
                                MasonryImageGrid(
                                    images: sortedImages,
                                    gridSize: gridSize,
                                    containerWidth: geometry.size.width - DirigibleStyle.Spacing.lg * 2,
                                    onImageTap: { index in
                                        selectedImageIndex = index
                                    },
                                    onImageDelete: { imageId in
                                        deleteImage(imageId)
                                    }
                                )
                                .padding(DirigibleStyle.Spacing.lg)
                            }
                        }
                    }
                }
            }
            .opacity(selectedImageIndex == nil ? 1 : 0)

            // Carousel overlay (inline, takes over the space)
            if let index = selectedImageIndex {
                CarouselView(
                    images: sortedImages,
                    currentIndex: index,
                    onIndexChange: { selectedImageIndex = $0 },
                    onClose: { selectedImageIndex = nil },
                    onCaptionChange: { imageId, caption in
                        updateImageCaption(imageId, caption: caption)
                    }
                )
                .transition(.opacity)
            }
        }
        .background(DirigibleStyle.Colors.background)
        .onAppear {
            title = item.title
            gridSize = item.gridSize ?? .medium
            sortMode = item.sortMode ?? .manual
        }
        .onChange(of: item.id) { _, _ in
            title = item.title
            gridSize = item.gridSize ?? .medium
            sortMode = item.sortMode ?? .manual
            selectedImageIndex = nil
        }
        .onChange(of: isTitleFocused) { _, focused in
            if !focused { saveTitleChange() }
        }
        .onDrop(of: [.image, .fileURL], isTargeted: $isDropTargeted) { providers in
            handleDrop(providers)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: DirigibleStyle.Spacing.sm) {
            // Title
            TextField("Untitled", text: $title)
                .font(.custom("Georgia", size: 24).weight(.bold))
                .foregroundColor(DirigibleStyle.Colors.foreground)
                .textFieldStyle(.plain)
                .focused($isTitleFocused)
                .onSubmit { saveTitleChange() }

            // Controls row
            HStack(spacing: DirigibleStyle.Spacing.md) {
                // Grid size picker
                HStack(spacing: 2) {
                    gridSizeButton(.small, icon: "square.grid.3x3")
                    gridSizeButton(.medium, icon: "square.grid.2x2")
                    gridSizeButton(.large, icon: "square")
                }
                .padding(2)
                .background(DirigibleStyle.Colors.hover)
                .cornerRadius(6)

                // Sort mode picker (Album vs Moodboard)
                HStack(spacing: 2) {
                    sortModeButton(.chronological)  // Album
                    sortModeButton(.manual)         // Moodboard
                }
                .padding(2)
                .background(DirigibleStyle.Colors.hover)
                .cornerRadius(6)

                Spacer()

                // Image count and size
                if !sortedImages.isEmpty {
                    let totalSize = sortedImages.reduce(0) { $0 + $1.fileSize }
                    Text("\(sortedImages.count) images • \(formatSize(totalSize))")
                        .font(DirigibleStyle.Typography.caption)
                        .foregroundColor(DirigibleStyle.Colors.muted)
                }

                // Add images button
                Button(action: selectImages) {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .medium))
                }
                .buttonStyle(DirigibleSecondaryButtonStyle())
            }
        }
        .padding(.horizontal, DirigibleStyle.Spacing.xl)
        .padding(.vertical, DirigibleStyle.Spacing.lg)
    }

    private func gridSizeButton(_ size: GridSize, icon: String) -> some View {
        Button {
            gridSize = size
            saveGridSize(size)
        } label: {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundColor(gridSize == size ? DirigibleStyle.Colors.foreground : DirigibleStyle.Colors.muted)
                .frame(width: 28, height: 24)
                .background(gridSize == size ? DirigibleStyle.Colors.background : Color.clear)
                .cornerRadius(4)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func sortModeButton(_ mode: SortMode) -> some View {
        Button {
            sortMode = mode
            saveSortMode(mode)
        } label: {
            Group {
                if mode == .chronological {
                    // Album icon: Stacked photos
                    AlbumIcon()
                } else {
                    // Moodboard icon: Masonry grid
                    MoodboardIcon()
                }
            }
            .frame(width: 28, height: 24)
            .foregroundColor(sortMode == mode ? DirigibleStyle.Colors.foreground : DirigibleStyle.Colors.muted)
            .background(sortMode == mode ? DirigibleStyle.Colors.background : Color.clear)
            .cornerRadius(4)
        }
        .buttonStyle(.plain)
        .help(mode == .chronological ? "Album (chronological)" : "Moodboard (manual)")
    }

    private var emptyState: some View {
        VStack(spacing: DirigibleStyle.Spacing.lg) {
            Spacer()

            VStack(spacing: DirigibleStyle.Spacing.md) {
                Image(systemName: "photo.on.rectangle.angled")
                    .font(.system(size: 48))
                    .foregroundColor(DirigibleStyle.Colors.muted.opacity(0.5))

                Text("Drop images here")
                    .font(DirigibleStyle.Typography.body)
                    .foregroundColor(DirigibleStyle.Colors.muted)

                Text("or click + to add")
                    .font(DirigibleStyle.Typography.caption)
                    .foregroundColor(DirigibleStyle.Colors.muted.opacity(0.7))
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(isDropTargeted ? DirigibleStyle.Colors.accent.opacity(0.1) : Color.clear)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(
                    isDropTargeted ? DirigibleStyle.Colors.accent : Color.clear,
                    style: StrokeStyle(lineWidth: 2, dash: [8])
                )
                .padding(DirigibleStyle.Spacing.lg)
        )
    }

    // MARK: - Actions

    private func saveTitleChange() {
        guard title != item.title else { return }
        var updated = item
        updated.title = title
        updated.updatedAt = Date()
        onUpdate(updated)
    }

    private func saveGridSize(_ size: GridSize) {
        var updated = item
        updated.gridSize = size
        updated.updatedAt = Date()
        onUpdate(updated)
    }

    private func saveSortMode(_ mode: SortMode) {
        var updated = item
        updated.sortMode = mode
        updated.updatedAt = Date()
        onUpdate(updated)
    }

    private func deleteImage(_ imageId: String) {
        var updated = item
        updated.images?.removeAll { $0.id == imageId }
        updated.updatedAt = Date()
        onUpdate(updated)
    }

    private func updateImageCaption(_ imageId: String, caption: String) {
        var updated = item
        if let index = updated.images?.firstIndex(where: { $0.id == imageId }) {
            updated.images?[index].caption = caption.isEmpty ? nil : caption
            updated.updatedAt = Date()
            onUpdate(updated)
        }
    }

    private func selectImages() {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.allowedContentTypes = [.image]

        if panel.runModal() == .OK {
            for url in panel.urls {
                addImageFromURL(url)
            }
        }
    }

    private func handleDrop(_ providers: [NSItemProvider]) -> Bool {
        for provider in providers {
            if provider.hasItemConformingToTypeIdentifier("public.image") {
                provider.loadItem(forTypeIdentifier: "public.image", options: nil) { data, _ in
                    if let url = data as? URL {
                        DispatchQueue.main.async {
                            addImageFromURL(url)
                        }
                    }
                }
            } else if provider.hasItemConformingToTypeIdentifier("public.file-url") {
                provider.loadItem(forTypeIdentifier: "public.file-url", options: nil) { data, _ in
                    if let urlData = data as? Data,
                       let url = URL(dataRepresentation: urlData, relativeTo: nil) {
                        DispatchQueue.main.async {
                            addImageFromURL(url)
                        }
                    }
                }
            }
        }
        return true
    }

    private func addImageFromURL(_ url: URL) {
        guard let image = NSImage(contentsOf: url) else { return }
        let size = image.size

        let newImage = MoodboardImage(
            id: UUID().uuidString,
            url: url.absoluteString,
            width: Int(size.width),
            height: Int(size.height),
            fileSize: (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int) ?? 0,
            order: (item.images?.count ?? 0)
        )

        var updated = item
        if updated.images == nil {
            updated.images = []
        }
        updated.images?.append(newImage)
        updated.updatedAt = Date()
        onUpdate(updated)
    }

    private func formatSize(_ bytes: Int) -> String {
        let mb = Double(bytes) / (1024 * 1024)
        if mb >= 1 {
            return String(format: "%.1f MB", mb)
        } else {
            let kb = Double(bytes) / 1024
            return String(format: "%.0f KB", kb)
        }
    }
}

// MARK: - Album Icon (Stacked Photos)

struct AlbumIcon: View {
    var body: some View {
        Canvas { context, size in
            let scale = min(size.width, size.height) / 24

            // Back photo
            let backRect = CGRect(x: 2 * scale, y: 2 * scale, width: 16 * scale, height: 12 * scale)
            context.stroke(
                RoundedRectangle(cornerRadius: 2 * scale).path(in: backRect),
                with: .foreground,
                lineWidth: 1.5
            )

            // Front photo background (filled to cover back)
            let frontRect = CGRect(x: 6 * scale, y: 10 * scale, width: 16 * scale, height: 12 * scale)
            context.fill(
                RoundedRectangle(cornerRadius: 2 * scale).path(in: frontRect),
                with: .color(DirigibleStyle.Colors.background)
            )
            context.stroke(
                RoundedRectangle(cornerRadius: 2 * scale).path(in: frontRect),
                with: .foreground,
                lineWidth: 1.5
            )

            // Mountain in front photo
            var mountain = Path()
            mountain.move(to: CGPoint(x: 8 * scale, y: 19 * scale))
            mountain.addLine(to: CGPoint(x: 12 * scale, y: 15 * scale))
            mountain.addLine(to: CGPoint(x: 15 * scale, y: 18 * scale))
            mountain.addLine(to: CGPoint(x: 20 * scale, y: 13 * scale))
            context.stroke(mountain, with: .foreground, lineWidth: 1.5)
        }
        .frame(width: 16, height: 16)
    }
}

// MARK: - Justified Image Grid (Album Mode)

struct JustifiedImageGrid: View {
    let images: [MoodboardImage]
    let gridSize: GridSize
    let containerWidth: CGFloat
    let onImageTap: (Int) -> Void
    let onImageDelete: (String) -> Void

    private var targetRowHeight: CGFloat {
        switch gridSize {
        case .small: return 120
        case .medium: return 180
        case .large: return 250
        }
    }

    var body: some View {
        let rows = calculateRows(containerWidth: containerWidth)

        LazyVStack(alignment: .leading, spacing: 8) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                HStack(spacing: 8) {
                    ForEach(row.images) { imageItem in
                        MoodboardImageCell(
                            image: imageItem.image,
                            width: imageItem.displayWidth,
                            height: row.height,
                            onTap: {
                                if let index = images.firstIndex(where: { $0.id == imageItem.image.id }) {
                                    onImageTap(index)
                                }
                            },
                            onDelete: {
                                onImageDelete(imageItem.image.id)
                            }
                        )
                    }
                }
            }
        }
    }

    private struct ImageRowItem: Identifiable {
        let image: MoodboardImage
        let displayWidth: CGFloat
        var id: String { image.id }
    }

    private struct ImageRow {
        let images: [ImageRowItem]
        let height: CGFloat
    }

    private func calculateRows(containerWidth: CGFloat) -> [ImageRow] {
        var rows: [ImageRow] = []
        var currentRowImages: [(MoodboardImage, CGFloat)] = []
        var currentRowWidth: CGFloat = 0
        let gap: CGFloat = 8

        for image in images {
            let aspectRatio = CGFloat(image.width) / CGFloat(max(image.height, 1))
            let imageWidth = targetRowHeight * aspectRatio

            let totalWidth = currentRowWidth + imageWidth + (currentRowImages.isEmpty ? 0 : gap)

            if totalWidth > containerWidth && !currentRowImages.isEmpty {
                rows.append(makeRow(from: currentRowImages, containerWidth: containerWidth, gap: gap))
                currentRowImages = []
                currentRowWidth = 0
            }

            currentRowImages.append((image, aspectRatio))
            currentRowWidth += imageWidth + (currentRowImages.count > 1 ? gap : 0)
        }

        if !currentRowImages.isEmpty {
            let fillPercentage = currentRowWidth / containerWidth
            if fillPercentage >= 0.6 {
                rows.append(makeRow(from: currentRowImages, containerWidth: containerWidth, gap: gap))
            } else {
                let items = currentRowImages.map { (image, ratio) in
                    ImageRowItem(image: image, displayWidth: targetRowHeight * ratio)
                }
                rows.append(ImageRow(images: items, height: targetRowHeight))
            }
        }

        return rows
    }

    private func makeRow(from images: [(MoodboardImage, CGFloat)], containerWidth: CGFloat, gap: CGFloat) -> ImageRow {
        let totalGaps = CGFloat(images.count - 1) * gap
        let availableWidth = containerWidth - totalGaps
        let totalAspectRatio = images.reduce(0) { $0 + $1.1 }
        let rowHeight = availableWidth / totalAspectRatio

        let items = images.map { (image, ratio) in
            ImageRowItem(image: image, displayWidth: rowHeight * ratio)
        }

        return ImageRow(images: items, height: rowHeight)
    }
}

// MARK: - Masonry Image Grid (Moodboard Mode)

struct MasonryImageGrid: View {
    let images: [MoodboardImage]
    let gridSize: GridSize
    let containerWidth: CGFloat
    let onImageTap: (Int) -> Void
    let onImageDelete: (String) -> Void

    private var columnCount: Int {
        switch gridSize {
        case .small: return 4
        case .medium: return 3
        case .large: return 2
        }
    }

    var body: some View {
        let columnWidth = (containerWidth - CGFloat(columnCount - 1) * 8) / CGFloat(columnCount)
        let columns = distributeImages(columnWidth: columnWidth)

        HStack(alignment: .top, spacing: 8) {
            ForEach(0..<columnCount, id: \.self) { columnIndex in
                LazyVStack(spacing: 8) {
                    ForEach(columns[columnIndex]) { imageItem in
                        MoodboardImageCell(
                            image: imageItem.image,
                            width: columnWidth,
                            height: imageItem.displayHeight,
                            onTap: {
                                if let index = images.firstIndex(where: { $0.id == imageItem.image.id }) {
                                    onImageTap(index)
                                }
                            },
                            onDelete: {
                                onImageDelete(imageItem.image.id)
                            }
                        )
                    }
                }
            }
        }
    }

    private struct MasonryItem: Identifiable {
        let image: MoodboardImage
        let displayHeight: CGFloat
        var id: String { image.id }
    }

    private func distributeImages(columnWidth: CGFloat) -> [[MasonryItem]] {
        var columns: [[MasonryItem]] = Array(repeating: [], count: columnCount)
        var columnHeights: [CGFloat] = Array(repeating: 0, count: columnCount)

        for image in images {
            let aspectRatio = CGFloat(image.width) / CGFloat(max(image.height, 1))
            let displayHeight = columnWidth / aspectRatio

            // Find shortest column
            let shortestColumn = columnHeights.enumerated().min(by: { $0.1 < $1.1 })?.0 ?? 0

            columns[shortestColumn].append(MasonryItem(image: image, displayHeight: displayHeight))
            columnHeights[shortestColumn] += displayHeight + 8
        }

        return columns
    }
}

// MARK: - Moodboard Image Cell

struct MoodboardImageCell: View {
    let image: MoodboardImage
    let width: CGFloat
    let height: CGFloat
    let onTap: () -> Void
    let onDelete: () -> Void

    @State private var isHovered = false
    @State private var loadedImage: NSImage?

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Group {
                if let nsImage = loadedImage {
                    Image(nsImage: nsImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else {
                    Rectangle()
                        .fill(DirigibleStyle.Colors.hover)
                        .overlay(
                            ProgressView()
                                .scaleEffect(0.5)
                        )
                }
            }
            .frame(width: width, height: height)
            .clipped()
            .contentShape(Rectangle())

            if isHovered {
                Button(action: onDelete) {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                        .padding(6)
                        .background(Color.black.opacity(0.6))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .padding(6)

                VStack {
                    Spacer()
                    Text(formatDate(image.createdAt))
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.9))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.5))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .cornerRadius(4)
        .onHover { isHovered = $0 }
        .onTapGesture(perform: onTap)
        .onAppear(perform: loadImage)
        .onChange(of: image.url) { _, _ in loadImage() }
    }

    private func loadImage() {
        let urlString = image.thumbnailUrl ?? image.url

        // Handle local file URLs
        if urlString.hasPrefix("file://"), let url = URL(string: urlString) {
            loadedImage = NSImage(contentsOf: url)
            return
        }

        // Handle /api/files/ URLs - need signed URL from Backblaze
        if urlString.hasPrefix("/api/files/") {
            Task {
                do {
                    let signedUrl = try await FirebaseSync.shared.getSignedUrl(for: urlString)
                    guard let url = URL(string: signedUrl) else { return }
                    let (data, _) = try await URLSession.shared.data(from: url)
                    if let nsImage = NSImage(data: data) {
                        await MainActor.run {
                            loadedImage = nsImage
                        }
                    }
                } catch {
                    print("[Moodboard] Failed to get signed URL: \(error)")
                }
            }
            return
        }

        // Handle remote URLs (http/https)
        guard let url = URL(string: urlString), urlString.hasPrefix("http") else {
            print("[Moodboard] Invalid URL: \(urlString)")
            return
        }

        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let nsImage = NSImage(data: data) {
                    await MainActor.run {
                        loadedImage = nsImage
                    }
                }
            } catch {
                print("[Moodboard] Failed to load image: \(error)")
            }
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

// MARK: - Carousel View (Inline, takes over the space)

struct CarouselView: View {
    let images: [MoodboardImage]
    @State var currentIndex: Int
    let onIndexChange: (Int) -> Void
    let onClose: () -> Void
    let onCaptionChange: (String, String) -> Void

    @State private var caption: String = ""
    @State private var isEditingCaption = false
    @FocusState private var isCaptionFocused: Bool
    @State private var loadedImage: NSImage?

    private var currentImage: MoodboardImage? {
        guard currentIndex >= 0 && currentIndex < images.count else { return nil }
        return images[currentIndex]
    }

    var body: some View {
        ZStack {
            // Dark background
            Color.black.opacity(0.95)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Top bar
                HStack {
                    Text("\(currentIndex + 1) / \(images.count)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))

                    Spacer()

                    Button(action: onClose) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                            .padding(10)
                            .background(Color.white.opacity(0.1))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }
                .padding()

                Spacer()

                // Main image area with arrows
                HStack {
                    // Previous button
                    Button(action: goToPrevious) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 24, weight: .medium))
                            .foregroundColor(.white.opacity(currentIndex > 0 ? 0.8 : 0.3))
                            .padding()
                            .background(Color.white.opacity(0.1))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .disabled(currentIndex == 0)

                    Spacer()

                    // Image
                    if let image = currentImage {
                        if let nsImage = loadedImage {
                            Image(nsImage: nsImage)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .cornerRadius(8)
                        } else {
                            ProgressView()
                                .scaleEffect(1.5)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .onAppear { loadCurrentImage() }
                        }
                    }

                    Spacer()

                    // Next button
                    Button(action: goToNext) {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 24, weight: .medium))
                            .foregroundColor(.white.opacity(currentIndex < images.count - 1 ? 0.8 : 0.3))
                            .padding()
                            .background(Color.white.opacity(0.1))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .disabled(currentIndex >= images.count - 1)
                }
                .padding(.horizontal)

                Spacer()

                // Caption and metadata
                if let image = currentImage {
                    VStack(spacing: 8) {
                        if isEditingCaption {
                            TextField("Add a caption...", text: $caption)
                                .textFieldStyle(.plain)
                                .font(.system(size: 14))
                                .foregroundColor(.white)
                                .multilineTextAlignment(.center)
                                .padding(8)
                                .background(Color.white.opacity(0.1))
                                .cornerRadius(4)
                                .frame(maxWidth: 400)
                                .focused($isCaptionFocused)
                                .onSubmit { saveCaption() }
                        } else {
                            Text(image.caption ?? "Click to add caption")
                                .font(.system(size: 14))
                                .foregroundColor(image.caption != nil ? .white : .white.opacity(0.5))
                                .onTapGesture {
                                    caption = image.caption ?? ""
                                    isEditingCaption = true
                                    isCaptionFocused = true
                                }
                        }

                        HStack(spacing: 16) {
                            Text("\(image.width) × \(image.height)")
                            if image.fileSize > 0 {
                                Text(formatFileSize(image.fileSize))
                            }
                            Text(formatDate(image.createdAt))
                        }
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.5))
                    }
                    .padding()
                }

                // Thumbnail strip
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(Array(images.enumerated()), id: \.element.id) { index, image in
                            ThumbnailView(image: image, isSelected: index == currentIndex)
                                .onTapGesture {
                                    currentIndex = index
                                    onIndexChange(index)
                                    loadCurrentImage()
                                    updateCaption()
                                }
                        }
                    }
                    .padding(.horizontal)
                }
                .frame(height: 60)
                .padding(.bottom)
            }
        }
        .onAppear {
            loadCurrentImage()
            updateCaption()
        }
        .onChange(of: currentIndex) { _, _ in
            loadCurrentImage()
            updateCaption()
        }
        // Keyboard navigation
        .background(
            KeyboardHandler(
                onLeft: goToPrevious,
                onRight: goToNext,
                onEscape: onClose
            )
        )
    }

    private func goToPrevious() {
        if currentIndex > 0 {
            currentIndex -= 1
            onIndexChange(currentIndex)
        }
    }

    private func goToNext() {
        if currentIndex < images.count - 1 {
            currentIndex += 1
            onIndexChange(currentIndex)
        }
    }

    private func loadCurrentImage() {
        guard let image = currentImage else { return }
        loadedImage = nil

        let urlString = image.url

        if urlString.hasPrefix("file://"), let url = URL(string: urlString) {
            loadedImage = NSImage(contentsOf: url)
            return
        }

        // Handle /api/files/ URLs - need signed URL from Backblaze
        if urlString.hasPrefix("/api/files/") {
            Task {
                do {
                    let signedUrl = try await FirebaseSync.shared.getSignedUrl(for: urlString)
                    guard let url = URL(string: signedUrl) else { return }
                    let (data, _) = try await URLSession.shared.data(from: url)
                    if let nsImage = NSImage(data: data) {
                        await MainActor.run {
                            loadedImage = nsImage
                        }
                    }
                } catch {
                    print("[Carousel] Failed to get signed URL: \(error)")
                }
            }
            return
        }

        guard let url = URL(string: urlString), urlString.hasPrefix("http") else { return }

        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let nsImage = NSImage(data: data) {
                    await MainActor.run {
                        loadedImage = nsImage
                    }
                }
            } catch {
                print("[Carousel] Failed to load image: \(error)")
            }
        }
    }

    private func updateCaption() {
        if let image = currentImage {
            caption = image.caption ?? ""
        }
        isEditingCaption = false
    }

    private func saveCaption() {
        if let image = currentImage {
            onCaptionChange(image.id, caption)
        }
        isEditingCaption = false
    }

    private func formatFileSize(_ bytes: Int) -> String {
        let mb = Double(bytes) / (1024 * 1024)
        return String(format: "%.1f MB", mb)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}

// MARK: - Keyboard Handler

struct KeyboardHandler: NSViewRepresentable {
    let onLeft: () -> Void
    let onRight: () -> Void
    let onEscape: () -> Void

    func makeNSView(context: Context) -> KeyboardView {
        let view = KeyboardView()
        view.onLeft = onLeft
        view.onRight = onRight
        view.onEscape = onEscape
        return view
    }

    func updateNSView(_ nsView: KeyboardView, context: Context) {
        nsView.onLeft = onLeft
        nsView.onRight = onRight
        nsView.onEscape = onEscape
    }

    class KeyboardView: NSView {
        var onLeft: (() -> Void)?
        var onRight: (() -> Void)?
        var onEscape: (() -> Void)?

        override var acceptsFirstResponder: Bool { true }

        override func keyDown(with event: NSEvent) {
            switch event.keyCode {
            case 123: onLeft?()    // Left arrow
            case 124: onRight?()   // Right arrow
            case 53: onEscape?()   // Escape
            default: super.keyDown(with: event)
            }
        }

        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            window?.makeFirstResponder(self)
        }
    }
}

// MARK: - Thumbnail View

struct ThumbnailView: View {
    let image: MoodboardImage
    let isSelected: Bool

    @State private var loadedImage: NSImage?

    var body: some View {
        Group {
            if let nsImage = loadedImage {
                Image(nsImage: nsImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
            }
        }
        .frame(width: 48, height: 48)
        .clipped()
        .cornerRadius(4)
        .opacity(isSelected ? 1 : 0.5)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(isSelected ? Color.white : Color.clear, lineWidth: 2)
        )
        .onAppear(perform: loadImage)
    }

    private func loadImage() {
        let urlString = image.thumbnailUrl ?? image.url

        if urlString.hasPrefix("file://"), let url = URL(string: urlString) {
            loadedImage = NSImage(contentsOf: url)
            return
        }

        // Handle /api/files/ URLs - need signed URL from Backblaze
        if urlString.hasPrefix("/api/files/") {
            Task {
                do {
                    let signedUrl = try await FirebaseSync.shared.getSignedUrl(for: urlString)
                    guard let url = URL(string: signedUrl) else { return }
                    let (data, _) = try await URLSession.shared.data(from: url)
                    if let nsImage = NSImage(data: data) {
                        await MainActor.run {
                            loadedImage = nsImage
                        }
                    }
                } catch {
                    print("[Thumbnail] Failed to get signed URL: \(error)")
                }
            }
            return
        }

        guard let url = URL(string: urlString), urlString.hasPrefix("http") else { return }

        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let nsImage = NSImage(data: data) {
                    await MainActor.run {
                        loadedImage = nsImage
                    }
                }
            } catch {
                print("[Thumbnail] Failed to load: \(error)")
            }
        }
    }
}
