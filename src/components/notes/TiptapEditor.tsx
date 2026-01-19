"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
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
import { useEffect, useCallback, useRef } from "react";
import { uploadNoteImage, uploadNoteFile } from "@/lib/notes-storage";
import { ImagePlaceholder } from "./ImagePlaceholder";
import { ImageWithCaption } from "./ImageWithCaption";
import { FilePlaceholder } from "./FilePlaceholder";
import { FileAttachment } from "./FileAttachment";

interface MediaInfo {
  id: string;
  url: string;
  path: string;
  type: "image" | "file";
  filename?: string;
  fileSize: number;
}

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  noteId: string;
  placeholder?: string;
  onImageClick?: (src: string) => void;
  onMediaAdded?: (media: MediaInfo) => void;
}

export default function TiptapEditor({
  content,
  onChange,
  noteId,
  placeholder = "Start typing...",
  onImageClick,
  onMediaAdded,
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
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
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
        const result = await uploadNoteImage(blob, id);

        // Track the media for size calculation and cleanup
        if (onMediaAdded) {
          onMediaAdded({
            id: `img-${Date.now()}`,
            url: result.url,
            path: result.path,
            type: "image",
            fileSize: result.size,
          });
        }

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
            .setImageWithCaption({ src: result.url, alt: "Image", caption: "" })
            .run();
        } else {
          // Fallback: just insert at current position
          editor
            .chain()
            .focus()
            .setImageWithCaption({ src: result.url, alt: "Image", caption: "" })
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
    [editor, noteId, onMediaAdded]
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
        const result = await uploadNoteFile(file, id);

        // Track the media for size calculation and cleanup
        if (onMediaAdded) {
          onMediaAdded({
            id: `file-${Date.now()}`,
            url: result.url,
            path: result.path,
            type: "file",
            filename: result.filename,
            fileSize: result.size,
          });
        }

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
            .setFileAttachment({ url: result.url, filename: result.filename, size: result.size })
            .run();
        } else {
          // Fallback: just insert at current position
          editor
            .chain()
            .focus()
            .setFileAttachment({ url: result.url, filename: result.filename, size: result.size })
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
    [editor, noteId, onMediaAdded]
  );

  // Parse markdown table to TipTap table JSON
  const parseMarkdownTable = useCallback((text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;

    // Check if it looks like a markdown table
    const isTableLine = (line: string) => line.trim().startsWith('|') && line.trim().endsWith('|');
    const isSeparatorLine = (line: string) => /^\|[\s\-:|]+\|$/.test(line.trim());

    if (!lines.every((line, i) => i === 1 ? isSeparatorLine(line) : isTableLine(line))) {
      return null;
    }

    // Parse rows (skip separator line at index 1)
    const rows = lines
      .filter((_, i) => i !== 1)
      .map(line => {
        return line
          .split('|')
          .slice(1, -1) // Remove empty strings from leading/trailing |
          .map(cell => cell.trim());
      });

    if (rows.length === 0 || rows[0].length === 0) return null;

    // Build TipTap table structure
    const tableContent = rows.map((row, rowIndex) => ({
      type: rowIndex === 0 ? 'tableRow' : 'tableRow',
      content: row.map(cell => ({
        type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
        content: [{ type: 'paragraph', content: cell ? [{ type: 'text', text: cell }] : [] }],
      })),
    }));

    return {
      type: 'table',
      content: tableContent,
    };
  }, []);

  // Handle file paste/drop events (images and other files)
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;

    const handlePaste = (event: ClipboardEvent) => {
      // First check for files
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

      // Check for markdown table in pasted text
      const text = event.clipboardData?.getData('text/plain');
      if (text) {
        const table = parseMarkdownTable(text);
        if (table) {
          event.preventDefault();
          editor.chain().focus().insertContent(table).run();
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
  }, [editor, handleImageUpload, handleFileUpload, parseMarkdownTable]);

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
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }
        .tiptap-editor .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }
        .tiptap-editor .ProseMirror li {
          margin: 0.125rem 0;
        }
        .tiptap-editor .ProseMirror li p {
          margin: 0;
        }
        /* Nested lists - same spacing as list items */
        .tiptap-editor .ProseMirror li > ul,
        .tiptap-editor .ProseMirror li > ol {
          margin: 0;
        }
        /* Strikethrough */
        .tiptap-editor .ProseMirror s {
          text-decoration: line-through;
          color: var(--muted);
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
          margin: 0.5rem 0;
        }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin: 0.125rem 0;
        }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 0.3rem;
        }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
          -webkit-appearance: none;
          appearance: none;
          width: 1rem;
          height: 1rem;
          border: 1.5px solid var(--border);
          border-radius: 3px;
          background: var(--background);
          cursor: pointer;
          position: relative;
          transition: all 0.15s ease;
        }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:hover {
          border-color: var(--foreground);
        }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
          background: var(--foreground);
          border-color: var(--foreground);
        }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 45%;
          width: 5px;
          height: 9px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: translate(-50%, -50%) rotate(45deg);
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
          margin: 0.125rem 0 0.125rem 1.25rem;
        }
        /* Task list nested under regular list */
        .tiptap-editor .ProseMirror li > ul[data-type="taskList"] {
          margin: 0.125rem 0;
        }

        /* Table styles */
        .tiptap-editor .ProseMirror table {
          border-collapse: collapse;
          margin: 1rem 0;
          overflow: hidden;
          table-layout: fixed;
          width: 100%;
        }
        .tiptap-editor .ProseMirror table td,
        .tiptap-editor .ProseMirror table th {
          border: 1px solid var(--border);
          box-sizing: border-box;
          min-width: 1em;
          padding: 0.5rem 0.75rem;
          position: relative;
          vertical-align: top;
        }
        .tiptap-editor .ProseMirror table th {
          background: var(--hover);
          font-weight: 600;
          text-align: left;
        }
        .tiptap-editor .ProseMirror table .selectedCell:after {
          background: rgba(var(--accent-rgb, 59, 130, 246), 0.15);
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          pointer-events: none;
          position: absolute;
          z-index: 2;
        }
        .tiptap-editor .ProseMirror table .column-resize-handle {
          background-color: var(--accent);
          bottom: -2px;
          pointer-events: none;
          position: absolute;
          right: -2px;
          top: 0;
          width: 4px;
        }
        .tiptap-editor .ProseMirror .tableWrapper {
          overflow-x: auto;
          margin: 1rem 0;
        }

        /* Dark mode adjustments */
        :root.dark .tiptap-editor .ProseMirror code {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
