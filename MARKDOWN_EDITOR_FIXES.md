# Markdown Editor Fixes

Tracking document at: `/Users/marcauger/Documents/blog/MARKDOWN_EDITOR_FIXES.md`

## Menu
- [x] Word wrap toggle - WORKING
- [x] Font selector - WORKING (title + content, Crimson Pro for serif)
- [x] Menu width - WORKING (220px)
- [x] Markdown syntax toggle - WORKING

## Markdown Syntax Hiding (when toggle is OFF)
- [x] Headers - `#` hidden
- [x] Bold - `**` hidden
- [x] Inline code - backticks hidden
- [x] Italic - `*` hidden (skip positions used by bold)
- [ ] Code blocks - DEFERRED (reverted to plain text, skip inline formatting inside)

## Images
- [x] Resize handles - improved visibility (corner triangle grip)
- [x] Captions - improved styling, hover/focus states
- [x] Upload placeholder - better centered styling
- [ ] Carousel/lightbox - needs testing

## Lists
- [x] Checkbox alignment - fixed with `top: 2px`
- [x] Unwanted checkmark - fixed with `-webkit-appearance: none`
- [x] Inline formatting (bold/italic) now works in list items
- [x] List spacing - working
- [x] Hierarchical/nested lists - fixed (2 spaces per level, 20px margin per level)

## Text Formatting
- [ ] Bold text renders as italic (might be related to asterisks showing)

## Slash Menu
- [ ] Notion-style slash command menu (type / to open)

## Other
- Font: Crimson Pro via `var(--font-serif)`
- Font: JetBrains Mono via `var(--font-mono)`

---

## Progress Log

### Session: 2026-01-22

**Attempt 1:** Used CodeMirror theme system - FAILED

**Attempt 2:** Apply styles directly to DOM - Word wrap & fonts WORKING

**Attempt 3:** Header `#` hiding - WORKING

**Attempt 4:** Bold/Italic/Code hiding - Fixed RangeSetBuilder ordering issue (decorations must be added in document order). Added code block (```) handling to hide opening/closing fence lines.

**Attempt 5:** Fixed italic (track bold positions, skip those when finding italic). Fixed code blocks (two-pass: find complete pairs first, only hide/skip when properly closed).

**Current:** Syntax hiding working for headers, bold, italic, inline code, code blocks
