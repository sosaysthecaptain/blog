"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect } from "react";

export interface ImageWithCaptionOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageWithCaption: {
      setImageWithCaption: (options: { src: string; alt?: string; caption?: string }) => ReturnType;
    };
  }
}

export const ImageWithCaption = Node.create<ImageWithCaptionOptions>({
  name: "imageWithCaption",
  group: "block",
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      caption: {
        default: "",
      },
      width: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-image-caption]",
        getAttrs: (node) => {
          if (typeof node === "string") return {};
          const img = node.querySelector("img");
          const figcaption = node.querySelector("figcaption");
          return {
            src: img?.getAttribute("src"),
            alt: img?.getAttribute("alt"),
            caption: figcaption?.textContent || "",
            width: img?.getAttribute("width"),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, caption, width } = HTMLAttributes;
    return [
      "figure",
      mergeAttributes(this.options.HTMLAttributes, { "data-image-caption": "" }),
      ["img", { src, alt, width, style: width ? `width: ${width}px` : undefined }],
      ["figcaption", {}, caption || ""],
    ];
  },

  addCommands() {
    return {
      setImageWithCaption:
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
    return ReactNodeViewRenderer(ImageWithCaptionView);
  },
});

function ImageWithCaptionView({ node, updateAttributes, selected }: NodeViewProps) {
  const attrs = node.attrs as { src: string; alt?: string; caption?: string; width?: number };
  const { src, alt, caption, width } = attrs;
  const [isEditing, setIsEditing] = useState(false);
  const [captionText, setCaptionText] = useState(caption || "");
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width || null);
  const imageRef = useRef<HTMLImageElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    setCaptionText(caption || "");
  }, [caption]);

  useEffect(() => {
    setCurrentWidth(width || null);
  }, [width]);

  const handleCaptionBlur = () => {
    setIsEditing(false);
    if (captionText !== caption) {
      updateAttributes({ caption: captionText });
    }
  };

  const handleCaptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCaptionBlur();
    } else if (e.key === "Escape") {
      setCaptionText(caption || "");
      setIsEditing(false);
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = imageRef.current?.offsetWidth || 300;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(100, startWidthRef.current + diff);
      setCurrentWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (currentWidth) {
        updateAttributes({ width: currentWidth });
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <NodeViewWrapper>
      <figure
        style={{
          margin: "1.5rem 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
        data-image-caption=""
      >
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            ref={imageRef}
            src={src}
            alt={alt || ""}
            style={{
              maxWidth: "100%",
              width: currentWidth ? `${currentWidth}px` : undefined,
              height: "auto",
              borderRadius: "8px",
              outline: selected ? "2px solid var(--accent)" : undefined,
              cursor: "default",
            }}
          />
          {selected && (
            <div
              onMouseDown={handleResizeStart}
              style={{
                position: "absolute",
                right: "-6px",
                bottom: "-6px",
                width: "12px",
                height: "12px",
                backgroundColor: "var(--accent)",
                border: "2px solid white",
                borderRadius: "50%",
                cursor: "se-resize",
              }}
            />
          )}
        </div>
        {isEditing ? (
          <input
            type="text"
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            onBlur={handleCaptionBlur}
            onKeyDown={handleCaptionKeyDown}
            autoFocus
            placeholder="Add a caption..."
            style={{
              marginTop: "8px",
              padding: "4px 8px",
              fontSize: "14px",
              color: "var(--muted)",
              backgroundColor: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              outline: "none",
              width: "100%",
              maxWidth: currentWidth ? `${currentWidth}px` : "100%",
              fontStyle: "italic",
            }}
          />
        ) : (
          <figcaption
            onClick={() => setIsEditing(true)}
            style={{
              marginTop: "8px",
              fontSize: "14px",
              color: "var(--muted)",
              fontStyle: "italic",
              cursor: "text",
              padding: "4px 0",
              minHeight: "24px",
              width: "100%",
              maxWidth: currentWidth ? `${currentWidth}px` : "100%",
            }}
          >
            {captionText || (
              <span style={{ opacity: 0.5 }}>Click to add caption...</span>
            )}
          </figcaption>
        )}
      </figure>
    </NodeViewWrapper>
  );
}

export default ImageWithCaption;
