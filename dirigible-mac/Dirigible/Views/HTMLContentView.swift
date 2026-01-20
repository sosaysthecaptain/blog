import SwiftUI
import WebKit

/// Renders HTML content matching the web app's TipTap editor styling
struct HTMLContentView: NSViewRepresentable {
    let html: String
    let isEditable: Bool
    var onContentChange: ((String) -> Void)?

    init(html: String, isEditable: Bool = false, onContentChange: ((String) -> Void)? = nil) {
        self.html = html
        self.isEditable = isEditable
        self.onContentChange = onContentChange
    }

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "contentChanged")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator

        // Make background transparent
        webView.setValue(false, forKey: "drawsBackground")

        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        let fullHTML = wrapHTMLWithStyles(html)
        webView.loadHTMLString(fullHTML, baseURL: nil)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onContentChange: onContentChange)
    }

    private func wrapHTMLWithStyles(_ content: String) -> String {
        let isDark = NSApp.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua

        let bgColor = isDark ? "#0A0A0A" : "#FFFFFF"
        let fgColor = isDark ? "#EDEDED" : "#171717"
        let mutedColor = isDark ? "#A3A3A3" : "#737373"
        let borderColor = isDark ? "#262626" : "#E5E5E5"
        let hoverColor = isDark ? "#171717" : "#F5F5F5"
        let accentColor = isDark ? "#3B82F6" : "#2563EB"
        let codeBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"

        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {
                    box-sizing: border-box;
                }
                body {
                    font-family: Georgia, 'Times New Roman', serif;
                    font-size: 14px;
                    line-height: 1.75;
                    color: \(fgColor);
                    background: \(bgColor);
                    margin: 0;
                    padding: 0;
                    -webkit-font-smoothing: antialiased;
                }
                h1 {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                    line-height: 1.2;
                }
                h2 {
                    font-size: 1.375rem;
                    font-weight: 600;
                    margin-top: 1.25rem;
                    margin-bottom: 0.5rem;
                    line-height: 1.3;
                }
                h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin-top: 1rem;
                    margin-bottom: 0.375rem;
                    line-height: 1.4;
                }
                p {
                    margin: 0.75rem 0;
                }
                p:first-child {
                    margin-top: 0;
                }
                ul, ol {
                    padding-left: 1.25rem;
                    margin: 0.5rem 0;
                }
                ul {
                    list-style-type: disc;
                }
                ol {
                    list-style-type: decimal;
                }
                li {
                    margin: 0.125rem 0;
                }
                li p {
                    margin: 0;
                }
                /* Nested lists */
                li > ul, li > ol {
                    margin: 0;
                }

                blockquote {
                    border-left: 3px solid \(borderColor);
                    padding-left: 1rem;
                    margin: 1rem 0;
                    color: \(mutedColor);
                    font-style: italic;
                }

                pre {
                    background: #2d2d2d;
                    color: #f8f8f2;
                    padding: 0.75rem;
                    border-radius: 0.375rem;
                    overflow-x: auto;
                    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                    font-size: 0.8125rem;
                    margin: 1rem 0;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                code {
                    background: \(codeBg);
                    padding: 0.15rem 0.3rem;
                    border-radius: 0.25rem;
                    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                    font-size: 0.875em;
                }
                pre code {
                    background: none;
                    padding: 0;
                    border-radius: 0;
                    font-size: inherit;
                }

                a {
                    color: \(accentColor);
                    text-decoration: underline;
                }

                hr {
                    border: none;
                    border-top: 1px solid \(borderColor);
                    margin: 1.5rem 0;
                }

                strong, b {
                    font-weight: 700;
                }
                em, i {
                    font-style: italic;
                }
                s, strike, del {
                    text-decoration: line-through;
                    color: \(mutedColor);
                }

                /* Task lists */
                ul[data-type="taskList"] {
                    list-style: none;
                    padding-left: 0;
                }
                ul[data-type="taskList"] li {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                }
                ul[data-type="taskList"] li input[type="checkbox"] {
                    margin-top: 0.25rem;
                    width: 14px;
                    height: 14px;
                    accent-color: \(fgColor);
                }
                ul[data-type="taskList"] li[data-checked="true"] > div {
                    text-decoration: line-through;
                    color: \(mutedColor);
                }

                /* Tables */
                table {
                    border-collapse: collapse;
                    margin: 1rem 0;
                    width: 100%;
                    font-size: 0.875rem;
                }
                table td, table th {
                    border: 1px solid \(borderColor);
                    padding: 0.375rem 0.5rem;
                    text-align: left;
                    vertical-align: top;
                }
                table th {
                    background: \(hoverColor);
                    font-weight: 600;
                }

                /* Images */
                img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.25rem;
                    margin: 0.75rem 0;
                }
                figure {
                    margin: 0.75rem 0;
                }
                figcaption {
                    text-align: center;
                    font-size: 0.8125rem;
                    color: \(mutedColor);
                    margin-top: 0.25rem;
                }

                /* File attachments */
                .file-attachment {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    background: \(hoverColor);
                    border: 1px solid \(borderColor);
                    border-radius: 0.25rem;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 0.8125rem;
                    color: \(fgColor);
                    text-decoration: none;
                    margin: 0.25rem 0;
                }
                .file-attachment:hover {
                    background: \(borderColor);
                }
            </style>
        </head>
        <body>
            \(content.isEmpty ? "<p style='color: \(mutedColor)'>No content</p>" : content)
        </body>
        </html>
        """
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var onContentChange: ((String) -> Void)?

        init(onContentChange: ((String) -> Void)?) {
            self.onContentChange = onContentChange
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "contentChanged", let content = message.body as? String {
                onContentChange?(content)
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            // Open links in default browser
            if navigationAction.navigationType == .linkActivated, let url = navigationAction.request.url {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
            } else {
                decisionHandler(.allow)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    HTMLContentView(html: """
        <h1>Heading 1</h1>
        <p>This is a paragraph with <strong>bold</strong>, <em>italic</em>, and <a href="https://example.com">a link</a>.</p>
        <h2>Heading 2</h2>
        <ul>
            <li>First item</li>
            <li>Second item with <code>inline code</code></li>
            <li>Third item</li>
        </ul>
        <h3>Code Block</h3>
        <pre><code>function hello() {
            console.log("Hello, world!");
        }</code></pre>
        <blockquote>This is a blockquote with some thoughtful text.</blockquote>
        <table>
            <tr><th>Name</th><th>Value</th></tr>
            <tr><td>Alpha</td><td>100</td></tr>
            <tr><td>Beta</td><td>200</td></tr>
        </table>
    """)
    .frame(width: 600, height: 800)
}
