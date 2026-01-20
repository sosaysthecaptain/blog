import SwiftUI

// MARK: - Design Tokens

/// Dirigible design system colors and styles
/// Reference: /admin/style-guide
enum DirigibleStyle {
    // MARK: - Colors

    /// Core semantic colors that adapt to light/dark mode
    enum Colors {
        /// Primary background (#FFFFFF / #0A0A0A)
        static let background = Color(nsColor: .windowBackgroundColor)

        /// Primary text (#171717 / #EDEDED)
        static let foreground = Color(nsColor: .labelColor)

        /// Secondary text, inactive icons (#737373 / #A3A3A3)
        static let muted = Color(nsColor: .secondaryLabelColor)

        /// Borders and dividers (#E5E5E5 / #262626)
        static let border = Color(nsColor: .separatorColor)

        /// Hover backgrounds (#F5F5F5 / #171717)
        static let hover = Color(nsColor: .unemphasizedSelectedContentBackgroundColor)

        /// Sidebar background (#FAFAFA / #0F0F0F)
        static let sidebarBg = Color(nsColor: .controlBackgroundColor)

        /// Accent for links, focus (#2563EB / #3B82F6)
        static let accent = Color.accentColor

        /// Selected item background (#3B82F6 / #2563EB)
        static let accentMuted = Color(red: 0.231, green: 0.510, blue: 0.965) // #3B82F6

        /// Text on accent backgrounds
        static let accentForeground = Color.white

        /// Status colors
        static let success = Color(red: 0.133, green: 0.773, blue: 0.369) // #22C55E
        static let warning = Color(red: 0.918, green: 0.702, blue: 0.220) // #EAB338
        static let danger = Color(red: 0.863, green: 0.196, blue: 0.184) // #DC322F
    }

    // MARK: - Typography

    enum Typography {
        /// Page titles - Serif, bold, 24pt
        static let title = Font.system(size: 24, weight: .bold, design: .serif)

        /// Section headers - Sans, semibold, 18pt
        static let heading = Font.system(size: 18, weight: .semibold)

        /// Subheadings - Sans, medium, 16pt
        static let subheading = Font.system(size: 16, weight: .medium)

        /// Body content - Serif, regular, 14pt
        static let bodySerif = Font.system(size: 14, design: .serif)

        /// UI body text - Sans, regular, 13pt
        static let body = Font.system(size: 13)

        /// Small body text - Sans, regular, 12pt
        static let bodySmall = Font.system(size: 12)

        /// Labels and captions - Sans, 11pt
        static let caption = Font.system(size: 11)

        /// Tiny text - Sans, 10pt
        static let tiny = Font.system(size: 10)
    }

    // MARK: - Spacing

    enum Spacing {
        static let xxs: CGFloat = 2
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
    }

    // MARK: - Icons

    enum IconSize {
        static let xs: CGFloat = 12  // Chevrons
        static let sm: CGFloat = 14  // Small UI
        static let md: CGFloat = 16  // Sidebar items
        static let lg: CGFloat = 20  // Buttons
        static let xl: CGFloat = 24  // Headers
    }
}

// MARK: - Button Styles

/// Primary button - Black border, inverts on press
struct DirigiblePrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundColor(
                configuration.isPressed
                    ? DirigibleStyle.Colors.background
                    : DirigibleStyle.Colors.foreground
            )
            .background(
                configuration.isPressed
                    ? DirigibleStyle.Colors.foreground
                    : DirigibleStyle.Colors.background
            )
            .overlay(
                Rectangle()
                    .stroke(DirigibleStyle.Colors.foreground, lineWidth: 1)
            )
            .opacity(isEnabled ? 1 : 0.5)
    }
}

/// Secondary button - Gray border, subtle invert
struct DirigibleSecondaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundColor(
                configuration.isPressed
                    ? DirigibleStyle.Colors.background
                    : DirigibleStyle.Colors.muted
            )
            .background(
                configuration.isPressed
                    ? DirigibleStyle.Colors.muted
                    : DirigibleStyle.Colors.background
            )
            .overlay(
                Rectangle()
                    .stroke(DirigibleStyle.Colors.border, lineWidth: 1)
            )
            .opacity(isEnabled ? 1 : 0.5)
    }
}

/// Danger button - Red, inverts on press
struct DirigibleDangerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .medium))
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                configuration.isPressed
                    ? DirigibleStyle.Colors.danger
                    : DirigibleStyle.Colors.background
            )
            .foregroundColor(
                configuration.isPressed
                    ? .white
                    : DirigibleStyle.Colors.danger
            )
            .overlay(
                Rectangle()
                    .stroke(DirigibleStyle.Colors.danger, lineWidth: 1)
            )
    }
}

/// Ghost button - No border, just text
struct DirigibleGhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                configuration.isPressed
                    ? DirigibleStyle.Colors.hover
                    : Color.clear
            )
            .foregroundColor(DirigibleStyle.Colors.muted)
    }
}

// MARK: - Text Field Style

/// Text field with 1px border, no rounded corners
struct DirigibleTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .textFieldStyle(.plain)
            .font(DirigibleStyle.Typography.body)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(DirigibleStyle.Colors.background)
            .overlay(
                Rectangle()
                    .stroke(DirigibleStyle.Colors.border, lineWidth: 1)
            )
    }
}

// MARK: - View Extensions

extension View {
    /// Apply dirigible card styling
    func dirigibleCard() -> some View {
        self
            .background(DirigibleStyle.Colors.background)
            .overlay(
                Rectangle()
                    .stroke(DirigibleStyle.Colors.border, lineWidth: 1)
            )
    }

    /// Apply dirigible panel styling (for sidebars, etc)
    func dirigiblePanel() -> some View {
        self
            .background(DirigibleStyle.Colors.sidebarBg)
    }
}

// MARK: - Sidebar Row Style

struct DirigibleSidebarRowStyle: ViewModifier {
    let isSelected: Bool
    let isHovered: Bool

    func body(content: Content) -> some View {
        content
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(backgroundColor)
            .foregroundColor(foregroundColor)
    }

    private var backgroundColor: Color {
        if isSelected {
            return DirigibleStyle.Colors.accentMuted
        } else if isHovered {
            return DirigibleStyle.Colors.hover
        }
        return Color.clear
    }

    private var foregroundColor: Color {
        isSelected ? .white : DirigibleStyle.Colors.foreground
    }
}

extension View {
    func dirigibleSidebarRow(isSelected: Bool, isHovered: Bool = false) -> some View {
        self.modifier(DirigibleSidebarRowStyle(isSelected: isSelected, isHovered: isHovered))
    }
}

// MARK: - Tag Style

struct DirigibleTag: View {
    let text: String

    /// Generate consistent pastel color from tag name
    private var tagColor: Color {
        var hash = 0
        for char in text.unicodeScalars {
            hash = Int(char.value) &+ ((hash << 5) &- hash)
        }
        let hue = Double(abs(hash) % 360) / 360.0
        return Color(hue: hue, saturation: 0.7, brightness: 0.85)
    }

    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(tagColor)
            .foregroundColor(.black.opacity(0.8))
    }
}

// MARK: - Custom Icons

/// Moodboard icon - masonry grid layout matching web app
struct MoodboardIcon: View {
    var body: some View {
        Canvas { context, size in
            let scale = min(size.width, size.height) / 24

            // Top-left rectangle (wider, shorter)
            let rect1 = CGRect(x: 2 * scale, y: 2 * scale, width: 9 * scale, height: 6 * scale)
            context.fill(RoundedRectangle(cornerRadius: 1 * scale).path(in: rect1), with: .foreground)

            // Top-right rectangle (taller)
            let rect2 = CGRect(x: 13 * scale, y: 2 * scale, width: 9 * scale, height: 9 * scale)
            context.fill(RoundedRectangle(cornerRadius: 1 * scale).path(in: rect2), with: .foreground)

            // Bottom-left rectangle (tallest)
            let rect3 = CGRect(x: 2 * scale, y: 10 * scale, width: 9 * scale, height: 12 * scale)
            context.fill(RoundedRectangle(cornerRadius: 1 * scale).path(in: rect3), with: .foreground)

            // Bottom-right rectangle
            let rect4 = CGRect(x: 13 * scale, y: 13 * scale, width: 9 * scale, height: 9 * scale)
            context.fill(RoundedRectangle(cornerRadius: 1 * scale).path(in: rect4), with: .foreground)
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

/// Music icon - double music note matching web app (Heroicons style)
struct MusicIcon: View {
    var body: some View {
        Image(systemName: "music.note")
    }
}

/// Helper to get the right icon view for a note type
struct NoteTypeIcon: View {
    let type: NoteType
    let size: CGFloat

    var body: some View {
        Group {
            switch type {
            case .folder:
                Image(systemName: "folder")
                    .font(.system(size: size))
            case .note:
                Image(systemName: "doc")
                    .font(.system(size: size))
            case .moodboard:
                MoodboardIcon()
                    .frame(width: size, height: size)
            case .music:
                Image(systemName: "music.note")
                    .font(.system(size: size))
            }
        }
        .foregroundColor(DirigibleStyle.Colors.muted)
    }
}

// MARK: - Preview

#Preview("Button Styles") {
    VStack(spacing: 20) {
        HStack(spacing: 12) {
            Button("Primary") {}
                .buttonStyle(DirigiblePrimaryButtonStyle())

            Button("Secondary") {}
                .buttonStyle(DirigibleSecondaryButtonStyle())

            Button("Danger") {}
                .buttonStyle(DirigibleDangerButtonStyle())

            Button("Ghost") {}
                .buttonStyle(DirigibleGhostButtonStyle())
        }

        HStack(spacing: 8) {
            DirigibleTag(text: "react")
            DirigibleTag(text: "typescript")
            DirigibleTag(text: "firebase")
            DirigibleTag(text: "design")
        }
    }
    .padding(40)
    .background(DirigibleStyle.Colors.background)
}
