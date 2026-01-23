"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  placeholder as cmPlaceholder,
  drawSelection,
  dropCursor,
  Decoration,
  DecorationSet,
  WidgetType,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { uploadNoteImage, uploadNoteFile } from "@/lib/notes-storage";
import { EditorDisplayPrefs } from "@/lib/notes";
import { useSignedUrls } from "@/hooks/useSignedUrls";
import { extractPathFromUrl } from "@/lib/signed-url-cache";

interface MediaInfo {
  id: string;
  url: string;
  path: string;
  type: "image" | "file";
  filename?: string;
  fileSize: number;
}

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  noteId: string;
  placeholder?: string;
  onImageClick?: (src: string) => void;
  onMediaAdded?: (media: MediaInfo) => void;
  displayPrefs?: EditorDisplayPrefs;
  onDisplayPrefsChange?: (prefs: EditorDisplayPrefs) => void;
}

// Check if URL needs signing (only /api/files/ URLs need it)
function needsSigning(url: string): boolean {
  if (!url) return false;
  if (url.includes("firebasestorage.googleapis.com")) return false;
  if (url.startsWith("https://") && !url.includes("/api/files/")) return false;
  return url.startsWith("/api/files/");
}

// Extract all image URLs from markdown content
function extractImageUrls(content: string): string[] {
  const urls: string[] = [];
  // Match ![...](url) - capture the URL part
  const imageRegex = /!\[[^\]]*\]\(([^)\s"=]+)/g;
  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    const url = match[1].trim();
    if (url && url !== "uploading" && !urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}

// Module-level store for signed URLs (avoids re-renders)
const signedUrlStore = {
  urls: {} as Record<string, string>,
  set(urls: Record<string, string>) {
    this.urls = { ...this.urls, ...urls };
  },
  get(url: string): string | null {
    // Try direct match
    if (this.urls[url]) return this.urls[url];
    // Try path extraction
    const path = extractPathFromUrl(url);
    if (this.urls[path]) return this.urls[path];
    return null;
  },
};

// Module-level flag for showing raw markdown (checked by decoration plugin)
let showRawMarkdown = false;

// Image widget with resize and caption
class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
    readonly caption: string | null,
    readonly width: number | null,
    readonly lineFrom: number,
    readonly lineTo: number,
    readonly view: EditorView,
    readonly onClick?: (src: string) => void
  ) {
    super();
  }

  toDOM() {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-image-wrapper";

    const container = document.createElement("div");
    container.className = "cm-image-container";

    // Get signed URL if needed
    let displayUrl = this.src;
    const requiresSigning = needsSigning(this.src);
    if (requiresSigning) {
      const signed = signedUrlStore.get(this.src);
      if (signed) {
        displayUrl = signed;
      } else {
        // Show loading state while waiting for signed URL
        container.innerHTML = `<div class="cm-image-loading">Loading image...</div>`;
        wrapper.appendChild(container);
        return wrapper;
      }
    }

    const img = document.createElement("img");
    img.src = displayUrl;
    img.alt = this.alt;
    if (this.width) {
      img.style.width = `${this.width}px`;
    }
    img.className = "cm-inline-image";

    if (this.onClick) {
      img.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onClick!(displayUrl);
      });
    }

    img.onload = () => {
      img.style.opacity = "1";
    };

    img.onerror = () => {
      container.innerHTML = `<div class="cm-image-error">Failed to load image</div>`;
    };

    container.appendChild(img);

    // Resize handle
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "cm-resize-handle";

    let startX = 0;
    let startWidth = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (e.clientX - startX));
      img.style.width = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      const newWidth = parseInt(img.style.width) || img.offsetWidth;
      this.updateWidth(newWidth);
    };

    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startWidth = img.offsetWidth;
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });

    container.appendChild(resizeHandle);
    wrapper.appendChild(container);

    // Caption
    const captionEl = document.createElement("div");
    captionEl.className = "cm-image-caption";
    captionEl.contentEditable = "true";
    captionEl.textContent = this.caption || "";
    captionEl.setAttribute("data-placeholder", "Add caption...");

    captionEl.addEventListener("blur", () => {
      const newCaption = captionEl.textContent?.trim() || "";
      if (newCaption !== (this.caption || "")) {
        this.updateCaption(newCaption);
      }
    });

    captionEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        captionEl.blur();
      }
      e.stopPropagation();
    });

    captionEl.addEventListener("click", (e) => e.stopPropagation());

    wrapper.appendChild(captionEl);
    return wrapper;
  }

  updateWidth(newWidth: number) {
    const doc = this.view.state.doc;
    const lineText = doc.sliceString(this.lineFrom, this.lineTo);
    // ![alt](url) or ![alt](url =width) or ![alt](url "caption") or ![alt](url =width "caption")
    const match = lineText.match(/^(!\[[^\]]*\]\([^\s)"=]+)(?:\s*=\d+)?(\s*"[^"]*")?(\))$/);
    if (match) {
      const newText = `${match[1]} =${newWidth}${match[2] || ""}${match[3]}`;
      this.view.dispatch({
        changes: { from: this.lineFrom, to: this.lineTo, insert: newText },
      });
    }
  }

  updateCaption(newCaption: string) {
    const doc = this.view.state.doc;
    const lineText = doc.sliceString(this.lineFrom, this.lineTo);
    const match = lineText.match(/^(!\[[^\]]*\]\([^\s)"=]+(?:\s*=\d+)?)(?:\s*"[^"]*")?(\))$/);
    if (match) {
      const captionPart = newCaption ? ` "${newCaption}"` : "";
      const newText = `${match[1]}${captionPart}${match[2]}`;
      this.view.dispatch({
        changes: { from: this.lineFrom, to: this.lineTo, insert: newText },
      });
    }
  }

  eq(other: ImageWidget) {
    return other.src === this.src && other.alt === this.alt &&
           other.caption === this.caption && other.width === this.width;
  }

  ignoreEvent(e: Event) {
    return e.type === "mousedown" || e.type === "input";
  }
}

// Checkbox widget
class CheckboxWidget extends WidgetType {
  constructor(
    readonly isChecked: boolean,
    readonly checkboxPos: number,
    readonly view: EditorView,
    readonly indentLevel: number = 0
  ) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-checkbox-wrapper";
    if (this.indentLevel > 0) {
      span.style.marginLeft = `${this.indentLevel * 20}px`;
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.isChecked;
    checkbox.className = `cm-checkbox ${this.isChecked ? "cm-checkbox-checked" : ""}`;

    checkbox.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const newChar = this.isChecked ? " " : "x";
      this.view.dispatch({
        changes: { from: this.checkboxPos + 3, to: this.checkboxPos + 4, insert: newChar },
      });
    });

    span.appendChild(checkbox);
    return span;
  }

  eq(other: CheckboxWidget) {
    return other.isChecked === this.isChecked && other.checkboxPos === this.checkboxPos && other.indentLevel === this.indentLevel;
  }

  ignoreEvent() {
    return false;
  }
}

// Bullet widget
class BulletWidget extends WidgetType {
  constructor(readonly indentLevel: number = 0) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-bullet";
    if (this.indentLevel > 0) {
      span.style.marginLeft = `${this.indentLevel * 20}px`;
    }
    span.textContent = "•";
    return span;
  }

  eq(other: BulletWidget) {
    return other.indentLevel === this.indentLevel;
  }
}

// Upload placeholder widget
class UploadPlaceholderWidget extends WidgetType {
  constructor(readonly filename: string) {
    super();
  }

  toDOM() {
    const container = document.createElement("div");
    container.className = "cm-upload-placeholder";
    container.innerHTML = `
      <svg class="cm-upload-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
      </svg>
      <span>Uploading ${this.filename}...</span>
    `;
    return container;
  }

  eq(other: UploadPlaceholderWidget) {
    return other.filename === this.filename;
  }
}

// Hidden widget (replaces markdown syntax with nothing)
class HiddenWidget extends WidgetType {
  toDOM() {
    // Return an empty span - the text it replaces disappears
    const span = document.createElement("span");
    return span;
  }

  eq() {
    return true; // All hidden widgets are equal
  }
}

// Create decorations for markdown rendering
function createDecorations(view: EditorView, onImageClick?: (src: string) => void): DecorationSet {
  if (showRawMarkdown) {
    return Decoration.none;
  }

  const doc = view.state.doc;
  const decorations: Array<{ from: number; to: number; deco: Decoration }> = [];

  // Track if we're inside a code block (to skip inline formatting)
  let inCodeBlock = false;

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const line = doc.line(lineNum);
    const text = line.text;

    // Toggle code block state on ``` lines, but don't decorate them
    if (text.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip all processing inside code blocks
    if (inCodeBlock) continue;

    // Images
    const imageMatch = text.match(/^!\[([^\]]*)\]\(([^\s)"=]+)(?:\s*=(\d+))?(?:\s*"([^"]*)")?\)$/);
    if (imageMatch) {
      const [, alt, src, widthStr, caption] = imageMatch;
      const width = widthStr ? parseInt(widthStr) : null;
      const widget = src === "uploading"
        ? new UploadPlaceholderWidget(alt || "image")
        : new ImageWidget(src, alt, caption || null, width, line.from, line.to, view, onImageClick);
      decorations.push({ from: line.from, to: line.to, deco: Decoration.replace({ widget }) });
      continue;
    }

    // Task lists: - [ ] or - [x]
    const taskMatch = text.match(/^(\s*)- \[([ x])\]/);
    if (taskMatch) {
      const [fullMatch, indent, check] = taskMatch;
      const indentLevel = Math.floor(indent.length / 2); // 2 spaces per level
      // Replace entire prefix including whitespace
      decorations.push({
        from: line.from,
        to: line.from + fullMatch.length,
        deco: Decoration.replace({ widget: new CheckboxWidget(check === "x", line.from + indent.length, view, indentLevel) }),
      });
      // Don't continue - allow inline formatting in list items
    }

    // Unordered lists: - item (only if not a task list)
    if (!taskMatch) {
      const listMatch = text.match(/^(\s*)- /);
      if (listMatch) {
        const [fullMatch, indent] = listMatch;
        const indentLevel = Math.floor(indent.length / 2); // 2 spaces per level
        // Replace entire prefix including whitespace
        decorations.push({
          from: line.from,
          to: line.from + fullMatch.length,
          deco: Decoration.replace({ widget: new BulletWidget(indentLevel) }),
        });
        // Don't continue - allow inline formatting in list items
      }
    }

    // Headings: hide # marks
    const headingMatch = text.match(/^(#{1,6}) /);
    if (headingMatch) {
      decorations.push({
        from: line.from,
        to: line.from + headingMatch[1].length + 1,
        deco: Decoration.replace({ widget: new HiddenWidget() }),
      });
    }

    // Inline formatting - collect positions to hide
    const hides: Array<{ from: number; to: number }> = [];

    // Bold: **text** - find pairs
    let pos = 0;
    while (pos < text.length) {
      const idx = text.indexOf("**", pos);
      if (idx === -1) break;
      const endIdx = text.indexOf("**", idx + 2);
      if (endIdx === -1) break;
      hides.push({ from: line.from + idx, to: line.from + idx + 2 });
      hides.push({ from: line.from + endIdx, to: line.from + endIdx + 2 });
      pos = endIdx + 2;
    }

    // Italic: *text* - find single asterisks not part of **
    // Mark positions already used by bold
    const boldPositions = new Set<number>();
    for (const h of hides) {
      for (let p = h.from; p < h.to; p++) boldPositions.add(p);
    }

    pos = 0;
    while (pos < text.length) {
      const idx = text.indexOf("*", pos);
      if (idx === -1) break;
      // Skip if this is part of ** (bold)
      if (boldPositions.has(line.from + idx)) {
        pos = idx + 1;
        continue;
      }
      // Find closing * that's not part of **
      let endIdx = idx + 1;
      while (endIdx < text.length) {
        const nextStar = text.indexOf("*", endIdx);
        if (nextStar === -1) break;
        // Skip if part of bold
        if (boldPositions.has(line.from + nextStar)) {
          endIdx = nextStar + 1;
          continue;
        }
        // Found closing *
        hides.push({ from: line.from + idx, to: line.from + idx + 1 });
        hides.push({ from: line.from + nextStar, to: line.from + nextStar + 1 });
        pos = nextStar + 1;
        break;
      }
      if (endIdx >= text.length || text.indexOf("*", endIdx) === -1) break;
    }

    // Inline code: `text` - but skip ``` sequences (code block fences)
    // First find all ``` positions to avoid
    const tripleBacktickPositions = new Set<number>();
    let triplePos = 0;
    while (triplePos < text.length) {
      const idx = text.indexOf("```", triplePos);
      if (idx === -1) break;
      tripleBacktickPositions.add(idx);
      tripleBacktickPositions.add(idx + 1);
      tripleBacktickPositions.add(idx + 2);
      triplePos = idx + 3;
    }

    // Now find inline code, skipping positions in ```
    pos = 0;
    while (pos < text.length) {
      const idx = text.indexOf("`", pos);
      if (idx === -1) break;
      // Skip if part of ```
      if (tripleBacktickPositions.has(idx)) {
        pos = idx + 1;
        continue;
      }
      // Find closing ` that's not part of ```
      let endIdx = idx + 1;
      let found = false;
      while (endIdx < text.length) {
        const nextTick = text.indexOf("`", endIdx);
        if (nextTick === -1) break;
        if (tripleBacktickPositions.has(nextTick)) {
          endIdx = nextTick + 1;
          continue;
        }
        // Found valid closing `
        hides.push({ from: line.from + idx, to: line.from + idx + 1 });
        hides.push({ from: line.from + nextTick, to: line.from + nextTick + 1 });
        pos = nextTick + 1;
        found = true;
        break;
      }
      if (!found) break;
    }

    // Sort by position and add
    hides.sort((a, b) => a.from - b.from);
    for (const h of hides) {
      decorations.push({ from: h.from, to: h.to, deco: Decoration.replace({ widget: new HiddenWidget() }) });
    }
  }

  // Sort decorations by position (required by RangeSetBuilder)
  decorations.sort((a, b) => a.from - b.from || a.to - b.to);

  const builder = new RangeSetBuilder<Decoration>();
  for (const d of decorations) {
    builder.add(d.from, d.to, d.deco);
  }
  return builder.finish();
}

// Decoration plugin - always rebuilds to catch signed URL updates
const decorationPlugin = (onImageClick?: (src: string) => void) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = createDecorations(view, onImageClick);
      }
      update(update: ViewUpdate) {
        // Always rebuild - signed URLs might have changed
        this.decorations = createDecorations(update.view, onImageClick);
      }
    },
    { decorations: (v) => v.decorations }
  );

// Font families (matching project standards)
const fontFamilies = {
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  serif: "var(--font-serif), Georgia, serif",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

// Create theme
function createEditorTheme(prefs: EditorDisplayPrefs) {
  return EditorView.theme({
    "&": {
      fontSize: "0.875rem !important",
      fontFamily: `${fontFamilies[prefs.font]} !important`,
      lineHeight: "1.6 !important",
      color: "var(--foreground)",
      backgroundColor: "transparent",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-content": {
      caretColor: "var(--foreground)",
      padding: "0",
      minHeight: "400px",
      whiteSpace: `${prefs.wordWrap ? "pre-wrap" : "pre"} !important`,
      wordBreak: `${prefs.wordWrap ? "break-word" : "normal"} !important`,
      overflowWrap: `${prefs.wordWrap ? "break-word" : "normal"} !important`,
    },
    ".cm-line": {
      padding: "0",
      fontFamily: "inherit !important",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--foreground)",
      borderLeftWidth: "1.5px",
    },
    ".cm-selectionBackground": { backgroundColor: "rgba(128, 128, 128, 0.3) !important" },
    "&.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(128, 128, 128, 0.4) !important" },
    ".cm-placeholder": { color: "var(--muted)", fontStyle: "italic" },
  });
}

// Syntax highlighting
const markdownHighlighting = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: "700", fontSize: "1.5rem" },
  { tag: tags.heading2, fontWeight: "600", fontSize: "1.25rem" },
  { tag: tags.heading3, fontWeight: "600", fontSize: "1.1rem" },
  { tag: tags.heading4, fontWeight: "600" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.strikethrough, textDecoration: "line-through", color: "var(--muted)" },
  { tag: tags.monospace, fontFamily: fontFamilies.mono, fontSize: "0.9em", backgroundColor: "var(--hover)", padding: "0.1em 0.25em", borderRadius: "3px" },
  { tag: tags.link, textDecoration: "underline" },
  { tag: tags.url, fontSize: "0.9em", color: "var(--muted)" },
  { tag: tags.quote, color: "var(--muted)", fontStyle: "italic" },
]);

const defaultDisplayPrefs: EditorDisplayPrefs = {
  wordWrap: true,
  font: "mono",
  showMarkdownSyntax: false,
};

export default function MarkdownEditor({
  content,
  onChange,
  noteId,
  placeholder = "Start typing...",
  onImageClick,
  onMediaAdded,
  displayPrefs = defaultDisplayPrefs,
  onDisplayPrefsChange,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const noteIdRef = useRef(noteId);
  const onChangeRef = useRef(onChange);
  const onMediaAddedRef = useRef(onMediaAdded);
  const onImageClickRef = useRef(onImageClick);
  const themeCompartment = useRef(new Compartment());
  const isInternalChange = useRef(false);

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Extract URLs that need signing
  const imageUrls = useMemo(() => {
    const urls = extractImageUrls(content);
    return urls.filter(needsSigning);
  }, [content]);

  // Get signed URLs
  const { getSignedUrl } = useSignedUrls(imageUrls);

  // Update signed URL store
  useEffect(() => {
    const newUrls: Record<string, string> = {};
    for (const url of imageUrls) {
      const signed = getSignedUrl(url);
      if (signed) {
        newUrls[url] = signed;
        newUrls[extractPathFromUrl(url)] = signed;
      }
    }
    if (Object.keys(newUrls).length > 0) {
      signedUrlStore.set(newUrls);
      // Refresh decorations
      viewRef.current?.dispatch({});
    }
  }, [imageUrls, getSignedUrl]);

  // Keep refs current
  useEffect(() => { noteIdRef.current = noteId; }, [noteId]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onMediaAddedRef.current = onMediaAdded; }, [onMediaAdded]);
  useEffect(() => { onImageClickRef.current = onImageClick; }, [onImageClick]);

  // Update theme and markdown visibility when prefs change
  useEffect(() => {
    // Update the module-level flag for decoration plugin
    showRawMarkdown = displayPrefs.showMarkdownSyntax;

    const view = viewRef.current;
    if (view) {
      // Apply font directly to DOM element (bypassing CodeMirror theme system)
      const editorEl = view.dom;
      const contentEl = view.contentDOM;

      editorEl.style.fontFamily = fontFamilies[displayPrefs.font];
      contentEl.style.fontFamily = fontFamilies[displayPrefs.font];

      // Apply word wrap directly
      contentEl.style.whiteSpace = displayPrefs.wordWrap ? "pre-wrap" : "pre";
      contentEl.style.wordBreak = displayPrefs.wordWrap ? "break-word" : "normal";
      contentEl.style.overflowWrap = displayPrefs.wordWrap ? "break-word" : "normal";
      contentEl.style.maxWidth = displayPrefs.wordWrap ? "100%" : "none";

      // Trigger decoration rebuild for markdown syntax toggle
      view.dispatch({});
    }
  }, [displayPrefs]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Image upload handler
  const handleImageUpload = useCallback(async (blob: Blob) => {
    const view = viewRef.current;
    if (!view) return;

    const id = noteIdRef.current || `temp-${Date.now()}`;
    const pos = view.state.selection.main.head;
    const placeholderText = "![image](uploading)";

    view.dispatch({ changes: { from: pos, insert: `\n${placeholderText}\n` } });

    try {
      const result = await uploadNoteImage(blob, id);
      onMediaAddedRef.current?.({
        id: `img-${Date.now()}`,
        url: result.url,
        path: result.path,
        type: "image",
        fileSize: result.size,
      });

      const currentContent = view.state.doc.toString();
      const idx = currentContent.indexOf(placeholderText);
      if (idx !== -1) {
        view.dispatch({
          changes: { from: idx, to: idx + placeholderText.length, insert: `![](${result.url})` },
        });
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
      const currentContent = view.state.doc.toString();
      const idx = currentContent.indexOf(placeholderText);
      if (idx !== -1) {
        view.dispatch({ changes: { from: idx, to: idx + placeholderText.length, insert: "" } });
      }
    }
  }, []);

  // File upload handler
  const handleFileUpload = useCallback(async (file: File) => {
    const view = viewRef.current;
    if (!view) return;

    const id = noteIdRef.current || `temp-${Date.now()}`;
    const pos = view.state.selection.main.head;
    const placeholderText = `[${file.name}](uploading)`;

    view.dispatch({ changes: { from: pos, insert: placeholderText } });

    try {
      const result = await uploadNoteFile(file, id);
      onMediaAddedRef.current?.({
        id: `file-${Date.now()}`,
        url: result.url,
        path: result.path,
        type: "file",
        filename: result.filename,
        fileSize: result.size,
      });

      const currentContent = view.state.doc.toString();
      const idx = currentContent.indexOf(placeholderText);
      if (idx !== -1) {
        view.dispatch({
          changes: { from: idx, to: idx + placeholderText.length, insert: `[${result.filename}](${result.url})` },
        });
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      const currentContent = view.state.doc.toString();
      const idx = currentContent.indexOf(placeholderText);
      if (idx !== -1) {
        view.dispatch({ changes: { from: idx, to: idx + placeholderText.length, insert: "" } });
      }
    }
  }, []);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const handlePaste = (event: ClipboardEvent) => {
      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        event.preventDefault();
        for (const file of Array.from(files)) {
          if (file.type.startsWith("image/")) {
            handleImageUpload(file);
          } else {
            handleFileUpload(file);
          }
        }
      }
    };

    const handleDrop = (event: DragEvent) => {
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        event.preventDefault();
        for (const file of Array.from(files)) {
          if (file.type.startsWith("image/")) {
            handleImageUpload(file);
          } else {
            handleFileUpload(file);
          }
        }
      }
    };

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isInternalChange.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const startState = EditorState.create({
      doc: content,
      extensions: [
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        syntaxHighlighting(markdownHighlighting),
        decorationPlugin(onImageClickRef.current),
        themeCompartment.current.of(createEditorTheme(displayPrefs)),
        cmPlaceholder(placeholder),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Apply initial styles directly to DOM
    view.dom.style.fontFamily = fontFamilies[displayPrefs.font];
    view.contentDOM.style.fontFamily = fontFamilies[displayPrefs.font];
    view.contentDOM.style.whiteSpace = displayPrefs.wordWrap ? "pre-wrap" : "pre";
    view.contentDOM.style.wordBreak = displayPrefs.wordWrap ? "break-word" : "normal";
    view.contentDOM.style.overflowWrap = displayPrefs.wordWrap ? "break-word" : "normal";

    view.dom.addEventListener("paste", handlePaste);
    view.dom.addEventListener("drop", handleDrop);

    return () => {
      view.dom.removeEventListener("paste", handlePaste);
      view.dom.removeEventListener("drop", handleDrop);
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync content from props
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      const currentContent = view.state.doc.toString();
      if (content !== currentContent) {
        isInternalChange.current = true;
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content } });
        isInternalChange.current = false;
      }
    }
  }, [content]);

  return (
    <div className="markdown-editor">
      {/* Settings button */}
      {onDisplayPrefsChange && (
        <div className="md-settings-container" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="md-settings-btn"
            title="Display settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {menuOpen && (
            <div className="md-settings-menu">
              <label className="md-menu-item">
                <input
                  type="checkbox"
                  checked={displayPrefs.wordWrap}
                  onChange={(e) => onDisplayPrefsChange({ ...displayPrefs, wordWrap: e.target.checked })}
                />
                <span>Word wrap</span>
              </label>

              <div className="md-menu-divider" />

              <div className="md-menu-label">Font</div>
              <div className="md-font-buttons">
                {(["mono", "serif", "sans"] as const).map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => onDisplayPrefsChange({ ...displayPrefs, font })}
                    className={`md-font-btn ${displayPrefs.font === font ? "md-font-btn-active" : ""}`}
                    style={{ fontFamily: fontFamilies[font] }}
                  >
                    {font}
                  </button>
                ))}
              </div>

              <div className="md-menu-divider" />

              <label className="md-menu-item">
                <input
                  type="checkbox"
                  checked={displayPrefs.showMarkdownSyntax}
                  onChange={(e) => onDisplayPrefsChange({ ...displayPrefs, showMarkdownSyntax: e.target.checked })}
                />
                <span>Show markdown syntax</span>
              </label>
            </div>
          )}
        </div>
      )}

      <div ref={editorRef} className="md-editor-container" />

      <style jsx global>{`
        .markdown-editor {
          position: relative;
        }

        .md-settings-container {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 10;
        }

        .md-settings-btn {
          padding: 6px;
          color: var(--muted);
          border-radius: 4px;
          transition: all 0.15s;
        }
        .md-settings-btn:hover {
          color: var(--foreground);
          background: var(--hover);
        }

        .md-settings-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          width: 220px;
          padding: 8px;
          background: var(--sidebar-bg, var(--background));
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
        }

        .md-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          font-size: 13px;
          color: var(--foreground);
          border-radius: 4px;
          cursor: pointer;
        }
        .md-menu-item:hover {
          background: var(--hover);
        }
        .md-menu-item input[type="checkbox"] {
          width: 14px;
          height: 14px;
          accent-color: var(--foreground);
        }

        .md-menu-divider {
          height: 1px;
          background: var(--border);
          margin: 6px 0;
        }

        .md-menu-label {
          padding: 4px 8px;
          font-size: 11px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .md-font-buttons {
          display: flex;
          gap: 4px;
          padding: 0 4px 4px;
        }

        .md-font-btn {
          flex: 1;
          padding: 4px 8px;
          font-size: 12px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: transparent;
          color: var(--foreground);
          cursor: pointer;
          transition: all 0.15s;
        }
        .md-font-btn:hover {
          border-color: var(--foreground);
        }
        .md-font-btn-active {
          background: var(--foreground);
          color: var(--background);
          border-color: var(--foreground);
        }

        .md-editor-container {
          min-height: 400px;
        }

        /* Editor styles */
        .markdown-editor .cm-editor {
          background: transparent;
        }

        /* Line height for lists - tighter spacing */
        .markdown-editor .cm-line {
          line-height: 1.5;
        }

        /* Image styles */
        .cm-image-wrapper {
          display: block;
          margin: 8px 0;
        }

        .cm-image-container {
          position: relative;
          display: inline-block;
        }

        .cm-inline-image {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .cm-resize-handle {
          position: absolute;
          right: -4px;
          bottom: -4px;
          width: 10px;
          height: 10px;
          background: var(--foreground);
          border: 2px solid var(--background);
          border-radius: 50%;
          cursor: se-resize;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .cm-image-container:hover .cm-resize-handle {
          opacity: 1;
        }

        .cm-image-error {
          padding: 12px 16px;
          background: var(--hover);
          border: 1px dashed var(--border);
          border-radius: 8px;
          color: var(--muted);
          font-size: 13px;
        }

        .cm-image-loading {
          padding: 12px 16px;
          background: var(--hover);
          border: 1px dashed var(--border);
          border-radius: 8px;
          color: var(--muted);
          font-size: 13px;
        }

        .cm-image-caption {
          font-size: 12px;
          color: var(--muted);
          font-style: italic;
          text-align: center;
          margin-top: 4px;
          outline: none;
          min-height: 1.4em;
        }
        .cm-image-caption:empty::before {
          content: attr(data-placeholder);
          opacity: 0.5;
        }

        /* Checkbox styles */
        .cm-checkbox-wrapper {
          display: inline;
          margin-right: 8px;
        }

        .cm-checkbox {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          width: 13px;
          height: 13px;
          border: 1.5px solid var(--foreground);
          border-radius: 3px;
          background: transparent;
          cursor: pointer;
          position: relative;
          top: 2px;
          margin: 0;
        }
        .cm-checkbox:checked,
        .cm-checkbox-checked {
          background: var(--foreground);
        }
        .cm-checkbox:checked::after,
        .cm-checkbox-checked::after {
          content: "";
          position: absolute;
          left: 3px;
          top: 0px;
          width: 4px;
          height: 7px;
          border: solid var(--background);
          border-width: 0 1.5px 1.5px 0;
          transform: rotate(45deg);
        }

        /* Bullet styles */
        .cm-bullet {
          display: inline;
          margin-right: 8px;
        }

        /* Upload placeholder */
        .cm-upload-placeholder {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--hover);
          border: 1px dashed var(--border);
          border-radius: 6px;
          margin: 8px 0;
          color: var(--muted);
          font-size: 13px;
        }

        .cm-upload-spinner {
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
