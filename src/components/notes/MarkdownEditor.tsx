"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { EditorState, StateField, StateEffect, RangeSetBuilder, Compartment } from "@codemirror/state";
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

// Extract all image URLs from markdown content
function extractImageUrls(content: string): string[] {
  const urls: string[] = [];
  const imageRegex = /!\[[^\]]*\]\(([^)"=\s]+)/g;
  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    const url = match[1].trim();
    if (url && url !== "uploading" && !urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}

// Store for signed URLs that can be updated without recreating editor
const signedUrlStore = {
  urls: {} as Record<string, string>,
  listeners: new Set<() => void>(),
  set(urls: Record<string, string>) {
    this.urls = urls;
    this.listeners.forEach((l) => l());
  },
  get(path: string): string | null {
    return this.urls[path] || null;
  },
};

// Image widget
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
    wrapper.style.margin = "0.5rem 0";

    const container = document.createElement("div");
    container.className = "cm-image-container";
    container.style.position = "relative";
    container.style.display = "inline-block";
    container.style.maxWidth = "100%";

    const img = document.createElement("img");
    const path = extractPathFromUrl(this.src);
    const signedUrl = signedUrlStore.get(path) || signedUrlStore.get(this.src);
    img.src = signedUrl || this.src;
    img.alt = this.alt;
    img.className = "cm-inline-image";
    img.style.maxWidth = "100%";
    img.style.width = this.width ? `${this.width}px` : "auto";
    img.style.height = "auto";
    img.style.borderRadius = "8px";
    img.style.cursor = "pointer";
    img.style.display = "block";

    if (this.onClick) {
      img.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onClick!(signedUrl || this.src);
      });
    }

    img.style.opacity = "0";
    img.style.transition = "opacity 0.2s";
    img.onload = () => {
      img.style.opacity = "1";
    };
    img.onerror = () => {
      container.innerHTML = `
        <div style="padding: 0.75rem; background: var(--hover); border: 1px dashed var(--border); border-radius: 8px; color: var(--muted); font-size: 0.75rem;">
          Failed to load image
        </div>
      `;
    };

    container.appendChild(img);

    // Resize handle
    const resizeHandle = document.createElement("div");
    resizeHandle.style.cssText = `
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
    `;

    container.addEventListener("mouseenter", () => {
      resizeHandle.style.opacity = "1";
    });
    container.addEventListener("mouseleave", () => {
      resizeHandle.style.opacity = "0";
    });

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

    // Editable caption
    const captionEl = document.createElement("div");
    captionEl.className = "cm-image-caption";
    captionEl.contentEditable = "true";
    captionEl.textContent = this.caption || "";
    captionEl.setAttribute("data-placeholder", "Add caption...");
    captionEl.style.cssText = `
      font-size: 0.75rem;
      color: var(--muted);
      font-style: italic;
      text-align: center;
      margin-top: 0.25rem;
      max-width: ${this.width ? this.width + "px" : "100%"};
      outline: none;
      min-height: 1.2em;
    `;

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

    captionEl.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    wrapper.appendChild(captionEl);
    return wrapper;
  }

  updateWidth(newWidth: number) {
    const doc = this.view.state.doc;
    const lineText = doc.sliceString(this.lineFrom, this.lineTo);

    // Parse current syntax and update width
    const match = lineText.match(/^(!\[[^\]]*\]\([^)"=\s]+)(?:\s*=\d+)?(\s*"[^"]*")?(\))$/);
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

    // Parse current syntax and update caption
    const match = lineText.match(/^(!\[[^\]]*\]\([^)"=\s]+(?:\s*=\d+)?)(?:\s*"[^"]*")?(\))$/);
    if (match) {
      const captionPart = newCaption ? ` "${newCaption}"` : "";
      const newText = `${match[1]}${captionPart}${match[2]}`;
      this.view.dispatch({
        changes: { from: this.lineFrom, to: this.lineTo, insert: newText },
      });
    }
  }

  eq(other: ImageWidget) {
    return (
      other.src === this.src &&
      other.alt === this.alt &&
      other.caption === this.caption &&
      other.width === this.width
    );
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
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.isChecked;
    checkbox.style.cssText = `
      appearance: none;
      width: 0.875rem;
      height: 0.875rem;
      border: 1.5px solid var(--foreground);
      border-radius: 2px;
      background: ${this.isChecked ? "var(--foreground)" : "transparent"};
      cursor: pointer;
      position: relative;
      vertical-align: middle;
      margin-right: 0.375rem;
      margin-top: -2px;
    `;

    if (this.isChecked) {
      const checkmark = document.createElement("span");
      checkmark.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--background)" stroke-width="3" style="position: absolute; left: 1px; top: 1px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      checkmark.style.cssText = `position: absolute; pointer-events: none;`;
      checkbox.style.position = "relative";
      checkbox.appendChild(checkmark);
    }

    checkbox.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const newChar = this.isChecked ? " " : "x";
      this.view.dispatch({
        changes: {
          from: this.checkboxPos + 3,
          to: this.checkboxPos + 4,
          insert: newChar,
        },
      });
    });

    return checkbox;
  }

  eq(other: CheckboxWidget) {
    return other.isChecked === this.isChecked && other.checkboxPos === this.checkboxPos;
  }

  ignoreEvent() {
    return false;
  }
}

// Upload placeholder
class UploadPlaceholderWidget extends WidgetType {
  constructor(readonly filename: string) {
    super();
  }

  toDOM() {
    const container = document.createElement("div");
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--hover); border: 1px dashed var(--border); border-radius: 6px; margin: 0.5rem 0;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
        <span style="color: var(--muted); font-size: 0.8rem;">Uploading ${this.filename}...</span>
      </div>
    `;
    return container;
  }

  eq(other: UploadPlaceholderWidget) {
    return other.filename === this.filename;
  }
}

// Create decorations
function createDecorations(view: EditorView, onImageClick?: (src: string) => void): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const lineText = line.text;

    // Images: ![alt](url) or ![alt](url =width) or ![alt](url "caption") or ![alt](url =width "caption")
    const imageRegex = /^!\[([^\]]*)\]\(([^)"=\s]+)(?:\s*=(\d+))?(?:\s*"([^"]*)")?\)$/;
    const imageMatch = lineText.match(imageRegex);
    if (imageMatch) {
      const alt = imageMatch[1];
      const src = imageMatch[2].trim();
      const width = imageMatch[3] ? parseInt(imageMatch[3]) : null;
      const caption = imageMatch[4] || null;

      if (src === "uploading") {
        builder.add(
          line.from,
          line.to,
          Decoration.replace({
            widget: new UploadPlaceholderWidget(alt || "image"),
          })
        );
      } else {
        builder.add(
          line.from,
          line.to,
          Decoration.replace({
            widget: new ImageWidget(src, alt, caption, width, line.from, line.to, view, onImageClick),
          })
        );
      }
      continue;
    }

    // Checkboxes: - [ ] or - [x]
    const taskMatch = lineText.match(/^(\s*)- \[([ x])\] /);
    if (taskMatch) {
      const indent = taskMatch[1].length;
      const isChecked = taskMatch[2] === "x";
      const checkStart = line.from + indent;
      // Replace "- [ ] " with just the checkbox widget
      builder.add(
        checkStart,
        checkStart + 6,
        Decoration.replace({
          widget: new CheckboxWidget(isChecked, checkStart, view),
        })
      );
    }

    // Unordered lists: replace - with •
    const listMatch = lineText.match(/^(\s*)- (?!\[[ x]\])/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const bulletStart = line.from + indent;
      builder.add(
        bulletStart,
        bulletStart + 2,
        Decoration.replace({
          widget: new (class extends WidgetType {
            toDOM() {
              const span = document.createElement("span");
              span.textContent = "• ";
              return span;
            }
          })(),
        })
      );
    }
  }

  return builder.finish();
}

// Decoration plugin
const decorationPlugin = (onImageClick?: (src: string) => void) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = createDecorations(view, onImageClick);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = createDecorations(update.view, onImageClick);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );

// Font families
const fontFamilies = {
  mono: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  serif: "var(--font-serif), Georgia, Cambria, 'Times New Roman', Times, serif",
  sans: "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

// Create theme based on preferences
function createEditorTheme(prefs: EditorDisplayPrefs) {
  return EditorView.theme({
    "&": {
      fontSize: "0.875rem",
      fontFamily: fontFamilies[prefs.font],
      lineHeight: "1.5",
      color: "var(--foreground)",
      backgroundColor: "transparent",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-content": {
      caretColor: "var(--foreground)",
      padding: "0",
      minHeight: "400px",
      whiteSpace: prefs.wordWrap ? "pre-wrap" : "pre",
      wordBreak: prefs.wordWrap ? "break-word" : "normal",
      overflowWrap: prefs.wordWrap ? "break-word" : "normal",
    },
    ".cm-line": {
      padding: "1px 0",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--foreground)",
      borderLeftWidth: "2px",
    },
    ".cm-selectionBackground": {
      backgroundColor: "rgba(128, 128, 128, 0.3) !important",
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(128, 128, 128, 0.4) !important",
    },
    ".cm-placeholder": {
      color: "var(--muted)",
      fontStyle: "italic",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
  });
}

// Syntax highlighting
const markdownHighlighting = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: "700", fontSize: "1.5rem", lineHeight: "1.2" },
  { tag: tags.heading2, fontWeight: "600", fontSize: "1.25rem", lineHeight: "1.3" },
  { tag: tags.heading3, fontWeight: "600", fontSize: "1.1rem", lineHeight: "1.4" },
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

  // Extract image URLs for signing
  const imageUrls = useMemo(() => extractImageUrls(content), [content]);
  const { getSignedUrl } = useSignedUrls(imageUrls);

  // Update signed URL store when URLs change
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const url of imageUrls) {
      const path = extractPathFromUrl(url);
      const signed = getSignedUrl(url);
      if (signed) {
        map[path] = signed;
        map[url] = signed;
      }
    }
    signedUrlStore.set(map);

    // Trigger decoration refresh
    const view = viewRef.current;
    if (view) {
      view.dispatch({});
    }
  }, [imageUrls, getSignedUrl]);

  useEffect(() => { noteIdRef.current = noteId; }, [noteId]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onMediaAddedRef.current = onMediaAdded; }, [onMediaAdded]);
  useEffect(() => { onImageClickRef.current = onImageClick; }, [onImageClick]);

  // Update theme when prefs change
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      view.dispatch({
        effects: themeCompartment.current.reconfigure(createEditorTheme(displayPrefs)),
      });
    }
  }, [displayPrefs]);

  const handleImageUpload = useCallback(async (blob: Blob) => {
    const view = viewRef.current;
    if (!view) return;

    const id = noteIdRef.current || `temp-${Date.now()}`;
    const pos = view.state.selection.main.head;
    const placeholderText = "\n![Uploading...](uploading)\n";

    view.dispatch({
      changes: { from: pos, insert: placeholderText },
    });

    try {
      const result = await uploadNoteImage(blob, id);

      if (onMediaAddedRef.current) {
        onMediaAddedRef.current({
          id: `img-${Date.now()}`,
          url: result.url,
          path: result.path,
          type: "image",
          fileSize: result.size,
        });
      }

      const currentContent = view.state.doc.toString();
      const placeholderIndex = currentContent.indexOf("![Uploading...](uploading)");

      if (placeholderIndex !== -1) {
        view.dispatch({
          changes: {
            from: placeholderIndex,
            to: placeholderIndex + "![Uploading...](uploading)".length,
            insert: `![](${result.url})`,
          },
        });
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
      const currentContent = view.state.doc.toString();
      const idx = currentContent.indexOf("![Uploading...](uploading)");
      if (idx !== -1) {
        view.dispatch({
          changes: { from: idx, to: idx + "![Uploading...](uploading)".length, insert: "" },
        });
      }
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    const view = viewRef.current;
    if (!view) return;

    const id = noteIdRef.current || `temp-${Date.now()}`;
    const pos = view.state.selection.main.head;
    const placeholderText = `[Uploading ${file.name}...](uploading)`;

    view.dispatch({
      changes: { from: pos, insert: placeholderText },
    });

    try {
      const result = await uploadNoteFile(file, id);

      if (onMediaAddedRef.current) {
        onMediaAddedRef.current({
          id: `file-${Date.now()}`,
          url: result.url,
          path: result.path,
          type: "file",
          filename: result.filename,
          fileSize: result.size,
        });
      }

      const currentContent = view.state.doc.toString();
      const idx = currentContent.indexOf(placeholderText);

      if (idx !== -1) {
        view.dispatch({
          changes: {
            from: idx,
            to: idx + placeholderText.length,
            insert: `[${result.filename}](${result.url})`,
          },
        });
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      const currentContent = view.state.doc.toString();
      const idx = currentContent.indexOf(placeholderText);
      if (idx !== -1) {
        view.dispatch({
          changes: { from: idx, to: idx + placeholderText.length, insert: "" },
        });
      }
    }
  }, []);

  // Initialize editor once
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const handlePaste = (event: ClipboardEvent) => {
      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          event.preventDefault();
          if (file.type.startsWith("image/")) {
            handleImageUpload(file);
          } else {
            handleFileUpload(file);
          }
          return;
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
  }, []); // Only run once on mount

  // Sync content from props (only if it differs from editor state)
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      const currentContent = view.state.doc.toString();
      if (content !== currentContent) {
        isInternalChange.current = true;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content },
        });
        isInternalChange.current = false;
      }
    }
  }, [content]);

  return (
    <div className="markdown-editor relative">
      {/* Display preferences dropdown */}
      {onDisplayPrefsChange && (
        <div className="absolute top-0 right-0 z-10">
          <details className="relative">
            <summary className="p-1.5 text-xs text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded cursor-pointer list-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </summary>
            <div className="absolute right-0 mt-1 w-48 bg-[--background] border border-[--border] rounded-lg shadow-lg p-2 space-y-2">
              {/* Word wrap */}
              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-[--hover] p-1.5 rounded">
                <input
                  type="checkbox"
                  checked={displayPrefs.wordWrap}
                  onChange={(e) => onDisplayPrefsChange({ ...displayPrefs, wordWrap: e.target.checked })}
                  className="rounded border-[--border]"
                />
                <span>Word wrap</span>
              </label>

              {/* Font selection */}
              <div className="space-y-1 p-1.5">
                <span className="text-xs text-[--muted]">Font</span>
                <div className="flex gap-1">
                  {(["mono", "serif", "sans"] as const).map((font) => (
                    <button
                      key={font}
                      onClick={() => onDisplayPrefsChange({ ...displayPrefs, font })}
                      className={`flex-1 px-2 py-1 text-xs rounded border ${
                        displayPrefs.font === font
                          ? "border-[--foreground] bg-[--foreground] text-[--background]"
                          : "border-[--border] hover:border-[--foreground]"
                      }`}
                      style={{ fontFamily: fontFamilies[font] }}
                    >
                      {font === "mono" ? "Aa" : font === "serif" ? "Aa" : "Aa"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Show markdown */}
              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-[--hover] p-1.5 rounded">
                <input
                  type="checkbox"
                  checked={displayPrefs.showMarkdownSyntax}
                  onChange={(e) => onDisplayPrefsChange({ ...displayPrefs, showMarkdownSyntax: e.target.checked })}
                  className="rounded border-[--border]"
                />
                <span>Show markdown</span>
              </label>
            </div>
          </details>
        </div>
      )}

      <div ref={editorRef} className="min-h-[400px]" />

      <style jsx global>{`
        .markdown-editor .cm-editor {
          background: transparent;
        }

        .markdown-editor .cm-line {
          padding: 1px 0;
        }

        /* Tighter list spacing */
        .markdown-editor .cm-line + .cm-line {
          /* Default tight spacing */
        }

        /* Image caption placeholder */
        .cm-image-caption:empty::before {
          content: attr(data-placeholder);
          color: var(--muted);
          opacity: 0.5;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Hide details marker */
        .markdown-editor details > summary::-webkit-details-marker,
        .markdown-editor details > summary::marker {
          display: none;
        }
      `}</style>
    </div>
  );
}
