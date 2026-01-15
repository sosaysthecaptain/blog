"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Extension, InputRule } from "@tiptap/core";

// Custom input rules for "- []" and "- [x]" syntax
const TaskListInputRules = Extension.create({
  name: "taskListInputRules",

  addInputRules() {
    return [
      // "- []" at start of line creates unchecked task
      new InputRule({
        find: /^-\s?\[\]\s$/,
        handler: ({ state, range, chain }) => {
          chain()
            .deleteRange(range)
            .toggleTaskList()
            .run();
        },
      }),
      // "- [x]" or "- [X]" at start of line creates checked task
      new InputRule({
        find: /^-\s?\[[xX]\]\s$/,
        handler: ({ state, range, chain }) => {
          chain()
            .deleteRange(range)
            .toggleTaskList()
            .updateAttributes("taskItem", { checked: true })
            .run();
        },
      }),
    ];
  },
});
import { useEffect, useCallback, useRef, useState } from "react";
import { uploadNoteImage, uploadNoteFile } from "@/lib/notes-storage";
import { ImagePlaceholder } from "./ImagePlaceholder";
import { ImageWithCaption } from "./ImageWithCaption";
import { FilePlaceholder } from "./FilePlaceholder";
import { FileAttachment } from "./FileAttachment";

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
      FilePlaceholder,
      FileAttachment,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[--accent] underline",
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TaskListInputRules,
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

  // Handle generic file upload (non-images)
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!editor) return;

      // Generate unique ID for this placeholder
      const placeholderId = `file-upload-${Date.now()}-${placeholderIdRef.current++}`;

      // Insert placeholder at cursor position
      editor
        .chain()
        .focus()
        .insertContent({
          type: "filePlaceholder",
          attrs: { id: placeholderId, filename: file.name },
        })
        .run();

      const id = noteId || `temp-${Date.now()}`;
      try {
        const { url, filename, size } = await uploadNoteFile(file, id);

        // Find and replace the placeholder with the actual file attachment
        const { doc } = editor.state;
        let placeholderPos: number | null = null;

        doc.descendants((node, pos) => {
          if (
            node.type.name === "filePlaceholder" &&
            node.attrs.id === placeholderId
          ) {
            placeholderPos = pos;
            return false;
          }
          return true;
        });

        if (placeholderPos !== null) {
          // Delete placeholder and insert file attachment
          editor
            .chain()
            .focus()
            .setNodeSelection(placeholderPos)
            .deleteSelection()
            .setFileAttachment({ url, filename, size })
            .run();
        } else {
          // Fallback: just insert at current position
          editor
            .chain()
            .focus()
            .setFileAttachment({ url, filename, size })
            .run();
        }
      } catch (error) {
        console.error("Failed to upload file:", error);
        // Remove the placeholder on error
        const { doc } = editor.state;
        doc.descendants((node, pos) => {
          if (
            node.type.name === "filePlaceholder" &&
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

  // Handle file paste/drop events (images and other files)
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;

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

    editorElement.addEventListener("paste", handlePaste);
    editorElement.addEventListener("drop", handleDrop);

    return () => {
      editorElement.removeEventListener("paste", handlePaste);
      editorElement.removeEventListener("drop", handleDrop);
    };
  }, [editor, handleImageUpload, handleFileUpload]);

  // Update content when it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Handle image double-clicks for lightbox (single click just selects)
  useEffect(() => {
    if (!editor || !onImageClick) return;

    const editorElement = editor.view.dom;

    const handleDoubleClick = (e: MouseEvent) => {
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

    editorElement.addEventListener("dblclick", handleDoubleClick);
    return () => editorElement.removeEventListener("dblclick", handleDoubleClick);
  }, [editor, onImageClick]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          handleImageUpload(file);
        } else {
          handleFileUpload(file);
        }
      }
    }
    // Reset input so same file can be selected again
    event.target.value = "";
    setShowUploadMenu(false);
  }, [handleImageUpload, handleFileUpload]);

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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="*/*"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
      />

      {/* Upload button - floating action button */}
      <div className="fixed bottom-6 right-6 sm:absolute sm:bottom-4 sm:right-4 z-50">
        <button
          type="button"
          onClick={() => setShowUploadMenu(!showUploadMenu)}
          className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-[--accent] text-white shadow-lg hover:opacity-90 transition-all flex items-center justify-center"
          title="Add image or file"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 sm:w-5 sm:h-5">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        {/* Upload menu dropdown */}
        {showUploadMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUploadMenu(false)}
            />
            <div className="absolute bottom-14 sm:bottom-12 right-0 bg-[--background] border border-[--border] rounded-lg shadow-xl overflow-hidden z-50 min-w-[160px]">
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "image/*";
                    fileInputRef.current.click();
                  }
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-[--hover] flex items-center gap-3 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-[--accent]">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span>Add Image</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "*/*";
                    fileInputRef.current.click();
                  }
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-[--hover] flex items-center gap-3 transition-colors border-t border-[--border]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-[--accent]">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3" />
                </svg>
                <span>Add File</span>
              </button>
            </div>
          </>
        )}
      </div>

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

        /* Task list / checklist styles */
        .tiptap-editor .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
          margin: 1rem 0;
        }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin: 0.25rem 0;
        }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 0.25rem;
        }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
          width: 1.1rem;
          height: 1.1rem;
          cursor: pointer;
          accent-color: var(--accent);
        }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1;
        }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
          text-decoration: line-through;
          color: var(--muted);
        }
        /* Nested task lists */
        .tiptap-editor .ProseMirror ul[data-type="taskList"] ul[data-type="taskList"] {
          margin: 0.25rem 0 0.25rem 1.5rem;
        }

        /* Dark mode adjustments */
        :root.dark .tiptap-editor .ProseMirror code {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
