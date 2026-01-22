"use client";

import { useEffect, useRef, useCallback, useState } from "react";
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
import { syntaxHighlighting, HighlightStyle, syntaxTree } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { uploadNoteImage, uploadNoteFile } from "@/lib/notes-storage";

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

// Image widget for rendering images inline
class ImageWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string, readonly onClick?: (src: string) => void) {
    super();
  }

  toDOM() {
    const container = document.createElement("div");
    container.className = "cm-image-container";

    const img = document.createElement("img");
    img.src = this.src;
    img.alt = this.alt;
    img.className = "cm-inline-image";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.borderRadius = "8px";
    img.style.margin = "0.5rem 0";
    img.style.cursor = "pointer";

    if (this.onClick) {
      img.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onClick!(this.src);
      });
    }

    // Add loading state
    img.style.opacity = "0";
    img.style.transition = "opacity 0.2s";
    img.onload = () => {
      img.style.opacity = "1";
    };
    img.onerror = () => {
      img.style.opacity = "0.5";
      img.alt = "Failed to load image";
    };

    container.appendChild(img);
    return container;
  }

  eq(other: ImageWidget) {
    return other.src === this.src && other.alt === this.alt;
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; color: var(--accent);">
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
  create: () => true, // Default to WYSIWYG mode (hide syntax)
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(toggleWysiwyg)) return e.value;
    }
    return value;
  },
});

// Create decorations for images and syntax hiding
function createDecorations(view: EditorView, onImageClick?: (src: string) => void): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const isWysiwyg = view.state.field(wysiwygMode);
  const selection = view.state.selection.main;

  // Get the line numbers that have the cursor
  const cursorLineStart = doc.lineAt(selection.from).number;
  const cursorLineEnd = doc.lineAt(selection.to).number;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const lineText = line.text;
    const isCurrentLine = i >= cursorLineStart && i <= cursorLineEnd;

    // Image pattern: ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = imageRegex.exec(lineText)) !== null) {
      const start = line.from + match.index;
      const end = start + match[0].length;
      const alt = match[1];
      const src = match[2];

      // Don't render placeholder images
      if (src === "uploading") {
        // Show upload placeholder
        builder.add(start, end, Decoration.replace({
          widget: new UploadPlaceholderWidget(alt || "image"),
        }));
      } else if (!isCurrentLine) {
        // Replace with image widget when not editing this line
        builder.add(start, end, Decoration.replace({
          widget: new ImageWidget(src, alt, onImageClick),
        }));
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
        // Hide opening **
        builder.add(start, start + 2, Decoration.replace({}));
        // Hide closing **
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

      // List bullets: replace - with •
      const listMatch = lineText.match(/^(\s*)- /);
      if (listMatch && !lineText.match(/^(\s*)- \[[ x]\]/)) {
        const bulletStart = line.from + listMatch[1].length;
        builder.add(bulletStart, bulletStart + 2, Decoration.replace({
          widget: new class extends WidgetType {
            toDOM() {
              const span = document.createElement("span");
              span.textContent = "• ";
              span.style.color = "var(--muted)";
              return span;
            }
          },
        }));
      }

      // Task list: style checkboxes
      const taskMatch = lineText.match(/^(\s*)- \[([ x])\] /);
      if (taskMatch) {
        const checkStart = line.from + taskMatch[1].length;
        const isChecked = taskMatch[2] === "x";
        builder.add(checkStart, checkStart + 6, Decoration.replace({
          widget: new class extends WidgetType {
            toDOM() {
              const span = document.createElement("span");
              span.innerHTML = isChecked
                ? '<span style="color: var(--accent);">☑</span> '
                : '<span style="color: var(--muted);">☐</span> ';
              return span;
            }
          },
        }));
      }

      // Links: hide markdown syntax, show just text
      const linkRegex = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
      while ((match = linkRegex.exec(lineText)) !== null) {
        const start = line.from + match.index;
        const textStart = start + 1;
        const textEnd = textStart + match[1].length;

        // Hide opening [
        builder.add(start, start + 1, Decoration.replace({}));
        // Hide ](url)
        builder.add(textEnd, start + match[0].length, Decoration.replace({}));
        // Style the link text
        builder.add(textStart, textEnd, Decoration.mark({
          class: "cm-link-text",
          attributes: { "data-href": match[2] },
        }));
      }
    }
  }

  return builder.finish();
}

// View plugin to manage decorations
const decorationPlugin = (onImageClick?: (src: string) => void) => ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = createDecorations(view, onImageClick);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet ||
          update.transactions.some(tr => tr.effects.some(e => e.is(toggleWysiwyg)))) {
        this.decorations = createDecorations(update.view, onImageClick);
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
);

// Custom theme
const editorTheme = EditorView.theme({
  "&": {
    fontSize: "1rem",
    fontFamily: "var(--font-serif), Georgia, serif",
    lineHeight: "1.7",
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
    backgroundColor: "rgba(var(--accent-rgb, 59, 130, 246), 0.2) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(var(--accent-rgb, 59, 130, 246), 0.3) !important",
  },
  ".cm-placeholder": {
    color: "var(--muted)",
    fontStyle: "italic",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-image-container": {
    display: "block",
  },
  ".cm-inline-image": {
    display: "block",
    maxWidth: "100%",
  },
  ".cm-link-text": {
    color: "var(--accent)",
    textDecoration: "underline",
    cursor: "pointer",
  },
});

// Syntax highlighting
const markdownHighlighting = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: "700", fontSize: "1.75rem", lineHeight: "1.2" },
  { tag: tags.heading2, fontWeight: "600", fontSize: "1.375rem", lineHeight: "1.3" },
  { tag: tags.heading3, fontWeight: "600", fontSize: "1.125rem", lineHeight: "1.4" },
  { tag: tags.heading4, fontWeight: "600", fontSize: "1rem" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.strikethrough, textDecoration: "line-through", color: "var(--muted)" },
  { tag: tags.monospace, fontFamily: "var(--font-mono), ui-monospace, monospace", fontSize: "0.875em", backgroundColor: "rgba(0, 0, 0, 0.06)", padding: "0.15em 0.3em", borderRadius: "3px" },
  { tag: tags.link, color: "var(--accent)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--accent)", fontSize: "0.9em" },
  { tag: tags.quote, color: "var(--muted)", fontStyle: "italic" },
  { tag: tags.list, color: "var(--foreground)" },
  { tag: tags.meta, color: "var(--muted)", opacity: "0.5" },
  { tag: tags.processingInstruction, color: "var(--muted)", opacity: "0.5" },
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

  useEffect(() => { noteIdRef.current = noteId; }, [noteId]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onMediaAddedRef.current = onMediaAdded; }, [onMediaAdded]);
  useEffect(() => { onImageClickRef.current = onImageClick; }, [onImageClick]);

  // Toggle WYSIWYG mode when prop changes
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      view.dispatch({
        effects: toggleWysiwyg.of(!showMarkdownSyntax),
      });
    }
  }, [showMarkdownSyntax]);

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
        decorationPlugin(onImageClickRef.current),
        editorTheme,
        cmPlaceholder(placeholder),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
      ],
    });

    // Set initial WYSIWYG state
    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    // Apply initial toggle state
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
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view && content !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    }
  }, [content]);

  return (
    <div className="markdown-editor font-serif relative">
      {/* Syntax toggle button */}
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
          font-size: 1.75rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.2;
        }

        .markdown-editor .cm-line:has(.tok-heading2) {
          font-size: 1.375rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }

        .markdown-editor .cm-line:has(.tok-heading3) {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.375rem;
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
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Link styling */
        .markdown-editor .cm-link-text {
          color: var(--accent);
          text-decoration: underline;
          cursor: pointer;
        }

        /* Code styling */
        .markdown-editor .tok-monospace {
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: 0.875em;
          background: rgba(0, 0, 0, 0.06);
          padding: 0.15em 0.3em;
          border-radius: 3px;
        }

        /* Dark mode */
        :root.dark .markdown-editor .tok-monospace {
          background: rgba(255, 255, 255, 0.1);
        }

        :root.dark .markdown-editor .cm-upload-placeholder > div {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}
