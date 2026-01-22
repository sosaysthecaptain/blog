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
    readonly view: EditorView
  ) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-checkbox-wrapper";

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
    return other.isChecked === this.isChecked && other.checkboxPos === this.checkboxPos;
  }

  ignoreEvent() {
    return false;
  }
}

// Bullet widget
class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-bullet";
    span.textContent = "•";
    return span;
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

// Create decorations for markdown rendering
function createDecorations(view: EditorView, onImageClick?: (src: string) => void): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;

    // Images: ![alt](url) or ![alt](url =width) or ![alt](url "caption") or combinations
    const imageMatch = text.match(/^!\[([^\]]*)\]\(([^\s)"=]+)(?:\s*=(\d+))?(?:\s*"([^"]*)")?\)$/);
    if (imageMatch) {
      const [, alt, src, widthStr, caption] = imageMatch;
      const width = widthStr ? parseInt(widthStr) : null;

      if (src === "uploading") {
        builder.add(line.from, line.to, Decoration.replace({
          widget: new UploadPlaceholderWidget(alt || "image"),
        }));
      } else {
        builder.add(line.from, line.to, Decoration.replace({
          widget: new ImageWidget(src, alt, caption || null, width, line.from, line.to, view, onImageClick),
        }));
      }
      continue;
    }

    // Task lists: - [ ] or - [x] (with optional indentation)
    const taskMatch = text.match(/^(\s*)- \[([ x])\] (.*)$/);
    if (taskMatch) {
      const [, indent, check] = taskMatch;
      const isChecked = check === "x";
      const checkStart = line.from + indent.length;
      // Replace "- [ ] " or "- [x] " with checkbox widget
      builder.add(checkStart, checkStart + 6, Decoration.replace({
        widget: new CheckboxWidget(isChecked, checkStart, view),
      }));
      continue;
    }

    // Unordered lists: - item (with optional indentation, but not task lists)
    const listMatch = text.match(/^(\s*)- (?!\[[ x]\])(.*)$/);
    if (listMatch) {
      const [, indent] = listMatch;
      const bulletStart = line.from + indent.length;
      // Replace "- " with bullet
      builder.add(bulletStart, bulletStart + 2, Decoration.replace({
        widget: new BulletWidget(),
      }));
    }
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

// Font families
const fontFamilies = {
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

// Create theme
function createEditorTheme(prefs: EditorDisplayPrefs) {
  return EditorView.theme({
    "&": {
      fontSize: "0.875rem",
      fontFamily: fontFamilies[prefs.font],
      lineHeight: "1.6",
      color: "var(--foreground)",
      backgroundColor: "transparent",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-content": {
      caretColor: "var(--foreground)",
      padding: "0",
      minHeight: "400px",
      whiteSpace: prefs.wordWrap ? "pre-wrap" : "pre",
      wordBreak: prefs.wordWrap ? "break-word" : "normal",
    },
    ".cm-line": { padding: "0" },
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

  // Update theme when prefs change
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompartment.current.reconfigure(createEditorTheme(displayPrefs)),
      });
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
          width: 180px;
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
          display: inline-flex;
          align-items: center;
          margin-right: 6px;
          vertical-align: baseline;
        }

        .cm-checkbox {
          appearance: none;
          width: 14px;
          height: 14px;
          border: 1.5px solid var(--foreground);
          border-radius: 3px;
          background: transparent;
          cursor: pointer;
          vertical-align: text-bottom;
          position: relative;
          margin: 0;
        }
        .cm-checkbox-checked {
          background: var(--foreground);
        }
        .cm-checkbox-checked::after {
          content: "";
          position: absolute;
          left: 3px;
          top: 0px;
          width: 4px;
          height: 8px;
          border: solid var(--background);
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        /* Bullet styles */
        .cm-bullet {
          color: var(--foreground);
          margin-right: 6px;
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
