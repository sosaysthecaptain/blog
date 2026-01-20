import SwiftUI
import DirigibleCore

// MARK: - App Settings Manager

@MainActor
class AppSettings: ObservableObject {
    static let shared = AppSettings()

    @AppStorage("appearance") var appearance: Appearance = .system {
        didSet {
            applyAppearance()
        }
    }

    enum Appearance: String, CaseIterable {
        case system = "System"
        case light = "Light"
        case dark = "Dark"

        var nsAppearance: NSAppearance? {
            switch self {
            case .system: return nil
            case .light: return NSAppearance(named: .aqua)
            case .dark: return NSAppearance(named: .darkAqua)
            }
        }
    }

    var isDarkMode: Bool {
        if appearance == .system {
            return NSApp.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
        }
        return appearance == .dark
    }

    private init() {
        applyAppearance()
    }

    func applyAppearance() {
        NSApp.appearance = appearance.nsAppearance
    }

    func toggleDarkMode() {
        if isDarkMode {
            appearance = .light
        } else {
            appearance = .dark
        }
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @EnvironmentObject var firebaseSync: FirebaseSync
    @EnvironmentObject var markdownSync: MarkdownSync

    var body: some View {
        TabView {
            GeneralSettingsView()
                .tabItem {
                    Label("General", systemImage: "gear")
                }

            SyncSettingsView()
                .environmentObject(markdownSync)
                .tabItem {
                    Label("Sync", systemImage: "arrow.triangle.2.circlepath")
                }

            AccountSettingsView()
                .environmentObject(firebaseSync)
                .tabItem {
                    Label("Account", systemImage: "person.circle")
                }
        }
        .frame(width: 450, height: 300)
    }
}

// MARK: - General Settings

struct GeneralSettingsView: View {
    @ObservedObject private var appSettings = AppSettings.shared

    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Theme", selection: $appSettings.appearance) {
                    ForEach(AppSettings.Appearance.allCases, id: \.self) { option in
                        Text(option.rawValue).tag(option)
                    }
                }
                .pickerStyle(.segmented)

                Text("Changes apply immediately to all windows")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .formStyle(.grouped)
        .padding()
    }
}

// MARK: - Sync Settings

struct SyncSettingsView: View {
    @EnvironmentObject var markdownSync: MarkdownSync
    @State private var settings = UserSettings.load()

    var body: some View {
        Form {
            Section("Notes Folder") {
                HStack {
                    Image(systemName: "folder.fill")
                        .foregroundColor(.accentColor)

                    Text(settings.notesFolder.path.replacingOccurrences(of: NSHomeDirectory(), with: "~"))
                        .lineLimit(1)
                        .truncationMode(.middle)

                    Spacer()

                    Button("Change...") {
                        selectFolder()
                    }
                }

                if let lastSync = markdownSync.lastSyncTime {
                    HStack {
                        Text("Last sync")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(lastSync, style: .relative)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Section("Media") {
                Toggle("Sync all photos and audio", isOn: $settings.syncMedia)
                    .onChange(of: settings.syncMedia) {
                        settings.save()
                    }

                if !settings.syncMedia {
                    Text("Media files will be cached locally as you access them")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Section {
                Button("Sync Now") {
                    Task {
                        await markdownSync.syncToFilesystem()
                    }
                }

                if let error = markdownSync.syncError {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.yellow)
                        Text(error.localizedDescription)
                            .foregroundColor(.secondary)
                    }
                    .font(.caption)
                }
            }
        }
        .formStyle(.grouped)
        .padding()
    }

    private func selectFolder() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.canCreateDirectories = true
        panel.allowsMultipleSelection = false

        if panel.runModal() == .OK, let url = panel.url {
            settings.notesFolder = url
            settings.save()
            markdownSync.setFolder(url)
        }
    }
}

// MARK: - Account Settings

struct AccountSettingsView: View {
    @EnvironmentObject var firebaseSync: FirebaseSync
    @State private var showSignOutConfirm = false

    var body: some View {
        Form {
            Section("Account") {
                if let email = firebaseSync.userEmail {
                    HStack {
                        Text("Email")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(email)
                    }

                    HStack {
                        Text("Status")
                            .foregroundColor(.secondary)
                        Spacer()
                        HStack(spacing: 4) {
                            Circle()
                                .fill(firebaseSync.isSyncing ? .green : .yellow)
                                .frame(width: 8, height: 8)
                            Text(firebaseSync.isSyncing ? "Syncing" : "Connected")
                        }
                    }
                } else {
                    Text("Not signed in")
                        .foregroundColor(.secondary)
                }
            }

            Section {
                Button("Sign Out", role: .destructive) {
                    showSignOutConfirm = true
                }
                .disabled(!firebaseSync.isAuthenticated)
            }
        }
        .formStyle(.grouped)
        .padding()
        .alert("Sign Out", isPresented: $showSignOutConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Sign Out", role: .destructive) {
                try? firebaseSync.signOut()
            }
        } message: {
            Text("Your local notes will remain on disk, but you'll need to sign in again to sync.")
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(FirebaseSync.shared)
        .environmentObject(MarkdownSync.shared)
}
