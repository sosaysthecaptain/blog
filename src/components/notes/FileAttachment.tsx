"use client";

import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";

export interface FileAttachmentOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fileAttachment: {
      setFileAttachment: (options: { url: string; filename: string; size: number }) => ReturnType;
    };
  }
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Get icon based on file type
function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  // Document types
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["xls", "xlsx"].includes(ext)) return "spreadsheet";
  if (["ppt", "pptx"].includes(ext)) return "presentation";

  // Code/text
  if (["txt", "md", "json", "xml", "csv"].includes(ext)) return "text";
  if (["js", "ts", "py", "java", "c", "cpp", "h", "css", "html"].includes(ext)) return "code";

  // Archives
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) return "archive";

  // Media
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "video";

  return "file";
}

export const FileAttachment = Node.create<FileAttachmentOptions>({
  name: "fileAttachment",
  group: "block",
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      url: { default: null },
      filename: { default: "file" },
      size: { default: 0 },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-file-attachment]",
        getAttrs: (node) => {
          if (typeof node === "string") return {};
          const a = node.querySelector("a");
          return {
            url: a?.getAttribute("href"),
            filename: a?.getAttribute("data-filename") || a?.textContent,
            size: parseInt(a?.getAttribute("data-size") || "0", 10),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { url, filename, size } = HTMLAttributes;
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, { "data-file-attachment": "" }),
      [
        "a",
        {
          href: url,
          download: filename,
          "data-filename": filename,
          "data-size": size,
          target: "_blank",
          rel: "noopener noreferrer",
        },
        filename,
      ],
    ];
  },

  addCommands() {
    return {
      setFileAttachment:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentView);
  },
});

function FileAttachmentView({ node, selected }: NodeViewProps) {
  const attrs = node.attrs as { url: string; filename: string; size: number };
  const { url, filename, size } = attrs;
  const iconType = getFileIcon(filename);

  const IconSvg = () => {
    // Base file icon paths
    const icons: Record<string, React.ReactElement> = {
      pdf: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path d="M7 21h10a2 2 0 002-2V9l-6-6H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path d="M13 3v6h6" />
          <text x="7" y="17" fontSize="6" fill="currentColor" stroke="none" fontWeight="bold">PDF</text>
        </svg>
      ),
      doc: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path d="M7 21h10a2 2 0 002-2V9l-6-6H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path d="M13 3v6h6" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      ),
      spreadsheet: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path d="M7 21h10a2 2 0 002-2V9l-6-6H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path d="M13 3v6h6" />
          <path d="M8 13h3v2H8v-2zM13 13h3v2h-3v-2zM8 17h3v2H8v-2zM13 17h3v2h-3v-2z" />
        </svg>
      ),
      archive: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path d="M7 21h10a2 2 0 002-2V9l-6-6H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path d="M13 3v6h6" />
          <rect x="10" y="12" width="4" height="2" rx="0.5" />
          <rect x="10" y="15" width="4" height="2" rx="0.5" />
        </svg>
      ),
      audio: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path d="M7 21h10a2 2 0 002-2V9l-6-6H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path d="M13 3v6h6" />
          <path d="M10 13v5a1 1 0 01-2 0v-3" />
          <circle cx="9" cy="16" r="1.5" />
        </svg>
      ),
      video: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path d="M7 21h10a2 2 0 002-2V9l-6-6H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path d="M13 3v6h6" />
          <path d="M10 13l4 2.5-4 2.5v-5z" fill="currentColor" />
        </svg>
      ),
      code: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path d="M7 21h10a2 2 0 002-2V9l-6-6H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path d="M13 3v6h6" />
          <path d="M10 14l-2 2 2 2M14 14l2 2-2 2" />
        </svg>
      ),
      text: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path d="M7 21h10a2 2 0 002-2V9l-6-6H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path d="M13 3v6h6" />
          <path d="M8 13h8M8 16h6" />
        </svg>
      ),
      file: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path d="M7 21h10a2 2 0 002-2V9l-6-6H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path d="M13 3v6h6" />
        </svg>
      ),
      presentation: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path d="M7 21h10a2 2 0 002-2V9l-6-6H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path d="M13 3v6h6" />
          <rect x="8" y="13" width="8" height="5" rx="0.5" />
        </svg>
      ),
    };
    return icons[iconType] || icons.file;
  };

  return (
    <NodeViewWrapper>
      <a
        href={url}
        download={filename}
        target="_blank"
        rel="noopener noreferrer"
        data-file-attachment=""
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px",
          margin: "12px 0",
          backgroundColor: "var(--hover)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          textDecoration: "none",
          color: "var(--foreground)",
          transition: "all 0.15s ease",
          outline: selected ? "2px solid var(--accent)" : undefined,
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = "var(--border)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "var(--hover)";
        }}
      >
        <div style={{ color: "var(--accent)", flexShrink: 0 }}>
          <IconSvg />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 500,
              fontSize: "14px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {filename}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            {formatFileSize(size)} &middot; Click to download
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ width: "20px", height: "20px", color: "var(--muted)", flexShrink: 0 }}
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
      </a>
    </NodeViewWrapper>
  );
}

export default FileAttachment;
