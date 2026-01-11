"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";

// Placeholder node that shows while image is uploading
export const ImagePlaceholder = Node.create({
  name: "imagePlaceholder",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-image-placeholder]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-image-placeholder": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImagePlaceholderView);
  },
});

function ImagePlaceholderView() {
  return (
    <NodeViewWrapper>
      <div
        className="image-placeholder-uploading"
        style={{
          width: "300px",
          height: "200px",
          border: "2px dashed var(--border)",
          borderRadius: "8px",
          backgroundColor: "var(--hover)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          margin: "1rem 0",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid var(--border)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <span style={{ color: "var(--muted)", fontSize: "14px" }}>
          Uploading image...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </NodeViewWrapper>
  );
}

export default ImagePlaceholder;
