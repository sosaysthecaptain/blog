import SwiftUI
import WebKit

/// Rich text editor matching TipTap's markdown input rules
/// Supports: headers, lists, blockquotes, code blocks, formatting
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
        context.coordinator.webView = webView

        // Make background transparent
        webView.setValue(false, forKey: "drawsBackground")

        // Load initial content
        let fullHTML = wrapHTMLWithStyles(html, isEditable: isEditable)
        webView.loadHTMLString(fullHTML, baseURL: nil)
        context.coordinator.lastLoadedHTML = html

        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        // Don't reload while user is actively editing
        if context.coordinator.isEditing {
            return
        }

        // Check if content actually changed
        if context.coordinator.lastLoadedHTML == html {
            return
        }

        context.coordinator.lastLoadedHTML = html
        let fullHTML = wrapHTMLWithStyles(html, isEditable: isEditable)
        webView.loadHTMLString(fullHTML, baseURL: nil)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onContentChange: onContentChange, isEditable: isEditable)
    }

    private func wrapHTMLWithStyles(_ content: String, isEditable: Bool) -> String {
        let editableAttr = isEditable ? "contenteditable=\"true\"" : ""
        let placeholderContent = isEditable && content.isEmpty ? "<p class=\"placeholder\">Start typing...</p>" : content

        // Use CSS custom properties that respond to prefers-color-scheme
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                :root {
                    --background: #FFFFFF;
                    --foreground: #171717;
                    --muted: #737373;
                    --border: #E5E5E5;
                    --hover: #F5F5F5;
                    --accent: #2563EB;
                    --code-bg: rgba(0,0,0,0.08);
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --background: #0A0A0A;
                        --foreground: #EDEDED;
                        --muted: #A3A3A3;
                        --border: #262626;
                        --hover: #171717;
                        --accent: #3B82F6;
                        --code-bg: rgba(255,255,255,0.1);
                    }
                }
                * {
                    box-sizing: border-box;
                }
                html, body {
                    height: 100%;
                    margin: 0;
                    padding: 0;
                }
                body {
                    font-family: Georgia, 'Times New Roman', serif;
                    font-size: 14px;
                    line-height: 1.75;
                    color: var(--foreground);
                    background: var(--background);
                    -webkit-font-smoothing: antialiased;
                }
                #editor {
                    min-height: 100%;
                    outline: none;
                    padding: 0;
                }
                .placeholder {
                    color: var(--muted);
                }
                h1 {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                    line-height: 1.2;
                }
                h1:first-child { margin-top: 0; }
                h2 {
                    font-size: 1.375rem;
                    font-weight: 600;
                    margin-top: 1.25rem;
                    margin-bottom: 0.5rem;
                    line-height: 1.3;
                }
                h2:first-child { margin-top: 0; }
                h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin-top: 1rem;
                    margin-bottom: 0.375rem;
                    line-height: 1.4;
                }
                h3:first-child { margin-top: 0; }
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
                li > ul, li > ol {
                    margin: 0;
                }

                blockquote {
                    border-left: 3px solid var(--border);
                    padding-left: 1rem;
                    margin: 1rem 0;
                    color: var(--muted);
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
                    background: var(--code-bg);
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
                    color: var(--accent);
                    text-decoration: underline;
                }

                hr {
                    border: none;
                    border-top: 1px solid var(--border);
                    margin: 1.5rem 0;
                }

                strong, b { font-weight: 700; }
                em, i { font-style: italic; }
                s, strike, del {
                    text-decoration: line-through;
                    color: var(--muted);
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
                }

                /* Tables */
                table {
                    border-collapse: collapse;
                    margin: 1rem 0;
                    width: 100%;
                    font-size: 0.875rem;
                }
                table td, table th {
                    border: 1px solid var(--border);
                    padding: 0.375rem 0.5rem;
                    text-align: left;
                    vertical-align: top;
                }
                table th {
                    background: var(--hover);
                    font-weight: 600;
                }

                /* Images */
                img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.25rem;
                    margin: 0.75rem 0;
                }
            </style>
        </head>
        <body>
            <div id="editor" \(editableAttr)>\(placeholderContent)</div>
            \(isEditable ? editorScript : "")
        </body>
        </html>
        """
    }

    private var editorScript: String {
        """
        <script>
            const editor = document.getElementById('editor');
            let debounceTimer = null;

            // Track editing state
            editor.addEventListener('focus', function() {
                window.webkit.messageHandlers.contentChanged.postMessage({ type: 'focus' });
                // Remove placeholder
                const placeholder = editor.querySelector('.placeholder');
                if (placeholder) {
                    placeholder.remove();
                    if (editor.innerHTML.trim() === '') {
                        editor.innerHTML = '<p><br></p>';
                        placeCaretAtStart();
                    }
                }
            });

            editor.addEventListener('blur', function() {
                window.webkit.messageHandlers.contentChanged.postMessage({ type: 'blur' });
                // Show placeholder if empty
                const text = editor.innerText.trim();
                if (!text || text === '') {
                    editor.innerHTML = '<p class="placeholder">Start typing...</p>';
                }
            });

            // Send content changes with debouncing
            function sendContent() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function() {
                    let content = editor.innerHTML;
                    if (content.includes('class="placeholder"')) {
                        content = '';
                    }
                    window.webkit.messageHandlers.contentChanged.postMessage({ type: 'content', html: content });
                }, 300);
            }

            // Markdown input rules - like TipTap's StarterKit
            // Triggers on input (when space is typed) not on Enter
            editor.addEventListener('input', function(e) {
                sendContent();

                const selection = window.getSelection();
                const node = selection.anchorNode;
                const block = getParentBlock(node);

                if (block && block.tagName === 'P') {
                    const text = block.innerText;

                    // Check for markdown patterns - triggers immediately when pattern is complete
                    const patterns = [
                        { regex: /^### $/, tag: 'h3' },
                        { regex: /^## $/, tag: 'h2' },
                        { regex: /^# $/, tag: 'h1' },
                        { regex: /^> $/, tag: 'blockquote' },
                        { regex: /^- $/, tag: 'ul' },
                        { regex: /^\\* $/, tag: 'ul' },
                        { regex: /^1\\. $/, tag: 'ol' },
                        { regex: /^---$/, tag: 'hr' },
                        { regex: /^```$/, tag: 'pre' },
                    ];

                    for (const p of patterns) {
                        if (p.regex.test(text)) {
                            convertToElement(block, p.tag);
                            sendContent();
                            return;
                        }
                    }
                }
            });

            // Handle Enter key for double-enter exit and keyboard shortcuts
            editor.addEventListener('keydown', function(e) {
                // Double enter to exit list/blockquote
                if (e.key === 'Enter' && !e.shiftKey) {
                    const selection = window.getSelection();
                    const node = selection.anchorNode;
                    const block = getParentBlock(node);

                    if (block) {
                        const parent = block.parentElement;
                        // In a list or blockquote with empty content = exit
                        if ((parent.tagName === 'UL' || parent.tagName === 'OL') && block.tagName === 'LI' && block.innerText.trim() === '') {
                            e.preventDefault();
                            exitBlock(block, parent);
                            sendContent();
                            return;
                        }
                        if (parent.tagName === 'BLOCKQUOTE' && block.innerText.trim() === '') {
                            e.preventDefault();
                            exitBlock(block, parent);
                            sendContent();
                            return;
                        }
                    }
                }

                // Keyboard shortcuts for formatting
                if (e.metaKey || e.ctrlKey) {
                    switch(e.key) {
                        case 'b':
                            e.preventDefault();
                            document.execCommand('bold');
                            sendContent();
                            break;
                        case 'i':
                            e.preventDefault();
                            document.execCommand('italic');
                            sendContent();
                            break;
                        case 'u':
                            e.preventDefault();
                            document.execCommand('underline');
                            sendContent();
                            break;
                    }
                }
            });

            // Handle paste
            editor.addEventListener('paste', function(e) {
                e.preventDefault();
                const html = e.clipboardData.getData('text/html');
                const text = e.clipboardData.getData('text/plain');
                if (html) {
                    document.execCommand('insertHTML', false, html);
                } else {
                    document.execCommand('insertText', false, text);
                }
                sendContent();
            });

            function getParentBlock(node) {
                while (node && node !== editor) {
                    if (node.nodeType === 1 && ['P', 'H1', 'H2', 'H3', 'LI', 'BLOCKQUOTE', 'PRE'].includes(node.tagName)) {
                        return node;
                    }
                    node = node.parentNode;
                }
                return null;
            }

            function convertToElement(block, tag) {
                if (tag === 'hr') {
                    const hr = document.createElement('hr');
                    const p = document.createElement('p');
                    p.innerHTML = '<br>';
                    block.replaceWith(hr);
                    hr.after(p);
                    placeCaretInElement(p);
                } else if (tag === 'ul' || tag === 'ol') {
                    const list = document.createElement(tag);
                    const li = document.createElement('li');
                    li.innerHTML = '<br>';
                    list.appendChild(li);
                    block.replaceWith(list);
                    placeCaretInElement(li);
                } else if (tag === 'pre') {
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
                    code.innerHTML = '<br>';
                    pre.appendChild(code);
                    block.replaceWith(pre);
                    placeCaretInElement(code);
                } else if (tag === 'blockquote') {
                    const bq = document.createElement('blockquote');
                    const p = document.createElement('p');
                    p.innerHTML = '<br>';
                    bq.appendChild(p);
                    block.replaceWith(bq);
                    placeCaretInElement(p);
                } else {
                    const el = document.createElement(tag);
                    el.innerHTML = '<br>';
                    block.replaceWith(el);
                    placeCaretInElement(el);
                }
            }

            function exitBlock(block, parent) {
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                if (parent.tagName === 'BLOCKQUOTE') {
                    parent.after(p);
                    if (parent.children.length === 1 && block.innerText.trim() === '') {
                        parent.remove();
                    } else {
                        block.remove();
                    }
                } else {
                    // List
                    parent.after(p);
                    block.remove();
                    if (parent.children.length === 0) {
                        parent.remove();
                    }
                }
                placeCaretInElement(p);
            }

            function placeCaretInElement(el) {
                const range = document.createRange();
                const sel = window.getSelection();
                range.setStart(el, 0);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }

            function placeCaretAtStart() {
                const p = editor.querySelector('p');
                if (p) placeCaretInElement(p);
            }
        </script>
        """
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var onContentChange: ((String) -> Void)?
        var isEditing = false
        var lastLoadedHTML: String = ""
        weak var webView: WKWebView?
        private let isEditable: Bool

        init(onContentChange: ((String) -> Void)?, isEditable: Bool) {
            self.onContentChange = onContentChange
            self.isEditable = isEditable
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "contentChanged",
                  let dict = message.body as? [String: Any],
                  let type = dict["type"] as? String else { return }

            switch type {
            case "focus":
                isEditing = true
            case "blur":
                isEditing = false
            case "content":
                if let html = dict["html"] as? String {
                    lastLoadedHTML = html
                    onContentChange?(html)
                }
            default:
                break
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
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

#Preview("View Only") {
    HTMLContentView(html: """
        <h1>Heading 1</h1>
        <p>This is a paragraph with <strong>bold</strong>, <em>italic</em>, and <a href="https://example.com">a link</a>.</p>
        <h2>Heading 2</h2>
        <ul>
            <li>First item</li>
            <li>Second item with <code>inline code</code></li>
        </ul>
        <blockquote>This is a blockquote.</blockquote>
    """)
    .frame(width: 600, height: 400)
}

#Preview("Editable") {
    HTMLContentView(
        html: "",
        isEditable: true,
        onContentChange: { print("Content: \($0)") }
    )
    .frame(width: 600, height: 400)
}
