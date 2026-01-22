import SwiftUI
import AppKit

/// Native macOS text editor with TipTap-like markdown shortcuts
struct MarkdownTextView: NSViewRepresentable {
    @Binding var text: String
    var onContentChange: ((String) -> Void)?

    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSTextView.scrollableTextView()
        let textView = scrollView.documentView as! NSTextView

        textView.delegate = context.coordinator
        textView.isRichText = false
        textView.font = NSFont(name: "Georgia", size: 14)
        textView.textColor = NSColor.labelColor
        textView.backgroundColor = .clear
        textView.drawsBackground = false
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false
        textView.isAutomaticTextReplacementEnabled = false
        textView.allowsUndo = true

        // Remove default padding
        textView.textContainerInset = NSSize(width: 0, height: 8)
        textView.textContainer?.lineFragmentPadding = 0

        context.coordinator.textView = textView
        textView.string = text

        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        let textView = scrollView.documentView as! NSTextView
        if textView.string != text && !context.coordinator.isEditing {
            textView.string = text
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(text: $text, onContentChange: onContentChange)
    }

    class Coordinator: NSObject, NSTextViewDelegate {
        @Binding var text: String
        var onContentChange: ((String) -> Void)?
        weak var textView: NSTextView?
        var isEditing = false

        init(text: Binding<String>, onContentChange: ((String) -> Void)?) {
            _text = text
            self.onContentChange = onContentChange
        }

        func textDidBeginEditing(_ notification: Notification) {
            isEditing = true
        }

        func textDidEndEditing(_ notification: Notification) {
            isEditing = false
        }

        func textDidChange(_ notification: Notification) {
            guard let textView = textView else { return }
            text = textView.string
            onContentChange?(textView.string)
        }

        func textView(_ textView: NSTextView, shouldChangeTextIn affectedCharRange: NSRange, replacementString: String?) -> Bool {
            guard let replacement = replacementString else { return true }

            // Check for markdown shortcuts when typing space or enter
            if replacement == " " || replacement == "\n" {
                let currentText = textView.string as NSString
                let lineRange = currentText.lineRange(for: NSRange(location: affectedCharRange.location, length: 0))
                let lineText = currentText.substring(with: lineRange).trimmingCharacters(in: .newlines)

                // Only process if we're at the end of the line
                let cursorInLine = affectedCharRange.location - lineRange.location

                if replacement == " " {
                    // Header shortcuts
                    if lineText == "###" && cursorInLine == 3 {
                        replaceLineWithHeader(textView, lineRange: lineRange, level: 3)
                        return false
                    }
                    if lineText == "##" && cursorInLine == 2 {
                        replaceLineWithHeader(textView, lineRange: lineRange, level: 2)
                        return false
                    }
                    if lineText == "#" && cursorInLine == 1 {
                        replaceLineWithHeader(textView, lineRange: lineRange, level: 1)
                        return false
                    }
                    // List shortcuts
                    if lineText == "-" && cursorInLine == 1 {
                        replaceLineWithPrefix(textView, lineRange: lineRange, prefix: "• ")
                        return false
                    }
                    if lineText == "*" && cursorInLine == 1 {
                        replaceLineWithPrefix(textView, lineRange: lineRange, prefix: "• ")
                        return false
                    }
                    if lineText == "1." && cursorInLine == 2 {
                        replaceLineWithPrefix(textView, lineRange: lineRange, prefix: "1. ")
                        return false
                    }
                    // Blockquote
                    if lineText == ">" && cursorInLine == 1 {
                        replaceLineWithPrefix(textView, lineRange: lineRange, prefix: "> ")
                        return false
                    }
                }

                if replacement == "\n" {
                    // Horizontal rule
                    if lineText == "---" {
                        replaceLineWithHR(textView, lineRange: lineRange)
                        return false
                    }
                    // Code block
                    if lineText == "```" {
                        replaceLineWithCodeBlock(textView, lineRange: lineRange)
                        return false
                    }
                    // Continue list on enter
                    if lineText.hasPrefix("• ") && lineText != "• " {
                        insertListContinuation(textView, prefix: "• ")
                        return false
                    }
                    if let match = lineText.range(of: #"^(\d+)\. "#, options: .regularExpression),
                       lineText != String(lineText[match]) {
                        let numStr = lineText[lineText.startIndex..<lineText.index(lineText.startIndex, offsetBy: lineText.distance(from: lineText.startIndex, to: match.upperBound) - 2)]
                        if let num = Int(numStr) {
                            insertListContinuation(textView, prefix: "\(num + 1). ")
                            return false
                        }
                    }
                    // Exit empty list item
                    if lineText == "• " || lineText.range(of: #"^\d+\. $"#, options: .regularExpression) != nil {
                        removeLinePrefix(textView, lineRange: lineRange)
                        return false
                    }
                }
            }

            return true
        }

        private func replaceLineWithHeader(_ textView: NSTextView, lineRange: NSRange, level: Int) {
            let prefix = String(repeating: "#", count: level) + " "
            textView.replaceCharacters(in: lineRange, with: prefix)
            textView.setSelectedRange(NSRange(location: lineRange.location + prefix.count, length: 0))
            textDidChange(Notification(name: NSText.didChangeNotification))
        }

        private func replaceLineWithPrefix(_ textView: NSTextView, lineRange: NSRange, prefix: String) {
            textView.replaceCharacters(in: lineRange, with: prefix)
            textView.setSelectedRange(NSRange(location: lineRange.location + prefix.count, length: 0))
            textDidChange(Notification(name: NSText.didChangeNotification))
        }

        private func replaceLineWithHR(_ textView: NSTextView, lineRange: NSRange) {
            textView.replaceCharacters(in: lineRange, with: "———\n")
            textView.setSelectedRange(NSRange(location: lineRange.location + 4, length: 0))
            textDidChange(Notification(name: NSText.didChangeNotification))
        }

        private func replaceLineWithCodeBlock(_ textView: NSTextView, lineRange: NSRange) {
            textView.replaceCharacters(in: lineRange, with: "```\n\n```\n")
            textView.setSelectedRange(NSRange(location: lineRange.location + 4, length: 0))
            textDidChange(Notification(name: NSText.didChangeNotification))
        }

        private func insertListContinuation(_ textView: NSTextView, prefix: String) {
            textView.insertText("\n" + prefix, replacementRange: textView.selectedRange())
            textDidChange(Notification(name: NSText.didChangeNotification))
        }

        private func removeLinePrefix(_ textView: NSTextView, lineRange: NSRange) {
            // Remove the prefix and don't add newline
            let newRange = NSRange(location: lineRange.location, length: lineRange.length)
            textView.replaceCharacters(in: newRange, with: "")
            textDidChange(Notification(name: NSText.didChangeNotification))
        }
    }
}

#Preview {
    MarkdownTextView(text: .constant("# Hello\n\nThis is a test"))
        .frame(width: 400, height: 300)
}
