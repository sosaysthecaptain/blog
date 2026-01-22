"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { EditorState, StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";
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
  showMarkdownSyntax?: boolean;
  onToggleSyntax?: (show: boolean) => void;
}

// Extract all image URLs from markdown content
function extractImageUrls(content: string): string[] {
  const urls: string[] = [];
  // Match ![alt](url) or ![alt](url =width) or ![alt](url "caption") or ![alt](url =width "caption")
  const imageRegex = /!\[[^\]]*\]\(([^)"=\s]+)/g;
  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    const url = match[1].trim();
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}

// Image widget for rendering images inline
class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
    readonly caption: string | null,
    readonly width: number | null,
    readonly signedUrl: string | null,
    readonly onClick?: (src: string) => void,
    readonly onWidthChange?: (newWidth: number) => void
  ) {
    super();
  }

  toDOM() {
    const container = document.createElement("div");
    container.className = "cm-image-container";
    container.style.position = "relative";
    container.style.display = "inline-block";
    container.style.maxWidth = "100%";

    const img = document.createElement("img");
    // Use signed URL if available, otherwise use original
    img.src = this.signedUrl || this.src;
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
        this.onClick!(this.signedUrl || this.src);
      });
    }

    // Loading state
    img.style.opacity = "0";
    img.style.transition = "opacity 0.2s";
    img.onload = () => {
      img.style.opacity = "1";
    };
    img.onerror = () => {
      container.innerHTML = `
        <div style="padding: 1rem; background: var(--hover); border: 1px dashed var(--border); border-radius: 8px; color: var(--muted); font-size: 0.75rem;">
          Failed to load image
        </div>
      `;
    };

    container.appendChild(img);

    // Add resize handle
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "cm-resize-handle";
    resizeHandle.style.cssText = `
      position: absolute;
      right: -4px;
      bottom: -4px;
      width: 12px;
      height: 12px;
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

    // Resize functionality
    let startX = 0;
    let startWidth = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(100, startWidth + (e.clientX - startX));
      img.style.width = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      const newWidth = parseInt(img.style.width) || img.offsetWidth;
      if (this.onWidthChange) {
        this.onWidthChange(newWidth);
      }
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

    // Add caption if present
    if (this.caption) {
      const captionEl = document.createElement("div");
      captionEl.className = "cm-image-caption";
      captionEl.textContent = this.caption;
      captionEl.style.cssText = `
        font-size: 0.75rem;
        color: var(--muted);
        font-style: italic;
        text-align: center;
        margin-top: 0.25rem;
        max-width: ${this.width ? this.width + "px" : "100%"};
      `;
      container.appendChild(captionEl);
    }

    // Wrapper for proper block layout
    const wrapper = document.createElement("div");
    wrapper.style.margin = "0.75rem 0";
    wrapper.appendChild(container);
    return wrapper;
  }

  eq(other: ImageWidget) {
    return (
      other.src === this.src &&
      other.alt === this.alt &&
      other.caption === this.caption &&
      other.width === this.width &&
      other.signedUrl === this.signedUrl
    );
  }

  ignoreEvent() {
    return false;
  }
}

// Checkbox widget for interactive task lists
class CheckboxWidget extends WidgetType {
  constructor(
    readonly isChecked: boolean,
    readonly checkboxPos: number,
    readonly view: EditorView
  ) {
    super();
  }

  toDOM() {
    const label = document.createElement("label");
    label.className = "cm-checkbox";
    label.style.cssText = `
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
      margin-right: 0.5rem;
    `;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.isChecked;
    checkbox.style.cssText = `
      appearance: none;
      width: 1.125rem;
      height: 1.125rem;
      border: 2px solid var(--foreground);
      border-radius: 3px;
      background: transparent;
      cursor: pointer;
      position: relative;
      transition: all 0.15s ease;
    `;

    if (this.isChecked) {
      checkbox.style.background = "var(--foreground)";
    }

    checkbox.addEventListener("change", (e) => {
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

    label.appendChild(checkbox);

    // Add checkmark for checked state
    if (this.isChecked) {
      const checkmark = document.createElement("span");
      checkmark.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--background)" stroke-width="3" style="position: absolute; left: 3px; top: 3px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      checkmark.style.cssText = `position: absolute; pointer-events: none;`;
      checkbox.appendChild(checkmark);
    }

    return label;
  }

  eq(other: CheckboxWidget) {
    return other.isChecked === this.isChecked && other.checkboxPos === this.checkboxPos;
  }

  ignoreEvent() {
    return false;
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
      <div style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--hover); border: 1px dashed var(--border); border-radius: 8px; margin: 0.5rem 0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; color: var(--foreground);">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
        <span style="color: var(--muted); font-size: 14px;">Uploading ${this.filename}...</span>
      </div>
    `;
    return container;
  }

  eq(other: UploadPlaceholderWidget) {
    return other.filename === this.filename;
  }
}

// State effect to toggle WYSIWYG mode
const toggleWysiwyg = StateEffect.define<boolean>();

// State field to track WYSIWYG mode
const wysiwygMode = StateField.define<boolean>({
  create: () => true,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(toggleWysiwyg)) return e.value;
    }
    return value;
  },
});

// Create decorations for images, checkboxes, and syntax hiding
function createDecorations(
  view: EditorView,
  signedUrlMap: Record<string, string>,
  onImageClick?: (src: string) => void
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const isWysiwyg = view.state.field(wysiwygMode);
  const selection = view.state.selection.main;

  const cursorLineStart = doc.lineAt(selection.from).number;
  const cursorLineEnd = doc.lineAt(selection.to).number;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const lineText = line.text;
    const isCurrentLine = i >= cursorLineStart && i <= cursorLineEnd;

    // Image pattern: ![alt](url) or ![alt](url "caption") or ![alt](url =width)
    const imageRegex = /!\[([^\]]*)\]\(([^)"=\s]+)(?:\s*=(\d+))?(?:\s+"([^"]*)")?\)/g;
    let match;
    while ((match = imageRegex.exec(lineText)) !== null) {
      const start = line.from + match.index;
      const end = start + match[0].length;
      const alt = match[1];
      const src = match[2].trim();
      const width = match[3] ? parseInt(match[3]) : null;
      const caption = match[4] || null;

      // Get signed URL if available
      const path = extractPathFromUrl(src);
      const signedUrl = signedUrlMap[path] || signedUrlMap[src] || null;

      if (src === "uploading") {
        builder.add(
          start,
          end,
          Decoration.replace({
            widget: new UploadPlaceholderWidget(alt || "image"),
          })
        );
      } else if (!isCurrentLine) {
        builder.add(
          start,
          end,
          Decoration.replace({
            widget: new ImageWidget(src, alt, caption, width, signedUrl, onImageClick),
          })
        );
      }
    }

    // Hide syntax when in WYSIWYG mode and not on current line
    if (isWysiwyg && !isCurrentLine) {
      // Headings: hide # characters
      const headingMatch = lineText.match(/^(#{1,6})\s/);
      if (headingMatch) {
        const hashEnd = line.from + headingMatch[0].length;
        builder.add(line.from, hashEnd, Decoration.replace({}));
      }

      // Bold: hide ** characters
      const boldRegex = /\*\*([^*]+)\*\*/g;
      while ((match = boldRegex.exec(lineText)) !== null) {
        const start = line.from + match.index;
        builder.add(start, start + 2, Decoration.replace({}));
        builder.add(start + match[0].length - 2, start + match[0].length, Decoration.replace({}));
      }

      // Italic: hide single * characters (but not **)
      const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;
      while ((match = italicRegex.exec(lineText)) !== null) {
        const start = line.from + match.index;
        builder.add(start, start + 1, Decoration.replace({}));
        builder.add(start + match[0].length - 1, start + match[0].length, Decoration.replace({}));
      }

      // Inline code: hide backticks
      const codeRegex = /`([^`]+)`/g;
      while ((match = codeRegex.exec(lineText)) !== null) {
        const start = line.from + match.index;
        builder.add(start, start + 1, Decoration.replace({}));
        builder.add(start + match[0].length - 1, start + match[0].length, Decoration.replace({}));
      }

      // Strikethrough: hide ~~
      const strikeRegex = /~~([^~]+)~~/g;
      while ((match = strikeRegex.exec(lineText)) !== null) {
        const start = line.from + match.index;
        builder.add(start, start + 2, Decoration.replace({}));
        builder.add(start + match[0].length - 2, start + match[0].length, Decoration.replace({}));
      }

      // List bullets: replace - with • (but not for checkboxes)
      const listMatch = lineText.match(/^(\s*)- (?!\[[ x]\])/);
      if (listMatch) {
        const bulletStart = line.from + listMatch[1].length;
        builder.add(
          bulletStart,
          bulletStart + 2,
          Decoration.replace({
            widget: new (class extends WidgetType {
              toDOM() {
                const span = document.createElement("span");
                span.textContent = "• ";
                span.style.color = "var(--muted)";
                return span;
              }
            })(),
          })
        );
      }

      // Task list: interactive checkboxes
      const taskMatch = lineText.match(/^(\s*)- \[([ x])\] /);
      if (taskMatch) {
        const checkStart = line.from + taskMatch[1].length;
        const isChecked = taskMatch[2] === "x";
        builder.add(
          checkStart,
          checkStart + 6,
          Decoration.replace({
            widget: new CheckboxWidget(isChecked, checkStart, view),
          })
        );
      }

      // Links: hide markdown syntax, show just text
      const linkRegex = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
      while ((match = linkRegex.exec(lineText)) !== null) {
        const start = line.from + match.index;
        const textStart = start + 1;
        const textEnd = textStart + match[1].length;

        builder.add(start, start + 1, Decoration.replace({}));
        builder.add(textEnd, start + match[0].length, Decoration.replace({}));
        builder.add(
          textStart,
          textEnd,
          Decoration.mark({
            class: "cm-link-text",
            attributes: { "data-href": match[2] },
          })
        );
      }
    }
  }

  return builder.finish();
}

// Custom theme - black and white, monospace
const editorTheme = EditorView.theme({
  "&": {
    fontSize: "0.875rem",
    fontFamily: "var(--font-mono), ui-monospace, monospace",
    lineHeight: "1.6",
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
  },
  ".cm-line": {
    padding: "2px 0",
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
  ".cm-image-container": {
    display: "inline-block",
  },
  ".cm-inline-image": {
    display: "block",
    maxWidth: "100%",
  },
  ".cm-link-text": {
    color: "var(--foreground)",
    textDecoration: "underline",
    cursor: "pointer",
  },
});

// Syntax highlighting - minimal, black and white
const markdownHighlighting = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: "700", fontSize: "1.5rem", lineHeight: "1.2" },
  { tag: tags.heading2, fontWeight: "600", fontSize: "1.25rem", lineHeight: "1.3" },
  { tag: tags.heading3, fontWeight: "600", fontSize: "1rem", lineHeight: "1.4" },
  { tag: tags.heading4, fontWeight: "600", fontSize: "0.875rem" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.strikethrough, textDecoration: "line-through", color: "var(--muted)" },
  {
    tag: tags.monospace,
    fontFamily: "var(--font-mono), ui-monospace, monospace",
    fontSize: "0.875em",
    backgroundColor: "var(--hover)",
    padding: "0.15em 0.3em",
    borderRadius: "3px",
  },
  { tag: tags.link, textDecoration: "underline" },
  { tag: tags.url, fontSize: "0.9em", color: "var(--muted)" },
  { tag: tags.quote, color: "var(--muted)", fontStyle: "italic" },
  { tag: tags.list, color: "var(--foreground)" },
  { tag: tags.meta, color: "var(--muted)" },
  { tag: tags.processingInstruction, color: "var(--muted)" },
]);

export default function MarkdownEditor({
  content,
  onChange,
  noteId,
  placeholder = "Start typing...",
  onImageClick,
  onMediaAdded,
  showMarkdownSyntax = false,
  onToggleSyntax,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const noteIdRef = useRef(noteId);
  const onChangeRef = useRef(onChange);
  const onMediaAddedRef = useRef(onMediaAdded);
  const onImageClickRef = useRef(onImageClick);

  // Extract image URLs for signed URL fetching
  const imageUrls = useMemo(() => extractImageUrls(content), [content]);
  const { getSignedUrl } = useSignedUrls(imageUrls);

  // Build a map of path -> signed URL
  const signedUrlMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const url of imageUrls) {
      const path = extractPathFromUrl(url);
      const signed = getSignedUrl(url);
      if (signed) {
        map[path] = signed;
        map[url] = signed;
      }
    }
    return map;
  }, [imageUrls, getSignedUrl]);

  useEffect(() => {
    noteIdRef.current = noteId;
  }, [noteId]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onMediaAddedRef.current = onMediaAdded;
  }, [onMediaAdded]);
  useEffect(() => {
    onImageClickRef.current = onImageClick;
  }, [onImageClick]);

  // Toggle WYSIWYG mode when prop changes
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      view.dispatch({
        effects: toggleWysiwyg.of(!showMarkdownSyntax),
      });
    }
  }, [showMarkdownSyntax]);

  // Update decorations when signed URLs change
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      // Force a re-render of decorations
      view.dispatch({});
    }
  }, [signedUrlMap]);

  const handleImageUpload = useCallback(async (blob: Blob) => {
    const view = viewRef.current;
    if (!view) return;

    const id = noteIdRef.current || `temp-${Date.now()}`;
    const pos = view.state.selection.main.head;
    const placeholderText = "![Uploading...](uploading)";

    view.dispatch({
      changes: { from: pos, insert: placeholderText },
      selection: { anchor: pos + placeholderText.length },
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
      const placeholderIndex = currentContent.indexOf(placeholderText);

      if (placeholderIndex !== -1) {
        view.dispatch({
          changes: {
            from: placeholderIndex,
            to: placeholderIndex + placeholderText.length,
            insert: `![](${result.url})`,
          },
        });
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
      const currentContent = view.state.doc.toString();
      const placeholderIndex = currentContent.indexOf(placeholderText);
      if (placeholderIndex !== -1) {
        view.dispatch({
          changes: { from: placeholderIndex, to: placeholderIndex + placeholderText.length, insert: "" },
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
      selection: { anchor: pos + placeholderText.length },
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
      const placeholderIndex = currentContent.indexOf(placeholderText);

      if (placeholderIndex !== -1) {
        view.dispatch({
          changes: {
            from: placeholderIndex,
            to: placeholderIndex + placeholderText.length,
            insert: `[${result.filename}](${result.url})`,
          },
        });
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      const currentContent = view.state.doc.toString();
      const placeholderIndex = currentContent.indexOf(placeholderText);
      if (placeholderIndex !== -1) {
        view.dispatch({
          changes: { from: placeholderIndex, to: placeholderIndex + placeholderText.length, insert: "" },
        });
      }
    }
  }, []);

  // View plugin that accesses signedUrlMap via closure
  const decorationPluginRef = useRef<ReturnType<typeof ViewPlugin.fromClass> | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const handlePaste = (event: ClipboardEvent) => {
      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
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
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith("image/")) {
            handleImageUpload(file);
          } else {
            handleFileUpload(file);
          }
        }
      }
    };

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    // Create decoration plugin with current signedUrlMap
    const decorationPlugin = ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
          this.decorations = createDecorations(view, signedUrlMap, onImageClickRef.current);
        }

        update(update: ViewUpdate) {
          if (
            update.docChanged ||
            update.viewportChanged ||
            update.selectionSet ||
            update.transactions.some((tr) => tr.effects.some((e) => e.is(toggleWysiwyg)))
          ) {
            this.decorations = createDecorations(update.view, signedUrlMap, onImageClickRef.current);
          }
        }
      },
      {
        decorations: (v) => v.decorations,
      }
    );

    const startState = EditorState.create({
      doc: content,
      extensions: [
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        wysiwygMode,
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        syntaxHighlighting(markdownHighlighting),
        decorationPlugin,
        editorTheme,
        cmPlaceholder(placeholder),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    view.dispatch({
      effects: toggleWysiwyg.of(!showMarkdownSyntax),
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
  }, [signedUrlMap]); // Recreate editor when signedUrlMap changes

  useEffect(() => {
    const view = viewRef.current;
    if (view && content !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    }
  }, [content]);

  return (
    <div className="markdown-editor relative">
      {onToggleSyntax && (
        <button
          type="button"
          onClick={() => onToggleSyntax(!showMarkdownSyntax)}
          className="absolute top-0 right-0 p-1.5 text-xs text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded transition-colors z-10"
          title={showMarkdownSyntax ? "Hide markdown syntax" : "Show markdown syntax"}
        >
          {showMarkdownSyntax ? "¶" : "Aa"}
        </button>
      )}

      <div ref={editorRef} className="min-h-[400px]" />

      <style jsx global>{`
        .markdown-editor .cm-editor {
          background: transparent;
        }

        .markdown-editor .cm-line {
          padding: 1px 0;
        }

        /* Heading line styles */
        .markdown-editor .cm-line:has(.tok-heading1) {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .markdown-editor .cm-line:has(.tok-heading2) {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.375rem;
          line-height: 1.3;
        }

        .markdown-editor .cm-line:has(.tok-heading3) {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.25rem;
          line-height: 1.4;
        }

        /* Blockquote styling */
        .markdown-editor .cm-line:has(.tok-quote) {
          border-left: 3px solid var(--border);
          padding-left: 1rem;
          color: var(--muted);
          font-style: italic;
        }

        /* Image container */
        .markdown-editor .cm-image-container {
          margin: 0.75rem 0;
        }

        .markdown-editor .cm-inline-image {
          max-width: 100%;
          border-radius: 8px;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .markdown-editor .cm-inline-image:hover {
          opacity: 0.9;
        }

        /* Upload spinner */
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Link styling */
        .markdown-editor .cm-link-text {
          text-decoration: underline;
          cursor: pointer;
        }

        /* Code styling */
        .markdown-editor .tok-monospace {
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: 0.875em;
          background: var(--hover);
          padding: 0.15em 0.3em;
          border-radius: 3px;
        }

        /* Checkbox styling */
        .markdown-editor .cm-checkbox input[type="checkbox"]:checked::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 45%;
          width: 5px;
          height: 9px;
          border: solid var(--background);
          border-width: 0 2px 2px 0;
          transform: translate(-50%, -50%) rotate(45deg);
        }

        /* List indentation */
        .markdown-editor .cm-line {
          /* Preserve indentation for nested lists */
        }
      `}</style>
    </div>
  );
}
