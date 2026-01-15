# Moodboard Feature Implementation Plan

## Overview

Moodboards are a new item type in the notes system for storing and viewing design inspiration. They display as Pinterest-style masonry grids of images, with carousel view for focused browsing.

---

## Architecture

### Data Model

Moodboards extend the existing `NoteItem` type:

```typescript
interface NoteItem {
  id?: string;
  type: "note" | "folder" | "moodboard";  // Add "moodboard"
  title: string;
  parentId: string | null;

  // For notes
  content?: string;

  // For moodboards
  images?: MoodboardImage[];
  gridSize?: "small" | "medium" | "large";  // User preference

  // Shared metadata
  date?: string;
  time?: string;
  tags?: string[];
  published?: boolean;
  slug?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface MoodboardImage {
  id: string;           // Unique ID within moodboard
  url: string;          // Original image URL
  thumbnailUrl: string; // Generated thumbnail URL
  caption?: string;
  source?: string;      // Attribution/reference URL
  width: number;        // Original dimensions (for masonry layout)
  height: number;
  order: number;        // For manual ordering
  createdAt: Timestamp;
}
```

### Storage Structure

```
Firebase Storage:
notes/
  {noteId}/
    images/
      {imageId}/
        original.{ext}    # Full resolution
        thumbnail.webp    # 400px wide, WebP format
```

### Firebase Function

A Cloud Function triggered on image upload:

```
Trigger: storage.object().onFinalize()
Path: notes/{noteId}/images/{imageId}/original.*

Actions:
1. Read original image
2. Generate 400px wide thumbnail using Sharp
3. Convert to WebP for smaller size
4. Save to thumbnail.webp in same directory
5. Update Firestore document with thumbnailUrl
```

---

## UI Components

### 1. MoodboardEditor (Main View)

The primary moodboard editing interface.

**Layout:**
- Header: Title, date, tags (same as NoteEditor)
- Grid controls: Size slider (small/medium/large)
- Masonry grid of images
- Empty state with instructions

**Features:**
- Drag & drop zone (entire viewport)
- Paste handler for clipboard images
- File picker button for bulk upload

### 2. MoodboardGrid

Pinterest-style masonry layout.

**Implementation approach:**
- CSS columns or a library like `react-masonry-css`
- Responsive: fewer columns on mobile
- Smooth reflow animations

**Grid sizes:**
- Small: ~150px column width
- Medium: ~250px column width (default)
- Large: ~350px column width

### 3. MoodboardImage

Individual image tile in the grid.

**States:**
- Default: Show thumbnail
- Hover: Subtle overlay with caption preview
- Selected: Blue border/ring
- Dragging: Slight scale up, shadow
- Loading: Blur placeholder or shimmer

**Interactions:**
- Click: Open carousel at this image
- Shift+Click: Add to selection
- Drag: Reorder

### 4. MoodboardCarousel

Full-screen image viewer.

**Features:**
- Shows full-resolution image
- Arrow key / swipe navigation
- Caption display at bottom (subtle, semi-transparent background)
- Click caption to edit inline
- Press Escape or click outside to close
- Preload adjacent images for smooth navigation

### 5. ImageUploadZone

Drag & drop overlay.

**Behavior:**
- Shows when files dragged over moodboard
- Full viewport overlay with dashed border
- "Drop images here" message
- Accepts multiple files

### 6. Selection & Multi-select

Google Photos-style selection.

**Interactions:**
- Click: Select single (deselect others)
- Shift+Click: Range select
- Cmd/Ctrl+Click: Toggle in selection
- Drag on empty space: Marquee select (stretch goal)

**Selection toolbar:**
- Appears when items selected
- Actions: Delete, Move to another moodboard (future)
- Shows count: "3 selected"

---

## Implementation Phases

### Phase 1: Foundation
1. Update `NoteItem` type to include `"moodboard"`
2. Update Firestore functions for moodboard CRUD
3. Add moodboard icon to sidebar/folder view
4. Create basic `MoodboardEditor` component
5. Wire up in page.tsx routing (type === "moodboard")

### Phase 2: Firebase Function for Thumbnails
1. Set up Firebase Functions project (if not exists)
2. Create thumbnail generation function
3. Deploy and test with manual uploads
4. Handle edge cases (very large images, non-image files)

### Phase 3: Image Upload
1. Implement drag & drop upload
2. Implement paste from clipboard
3. Implement file picker for bulk upload
4. Show upload progress/placeholders
5. Store image metadata in Firestore

### Phase 4: Masonry Grid
1. Implement masonry layout (CSS columns or library)
2. Add grid size control
3. Loading states (blur-up or shimmer)
4. Smooth layout animations on reflow

### Phase 5: Drag to Reorder
1. Implement drag detection on images
2. Visual feedback (lift, shadow)
3. Drop targets with "scoot" animation
4. Persist new order to Firestore

### Phase 6: Selection
1. Click to select
2. Shift+Click range select
3. Cmd/Ctrl+Click toggle
4. Selection toolbar with delete action
5. Visual selection state

### Phase 7: Carousel View
1. Full-screen overlay component
2. Image display with loading states
3. Keyboard navigation (arrows, escape)
4. Touch/swipe navigation
5. Caption display
6. Click-to-edit caption
7. Preload adjacent images

### Phase 8: Polish
1. Empty state design
2. Animations and transitions
3. Mobile responsive adjustments
4. Error handling (failed uploads, etc.)
5. Performance optimization (lazy loading, virtualization if needed)

---

## Technical Decisions

### Masonry Layout

**Option A: CSS Columns**
```css
.masonry-grid {
  column-count: 4;
  column-gap: 16px;
}
.masonry-item {
  break-inside: avoid;
  margin-bottom: 16px;
}
```
- Pros: No library, simple
- Cons: Items flow top-to-bottom then left-to-right (not ideal)

**Option B: react-masonry-css**
- Pros: Proper left-to-right flow, responsive breakpoints
- Cons: Another dependency

**Recommendation:** Start with CSS columns, upgrade if ordering feels wrong.

### Drag & Drop Library

**Option A: Native HTML5 drag and drop**
- Pros: No dependency
- Cons: Verbose, cross-browser quirks, hard to animate

**Option B: @dnd-kit**
- Pros: Modern, accessible, great animations, sortable preset
- Cons: Learning curve, bundle size

**Option C: react-beautiful-dnd**
- Pros: Well-known, good animations
- Cons: No longer maintained, doesn't support React 18 strict mode well

**Recommendation:** @dnd-kit - it's the modern choice and handles our "scoot" animation needs.

### Image Loading Strategy

1. **Thumbnail in grid** - Always load thumbnail for grid view
2. **Blur-up placeholder** - Show tiny blurred version while thumbnail loads
3. **Full image in carousel** - Load original only when opened in carousel
4. **Preloading** - Preload next/prev images in carousel

---

## File Structure

```
src/
  components/
    notes/
      MoodboardEditor.tsx      # Main moodboard view
      MoodboardGrid.tsx        # Masonry grid layout
      MoodboardImage.tsx       # Individual image tile
      MoodboardCarousel.tsx    # Fullscreen viewer
      MoodboardDropZone.tsx    # Drag & drop overlay
      MoodboardToolbar.tsx     # Selection actions toolbar
  lib/
    notes.ts                   # Add moodboard types
    moodboard-storage.ts       # Image upload/delete functions
functions/
  src/
    index.ts                   # Firebase Functions entry
    generateThumbnail.ts       # Thumbnail generation function
```

---

## Icon

Moodboard icon concept: A 2x2 grid of rounded squares (suggesting a photo grid), or overlapping polaroid-style frames.

```svg
<!-- Option: Grid of photos -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="3" y="3" width="7" height="7" rx="1" />
  <rect x="14" y="3" width="7" height="7" rx="1" />
  <rect x="3" y="14" width="7" height="7" rx="1" />
  <rect x="14" y="14" width="7" height="7" rx="1" />
</svg>
```

---

## Open Questions / Future Considerations

1. **Sharing** - Public moodboard URLs (like published blog posts)?
2. **Collections** - Can an image appear in multiple moodboards?
3. **Import from URL** - Reconsidered as optional future feature?
4. **Image editing** - Crop, rotate within the app?
5. **Infinite scroll** - For very large moodboards, virtualize the grid?
6. **Export** - Download moodboard as ZIP of images?

---

## Dependencies to Add

```json
{
  "@dnd-kit/core": "^6.x",
  "@dnd-kit/sortable": "^8.x",
  "react-masonry-css": "^1.x"  // If CSS columns insufficient
}
```

Firebase Functions:
```json
{
  "sharp": "^0.33.x"
}
```
