"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback, useRef } from "react";
import { uploadNoteImage } from "@/lib/notes-storage";
import { ImagePlaceholder } from "./ImagePlaceholder";
import { ImageWithCaption } from "./ImageWithCaption";

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  noteId: string;
  placeholder?: string;
  onImageClick?: (src: string) => void;
}

export default function TiptapEditor({
  content,
  onChange,
  noteId,
  placeholder = "Start typing...",
  onImageClick,
}: TiptapEditorProps) {
  const placeholderIdRef = useRef(0);
  const noteIdRef = useRef(noteId);

  // Keep noteId ref in sync
  useEffect(() => {
    noteIdRef.current = noteId;
  }, [noteId]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      ImagePlaceholder,
      ImageWithCaption,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[--accent] underline",
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[400px]",
      },
    },
  });

  const handleImageUpload = useCallback(
    async (blob: Blob) => {
      if (!editor) return;

      // Generate unique ID for this placeholder
      const placeholderId = `upload-${Date.now()}-${placeholderIdRef.current++}`;

      // Insert placeholder at cursor position
      editor
        .chain()
        .focus()
        .insertContent({
          type: "imagePlaceholder",
          attrs: { id: placeholderId },
        })
        .run();

      const id = noteId || `temp-${Date.now()}`;
      try {
        const url = await uploadNoteImage(blob, id);

        // Find and replace the placeholder with the actual image
        const { doc, tr } = editor.state;
        let placeholderPos: number | null = null;

        doc.descendants((node, pos) => {
          if (
            node.type.name === "imagePlaceholder" &&
            node.attrs.id === placeholderId
          ) {
            placeholderPos = pos;
            return false;
          }
          return true;
        });

        if (placeholderPos !== null) {
          // Delete placeholder and insert image with caption
          editor
            .chain()
            .focus()
            .setNodeSelection(placeholderPos)
            .deleteSelection()
            .setImageWithCaption({ src: url, alt: "Image", caption: "" })
            .run();
        } else {
          // Fallback: just insert at current position
          editor
            .chain()
            .focus()
            .setImageWithCaption({ src: url, alt: "Image", caption: "" })
            .run();
        }
      } catch (error) {
        console.error("Failed to upload image:", error);
        // Remove the placeholder on error
        const { doc } = editor.state;
        doc.descendants((node, pos) => {
          if (
            node.type.name === "imagePlaceholder" &&
            node.attrs.id === placeholderId
          ) {
            editor
              .chain()
              .focus()
              .setNodeSelection(pos)
              .deleteSelection()
              .run();
            return false;
          }
          return true;
        });
      }
    },
    [editor, noteId]
  );

  // Handle image paste/drop events
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;

    const handlePaste = (event: ClipboardEvent) => {
      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            handleImageUpload(file);
            return;
          }
        }
      }
    };

    const handleDrop = (event: DragEvent) => {
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            handleImageUpload(file);
            return;
          }
        }
      }
    };

    editorElement.addEventListener("paste", handlePaste);
    editorElement.addEventListener("drop", handleDrop);

    return () => {
      editorElement.removeEventListener("paste", handlePaste);
      editorElement.removeEventListener("drop", handleDrop);
    };
  }, [editor, handleImageUpload]);

  // Update content when it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Handle image clicks for lightbox
  useEffect(() => {
    if (!editor || !onImageClick) return;

    const editorElement = editor.view.dom;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        const src = target.getAttribute("src");
        if (src) {
          e.preventDefault();
          e.stopPropagation();
          onImageClick(src);
        }
      }
    };

    editorElement.addEventListener("click", handleClick);
    return () => editorElement.removeEventListener("click", handleClick);
  }, [editor, onImageClick]);

  if (!editor) {
    return (
      <div className="min-h-[400px]">
        <span className="text-[--muted]">Loading...</span>
      </div>
    );
  }

  return (
    <div className="tiptap-editor font-serif relative">
      <EditorContent editor={editor} />

      <style jsx global>{`
        .tiptap-editor .ProseMirror {
          outline: none;
          font-family: var(--font-serif), Georgia, serif;
          font-size: 1.125rem;
          line-height: 1.75;
          color: var(--foreground);
        }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: var(--muted);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap-editor .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          line-height: 1.2;
        }
        .tiptap-editor .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }
        .tiptap-editor .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        .tiptap-editor .ProseMirror p {
          margin: 1rem 0;
        }
        .tiptap-editor .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .tiptap-editor .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .tiptap-editor .ProseMirror li {
          margin: 0.25rem 0;
        }
        .tiptap-editor .ProseMirror li p {
          margin: 0;
        }
        .tiptap-editor .ProseMirror blockquote {
          border-left: 3px solid var(--border);
          padding-left: 1rem;
          margin: 1.5rem 0;
          color: var(--muted);
          font-style: italic;
        }
        .tiptap-editor .ProseMirror pre {
          background: #2d2d2d;
          color: #f8f8f2;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: 0.875rem;
          margin: 1.5rem 0;
        }
        .tiptap-editor .ProseMirror code {
          background: rgba(0, 0, 0, 0.08);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: 0.9em;
        }
        .tiptap-editor .ProseMirror pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
        }
        .tiptap-editor .ProseMirror a {
          color: var(--accent);
          text-decoration: underline;
        }
        .tiptap-editor .ProseMirror hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 2rem 0;
        }
        .tiptap-editor .ProseMirror strong {
          font-weight: 700;
        }
        .tiptap-editor .ProseMirror em {
          font-style: italic;
        }

        /* Dark mode adjustments */
        :root.dark .tiptap-editor .ProseMirror code {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
