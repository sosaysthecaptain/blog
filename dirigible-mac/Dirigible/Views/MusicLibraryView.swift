import SwiftUI
import AVFoundation
import DirigibleCore

// MARK: - Music Library Detail View

struct MusicLibraryDetailView: View {
    let item: NoteItem
    let onUpdate: (NoteItem) -> Void

    @State private var songs: [Song] = []
    @State private var searchText = ""
    @State private var sortColumn: MusicSortColumn = .title
    @State private var sortAscending = true
    @State private var selectedSongIds: Set<String> = []
    @State private var isLoading = true

    @StateObject private var player = MusicPlayer.shared

    private var filteredSongs: [Song] {
        var result = songs

        // Filter by search
        if !searchText.isEmpty {
            let search = searchText.lowercased()
            result = result.filter {
                $0.title.lowercased().contains(search) ||
                $0.artist.lowercased().contains(search) ||
                $0.album.lowercased().contains(search)
            }
        }

        // Sort
        result.sort { a, b in
            let comparison: Bool
            switch sortColumn {
            case .title:
                comparison = a.title.localizedCaseInsensitiveCompare(b.title) == .orderedAscending
            case .artist:
                comparison = a.artist.localizedCaseInsensitiveCompare(b.artist) == .orderedAscending
            case .album:
                comparison = a.album.localizedCaseInsensitiveCompare(b.album) == .orderedAscending
            case .year:
                comparison = (a.year ?? 0) < (b.year ?? 0)
            case .trackNumber:
                comparison = (a.trackNumber ?? 0) < (b.trackNumber ?? 0)
            case .duration:
                comparison = a.duration < b.duration
            case .fileSize:
                comparison = a.fileSize < b.fileSize
            }
            return sortAscending ? comparison : !comparison
        }

        return result
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            header

            Divider()
                .background(DirigibleStyle.Colors.border)

            // Content
            if isLoading {
                loadingState
            } else if songs.isEmpty {
                emptyState
            } else {
                songsTable
            }

            // Player bar (if playing)
            if player.currentSong != nil {
                Divider()
                    .background(DirigibleStyle.Colors.border)
                PlayerBar()
            }
        }
        .background(DirigibleStyle.Colors.background)
        .onAppear(perform: loadSongs)
        .onChange(of: item.id) { _, _ in loadSongs() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: DirigibleStyle.Spacing.sm) {
            Text(item.title)
                .font(.custom("Georgia", size: 24).weight(.bold))
                .foregroundColor(DirigibleStyle.Colors.foreground)

            HStack(spacing: DirigibleStyle.Spacing.md) {
                // Search
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 12))
                        .foregroundColor(DirigibleStyle.Colors.muted)

                    TextField("Search songs...", text: $searchText)
                        .textFieldStyle(.plain)
                        .font(DirigibleStyle.Typography.body)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(DirigibleStyle.Colors.hover)
                .cornerRadius(6)
                .frame(maxWidth: 300)

                Spacer()

                // Song count
                Text("\(filteredSongs.count) songs")
                    .font(DirigibleStyle.Typography.caption)
                    .foregroundColor(DirigibleStyle.Colors.muted)
            }
        }
        .padding(.horizontal, DirigibleStyle.Spacing.xl)
        .padding(.vertical, DirigibleStyle.Spacing.lg)
    }

    private var loadingState: some View {
        VStack(spacing: DirigibleStyle.Spacing.md) {
            ProgressView()
            Text("Loading songs...")
                .font(DirigibleStyle.Typography.caption)
                .foregroundColor(DirigibleStyle.Colors.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyState: some View {
        VStack(spacing: DirigibleStyle.Spacing.lg) {
            Spacer()

            Image(systemName: "music.note.list")
                .font(.system(size: 48))
                .foregroundColor(DirigibleStyle.Colors.muted.opacity(0.5))

            Text("No songs yet")
                .font(DirigibleStyle.Typography.body)
                .foregroundColor(DirigibleStyle.Colors.muted)

            Text("Add songs from the web app")
                .font(DirigibleStyle.Typography.caption)
                .foregroundColor(DirigibleStyle.Colors.muted.opacity(0.7))

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var songsTable: some View {
        VStack(spacing: 0) {
            // Column headers
            HStack(spacing: 0) {
                // Playing indicator
                Text("")
                    .frame(width: 24)

                columnHeader("#", column: .trackNumber, width: 36)
                columnHeader("Title", column: .title, flex: 1.5, minWidth: 120)
                columnHeader("Artist", column: .artist, flex: 1, minWidth: 80)
                columnHeader("Album", column: .album, flex: 1, minWidth: 80)
                columnHeader("Year", column: .year, width: 50)
                columnHeader("Time", column: .duration, width: 54)
                columnHeader("Size", column: .fileSize, width: 60)
            }
            .padding(.horizontal, DirigibleStyle.Spacing.md)
            .padding(.vertical, 8)
            .background(DirigibleStyle.Colors.hover)

            Divider()
                .background(DirigibleStyle.Colors.border)

            // Songs list
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(Array(filteredSongs.enumerated()), id: \.element.id) { index, song in
                        SongRow(
                            song: song,
                            isSelected: selectedSongIds.contains(song.id),
                            isPlaying: player.currentSong?.id == song.id,
                            isAlternate: index % 2 == 1,
                            onTap: { selectSong(song) },
                            onDoubleTap: { playSong(song) }
                        )
                    }
                }
            }
        }
    }

    private func columnHeader(_ title: String, column: MusicSortColumn, width: CGFloat? = nil, flex: CGFloat? = nil, minWidth: CGFloat? = nil) -> some View {
        Button(action: {
            if sortColumn == column {
                sortAscending.toggle()
            } else {
                sortColumn = column
                sortAscending = true
            }
            saveSortPreferences()
        }) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(DirigibleStyle.Colors.muted)

                if sortColumn == column {
                    Image(systemName: sortAscending ? "chevron.up" : "chevron.down")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(DirigibleStyle.Colors.muted)
                }
            }
            .frame(maxWidth: flex != nil ? .infinity : nil, alignment: .leading)
        }
        .buttonStyle(.plain)
        .frame(width: width)
        .frame(minWidth: minWidth)
    }

    private func loadSongs() {
        isLoading = true
        sortColumn = item.musicSortColumn ?? .title
        sortAscending = item.musicSortDirection != .desc

        Task {
            do {
                let loadedSongs = try await LocalCache.shared.getSongsByLibrary(item.id)
                await MainActor.run {
                    songs = loadedSongs
                    isLoading = false
                }
            } catch {
                print("[MusicLibrary] Failed to load songs: \(error)")
                await MainActor.run {
                    isLoading = false
                }
            }
        }
    }

    private func selectSong(_ song: Song) {
        if NSEvent.modifierFlags.contains(.command) {
            if selectedSongIds.contains(song.id) {
                selectedSongIds.remove(song.id)
            } else {
                selectedSongIds.insert(song.id)
            }
        } else {
            selectedSongIds = [song.id]
        }
    }

    private func playSong(_ song: Song) {
        // Build queue from visible songs starting at this song
        let startIndex = filteredSongs.firstIndex(where: { $0.id == song.id }) ?? 0
        let queue = Array(filteredSongs[startIndex...])
        player.playQueue(queue)
    }

    private func saveSortPreferences() {
        var updated = item
        updated.musicSortColumn = sortColumn
        updated.musicSortDirection = sortAscending ? .asc : .desc
        updated.updatedAt = Date()
        onUpdate(updated)
    }
}

// MARK: - Song Row

struct SongRow: View {
    let song: Song
    let isSelected: Bool
    let isPlaying: Bool
    let isAlternate: Bool
    let onTap: () -> Void
    let onDoubleTap: () -> Void

    @State private var isHovered = false

    var body: some View {
        HStack(spacing: 0) {
            // Playing indicator
            Group {
                if isPlaying {
                    Image(systemName: "play.fill")
                        .font(.system(size: 10))
                        .foregroundColor(DirigibleStyle.Colors.accent)
                } else {
                    Text("")
                }
            }
            .frame(width: 24)

            // Track number
            Text(song.trackNumber.map { String($0) } ?? "-")
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(DirigibleStyle.Colors.muted)
                .frame(width: 36, alignment: .leading)

            // Title
            Text(song.title)
                .font(DirigibleStyle.Typography.body)
                .foregroundColor(DirigibleStyle.Colors.foreground)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Artist
            Text(song.artist)
                .font(DirigibleStyle.Typography.body)
                .foregroundColor(DirigibleStyle.Colors.muted)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Album
            Text(song.album)
                .font(DirigibleStyle.Typography.body)
                .foregroundColor(DirigibleStyle.Colors.muted)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Year
            Text(song.year.map { String($0) } ?? "-")
                .font(.system(size: 12))
                .foregroundColor(DirigibleStyle.Colors.muted)
                .frame(width: 50, alignment: .leading)

            // Duration
            Text(song.formattedDuration)
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(DirigibleStyle.Colors.muted)
                .frame(width: 54, alignment: .leading)

            // File size
            Text(song.formattedFileSize)
                .font(.system(size: 12))
                .foregroundColor(DirigibleStyle.Colors.muted)
                .frame(width: 60, alignment: .leading)
        }
        .padding(.horizontal, DirigibleStyle.Spacing.md)
        .padding(.vertical, 8)
        .background(
            isSelected ? DirigibleStyle.Colors.accent.opacity(0.2) :
            isHovered ? DirigibleStyle.Colors.hover :
            isAlternate ? DirigibleStyle.Colors.sidebarBg : Color.clear
        )
        .contentShape(Rectangle())
        .onHover { isHovered = $0 }
        .onTapGesture(count: 2, perform: onDoubleTap)
        .onTapGesture(count: 1, perform: onTap)
    }
}

// MARK: - Player Bar

struct PlayerBar: View {
    @StateObject private var player = MusicPlayer.shared

    var body: some View {
        HStack(spacing: DirigibleStyle.Spacing.md) {
            // Album art (if available)
            if let song = player.currentSong {
                AlbumArtView(song: song, size: 48)
            }

            // Song info
            VStack(alignment: .leading, spacing: 2) {
                Text(player.currentSong?.title ?? "Not Playing")
                    .font(DirigibleStyle.Typography.body)
                    .foregroundColor(DirigibleStyle.Colors.foreground)
                    .lineLimit(1)

                Text(player.currentSong?.artist ?? "-")
                    .font(DirigibleStyle.Typography.caption)
                    .foregroundColor(DirigibleStyle.Colors.muted)
                    .lineLimit(1)
            }
            .frame(minWidth: 150, alignment: .leading)

            Spacer()

            // Playback controls
            HStack(spacing: DirigibleStyle.Spacing.sm) {
                Button(action: player.previous) {
                    Image(systemName: "backward.fill")
                        .font(.system(size: 14))
                }
                .buttonStyle(.plain)
                .foregroundColor(DirigibleStyle.Colors.muted)

                Button(action: player.togglePlayPause) {
                    Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 18))
                }
                .buttonStyle(.plain)
                .foregroundColor(DirigibleStyle.Colors.foreground)
                .frame(width: 36, height: 36)
                .background(DirigibleStyle.Colors.hover)
                .cornerRadius(18)

                Button(action: player.next) {
                    Image(systemName: "forward.fill")
                        .font(.system(size: 14))
                }
                .buttonStyle(.plain)
                .foregroundColor(DirigibleStyle.Colors.muted)
            }

            Spacer()

            // Progress
            HStack(spacing: 8) {
                Text(formatTime(player.currentTime))
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(DirigibleStyle.Colors.muted)
                    .frame(width: 40, alignment: .trailing)

                ProgressBar(value: player.progress, onSeek: player.seek)
                    .frame(width: 150, height: 4)

                Text(formatTime(player.duration))
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(DirigibleStyle.Colors.muted)
                    .frame(width: 40, alignment: .leading)
            }

            // Volume
            HStack(spacing: 4) {
                Button(action: player.toggleMute) {
                    Image(systemName: player.isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                        .font(.system(size: 12))
                }
                .buttonStyle(.plain)
                .foregroundColor(DirigibleStyle.Colors.muted)

                Slider(value: Binding(
                    get: { player.volume },
                    set: { player.setVolume($0) }
                ), in: 0...1)
                .frame(width: 80)
            }
        }
        .padding(.horizontal, DirigibleStyle.Spacing.lg)
        .padding(.vertical, DirigibleStyle.Spacing.md)
        .background(DirigibleStyle.Colors.sidebarBg)
    }

    private func formatTime(_ seconds: Double) -> String {
        let mins = Int(seconds) / 60
        let secs = Int(seconds) % 60
        return String(format: "%d:%02d", mins, secs)
    }
}

// MARK: - Progress Bar

struct ProgressBar: View {
    let value: Double
    let onSeek: (Double) -> Void

    @State private var isDragging = false
    @State private var dragValue: Double = 0

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Background
                Rectangle()
                    .fill(DirigibleStyle.Colors.border)
                    .cornerRadius(2)

                // Progress
                Rectangle()
                    .fill(DirigibleStyle.Colors.accent)
                    .cornerRadius(2)
                    .frame(width: max(0, geometry.size.width * (isDragging ? dragValue : value)))
            }
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { gesture in
                        isDragging = true
                        dragValue = max(0, min(1, gesture.location.x / geometry.size.width))
                    }
                    .onEnded { gesture in
                        let seekValue = max(0, min(1, gesture.location.x / geometry.size.width))
                        onSeek(seekValue)
                        isDragging = false
                    }
            )
        }
    }
}

// MARK: - Album Art View

struct AlbumArtView: View {
    let song: Song
    let size: CGFloat

    @State private var loadedImage: NSImage?

    var body: some View {
        Group {
            if let image = loadedImage {
                Image(nsImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                Rectangle()
                    .fill(DirigibleStyle.Colors.hover)
                    .overlay(
                        Image(systemName: "music.note")
                            .font(.system(size: size * 0.4))
                            .foregroundColor(DirigibleStyle.Colors.muted)
                    )
            }
        }
        .frame(width: size, height: size)
        .cornerRadius(4)
        .onAppear(perform: loadArt)
    }

    private func loadArt() {
        guard let urlString = song.albumArtThumbUrl ?? song.albumArtUrl else { return }

        // Handle /api/files/ URLs
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
                    print("[AlbumArt] Failed to load: \(error)")
                }
            }
            return
        }

        // Handle direct URLs
        guard let url = URL(string: urlString) else { return }
        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let nsImage = NSImage(data: data) {
                    await MainActor.run {
                        loadedImage = nsImage
                    }
                }
            } catch {
                print("[AlbumArt] Failed to load: \(error)")
            }
        }
    }
}

// MARK: - Music Player

@MainActor
class MusicPlayer: ObservableObject {
    static let shared = MusicPlayer()

    @Published var currentSong: Song?
    @Published var isPlaying = false
    @Published var currentTime: Double = 0
    @Published var duration: Double = 0
    @Published var volume: Double = 1.0
    @Published var isMuted = false

    private var player: AVPlayer?
    private var timeObserver: Any?
    private var queue: [Song] = []
    private var currentIndex = 0

    var progress: Double {
        guard duration > 0 else { return 0 }
        return currentTime / duration
    }

    private init() {
        setupAudioSession()
    }

    private func setupAudioSession() {
        // macOS doesn't need audio session setup like iOS
    }

    func playQueue(_ songs: [Song]) {
        queue = songs
        currentIndex = 0
        if let first = songs.first {
            play(first)
        }
    }

    func play(_ song: Song) {
        currentSong = song

        // Get signed URL if needed
        Task {
            do {
                var urlString = song.storageUrl

                if urlString.hasPrefix("/api/files/") {
                    urlString = try await FirebaseSync.shared.getSignedUrl(for: urlString)
                }

                guard let url = URL(string: urlString) else {
                    print("[MusicPlayer] Invalid URL: \(urlString)")
                    return
                }

                await MainActor.run {
                    setupPlayer(with: url)
                }
            } catch {
                print("[MusicPlayer] Failed to get signed URL: \(error)")
            }
        }
    }

    private func setupPlayer(with url: URL) {
        // Clean up existing player
        if let observer = timeObserver {
            player?.removeTimeObserver(observer)
            timeObserver = nil
        }

        let playerItem = AVPlayerItem(url: url)
        player = AVPlayer(playerItem: playerItem)
        player?.volume = isMuted ? 0 : Float(volume)

        // Observe time
        timeObserver = player?.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main) { [weak self] time in
            Task { @MainActor in
                self?.currentTime = time.seconds
            }
        }

        // Observe duration
        Task {
            if let duration = try? await playerItem.asset.load(.duration) {
                await MainActor.run {
                    self.duration = duration.seconds
                }
            }
        }

        // Observe end of playback
        NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: playerItem, queue: .main) { [weak self] _ in
            Task { @MainActor in
                self?.playNext()
            }
        }

        player?.play()
        isPlaying = true
    }

    func togglePlayPause() {
        if isPlaying {
            player?.pause()
        } else {
            player?.play()
        }
        isPlaying.toggle()
    }

    func next() {
        playNext()
    }

    private func playNext() {
        guard currentIndex < queue.count - 1 else {
            isPlaying = false
            return
        }
        currentIndex += 1
        play(queue[currentIndex])
    }

    func previous() {
        if currentTime > 3 {
            // Restart current song
            seek(to: 0)
        } else if currentIndex > 0 {
            currentIndex -= 1
            play(queue[currentIndex])
        }
    }

    func seek(to progress: Double) {
        let time = CMTime(seconds: duration * progress, preferredTimescale: 600)
        player?.seek(to: time)
    }

    func setVolume(_ value: Double) {
        volume = value
        isMuted = false
        player?.volume = Float(value)
    }

    func toggleMute() {
        isMuted.toggle()
        player?.volume = isMuted ? 0 : Float(volume)
    }
}
