import SwiftUI
import DirigibleCore

struct OnboardingView: View {
    @EnvironmentObject var firebaseSync: FirebaseSync
    @State private var showingSyncView = false

    var body: some View {
        VStack(spacing: 0) {
            if showingSyncView {
                SyncingView {
                    completeOnboarding()
                }
                .environmentObject(firebaseSync)
            } else {
                welcomeView
            }
        }
        .frame(width: 480, height: 360)
        .background(Color(nsColor: .windowBackgroundColor))
    }

    private var welcomeView: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 16) {
                HindenburgLogo()
                    .fill(Color(nsColor: .labelColor))
                    .frame(width: 100, height: 53)

                Text("dirigible")
                    .font(.system(size: 28, weight: .bold, design: .monospaced))

                Text("Portable sovereignty.")
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundColor(.secondary)

                VStack(alignment: .leading, spacing: 8) {
                    featureRow(icon: "doc.text", text: "Notes and markdown")
                    featureRow(icon: "photo.stack", text: "Moodboards and photos")
                    featureRow(icon: "music.note", text: "Your music library")
                    featureRow(icon: "lock", text: "Your data, your control")
                }
                .padding(.top, 16)
            }
            .frame(maxWidth: 360)

            Spacer()

            HStack {
                Spacer()

                Button("Continue") {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showingSyncView = true
                    }
                }
                .buttonStyle(DirigiblePrimaryButtonStyle())
                .frame(width: 100, height: 32)
                .font(.system(size: 12, weight: .medium))
            }
            .padding(24)
        }
    }

    private func featureRow(icon: String, text: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundColor(.secondary)
                .frame(width: 16)

            Text(text)
                .font(.system(size: 13))
        }
    }

    private func completeOnboarding() {
        var settings = UserSettings.load()
        settings.hasCompletedOnboarding = true
        settings.save()
    }
}

// MARK: - Syncing View

struct SyncingView: View {
    @EnvironmentObject var firebaseSync: FirebaseSync
    @State private var syncProgress: Double = 0
    @State private var syncStatus: String = "Connecting..."
    @State private var itemsLoaded: Int = 0
    @State private var syncComplete = false
    let onComplete: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            VStack(spacing: 16) {
                if syncComplete {
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 48))
                        .foregroundColor(.green)
                } else {
                    ProgressView()
                        .scaleEffect(1.5)
                }

                Text(syncComplete ? "Sync complete" : syncStatus)
                    .font(.system(size: 18, weight: .semibold))

                if !syncComplete {
                    VStack(spacing: 8) {
                        ProgressView(value: syncProgress)
                            .progressViewStyle(.linear)
                            .frame(width: 200)

                        Text("\(itemsLoaded) items")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.secondary)
                    }
                }
            }

            Spacer()

            if syncComplete {
                HStack {
                    Spacer()
                    Button("Get Started") {
                        onComplete()
                    }
                    .buttonStyle(DirigiblePrimaryButtonStyle())
                    .frame(width: 100, height: 32)
                    .font(.system(size: 12, weight: .medium))
                }
                .padding(24)
            }
        }
        .task {
            await performInitialSync()
        }
    }

    private func performInitialSync() async {
        syncStatus = "Syncing notes..."
        syncProgress = 0.2

        // Give Firebase sync a moment to populate local cache
        // The sync listeners should have started when we authenticated
        try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second

        syncProgress = 0.4
        syncStatus = "Loading content..."

        // Check how many items are in the local cache
        do {
            let notes = try await LocalCache.shared.getAllNotes()
            itemsLoaded = notes.count
            syncProgress = 0.8
        } catch {
            print("[Sync] Failed to load notes: \(error)")
        }

        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 second
        syncProgress = 1.0
        syncStatus = "Complete"

        try? await Task.sleep(nanoseconds: 300_000_000) // 0.3 second
        withAnimation {
            syncComplete = true
        }
    }
}

#Preview {
    OnboardingView()
        .environmentObject(FirebaseSync.shared)
}
