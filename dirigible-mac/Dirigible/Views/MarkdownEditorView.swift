import SwiftUI
import WebKit

/// Loads the bundled React/CodeMirror markdown editor
/// This is the EXACT same editor as the web app, just bundled locally
struct MarkdownEditorView: NSViewRepresentable {
    @Binding var content: String
    let noteId: String
    var font: String = "mono"
    var fontSize: String = "base"
    var onContentChange: ((String) -> Void)?

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "contentChanged")
        config.userContentController.add(context.coordinator, name: "editorReady")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.setValue(false, forKey: "drawsBackground")

        context.coordinator.webView = webView
        context.coordinator.pendingContent = content
        context.coordinator.pendingFont = font
        context.coordinator.pendingFontSize = fontSize

        // Load the bundled editor HTML
        // Try multiple paths since Xcode can organize resources differently
        let possiblePaths = [
            Bundle.main.path(forResource: "index", ofType: "html", inDirectory: "Resources"),
            Bundle.main.path(forResource: "index", ofType: "html"),
            Bundle.main.url(forResource: "index", withExtension: "html")?.path
        ]

        if let htmlPath = possiblePaths.compactMap({ $0 }).first {
            print("[MarkdownEditorView] Loading editor from: \(htmlPath)")
            let htmlURL = URL(fileURLWithPath: htmlPath)
            webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
        } else {
            // Debug: list what's in the bundle
            print("[MarkdownEditorView] ERROR: Could not find bundled editor HTML")
            print("[MarkdownEditorView] Bundle path: \(Bundle.main.bundlePath)")
            if let resourcePath = Bundle.main.resourcePath {
                print("[MarkdownEditorView] Resource path: \(resourcePath)")
                if let contents = try? FileManager.default.contentsOfDirectory(atPath: resourcePath) {
                    print("[MarkdownEditorView] Bundle contents: \(contents)")
                }
            }
            // Fallback: show error message
            webView.loadHTMLString("<html><body><h1>Editor not found</h1><p>The bundled editor could not be loaded. Check console for debug info.</p></body></html>", baseURL: nil)
        }

        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        guard context.coordinator.editorReady else { return }

        // Update content if changed externally
        if context.coordinator.lastContent != content {
            context.coordinator.lastContent = content
            let escaped = escapeForJS(content)
            webView.evaluateJavaScript("window.editorAPI?.setContent('\(escaped)');", completionHandler: nil)
        }

        // Update font if changed
        if context.coordinator.lastFont != font {
            context.coordinator.lastFont = font
            webView.evaluateJavaScript("window.editorAPI?.setFont('\(font)');", completionHandler: nil)
        }

        // Update font size if changed
        if context.coordinator.lastFontSize != fontSize {
            context.coordinator.lastFontSize = fontSize
            webView.evaluateJavaScript("window.editorAPI?.setFontSize('\(fontSize)');", completionHandler: nil)
        }

        // Update dark mode based on system appearance
        let isDark = NSApp.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
        if context.coordinator.lastDarkMode != isDark {
            context.coordinator.lastDarkMode = isDark
            webView.evaluateJavaScript("window.editorAPI?.setDarkMode(\(isDark));", completionHandler: nil)
        }
    }

    private func escapeForJS(_ str: String) -> String {
        return str
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "\\r")
            .replacingOccurrences(of: "\t", with: "\\t")
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: MarkdownEditorView
        weak var webView: WKWebView?
        var editorReady = false
        var lastContent = ""
        var lastFont = "mono"
        var lastFontSize = "base"
        var lastDarkMode = false
        var pendingContent = ""
        var pendingFont = "mono"
        var pendingFontSize = "base"

        init(_ parent: MarkdownEditorView) {
            self.parent = parent
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "editorReady" {
                editorReady = true
                print("[MarkdownEditorView] Editor ready")

                // Set initial content and settings
                let escaped = parent.escapeForJS(pendingContent)
                webView?.evaluateJavaScript("window.editorAPI?.setContent('\(escaped)');", completionHandler: nil)
                webView?.evaluateJavaScript("window.editorAPI?.setFont('\(pendingFont)');", completionHandler: nil)
                webView?.evaluateJavaScript("window.editorAPI?.setFontSize('\(pendingFontSize)');", completionHandler: nil)

                let isDark = NSApp.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
                webView?.evaluateJavaScript("window.editorAPI?.setDarkMode(\(isDark));", completionHandler: nil)

                lastContent = pendingContent
                lastFont = pendingFont
                lastFontSize = pendingFontSize
                lastDarkMode = isDark

            } else if message.name == "contentChanged" {
                guard let dict = message.body as? [String: Any],
                      let type = dict["type"] as? String,
                      type == "content",
                      let markdown = dict["markdown"] as? String else {
                    print("[MarkdownEditorView] contentChanged: INVALID message format")
                    return
                }

                print("[MarkdownEditorView] contentChanged received, length=\(markdown.count)")
                lastContent = markdown
                DispatchQueue.main.async {
                    self.parent.content = markdown
                    self.parent.onContentChange?(markdown)
                    print("[MarkdownEditorView] onContentChange callback invoked")
                }
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("[MarkdownEditorView] Navigation finished")
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("[MarkdownEditorView] Navigation failed: \(error)")
        }
    }
}
