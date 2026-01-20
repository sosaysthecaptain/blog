# Dirigible Mac App

Native macOS app for Dirigible notes, built with SwiftUI.

## Setup

### 1. Firebase Configuration

Download `GoogleService-Info.plist` from Firebase Console and add it to the `Dirigible/` folder:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings > General
4. Under "Your apps", find or add macOS app
5. Download `GoogleService-Info.plist`
6. Add it to `dirigible-mac/Dirigible/`

### 2. Open in Xcode

```bash
open Dirigible.xcodeproj
```

### 3. Resolve Packages

Xcode should automatically resolve the `DirigibleCore` package from `../shared-swift`. If not:

1. File > Packages > Resolve Package Versions

### 4. Build & Run

Press ⌘R or click the Run button.

## Architecture

```
dirigible-mac/
├── Dirigible.xcodeproj    # Xcode project
├── Dirigible/
│   ├── DirigibleApp.swift # App entry point
│   ├── Views/
│   │   ├── MainView.swift       # Sidebar + content
│   │   ├── OnboardingView.swift # First-run setup
│   │   ├── LoginView.swift      # Firebase auth
│   │   └── SettingsView.swift   # Preferences
│   └── Assets.xcassets/
└── README.md

../shared-swift/           # Shared Swift package
├── Package.swift
└── Sources/DirigibleCore/
    ├── Models.swift       # NoteItem, Song, etc.
    ├── LocalCache.swift   # SQLite cache
    ├── FirebaseSync.swift # Firestore sync
    └── MarkdownSync.swift # Bidirectional file sync
```

## Features

- **Onboarding**: Choose notes folder location and media sync preference
- **Firebase Auth**: Sign in with your Dirigible account
- **Real-time Sync**: Firestore → SQLite cache for instant reads
- **Markdown Files**: Bidirectional sync with local markdown folder
- **Native macOS**: SwiftUI with proper keyboard shortcuts, menus, etc.

## Keyboard Shortcuts

- ⌘N: New note
- ⇧⌘N: New folder
- ⌥⌘S: Sync now
- ⌘,: Preferences
