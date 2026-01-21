import SwiftUI
import FirebaseCore
import FirebaseAuth
import DirigibleCore

@main
struct DirigibleApp: App {
    @StateObject private var firebaseSync = FirebaseSync.shared
    @StateObject private var markdownSync = MarkdownSync.shared
    @State private var showOnboarding = false

    init() {
        // Configure Firebase
        FirebaseApp.configure()

        // Use default keychain instead of access group (fixes -34018 error on macOS)
        do {
            try Auth.auth().useUserAccessGroup(nil)
            print("[APP] Set Firebase Auth to use default keychain")
        } catch {
            print("[APP] Failed to set keychain access group: \(error)")
        }
    }

    private var windowSize: CGSize {
        if !firebaseSync.isAuthenticated {
            return CGSize(width: 304, height: 480)
        } else if !UserSettings.load().hasCompletedOnboarding {
            return CGSize(width: 480, height: 360)
        } else {
            return CGSize(width: 1000, height: 700)
        }
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if !firebaseSync.isAuthenticated {
                    LoginView()
                        .frame(width: 320, height: 500)
                } else if !UserSettings.load().hasCompletedOnboarding {
                    OnboardingView()
                        .frame(minWidth: 500, minHeight: 400)
                } else {
                    MainView()
                        .frame(minWidth: 900, minHeight: 600)
                }
            }
            .environmentObject(firebaseSync)
            .environmentObject(markdownSync)
            .onAppear {
                // Apply saved appearance on launch
                AppSettings.shared.applyAppearance()
            }
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
        .defaultSize(width: 1200, height: 800)
        .commands {
            SidebarCommands()

            CommandGroup(replacing: .newItem) {
                Button("New Note") {
                    NotificationCenter.default.post(name: .createNewNote, object: nil)
                }
                .keyboardShortcut("n")

                Button("New Folder") {
                    NotificationCenter.default.post(name: .createNewFolder, object: nil)
                }
                .keyboardShortcut("n", modifiers: [.command, .shift])
            }

            CommandMenu("Notes") {
                Button("Sync Now") {
                    Task {
                        await markdownSync.syncToFilesystem()
                    }
                }
                .keyboardShortcut("s", modifiers: [.command, .option])
            }
        }

        #if os(macOS)
        Settings {
            SettingsView()
                .environmentObject(firebaseSync)
                .environmentObject(markdownSync)
        }
        #endif
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let createNewNote = Notification.Name("createNewNote")
    static let createNewFolder = Notification.Name("createNewFolder")
}
