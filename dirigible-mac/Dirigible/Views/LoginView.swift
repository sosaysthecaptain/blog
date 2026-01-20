import SwiftUI
import DirigibleCore

// Hindenburg logo shape
struct HindenburgLogo: Shape {
    func path(in rect: CGRect) -> Path {
        let scale = min(rect.width / 728, rect.height / 387)
        let xOffset = (rect.width - 728 * scale) / 2
        let yOffset = (rect.height - 387 * scale) / 2

        var path = Path()

        // Main body path (scaled and offset)
        path.move(to: CGPoint(x: xOffset + 148.677 * scale, y: yOffset + 123.244 * scale))
        path.addCurve(
            to: CGPoint(x: xOffset + 216.472 * scale, y: yOffset + 105.725 * scale),
            control1: CGPoint(x: xOffset + 173.807 * scale, y: yOffset + 115.461 * scale),
            control2: CGPoint(x: xOffset + 198.003 * scale, y: yOffset + 109.086 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 405.787 * scale, y: yOffset + 90.2071 * scale),
            control1: CGPoint(x: xOffset + 271.902 * scale, y: yOffset + 95.6382 * scale),
            control2: CGPoint(x: xOffset + 308.571 * scale, y: yOffset + 92.5347 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 607.893 * scale, y: yOffset + 115.811 * scale),
            control1: CGPoint(x: xOffset + 503.003 * scale, y: yOffset + 87.8794 * scale),
            control2: CGPoint(x: xOffset + 593.823 * scale, y: yOffset + 109.604 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 669.719 * scale, y: yOffset + 157.709 * scale),
            control1: CGPoint(x: xOffset + 621.964 * scale, y: yOffset + 122.018 * scale),
            control2: CGPoint(x: xOffset + 659.486 * scale, y: yOffset + 145.295 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 685.922 * scale, y: yOffset + 186.417 * scale),
            control1: CGPoint(x: xOffset + 673.841 * scale, y: yOffset + 164.175 * scale),
            control2: CGPoint(x: xOffset + 682.852 * scale, y: yOffset + 178.968 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 688.907 * scale, y: yOffset + 195.727 * scale),
            control1: CGPoint(x: xOffset + 688.992 * scale, y: yOffset + 193.865 * scale),
            control2: CGPoint(x: xOffset + 689.191 * scale, y: yOffset + 195.727 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 680.805 * scale, y: yOffset + 215.9 * scale),
            control1: CGPoint(x: xOffset + 687.485 * scale, y: yOffset + 200.124 * scale),
            control2: CGPoint(x: xOffset + 683.875 * scale, y: yOffset + 210.314 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 666.735 * scale, y: yOffset + 239.177 * scale),
            control1: CGPoint(x: xOffset + 677.735 * scale, y: yOffset + 221.487 * scale),
            control2: CGPoint(x: xOffset + 670.146 * scale, y: yOffset + 233.746 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 591.264 * scale, y: yOffset + 281.85 * scale),
            control1: CGPoint(x: xOffset + 657.78 * scale, y: yOffset + 249.263 * scale),
            control2: CGPoint(x: xOffset + 632.963 * scale, y: yOffset + 269.71 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 393.422 * scale, y: yOffset + 298.92 * scale),
            control1: CGPoint(x: xOffset + 548.626 * scale, y: yOffset + 294.264 * scale),
            control2: CGPoint(x: xOffset + 503.856 * scale, y: yOffset + 298.144 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 140.576 * scale, y: yOffset + 267.884 * scale),
            control1: CGPoint(x: xOffset + 282.988 * scale, y: yOffset + 299.696 * scale),
            control2: CGPoint(x: xOffset + 206.665 * scale, y: yOffset + 284.954 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 42.3196 * scale, y: yOffset + 224.54 * scale),
            control1: CGPoint(x: xOffset + 104.189 * scale, y: yOffset + 258.487 * scale),
            control2: CGPoint(x: xOffset + 67.87 * scale, y: yOffset + 239.975 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 15.2188 * scale, y: yOffset + 206.59 * scale),
            control1: CGPoint(x: xOffset + 30.7439 * scale, y: yOffset + 217.547 * scale),
            control2: CGPoint(x: xOffset + 21.3785 * scale, y: yOffset + 211.186 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 25.0256 * scale, y: yOffset + 174.003 * scale),
            control1: CGPoint(x: xOffset + 8.82298 * scale, y: yOffset + 202.71 * scale),
            control2: CGPoint(x: xOffset + 1.83031 * scale, y: yOffset + 190.762 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 42.3196 * scale, y: yOffset + 163.916 * scale),
            control1: CGPoint(x: xOffset + 29.2604 * scale, y: yOffset + 170.943 * scale),
            control2: CGPoint(x: xOffset + 35.1597 * scale, y: yOffset + 167.536 * scale)
        )
        path.addLine(to: CGPoint(x: xOffset + 42.9338 * scale, y: yOffset + 159.261 * scale))
        path.addCurve(
            to: CGPoint(x: xOffset + 49.3295 * scale, y: yOffset + 90.2071 * scale),
            control1: CGPoint(x: xOffset + 44.7814 * scale, y: yOffset + 138.312 * scale),
            control2: CGPoint(x: xOffset + 48.6473 * scale, y: yOffset + 95.1727 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 54.4462 * scale, y: yOffset + 84 * scale),
            control1: CGPoint(x: xOffset + 50.0117 * scale, y: yOffset + 85.2414 * scale),
            control2: CGPoint(x: xOffset + 53.0249 * scale, y: yOffset + 84 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 110.303 * scale, y: yOffset + 85.5518 * scale),
            control1: CGPoint(x: xOffset + 72.2122 * scale, y: yOffset + 84.5173 * scale),
            control2: CGPoint(x: xOffset + 108.256 * scale, y: yOffset + 85.5518 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 121.389 * scale, y: yOffset + 87.8794 * scale),
            control1: CGPoint(x: xOffset + 112.861 * scale, y: yOffset + 85.5518 * scale),
            control2: CGPoint(x: xOffset + 119.683 * scale, y: yOffset + 87.1035 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 138.87 * scale, y: yOffset + 103.397 * scale),
            control1: CGPoint(x: xOffset + 123.094 * scale, y: yOffset + 88.6553 * scale),
            control2: CGPoint(x: xOffset + 131.195 * scale, y: yOffset + 94.0865 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 148.677 * scale, y: yOffset + 123.244 * scale),
            control1: CGPoint(x: xOffset + 145.01 * scale, y: yOffset + 110.846 * scale),
            control2: CGPoint(x: xOffset + 147.967 * scale, y: yOffset + 119.732 * scale)
        )
        path.closeSubpath()

        // Gondola path
        path.move(to: CGPoint(x: xOffset + 42.3196 * scale, y: yOffset + 224.54 * scale))
        path.addCurve(
            to: CGPoint(x: xOffset + 48.0504 * scale, y: yOffset + 288.057 * scale),
            control1: CGPoint(x: xOffset + 44.0878 * scale, y: yOffset + 244.678 * scale),
            control2: CGPoint(x: xOffset + 47.7092 * scale, y: yOffset + 285.575 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 70.2224 * scale, y: yOffset + 298.144 * scale),
            control1: CGPoint(x: xOffset + 48.3915 * scale, y: yOffset + 290.54 * scale),
            control2: CGPoint(x: xOffset + 62.9739 * scale, y: yOffset + 295.816 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 114.993 * scale, y: yOffset + 303.575 * scale),
            control1: CGPoint(x: xOffset + 82.1612 * scale, y: yOffset + 300.73 * scale),
            control2: CGPoint(x: xOffset + 107.83 * scale, y: yOffset + 305.437 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 137.165 * scale, y: yOffset + 290.385 * scale),
            control1: CGPoint(x: xOffset + 123.947 * scale, y: yOffset + 301.247 * scale),
            control2: CGPoint(x: xOffset + 133.754 * scale, y: yOffset + 295.04 * scale)
        )
        path.addCurve(
            to: CGPoint(x: xOffset + 147.824 * scale, y: yOffset + 270.988 * scale),
            control1: CGPoint(x: xOffset + 140.576 * scale, y: yOffset + 285.73 * scale),
            control2: CGPoint(x: xOffset + 145.692 * scale, y: yOffset + 277.195 * scale)
        )
        path.addLine(to: CGPoint(x: xOffset + 140.576 * scale, y: yOffset + 267.884 * scale))
        path.addCurve(
            to: CGPoint(x: xOffset + 42.3196 * scale, y: yOffset + 224.54 * scale),
            control1: CGPoint(x: xOffset + 67.87 * scale, y: yOffset + 239.975 * scale),
            control2: CGPoint(x: xOffset + 42.3196 * scale, y: yOffset + 224.54 * scale)
        )
        path.closeSubpath()

        return path
    }
}

struct LoginView: View {
    @EnvironmentObject var firebaseSync: FirebaseSync
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var isGoogleLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            // Header with logo
            VStack(spacing: 8) {
                HindenburgLogo()
                    .fill(Color(nsColor: .labelColor))
                    .frame(width: 80, height: 42)

                Text("dirigible")
                    .font(.system(size: 24, weight: .bold, design: .monospaced))

                Text("Sign in to sync your notes")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(.secondary)
            }
            .padding(.bottom, 32)

            // Google Sign-In (primary)
            Button {
                signInWithGoogle()
            } label: {
                HStack(spacing: 8) {
                    if isGoogleLoading {
                        ProgressView()
                            .scaleEffect(0.7)
                            .frame(width: 16, height: 16)
                    } else {
                        Image(systemName: "g.circle.fill")
                            .font(.system(size: 16))
                    }
                    Text("Continue with Google")
                        .font(.system(size: 13, weight: .medium))
                }
                .frame(maxWidth: .infinity)
                .frame(height: 36)
            }
            .buttonStyle(DirigiblePrimaryButtonStyle())
            .disabled(isLoading || isGoogleLoading)

            // Divider
            HStack {
                Rectangle()
                    .fill(Color(nsColor: .separatorColor))
                    .frame(height: 1)
                Text("or")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 12)
                Rectangle()
                    .fill(Color(nsColor: .separatorColor))
                    .frame(height: 1)
            }
            .padding(.vertical, 20)

            // Email/Password form
            VStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Email")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                    TextField("", text: $email)
                        .textFieldStyle(DirigibleTextFieldStyle())
                        .textContentType(.emailAddress)
                        .autocorrectionDisabled()
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Password")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                    SecureField("", text: $password)
                        .textFieldStyle(DirigibleTextFieldStyle())
                        .textContentType(.password)
                }
            }

            if let error = errorMessage {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 10))
                    Text(error)
                        .font(.system(size: 11))
                }
                .foregroundColor(.red)
                .padding(.top, 12)
            }

            Button {
                signIn()
            } label: {
                HStack {
                    if isLoading {
                        ProgressView()
                            .scaleEffect(0.7)
                            .frame(width: 14, height: 14)
                    }
                    Text("Sign In")
                        .font(.system(size: 13, weight: .medium))
                }
                .frame(maxWidth: .infinity)
                .frame(height: 36)
            }
            .buttonStyle(DirigibleSecondaryButtonStyle())
            .disabled(email.isEmpty || password.isEmpty || isLoading || isGoogleLoading)
            .padding(.top, 16)
            .keyboardShortcut(.return)
        }
        .frame(width: 240)
        .padding(32)
        .background(Color(nsColor: .windowBackgroundColor))
    }

    private func signIn() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await firebaseSync.signIn(email: email, password: password)
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func signInWithGoogle() {
        isGoogleLoading = true
        errorMessage = nil

        Task {
            do {
                try await firebaseSync.signInWithGoogle()
            } catch {
                errorMessage = error.localizedDescription
            }
            isGoogleLoading = false
        }
    }
}

// Button styles moved to DirigibleStyle.swift

#Preview {
    LoginView()
        .environmentObject(FirebaseSync.shared)
}
