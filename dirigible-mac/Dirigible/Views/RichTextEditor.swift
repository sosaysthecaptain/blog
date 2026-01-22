import SwiftUI
import AppKit

/// Rich text editor with markdown shortcuts that outputs HTML
/// Handles conversion between markdown-style input and HTML storage
struct RichTextEditor: NSViewRepresentable {
    @Binding var html: String
    var onContentChange: ((String) -> Void)?

    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSTextView.scrollableTextView()
        let textView = scrollView.documentView as! NSTextView

        textView.delegate = context.coordinator
        textView.isRichText = true
        textView.allowsUndo = true
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false
        textView.isAutomaticTextReplacementEnabled = false
        textView.usesAdaptiveColorMappingForDarkAppearance = true

        // Styling
        textView.backgroundColor = .clear
        textView.drawsBackground = false
        textView.textContainerInset = NSSize(width: 0, height: 8)
        textView.textContainer?.lineFragmentPadding = 0

        // Default font
        textView.typingAttributes = [
            .font: NSFont(name: "Georgia", size: 14) ?? NSFont.systemFont(ofSize: 14),
            .foregroundColor: NSColor.labelColor
        ]

        context.coordinator.textView = textView

        // Load initial HTML content
        if !html.isEmpty {
            context.coordinator.loadHTML(html)
        }

        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        guard !context.coordinator.isEditing else { return }

        let textView = scrollView.documentView as! NSTextView
        if context.coordinator.lastLoadedHTML != html {
            context.coordinator.loadHTML(html)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(html: $html, onContentChange: onContentChange)
    }

    class Coordinator: NSObject, NSTextViewDelegate {
        @Binding var html: String
        var onContentChange: ((String) -> Void)?
        weak var textView: NSTextView?
        var isEditing = false
        var lastLoadedHTML = ""

        // Fonts
        let bodyFont = NSFont(name: "Georgia", size: 14) ?? NSFont.systemFont(ofSize: 14)
        let h1Font = NSFont(name: "Georgia-Bold", size: 28) ?? NSFont.boldSystemFont(ofSize: 28)
        let h2Font = NSFont(name: "Georgia-Bold", size: 22) ?? NSFont.boldSystemFont(ofSize: 22)
        let h3Font = NSFont(name: "Georgia-Bold", size: 18) ?? NSFont.boldSystemFont(ofSize: 18)
        let codeFont = NSFont(name: "SF Mono", size: 13) ?? NSFont.monospacedSystemFont(ofSize: 13, weight: .regular)

        init(html: Binding<String>, onContentChange: ((String) -> Void)?) {
            _html = html
            self.onContentChange = onContentChange
        }

        func loadHTML(_ htmlString: String) {
            guard let textView = textView else { return }
            lastLoadedHTML = htmlString

            if htmlString.isEmpty {
                textView.string = ""
                return
            }

            // Convert HTML to attributed string
            if let data = htmlString.data(using: .utf8),
               let attrString = try? NSAttributedString(
                   data: data,
                   options: [
                       .documentType: NSAttributedString.DocumentType.html,
                       .characterEncoding: String.Encoding.utf8.rawValue
                   ],
                   documentAttributes: nil
               ) {
                // Apply our custom styling
                let mutableAttr = NSMutableAttributedString(attributedString: attrString)
                applyCustomStyling(to: mutableAttr)
                textView.textStorage?.setAttributedString(mutableAttr)
            } else {
                // Fallback: just show as plain text
                textView.string = htmlString.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
            }
        }

        private func applyCustomStyling(to attrString: NSMutableAttributedString) {
            let fullRange = NSRange(location: 0, length: attrString.length)

            // Set default font for body text
            attrString.addAttribute(.font, value: bodyFont, range: fullRange)
            attrString.addAttribute(.foregroundColor, value: NSColor.labelColor, range: fullRange)

            // Detect headers by font size (HTML parsing sets larger fonts for headers)
            attrString.enumerateAttribute(.font, in: fullRange, options: []) { value, range, _ in
                if let font = value as? NSFont {
                    let size = font.pointSize
                    if size >= 24 {
                        attrString.addAttribute(.font, value: h1Font, range: range)
                    } else if size >= 18 && size < 24 {
                        attrString.addAttribute(.font, value: h2Font, range: range)
                    } else if size >= 14 && size < 18 && font.fontDescriptor.symbolicTraits.contains(.bold) {
                        attrString.addAttribute(.font, value: h3Font, range: range)
                    }
                }
            }
        }

        func textDidBeginEditing(_ notification: Notification) {
            isEditing = true
        }

        func textDidEndEditing(_ notification: Notification) {
            isEditing = false
            saveContent()
        }

        func textDidChange(_ notification: Notification) {
            scheduleContentSave()
        }

        private var saveTimer: Timer?

        private func scheduleContentSave() {
            saveTimer?.invalidate()
            saveTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: false) { [weak self] _ in
                self?.saveContent()
            }
        }

        private func saveContent() {
            guard let textView = textView else { return }

            // Convert attributed string back to HTML
            let attrString = textView.attributedString()
            if let htmlData = try? attrString.data(
                from: NSRange(location: 0, length: attrString.length),
                documentAttributes: [
                    .documentType: NSAttributedString.DocumentType.html,
                    .characterEncoding: String.Encoding.utf8.rawValue
                ]
            ),
               var htmlString = String(data: htmlData, encoding: .utf8) {
                // Clean up the HTML
                htmlString = cleanupHTML(htmlString)
                lastLoadedHTML = htmlString
                html = htmlString
                onContentChange?(htmlString)
            }
        }

        private func cleanupHTML(_ html: String) -> String {
            var result = html

            // Remove the full HTML document wrapper that NSAttributedString generates
            if let bodyStart = result.range(of: "<body>"),
               let bodyEnd = result.range(of: "</body>") {
                result = String(result[bodyStart.upperBound..<bodyEnd.lowerBound])
            }

            // Remove excessive whitespace and line breaks
            result = result.trimmingCharacters(in: .whitespacesAndNewlines)

            return result
        }

        // Track if current line is a heading (to reset on Enter)
        private var isInHeading = false

        // MARK: - Markdown Shortcuts

        func textView(_ textView: NSTextView, shouldChangeTextIn affectedCharRange: NSRange, replacementString: String?) -> Bool {
            guard let replacement = replacementString else { return true }

            let text = textView.string as NSString
            let lineRange = text.lineRange(for: NSRange(location: affectedCharRange.location, length: 0))
            let lineText = text.substring(with: lineRange).trimmingCharacters(in: .newlines)
            let cursorInLine = affectedCharRange.location - lineRange.location

            // Handle Enter key
            if replacement == "\n" {
                // If we're in a heading, reset to body style after pressing Enter
                if isInHeading {
                    print("[RichTextEditor] Exiting heading, resetting to body style")
                    isInHeading = false
                    // Insert newline with body attributes
                    let bodyAttrs: [NSAttributedString.Key: Any] = [
                        .font: bodyFont,
                        .foregroundColor: NSColor.labelColor
                    ]
                    let newline = NSAttributedString(string: "\n", attributes: bodyAttrs)
                    textView.insertText(newline, replacementRange: affectedCharRange)
                    textView.typingAttributes = bodyAttrs
                    return false
                }

                // Horizontal rule: ---
                if lineText == "---" {
                    print("[RichTextEditor] -> hr")
                    insertHorizontalRule(textView, lineRange: lineRange)
                    return false
                }

                // Code block: ```
                if lineText == "```" {
                    print("[RichTextEditor] -> code block")
                    insertCodeBlock(textView, lineRange: lineRange)
                    return false
                }

                // Exit empty bullet list
                if lineText == "• " {
                    print("[RichTextEditor] Exiting bullet list")
                    clearLine(textView, lineRange: lineRange)
                    return false
                }

                // Continue bullet list
                if lineText.hasPrefix("• ") && lineText.count > 2 {
                    print("[RichTextEditor] Continuing bullet list")
                    continueList(textView, prefix: "• ")
                    return false
                }

                // Handle numbered lists: check if line matches "N. " pattern
                if let match = lineText.range(of: #"^(\d+)\. (.*)$"#, options: .regularExpression) {
                    // Extract the number
                    if let dotIndex = lineText.firstIndex(of: ".") {
                        let numStr = String(lineText[lineText.startIndex..<dotIndex])
                        let afterPrefix = lineText[lineText.index(dotIndex, offsetBy: 2)...]

                        if afterPrefix.isEmpty {
                            // Empty numbered list item - exit list
                            print("[RichTextEditor] Exiting numbered list")
                            clearLine(textView, lineRange: lineRange)
                            return false
                        } else if let num = Int(numStr) {
                            // Continue numbered list
                            print("[RichTextEditor] Continuing numbered list")
                            continueList(textView, prefix: "\(num + 1). ")
                            return false
                        }
                    }
                }
            }

            // Handle Space key
            if replacement == " " {
                print("[RichTextEditor] Processing space at cursor \(cursorInLine) in line '\(lineText)'")

                // Header shortcuts
                if lineText == "###" && cursorInLine == 3 {
                    print("[RichTextEditor] -> H3")
                    convertToHeading(textView, lineRange: lineRange, level: 3)
                    return false
                }
                if lineText == "##" && cursorInLine == 2 {
                    print("[RichTextEditor] -> H2")
                    convertToHeading(textView, lineRange: lineRange, level: 2)
                    return false
                }
                if lineText == "#" && cursorInLine == 1 {
                    print("[RichTextEditor] -> H1")
                    convertToHeading(textView, lineRange: lineRange, level: 1)
                    return false
                }

                // List shortcuts
                if (lineText == "-" || lineText == "*") && cursorInLine == 1 {
                    print("[RichTextEditor] -> bullet list")
                    convertToListItem(textView, lineRange: lineRange, prefix: "• ")
                    return false
                }
                if lineText == "1." && cursorInLine == 2 {
                    print("[RichTextEditor] -> numbered list")
                    convertToListItem(textView, lineRange: lineRange, prefix: "1. ")
                    return false
                }

                // Blockquote
                if lineText == ">" && cursorInLine == 1 {
                    print("[RichTextEditor] -> blockquote")
                    convertToBlockquote(textView, lineRange: lineRange)
                    return false
                }
            }

            // Handle backtick for inline code
            if replacement == "`" {
                // Check if we're closing an inline code span
                let beforeCursor = text.substring(to: affectedCharRange.location)
                if let lastBacktick = beforeCursor.lastIndex(of: "`") {
                    let codeContent = String(beforeCursor[beforeCursor.index(after: lastBacktick)...])
                    // Only convert if there's content between backticks and no newline
                    if !codeContent.isEmpty && !codeContent.contains("\n") {
                        print("[RichTextEditor] -> inline code: '\(codeContent)'")
                        convertToInlineCode(textView, from: beforeCursor.distance(from: beforeCursor.startIndex, to: lastBacktick), content: codeContent)
                        return false
                    }
                }
            }

            return true
        }

        private func convertToHeading(_ textView: NSTextView, lineRange: NSRange, level: Int) {
            let font: NSFont
            switch level {
            case 1: font = h1Font
            case 2: font = h2Font
            default: font = h3Font
            }

            // Replace the markdown prefix with empty string and apply heading style
            let storage = textView.textStorage!
            storage.replaceCharacters(in: lineRange, with: "")

            // Apply heading attributes to the now-empty line
            let attrs: [NSAttributedString.Key: Any] = [
                .font: font,
                .foregroundColor: NSColor.labelColor
            ]
            textView.typingAttributes = attrs
            textView.setSelectedRange(NSRange(location: lineRange.location, length: 0))

            // Track that we're in a heading so we can reset on Enter
            isInHeading = true
        }

        private func convertToListItem(_ textView: NSTextView, lineRange: NSRange, prefix: String) {
            let storage = textView.textStorage!
            let attrs: [NSAttributedString.Key: Any] = [
                .font: bodyFont,
                .foregroundColor: NSColor.labelColor
            ]
            let prefixAttr = NSAttributedString(string: prefix, attributes: attrs)

            storage.replaceCharacters(in: lineRange, with: prefixAttr)
            textView.setSelectedRange(NSRange(location: lineRange.location + prefix.count, length: 0))
        }

        private func convertToBlockquote(_ textView: NSTextView, lineRange: NSRange) {
            let storage = textView.textStorage!
            let attrs: [NSAttributedString.Key: Any] = [
                .font: NSFont(name: "Georgia-Italic", size: 14) ?? bodyFont,
                .foregroundColor: NSColor.secondaryLabelColor
            ]
            let prefix = NSAttributedString(string: "", attributes: attrs)

            storage.replaceCharacters(in: lineRange, with: prefix)
            textView.typingAttributes = attrs
            textView.setSelectedRange(NSRange(location: lineRange.location, length: 0))
        }

        private func insertHorizontalRule(_ textView: NSTextView, lineRange: NSRange) {
            let storage = textView.textStorage!
            let hrString = NSAttributedString(string: "———\n", attributes: [
                .font: bodyFont,
                .foregroundColor: NSColor.separatorColor
            ])

            storage.replaceCharacters(in: lineRange, with: hrString)
            textView.typingAttributes = [.font: bodyFont, .foregroundColor: NSColor.labelColor]
            textView.setSelectedRange(NSRange(location: lineRange.location + 4, length: 0))
        }

        private func continueList(_ textView: NSTextView, prefix: String) {
            let attrs: [NSAttributedString.Key: Any] = [
                .font: bodyFont,
                .foregroundColor: NSColor.labelColor
            ]
            let continuation = NSAttributedString(string: "\n" + prefix, attributes: attrs)

            textView.insertText(continuation, replacementRange: textView.selectedRange())
        }

        private func clearLine(_ textView: NSTextView, lineRange: NSRange) {
            let storage = textView.textStorage!
            storage.replaceCharacters(in: lineRange, with: "")
            textView.typingAttributes = [.font: bodyFont, .foregroundColor: NSColor.labelColor]
            textView.setSelectedRange(NSRange(location: lineRange.location, length: 0))
        }

        private func insertCodeBlock(_ textView: NSTextView, lineRange: NSRange) {
            let storage = textView.textStorage!

            // Create code block with monospace font and background color
            let codeAttrs: [NSAttributedString.Key: Any] = [
                .font: codeFont,
                .foregroundColor: NSColor.labelColor,
                .backgroundColor: NSColor.quaternaryLabelColor
            ]

            // Replace ``` with empty code block placeholder
            let codeBlock = NSAttributedString(string: "\n", attributes: codeAttrs)
            storage.replaceCharacters(in: lineRange, with: codeBlock)
            textView.typingAttributes = codeAttrs
            textView.setSelectedRange(NSRange(location: lineRange.location, length: 0))
        }

        private func convertToInlineCode(_ textView: NSTextView, from startOffset: Int, content: String) {
            let storage = textView.textStorage!

            // Range from opening backtick to current cursor (where closing backtick would be)
            let codeRange = NSRange(location: startOffset, length: content.count + 1)

            // Create inline code with monospace font and subtle background
            let codeAttrs: [NSAttributedString.Key: Any] = [
                .font: codeFont,
                .foregroundColor: NSColor.labelColor,
                .backgroundColor: NSColor.quaternaryLabelColor
            ]

            let codeString = NSAttributedString(string: content, attributes: codeAttrs)

            // Replace the `content with styled content (no backticks)
            storage.replaceCharacters(in: codeRange, with: codeString)

            // Reset to body attributes after the code
            textView.typingAttributes = [.font: bodyFont, .foregroundColor: NSColor.labelColor]
            textView.setSelectedRange(NSRange(location: startOffset + content.count, length: 0))
        }
    }
}

#Preview {
    RichTextEditor(html: .constant("<h1>Hello</h1><p>This is a test</p>"))
        .frame(width: 500, height: 400)
}
