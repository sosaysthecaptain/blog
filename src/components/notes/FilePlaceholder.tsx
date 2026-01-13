"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";

// Placeholder node that shows while file is uploading
export const FilePlaceholder = Node.create({
  name: "filePlaceholder",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      filename: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-file-placeholder]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-file-placeholder": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FilePlaceholderView);
  },
});

function FilePlaceholderView({ node }: NodeViewProps) {
  const filename = (node.attrs.filename as string) || "file";

  return (
    <NodeViewWrapper>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px",
          margin: "12px 0",
          backgroundColor: "var(--hover)",
          border: "2px dashed var(--border)",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            border: "3px solid var(--border)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Uploading {filename}...
          </div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </NodeViewWrapper>
  );
}

export default FilePlaceholder;
