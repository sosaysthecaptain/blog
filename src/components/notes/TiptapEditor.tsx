"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback, useState } from "react";
import { uploadNoteImage } from "@/lib/notes-storage";

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  noteId: string;
  placeholder?: string;
}

export default function TiptapEditor({
  content,
  onChange,
  noteId,
  placeholder = "Start typing...",
}: TiptapEditorProps) {
  const [isUploading, setIsUploading] = useState(false);

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
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
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
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const blob = item.getAsFile();
            if (blob) {
              handleImageUpload(blob);
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        for (const file of files) {
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  const handleImageUpload = useCallback(
    async (blob: Blob) => {
      if (!editor) return;

      const id = noteId || `temp-${Date.now()}`;
      setIsUploading(true);
      try {
        const url = await uploadNoteImage(blob, id);
        editor
          .chain()
          .focus()
          .setImage({ src: url, alt: "Image" })
          .run();
      } catch (error) {
        console.error("Failed to upload image:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [editor, noteId]
  );

  // Update content when it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

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

      {isUploading && (
        <div className="inline-flex items-center gap-2 px-3 py-2 mt-4 border-2 border-dashed border-[--border] rounded bg-[--hover] text-[--muted] text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Uploading image...
        </div>
      )}

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
        .tiptap-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
          cursor: pointer;
        }
        .tiptap-editor .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid var(--accent);
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

        /* Image upload placeholder */
        .tiptap-editor .ProseMirror .image-upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          margin: 1.5rem 0;
          border: 2px dashed var(--border);
          border-radius: 0.5rem;
          background: var(--hover);
          color: var(--muted);
          font-size: 0.875rem;
        }
        .tiptap-editor .ProseMirror .image-upload-placeholder .upload-progress {
          width: 120px;
          height: 4px;
          background: var(--border);
          border-radius: 2px;
          margin-bottom: 0.5rem;
          overflow: hidden;
        }
        .tiptap-editor .ProseMirror .image-upload-placeholder .upload-progress::after {
          content: '';
          display: block;
          width: 40%;
          height: 100%;
          background: var(--accent);
          animation: progress 1s ease-in-out infinite;
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }

        /* Dark mode adjustments */
        :root.dark .tiptap-editor .ProseMirror code {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
