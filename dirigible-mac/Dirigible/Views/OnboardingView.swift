import SwiftUI
import DirigibleCore

struct OnboardingView: View {
    @EnvironmentObject var markdownSync: MarkdownSync
    @State private var step: OnboardingStep = .welcome
    @State private var selectedFolder: URL?
    @State private var syncMedia = false

    enum OnboardingStep: Int, CaseIterable {
        case welcome = 0
        case folderSelection = 1
        case mediaSync = 2
        case complete = 3
    }

    var body: some View {
        VStack(spacing: 0) {
            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color(nsColor: .separatorColor))
                        .frame(height: 2)

                    Rectangle()
                        .fill(Color(nsColor: .labelColor))
                        .frame(width: geo.size.width * progress, height: 2)
                        .animation(.easeInOut(duration: 0.3), value: step)
                }
            }
            .frame(height: 2)

            // Content
            VStack(spacing: 0) {
                Spacer()

                Group {
                    switch step {
                    case .welcome:
                        welcomeStep
                    case .folderSelection:
                        folderSelectionStep
                    case .mediaSync:
                        mediaSyncStep
                    case .complete:
                        completeStep
                    }
                }
                .frame(maxWidth: 360)

                Spacer()

                // Navigation
                HStack(spacing: 12) {
                    if step != .welcome {
                        Button("Back") {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                goBack()
                            }
                        }
                        .buttonStyle(DirigibleSecondaryButtonStyle())
                        .frame(width: 80, height: 32)
                    }

                    Spacer()

                    Button(step == .complete ? "Get Started" : "Continue") {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            goNext()
                        }
                    }
                    .buttonStyle(DirigiblePrimaryButtonStyle())
                    .frame(width: step == .complete ? 100 : 80, height: 32)
                    .disabled(step == .folderSelection && selectedFolder == nil)
                }
                .font(.system(size: 12, weight: .medium))
                .padding(24)
            }
        }
        .frame(width: 480, height: 360)
        .background(Color(nsColor: .windowBackgroundColor))
    }

    private var progress: CGFloat {
        CGFloat(step.rawValue + 1) / CGFloat(OnboardingStep.allCases.count)
    }

    // MARK: - Steps

    private var welcomeStep: some View {
        VStack(spacing: 16) {
            HindenburgLogo()
                .fill(Color(nsColor: .labelColor))
                .frame(width: 100, height: 53)

            Text("dirigible")
                .font(.system(size: 28, weight: .bold, design: .monospaced))

            Text("Your notes, everywhere.")
                .font(.system(size: 13, design: .monospaced))
                .foregroundColor(.secondary)

            VStack(alignment: .leading, spacing: 8) {
                featureRow(icon: "folder", text: "Markdown files on your drive")
                featureRow(icon: "arrow.triangle.2.circlepath", text: "Synced with the cloud")
                featureRow(icon: "lock", text: "Your data, your control")
            }
            .padding(.top, 16)
        }
    }

    private var folderSelectionStep: some View {
        VStack(spacing: 16) {
            VStack(spacing: 4) {
                Text("Notes Folder")
                    .font(.system(size: 18, weight: .semibold))

                Text("Where should we store your notes?")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }

            // Folder display
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    Image(systemName: "folder.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)

                    Text(displayPath)
                        .font(.system(size: 12, design: .monospaced))
                        .lineLimit(1)
                        .truncationMode(.middle)

                    Spacer()
                }
                .padding(12)
                .background(Color(nsColor: .controlBackgroundColor))
                .overlay(
                    Rectangle()
                        .stroke(Color(nsColor: .separatorColor), lineWidth: 1)
                )

                Button {
                    selectFolder()
                } label: {
                    Text("Choose Folder")
                        .font(.system(size: 12, weight: .medium))
                        .frame(maxWidth: .infinity)
                        .frame(height: 32)
                }
                .buttonStyle(DirigibleSecondaryButtonStyle())
            }
            .padding(.top, 8)

            Text("Notes are saved as .md files you can edit anywhere")
                .font(.system(size: 11))
                .foregroundColor(.secondary)
                .padding(.top, 4)
        }
        .onAppear {
            if selectedFolder == nil {
                selectedFolder = defaultFolderURL
            }
        }
    }

    private var mediaSyncStep: some View {
        VStack(spacing: 16) {
            VStack(spacing: 4) {
                Text("Media Files")
                    .font(.system(size: 18, weight: .semibold))

                Text("How should we handle photos and audio?")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }

            VStack(spacing: 0) {
                optionRow(
                    selected: syncMedia,
                    title: "Download everything",
                    description: "All media synced to your folder",
                    action: { syncMedia = true }
                )

                Rectangle()
                    .fill(Color(nsColor: .separatorColor))
                    .frame(height: 1)

                optionRow(
                    selected: !syncMedia,
                    title: "Cache on demand",
                    description: "Media downloaded as you view it",
                    action: { syncMedia = false }
                )
            }
            .overlay(
                Rectangle()
                    .stroke(Color(nsColor: .separatorColor), lineWidth: 1)
            )
            .padding(.top, 8)
        }
    }

    private var completeStep: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark")
                .font(.system(size: 24, weight: .medium))
                .foregroundColor(Color(nsColor: .labelColor))
                .frame(width: 48, height: 48)
                .overlay(
                    Rectangle()
                        .stroke(Color(nsColor: .labelColor), lineWidth: 1)
                )

            VStack(spacing: 4) {
                Text("Ready")
                    .font(.system(size: 18, weight: .semibold))

                Text("Sign in to start syncing")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }

            // Summary
            VStack(alignment: .leading, spacing: 6) {
                summaryRow(label: "Folder", value: selectedFolder?.lastPathComponent ?? "dirigible")
                summaryRow(label: "Media", value: syncMedia ? "Sync all" : "On demand")
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(nsColor: .controlBackgroundColor))
            .overlay(
                Rectangle()
                    .stroke(Color(nsColor: .separatorColor), lineWidth: 1)
            )
            .padding(.top, 8)
        }
    }

    // MARK: - Components

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

    private func optionRow(selected: Bool, title: String, description: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: selected ? "checkmark.square.fill" : "square")
                    .font(.system(size: 14))
                    .foregroundColor(selected ? Color(nsColor: .labelColor) : Color(nsColor: .secondaryLabelColor))

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Color(nsColor: .labelColor))

                    Text(description)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }

                Spacer()
            }
            .padding(12)
            .background(selected ? Color(nsColor: .controlBackgroundColor) : Color.clear)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func summaryRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 11))
                .foregroundColor(.secondary)
                .frame(width: 50, alignment: .leading)

            Text(value)
                .font(.system(size: 12))
        }
    }

    // MARK: - Navigation

    private func goNext() {
        switch step {
        case .welcome:
            step = .folderSelection
        case .folderSelection:
            step = .mediaSync
        case .mediaSync:
            step = .complete
        case .complete:
            completeOnboarding()
        }
    }

    private func goBack() {
        switch step {
        case .welcome:
            break
        case .folderSelection:
            step = .welcome
        case .mediaSync:
            step = .folderSelection
        case .complete:
            step = .mediaSync
        }
    }

    // MARK: - Actions

    private var defaultFolderURL: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
            .appendingPathComponent("dirigible", isDirectory: true)
    }

    private var displayPath: String {
        (selectedFolder ?? defaultFolderURL).path
            .replacingOccurrences(of: NSHomeDirectory(), with: "~")
    }

    private func selectFolder() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.canCreateDirectories = true
        panel.allowsMultipleSelection = false
        panel.message = "Choose where to store your notes"
        panel.prompt = "Select"

        if panel.runModal() == .OK {
            selectedFolder = panel.url
        }
    }

    private func completeOnboarding() {
        guard let folder = selectedFolder else { return }

        var settings = UserSettings.load()
        settings.notesFolder = folder
        settings.syncMedia = syncMedia
        settings.hasCompletedOnboarding = true
        settings.save()

        markdownSync.setFolder(folder)
        try? markdownSync.start()
    }
}

#Preview {
    OnboardingView()
        .environmentObject(MarkdownSync.shared)
}
