"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorState, Transaction } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder, drawSelection, dropCursor } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
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
}

// Custom theme matching the app's design
const editorTheme = EditorView.theme({
  "&": {
    fontSize: "1.125rem",
    fontFamily: "var(--font-serif), Georgia, serif",
    lineHeight: "1.75",
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
    padding: "0",
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
  // Scrollbar styling
  ".cm-scroller": {
    overflow: "auto",
  },
});

// Syntax highlighting for markdown
const markdownHighlighting = HighlightStyle.define([
  // Headings - larger and bolder
  { tag: tags.heading1, fontWeight: "700", fontSize: "2rem", lineHeight: "1.2" },
  { tag: tags.heading2, fontWeight: "600", fontSize: "1.5rem", lineHeight: "1.3" },
  { tag: tags.heading3, fontWeight: "600", fontSize: "1.25rem", lineHeight: "1.4" },
  { tag: tags.heading4, fontWeight: "600", fontSize: "1.125rem" },
  { tag: tags.heading5, fontWeight: "600", fontSize: "1rem" },
  { tag: tags.heading6, fontWeight: "600", fontSize: "0.875rem" },

  // Emphasis
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.strikethrough, textDecoration: "line-through", color: "var(--muted)" },

  // Code
  { tag: tags.monospace, fontFamily: "var(--font-mono), ui-monospace, monospace", fontSize: "0.9em", backgroundColor: "rgba(0, 0, 0, 0.08)", padding: "0.2em 0.4em", borderRadius: "0.25rem" },

  // Links and URLs
  { tag: tags.link, color: "var(--accent)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--accent)" },

  // Quotes
  { tag: tags.quote, color: "var(--muted)", fontStyle: "italic", borderLeft: "3px solid var(--border)", paddingLeft: "1rem" },

  // Lists
  { tag: tags.list, color: "var(--foreground)" },

  // Meta (markdown syntax characters like **, ##, etc.)
  { tag: tags.processingInstruction, color: "var(--muted)", opacity: "0.6" },
  { tag: tags.meta, color: "var(--muted)", opacity: "0.6" },

  // Content in brackets/parens (link text, image alt)
  { tag: tags.contentSeparator, color: "var(--muted)" },

  // Horizontal rule
  { tag: tags.separator, color: "var(--border)" },
]);

export default function MarkdownEditor({
  content,
  onChange,
  noteId,
  placeholder = "Start typing...",
  onImageClick,
  onMediaAdded,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const noteIdRef = useRef(noteId);
  const onChangeRef = useRef(onChange);
  const onMediaAddedRef = useRef(onMediaAdded);

  // Keep refs in sync
  useEffect(() => {
    noteIdRef.current = noteId;
  }, [noteId]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onMediaAddedRef.current = onMediaAdded;
  }, [onMediaAdded]);

  // Handle image upload
  const handleImageUpload = useCallback(async (blob: Blob) => {
    const view = viewRef.current;
    if (!view) return;

    const id = noteIdRef.current || `temp-${Date.now()}`;

    // Insert placeholder at cursor
    const pos = view.state.selection.main.head;
    const placeholderText = "![Uploading...](uploading)";

    view.dispatch({
      changes: { from: pos, insert: placeholderText },
      selection: { anchor: pos + placeholderText.length },
    });

    try {
      const result = await uploadNoteImage(blob, id);

      // Track the media
      if (onMediaAddedRef.current) {
        onMediaAddedRef.current({
          id: `img-${Date.now()}`,
          url: result.url,
          path: result.path,
          type: "image",
          fileSize: result.size,
        });
      }

      // Replace placeholder with actual image markdown
      const currentContent = view.state.doc.toString();
      const placeholderIndex = currentContent.indexOf(placeholderText);

      if (placeholderIndex !== -1) {
        const imageMarkdown = `![](${result.url})`;
        view.dispatch({
          changes: {
            from: placeholderIndex,
            to: placeholderIndex + placeholderText.length,
            insert: imageMarkdown,
          },
        });
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
      // Remove placeholder on error
      const currentContent = view.state.doc.toString();
      const placeholderIndex = currentContent.indexOf(placeholderText);
      if (placeholderIndex !== -1) {
        view.dispatch({
          changes: {
            from: placeholderIndex,
            to: placeholderIndex + placeholderText.length,
            insert: "",
          },
        });
      }
    }
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    const view = viewRef.current;
    if (!view) return;

    const id = noteIdRef.current || `temp-${Date.now()}`;

    // Insert placeholder at cursor
    const pos = view.state.selection.main.head;
    const placeholderText = `[Uploading ${file.name}...](uploading)`;

    view.dispatch({
      changes: { from: pos, insert: placeholderText },
      selection: { anchor: pos + placeholderText.length },
    });

    try {
      const result = await uploadNoteFile(file, id);

      // Track the media
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

      // Replace placeholder with actual file link
      const currentContent = view.state.doc.toString();
      const placeholderIndex = currentContent.indexOf(placeholderText);

      if (placeholderIndex !== -1) {
        const fileMarkdown = `[${result.filename}](${result.url})`;
        view.dispatch({
          changes: {
            from: placeholderIndex,
            to: placeholderIndex + placeholderText.length,
            insert: fileMarkdown,
          },
        });
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      // Remove placeholder on error
      const currentContent = view.state.doc.toString();
      const placeholderIndex = currentContent.indexOf(placeholderText);
      if (placeholderIndex !== -1) {
        view.dispatch({
          changes: {
            from: placeholderIndex,
            to: placeholderIndex + placeholderText.length,
            insert: "",
          },
        });
      }
    }
  }, []);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) return;

    // Handle paste events for files
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

    // Handle drop events for files
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

    // Create update listener extension
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
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
        }),
        syntaxHighlighting(markdownHighlighting),
        editorTheme,
        cmPlaceholder(placeholder),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        updateListener,
        // Handle image clicks
        EditorView.domEventHandlers({
          click: (event) => {
            const target = event.target as HTMLElement;
            // Check if clicking on an image (rendered in preview mode)
            if (target.tagName === "IMG" && onImageClick) {
              const src = target.getAttribute("src");
              if (src) {
                onImageClick(src);
              }
            }
          },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Add event listeners
    view.dom.addEventListener("paste", handlePaste);
    view.dom.addEventListener("drop", handleDrop);

    return () => {
      view.dom.removeEventListener("paste", handlePaste);
      view.dom.removeEventListener("drop", handleDrop);
      view.destroy();
      viewRef.current = null;
    };
  }, []); // Only run once on mount

  // Update content when it changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (view && content !== view.state.doc.toString()) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      });
    }
  }, [content]);

  return (
    <div className="markdown-editor font-serif relative">
      <div ref={editorRef} className="min-h-[400px]" />

      <style jsx global>{`
        .markdown-editor .cm-editor {
          background: transparent;
        }

        /* Style markdown syntax characters to be subtle */
        .markdown-editor .cm-line .tok-meta,
        .markdown-editor .cm-line .tok-processingInstruction {
          opacity: 0.5;
        }

        /* Make headings look like headings even with # visible */
        .markdown-editor .cm-line:has(.tok-heading1) {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          line-height: 1.2;
        }

        .markdown-editor .cm-line:has(.tok-heading2) {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }

        .markdown-editor .cm-line:has(.tok-heading3) {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        /* Code blocks */
        .markdown-editor .cm-line:has(.tok-monospace) {
          font-family: var(--font-mono), ui-monospace, monospace;
        }

        /* Blockquotes */
        .markdown-editor .cm-line:has(.tok-quote) {
          border-left: 3px solid var(--border);
          padding-left: 1rem;
          color: var(--muted);
          font-style: italic;
        }

        /* Links */
        .markdown-editor .tok-link,
        .markdown-editor .tok-url {
          color: var(--accent);
          text-decoration: underline;
        }

        /* Emphasis */
        .markdown-editor .tok-emphasis {
          font-style: italic;
        }

        .markdown-editor .tok-strong {
          font-weight: 700;
        }

        /* Dark mode adjustments */
        :root.dark .markdown-editor .tok-monospace {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
