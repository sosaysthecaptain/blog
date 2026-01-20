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
        .background(DirigibleStyle.Colors.background)
    }

    private var welcomeView: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: DirigibleStyle.Spacing.lg) {
                HindenburgLogo()
                    .fill(DirigibleStyle.Colors.foreground)
                    .frame(width: 100, height: 53)

                Text("dirigible")
                    .font(.system(size: 28, weight: .bold, design: .monospaced))
                    .foregroundColor(DirigibleStyle.Colors.foreground)

                Text("Portable sovereignty.")
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundColor(DirigibleStyle.Colors.muted)

                VStack(alignment: .leading, spacing: DirigibleStyle.Spacing.sm) {
                    featureRow(icon: "doc.text", text: "Notes and markdown")
                    featureRow(icon: "photo.stack", text: "Moodboards and photos")
                    featureRow(icon: "music.note", text: "Your music library")
                    featureRow(icon: "lock", text: "Your data, your control")
                }
                .padding(.top, DirigibleStyle.Spacing.lg)
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
            }
            .padding(DirigibleStyle.Spacing.xl)
        }
    }

    private func featureRow(icon: String, text: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: DirigibleStyle.IconSize.xs))
                .foregroundColor(DirigibleStyle.Colors.muted)
                .frame(width: 16)

            Text(text)
                .font(DirigibleStyle.Typography.body)
                .foregroundColor(DirigibleStyle.Colors.foreground)
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
        VStack(spacing: DirigibleStyle.Spacing.xl) {
            Spacer()

            VStack(spacing: DirigibleStyle.Spacing.lg) {
                if syncComplete {
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 48))
                        .foregroundColor(DirigibleStyle.Colors.success)
                } else {
                    ProgressView()
                        .scaleEffect(1.5)
                }

                Text(syncComplete ? "Sync complete" : syncStatus)
                    .font(DirigibleStyle.Typography.heading)
                    .foregroundColor(DirigibleStyle.Colors.foreground)

                if !syncComplete {
                    VStack(spacing: DirigibleStyle.Spacing.sm) {
                        ProgressView(value: syncProgress)
                            .progressViewStyle(.linear)
                            .frame(width: 200)
                            .tint(DirigibleStyle.Colors.foreground)

                        Text("\(itemsLoaded) items")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(DirigibleStyle.Colors.muted)
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
                }
                .padding(DirigibleStyle.Spacing.xl)
            }
        }
        .task {
            await performInitialSync()
        }
    }

    private func performInitialSync() async {
        syncStatus = "Syncing notes..."
        syncProgress = 0.2

        try? await Task.sleep(nanoseconds: 1_000_000_000)

        syncProgress = 0.4
        syncStatus = "Loading content..."

        do {
            let notes = try await LocalCache.shared.getAllNotes()
            itemsLoaded = notes.count
            syncProgress = 0.8
        } catch {
            print("[Sync] Failed to load notes: \(error)")
        }

        try? await Task.sleep(nanoseconds: 500_000_000)
        syncProgress = 1.0
        syncStatus = "Complete"

        try? await Task.sleep(nanoseconds: 300_000_000)
        withAnimation {
            syncComplete = true
        }
    }
}

#Preview {
    OnboardingView()
        .environmentObject(FirebaseSync.shared)
}
