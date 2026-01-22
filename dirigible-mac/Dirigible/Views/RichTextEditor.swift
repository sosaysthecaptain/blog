import SwiftUI
import WebKit

/// Rich text editor using TipTap (ProseMirror-based) in a WKWebView
/// Matches the web app's editing experience exactly
struct RichTextEditor: NSViewRepresentable {
    @Binding var html: String
    var onContentChange: ((String) -> Void)?

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "contentChange")
        config.userContentController.add(context.coordinator, name: "editorReady")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator

        // Make background transparent
        webView.setValue(false, forKey: "drawsBackground")

        context.coordinator.webView = webView

        // Load the editor HTML
        let htmlContent = context.coordinator.generateEditorHTML()
        webView.loadHTMLString(htmlContent, baseURL: nil)

        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        // Only update if content changed externally (not from our own edits)
        guard context.coordinator.isReady,
              !context.coordinator.isEditing,
              context.coordinator.lastSetHTML != html else { return }

        context.coordinator.setContent(html)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(html: $html, onContentChange: onContentChange)
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        @Binding var html: String
        var onContentChange: ((String) -> Void)?
        weak var webView: WKWebView?
        var isReady = false
        var isEditing = false
        var lastSetHTML = ""
        var pendingContent: String?

        init(html: Binding<String>, onContentChange: ((String) -> Void)?) {
            _html = html
            self.onContentChange = onContentChange
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            switch message.name {
            case "editorReady":
                isReady = true
                // Set initial content or any pending content
                if let pending = pendingContent {
                    setContent(pending)
                    pendingContent = nil
                } else if !html.isEmpty {
                    setContent(html)
                }

            case "contentChange":
                guard let dict = message.body as? [String: Any],
                      let newHTML = dict["html"] as? String else { return }

                isEditing = true
                lastSetHTML = newHTML
                html = newHTML
                onContentChange?(newHTML)

                // Reset editing flag after a short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    self.isEditing = false
                }

            default:
                break
            }
        }

        func setContent(_ content: String) {
            guard isReady, let webView = webView else {
                pendingContent = content
                return
            }

            lastSetHTML = content
            let escaped = content
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "`", with: "\\`")
                .replacingOccurrences(of: "$", with: "\\$")

            webView.evaluateJavaScript("setContent(`\(escaped)`)") { _, error in
                if let error = error {
                    print("[RichTextEditor] Error setting content: \(error)")
                }
            }
        }

        func generateEditorHTML() -> String {
            // Detect dark mode
            let isDark = NSApp.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua

            return """
            <!DOCTYPE html>
            <html class="\(isDark ? "dark" : "")">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://cdn.jsdelivr.net/npm/@tiptap/core@2.1.13/dist/index.umd.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/@tiptap/pm@2.1.13/dist/index.umd.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/@tiptap/starter-kit@2.1.13/dist/index.umd.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/@tiptap/extension-placeholder@2.1.13/dist/index.umd.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/@tiptap/extension-link@2.1.13/dist/index.umd.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/@tiptap/extension-task-list@2.1.13/dist/index.umd.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/@tiptap/extension-task-item@2.1.13/dist/index.umd.min.js"></script>
                <style>
                    :root {
                        --background: #FFFFFF;
                        --foreground: #171717;
                        --muted: #737373;
                        --border: #E5E5E5;
                        --hover: #F5F5F5;
                        --accent: #2563EB;
                    }
                    .dark {
                        --background: #0A0A0A;
                        --foreground: #EDEDED;
                        --muted: #A3A3A3;
                        --border: #262626;
                        --hover: #171717;
                        --accent: #3B82F6;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Georgia, serif;
                        font-size: 14px;
                        line-height: 1.75;
                        color: var(--foreground);
                        background: transparent;
                        padding: 8px 0;
                    }
                    #editor {
                        outline: none;
                        min-height: 100px;
                    }
                    .ProseMirror {
                        outline: none;
                    }
                    .ProseMirror p.is-editor-empty:first-child::before {
                        color: var(--muted);
                        content: attr(data-placeholder);
                        float: left;
                        height: 0;
                        pointer-events: none;
                    }
                    .ProseMirror p {
                        margin: 0.75em 0;
                    }
                    .ProseMirror p:first-child {
                        margin-top: 0;
                    }
                    .ProseMirror h1 {
                        font-family: Georgia, serif;
                        font-size: 28px;
                        font-weight: 700;
                        margin: 1.5em 0 0.5em 0;
                        line-height: 1.2;
                    }
                    .ProseMirror h1:first-child {
                        margin-top: 0;
                    }
                    .ProseMirror h2 {
                        font-family: Georgia, serif;
                        font-size: 22px;
                        font-weight: 700;
                        margin: 1.25em 0 0.5em 0;
                        line-height: 1.3;
                    }
                    .ProseMirror h2:first-child {
                        margin-top: 0;
                    }
                    .ProseMirror h3 {
                        font-family: Georgia, serif;
                        font-size: 18px;
                        font-weight: 700;
                        margin: 1em 0 0.5em 0;
                        line-height: 1.4;
                    }
                    .ProseMirror h3:first-child {
                        margin-top: 0;
                    }
                    .ProseMirror ul {
                        list-style-type: disc;
                        padding-left: 1.25em;
                        margin: 0.5em 0;
                    }
                    .ProseMirror ol {
                        list-style-type: decimal;
                        padding-left: 1.25em;
                        margin: 0.5em 0;
                    }
                    .ProseMirror li {
                        margin: 0.125em 0;
                    }
                    .ProseMirror li p {
                        margin: 0;
                    }
                    .ProseMirror li > ul,
                    .ProseMirror li > ol {
                        margin: 0;
                    }
                    .ProseMirror blockquote {
                        border-left: 3px solid var(--border);
                        padding-left: 1em;
                        margin: 1em 0;
                        color: var(--muted);
                        font-style: italic;
                    }
                    .ProseMirror pre {
                        background: #2d2d2d;
                        color: #f8f8f2;
                        padding: 1em;
                        border-radius: 4px;
                        overflow-x: auto;
                        font-family: "SF Mono", ui-monospace, monospace;
                        font-size: 13px;
                        margin: 1em 0;
                    }
                    .ProseMirror code {
                        background: rgba(0, 0, 0, 0.08);
                        padding: 0.15em 0.3em;
                        border-radius: 3px;
                        font-family: "SF Mono", ui-monospace, monospace;
                        font-size: 0.9em;
                    }
                    .dark .ProseMirror code {
                        background: rgba(255, 255, 255, 0.1);
                    }
                    .ProseMirror pre code {
                        background: none;
                        padding: 0;
                        border-radius: 0;
                        font-size: inherit;
                    }
                    .ProseMirror a {
                        color: var(--accent);
                        text-decoration: underline;
                    }
                    .ProseMirror hr {
                        border: none;
                        border-top: 1px solid var(--border);
                        margin: 1.5em 0;
                    }
                    .ProseMirror strong {
                        font-weight: 700;
                    }
                    .ProseMirror em {
                        font-style: italic;
                    }
                    .ProseMirror s {
                        text-decoration: line-through;
                        color: var(--muted);
                    }
                    /* Task list styles */
                    .ProseMirror ul[data-type="taskList"] {
                        list-style: none;
                        padding-left: 0;
                        margin: 0.5em 0;
                    }
                    .ProseMirror ul[data-type="taskList"] li {
                        display: flex;
                        align-items: flex-start;
                        gap: 0.5em;
                        margin: 0.125em 0;
                    }
                    .ProseMirror ul[data-type="taskList"] li > label {
                        flex-shrink: 0;
                        margin-top: 0.175em;
                    }
                    .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 1em;
                        height: 1em;
                        border: 2px solid var(--muted);
                        border-radius: 3px;
                        background: var(--background);
                        cursor: pointer;
                        position: relative;
                    }
                    .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
                        background: var(--foreground);
                        border-color: var(--foreground);
                    }
                    .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after {
                        content: '';
                        position: absolute;
                        left: 50%;
                        top: 45%;
                        width: 5px;
                        height: 9px;
                        border: solid white;
                        border-width: 0 2px 2px 0;
                        transform: translate(-50%, -50%) rotate(45deg);
                    }
                    .dark .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after {
                        border-color: var(--background);
                    }
                    .ProseMirror ul[data-type="taskList"] li > div {
                        flex: 1;
                    }
                    .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
                        text-decoration: line-through;
                        color: var(--muted);
                    }
                </style>
            </head>
            <body>
                <div id="editor"></div>
                <script>
                    let editor = null;

                    function initEditor() {
                        const { Editor } = window.TiptapCore;
                        const StarterKit = window.TiptapStarterKit.StarterKit;
                        const Placeholder = window.TiptapExtensionPlaceholder.Placeholder;
                        const Link = window.TiptapExtensionLink.Link;
                        const TaskList = window.TiptapExtensionTaskList.TaskList;
                        const TaskItem = window.TiptapExtensionTaskItem.TaskItem;

                        editor = new Editor({
                            element: document.getElementById('editor'),
                            extensions: [
                                StarterKit.configure({
                                    heading: {
                                        levels: [1, 2, 3],
                                    },
                                }),
                                Placeholder.configure({
                                    placeholder: 'Start typing...',
                                }),
                                Link.configure({
                                    openOnClick: false,
                                }),
                                TaskList,
                                TaskItem.configure({
                                    nested: true,
                                }),
                            ],
                            content: '',
                            onUpdate: ({ editor }) => {
                                const html = editor.getHTML();
                                window.webkit.messageHandlers.contentChange.postMessage({ html: html });
                            },
                        });

                        // Notify Swift that editor is ready
                        window.webkit.messageHandlers.editorReady.postMessage({});
                    }

                    function setContent(html) {
                        if (editor) {
                            editor.commands.setContent(html, false);
                        }
                    }

                    function getContent() {
                        return editor ? editor.getHTML() : '';
                    }

                    // Initialize when DOM is ready
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', initEditor);
                    } else {
                        initEditor();
                    }
                </script>
            </body>
            </html>
            """
        }
    }
}

#Preview {
    RichTextEditor(html: .constant("<h1>Hello</h1><p>This is a test</p>"))
        .frame(width: 500, height: 400)
}
