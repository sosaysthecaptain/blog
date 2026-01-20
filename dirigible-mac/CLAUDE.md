# Dirigible Mac App

Native macOS app for Dirigible - a personal notes/moodboards/music system.

## Project Goal

Build a native SwiftUI Mac app that:
1. Does everything the web app does (notes, folders, moodboards, music)
2. Matches the web app's aesthetic (see `/admin/style-guide`)
3. Caches all Firebase data locally (SQLite)
4. Maintains a local folder of markdown files with **bidirectional sync**

## Architecture

```
dirigible-mac/
├── Dirigible.xcodeproj
├── Dirigible/
│   ├── DirigibleApp.swift      # Entry point, app lifecycle
│   ├── Views/
│   │   ├── MainView.swift      # Sidebar + content (NavigationSplitView)
│   │   ├── OnboardingView.swift # First-run: welcome → sync
│   │   ├── LoginView.swift     # Google OAuth via ASWebAuthenticationSession
│   │   └── SettingsView.swift  # Preferences
│   └── Assets.xcassets/
└── CLAUDE.md

shared-swift/                    # Swift Package (shared with future iOS app)
├── Package.swift
└── Sources/DirigibleCore/
    ├── Models.swift            # NoteItem, Song, MoodboardImage, etc.
    ├── LocalCache.swift        # SQLite cache (actor-based)
    ├── FirebaseSync.swift      # Firestore ↔ LocalCache sync
    └── MarkdownSync.swift      # LocalCache ↔ Filesystem sync
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUD                                    │
│  ┌─────────────┐                                                │
│  │  Firestore  │  ← Web app writes here                         │
│  └──────┬──────┘                                                │
└─────────┼───────────────────────────────────────────────────────┘
          │ Real-time listener (FirebaseSync)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MAC APP                                  │
│  ┌─────────────┐         ┌─────────────┐         ┌───────────┐ │
│  │   SQLite    │◄───────►│ MarkdownSync│◄───────►│ ~/dirigible│ │
│  │ LocalCache  │         │             │         │  *.md files│ │
│  └──────┬──────┘         └─────────────┘         └───────────┘ │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │   SwiftUI   │  ← User sees this                             │
│  │    Views    │                                               │
│  └─────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Read path:** SwiftUI → LocalCache (instant)
**Write path:** SwiftUI → Firestore → LocalCache (via listener) → Filesystem

## Data Model

### NoteItem (the core entity)
```swift
struct NoteItem {
    let id: String              // UUID
    var type: NoteType          // .note, .folder, .moodboard, .music
    var title: String
    var parentId: String?       // nil = root level
    var createdAt: Date
    var updatedAt: Date

    // Note-specific
    var content: String?        // Markdown content
    var date: String?           // "2024-01-15"
    var time: String?           // "14:30"
    var tags: [String]?
    var embeddedMedia: [EmbeddedMedia]?

    // Moodboard-specific
    var images: [MoodboardImage]?
    var gridSize: GridSize?     // .small, .medium, .large
    var sortMode: SortMode?     // .chronological, .manual

    // Music-specific
    var musicSortColumn: MusicSortColumn?
    var musicSortDirection: SortDirection?

    // Publishing
    var published: Bool?
    var slug: String?
    var sortOrder: Int?
}
```

### Song
```swift
struct Song {
    let id: String
    var libraryId: String       // References a NoteItem of type .music
    var title, artist, album: String
    var year, trackNumber, discNumber: Int?
    var duration: Double        // seconds
    var storageUrl: String      // Firebase Storage URL
    var albumArtUrl: String?
    // ... etc
}
```

## Current State

### Working
- [x] Google OAuth login (via Firebase REST API + PKCE)
- [x] Auth state persistence (UserDefaults)
- [x] Firestore real-time sync → SQLite cache
- [x] Display top-level items in sidebar
- [x] Basic note editing (title + content)
- [x] Onboarding flow with sync progress

### Broken / Missing
- [ ] **Nested items don't appear** - clicking folders shows nothing
- [ ] **Styling is generic macOS** - needs to match web aesthetic
- [ ] **Markdown folder sync** - exists but has bugs (see below)
- [ ] **Moodboard view** - no implementation
- [ ] **Music library view** - no implementation
- [ ] **Properties modal** - date, time, tags, publish status
- [ ] **Search** - not implemented
- [ ] **Keyboard shortcuts** - partially implemented

## Markdown Sync Requirements

### Sync Rules (AUTHORITATIVE)
1. **Last-write-wins** for conflicts
2. **Directory structure = note hierarchy** (folders in Finder = folders in app)
3. **Deletes are authoritative** - delete locally OR in cloud, it's gone everywhere
4. **Notes only for now** - images/mp3s come later

### Markdown Format
```markdown
---
id: abc123-def456
title: My Note Title
date: 2024-01-15
time: 14:30
tags: [react, typescript]
published: true
slug: my-note-title
created: 2024-01-15T10:30:00Z
updated: 2024-01-20T14:45:00Z
---

# My Note Title

The actual content goes here...
```

### Current Bugs in MarkdownSync.swift
1. **`determineParentId()` returns nil** - doesn't map folder paths to note IDs
2. **File watcher only watches root** - misses changes in subdirectories
3. **`buildTree()` has struct mutation bug** - modifies copy not original
4. **No recursive directory watching** - need FSEvents or polling

### Required Fixes
1. **Folder ID mapping**: Store folder metadata:
   - Option A: `.dirigible.json` in each folder with `{"id": "folder-uuid"}`
   - Option B: Single `~/dirigible/.index.json` with full path→ID map
   - **Recommendation**: Option A (self-contained, survives moves)

2. **Bidirectional path resolution**:
   ```swift
   // Firestore → Filesystem
   func pathForNote(_ note: NoteItem) -> URL  // Build path from parent chain

   // Filesystem → Firestore
   func noteIdForPath(_ url: URL) -> String?  // Read .dirigible.json from parent
   ```

3. **Recursive file watching**: Use FSEvents API or DispatchSource per directory

4. **Conflict detection**: Compare `updatedAt` timestamps before writing

## Style Guide Summary

The web app has a detailed style guide at `/admin/style-guide`. Key points:

### Design Principles
- **Dense, compact layouts** - no wasted space
- **Sharp corners** - avoid rounded corners on modals/panels
- **Monochrome buttons** - black/white with invert on press
- **1px borders** - use `--border` color
- **No shadows** - flat design, borders for separation

### Colors (Light Mode)
```
--background:   #FFFFFF
--foreground:   #171717  (primary text)
--muted:        #737373  (secondary text, icons)
--border:       #E5E5E5
--hover:        #F5F5F5
--sidebar-bg:   #FAFAFA
--accent:       #2563EB  (links, focus)
--accent-muted: #3B82F6  (selected items)
```

### Colors (Dark Mode)
```
--background:   #0A0A0A
--foreground:   #EDEDED
--muted:        #A3A3A3
--border:       #262626
--hover:        #171717
--sidebar-bg:   #0F0F0F
--accent:       #3B82F6
--accent-muted: #2563EB
```

### SwiftUI Color Mapping
```swift
// In SwiftUI, use these NSColor mappings:
Color(nsColor: .windowBackgroundColor)  // --background
Color(nsColor: .labelColor)             // --foreground
Color(nsColor: .secondaryLabelColor)    // --muted
Color(nsColor: .separatorColor)         // --border
Color(nsColor: .controlBackgroundColor) // --sidebar-bg
```

### Typography
- **Page titles**: Serif, bold, 24pt
- **Section headers**: Sans, semibold, 18pt
- **Body (content)**: Serif, regular, 14pt
- **Body (UI)**: Sans, regular, 13pt
- **Labels/captions**: Sans, muted, 11-12pt

### Button Styles (from style guide)
```swift
struct DirigiblePrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .medium))
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(configuration.isPressed ? Color(nsColor: .labelColor) : Color(nsColor: .windowBackgroundColor))
            .foregroundColor(configuration.isPressed ? Color(nsColor: .windowBackgroundColor) : Color(nsColor: .labelColor))
            .overlay(Rectangle().stroke(Color(nsColor: .labelColor), lineWidth: 1))
    }
}

struct DirigibleSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .medium))
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(configuration.isPressed ? Color(nsColor: .secondaryLabelColor) : Color.clear)
            .foregroundColor(configuration.isPressed ? Color(nsColor: .windowBackgroundColor) : Color(nsColor: .secondaryLabelColor))
            .overlay(Rectangle().stroke(Color(nsColor: .separatorColor), lineWidth: 1))
    }
}
```

### Sidebar Item Style
```swift
// Unselected: icon muted, text primary, bg transparent
// Hover: bg --hover
// Selected: bg --accent-muted (#3B82F6), text white
```

### Icons
- Use SF Symbols
- Standard sizes: 12pt (chevrons), 14pt (small UI), 16pt (sidebar), 20pt (buttons)
- Match Heroicons outline style from web

## Implementation Roadmap

### Phase 1: Fix Core Functionality
1. **Fix nested items** - `getChildren(of:)` needs to work, sidebar needs tree view
2. **Apply styling** - Button styles, colors, typography
3. **Fix markdown sync** - Folder ID mapping, recursive watching

### Phase 2: Feature Parity
4. **Properties modal** - date, time, tags, publish status
5. **Moodboard view** - grid of images with justified layout
6. **Music library view** - table with columns, playback
7. **Search** - search bar in sidebar

### Phase 3: Polish
8. **Keyboard shortcuts** - Cmd+N, Cmd+Shift+N, Cmd+F, etc.
9. **Context menus** - right-click on sidebar items
10. **Drag & drop** - reorder items, move between folders
11. **Media download** - on-demand caching for images/audio

## Web App Reference

The web app lives in the same repo. Key files to reference:

```
src/components/notes/
├── Sidebar.tsx          # Folder tree with drag/drop
├── FolderTree.tsx       # Recursive tree component
├── NoteEditor.tsx       # TipTap-based markdown editor
├── TiptapEditor.tsx     # Rich text editing
├── PropertiesModal.tsx  # Date/time/tags/publish modal
├── MoodboardEditor.tsx  # Image grid view
├── MusicLibraryEditor.tsx # Song table + player
├── TagInput.tsx         # Tag autocomplete
└── SearchBar.tsx        # Global search

src/app/admin/(tabs)/style-guide/page.tsx  # Full style reference
```

## Firebase Configuration

The app needs `GoogleService-Info.plist` in the `Dirigible/` folder. Download from Firebase Console.

Current project uses:
- **iOS OAuth Client ID**: `341793197828-gii5rq2g1vf6kjr2fdthstivvol3kjic.apps.googleusercontent.com`
- Uses PKCE flow (no client secret needed)
- Redirect scheme: `com.googleusercontent.apps.341793197828-gii5rq2g1vf6kjr2fdthstivvol3kjic`

## Known Issues

1. **Firebase SDK keychain issues on macOS** - worked around by using REST API
2. **Firestore security rules** - notes collection is public read, authenticated write
3. **Signed URLs for images** - Firebase Storage URLs expire, need cloud function to generate signed URLs

## Commands

```bash
# Open in Xcode
open dirigible-mac/Dirigible.xcodeproj

# Build from command line
xcodebuild -project dirigible-mac/Dirigible.xcodeproj -scheme Dirigible build

# Run the web app (for reference)
npm run dev
```

---

## Sprint Log

### Sprint 1: Core Functionality (Current)
**Goal:** Make the app actually work - see nested items, basic usability

- [x] **1.1 Recursive folder tree in sidebar**
  - Used DisclosureGroup with recursive TreeItemView
  - Expansion state tracked in viewModel.expandedFolders
  - Files: `MainView.swift`

- [x] **1.2 Fix detail view for different types**
  - DetailView switches on item.type
  - Added: NoteDetailView, FolderDetailView, MoodboardDetailView (placeholder), MusicLibraryDetailView (placeholder)

- [x] **1.3 Create/delete operations**
  - Context menu on all items (New Note, New Folder, Delete)
  - Toolbar creates inside selected folder or at root
  - Delete recursively removes children

**Status:** Code complete - NEEDS TESTING

---

### Sprint 2: Styling (Current)
**Goal:** Match the web app aesthetic

- [x] **2.1 Design tokens** - Created `DirigibleStyle.swift` with:
  - Colors (background, foreground, muted, border, hover, accent, etc.)
  - Typography (title, heading, body, bodySerif, caption)
  - Spacing scale (xs through xxl)
  - Icon sizes

- [x] **2.2 Button styles** - Primary, secondary, danger, ghost
  - All use sharp corners (Rectangle stroke)
  - Invert colors on press

- [x] **2.3 Sidebar styling** - Applied DirigibleStyle to ItemRowView
  - Selection turns icons/text white

- [x] **2.4 Editor styling** - NoteDetailView uses:
  - DirigibleStyle.Typography.title for note title
  - DirigibleStyle.Typography.bodySerif for content
  - DirigibleStyle.Spacing for padding

- [x] **2.5 Onboarding styling** - Applied tokens to OnboardingView

**Status:** Code complete - NEEDS TESTING

---

### Sprint 3: Markdown Sync
**Goal:** Flawless bidirectional sync with local folder

- [ ] **3.1 Folder ID mapping** - `.dirigible.json` per folder
- [ ] **3.2 Recursive file watching** - FSEvents or per-directory watchers
- [ ] **3.3 Conflict resolution** - Compare timestamps, last-write-wins
- [ ] **3.4 Delete propagation** - Sync deletes both directions
- [ ] **3.5 Initial sync** - Full export on first run

**Status:** Not started

---

### Sprint 4: Look & Feel Fixes (Complete)
**Goal:** Match the web app's visual appearance

- [x] **4.1 Fix sidebar icons** - Outline SF Symbols + custom MoodboardIcon
- [x] **4.2 Fix folder view** - Table with Title/Date/Tags columns, hover states
- [x] **4.3 HTML rendering** - WKWebView with TipTap-matching CSS
  - HTMLContentView.swift renders HTML content
  - Supports headings, lists, code blocks, blockquotes, tables, images
  - Light/dark mode aware
- [x] **4.4 Fix note creation** - effectiveParentId creates in correct folder

**Status:** Complete

---

### Sprint 5: UX Improvements (Complete)
**Goal:** Match web app's editing experience and add user controls

- [x] **5.1 Add user menu to sidebar** - At bottom of sidebar
  - Shows user email
  - Settings link
  - Sign out option with confirmation dialog
- [x] **5.2 Note title in header** - Title and metadata at top, content below

**Status:** Complete

---

### Sprint 6: Inline Editing & Dark Mode (Complete)
**Goal:** WYSIWYG editing and appearance settings

- [x] **6.1 WYSIWYG editing with contentEditable**
  - HTMLContentView now supports `isEditable: true`
  - Uses contentEditable HTML with JavaScript message passing
  - Debounced content changes sent back to SwiftUI
  - Keyboard shortcuts: Cmd+B (bold), Cmd+I (italic), Cmd+U (underline)
  - Paste handling preserves HTML formatting
  - Focus/blur tracking prevents unwanted reloads during editing
- [x] **6.2 Dark mode toggle**
  - AppSettings manager with `@AppStorage` persistence
  - Applies appearance to all windows via `NSApp.appearance`
  - Toggle in user menu (sun/moon icon)
  - Full theme picker in Settings > General
- [x] **6.3 NoteDetailView uses editable HTML**
  - Content changes auto-save to Firebase
  - Title editable in header

**Status:** Complete

---

### Completed
_(Items move here when done)_
