import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import MarkdownEditor from "../src/components/notes/MarkdownEditor";
import { EditorDisplayPrefs } from "../src/lib/notes";
import "../src/app/globals.css";

// Standalone editor for embedding in native apps via WebView
function EmbeddedEditor() {
  const [content, setContent] = useState("");
  const [noteId, setNoteId] = useState("embedded");
  const [displayPrefs, setDisplayPrefs] = useState<EditorDisplayPrefs>({
    wordWrap: true,
    font: "mono",
    fontSize: "base",
    showMarkdownSyntax: false,
  });
  const contentRef = useRef(content);

  // Keep ref in sync for getContent()
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Notify native app of content changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    // Send to native app via webkit messageHandler (macOS/iOS)
    if ((window as any).webkit?.messageHandlers?.contentChanged) {
      (window as any).webkit.messageHandlers.contentChanged.postMessage({
        type: "content",
        markdown: newContent,
      });
    }
  }, []);

  // Expose functions for native app to call
  useEffect(() => {
    (window as any).editorAPI = {
      setContent: (markdown: string) => {
        setContent(markdown);
      },
      getContent: () => {
        return contentRef.current;
      },
      setNoteId: (id: string) => {
        setNoteId(id);
      },
      setFont: (font: "mono" | "serif" | "sans") => {
        setDisplayPrefs((prev) => ({ ...prev, font }));
      },
      setFontSize: (fontSize: "xs" | "sm" | "base" | "lg" | "xl") => {
        setDisplayPrefs((prev) => ({ ...prev, fontSize }));
      },
      setShowMarkdownSyntax: (show: boolean) => {
        setDisplayPrefs((prev) => ({ ...prev, showMarkdownSyntax: show }));
      },
      setDarkMode: (isDark: boolean) => {
        if (isDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },
    };

    // Check URL params for initial settings
    const params = new URLSearchParams(window.location.search);
    if (params.get("dark") === "true") {
      document.documentElement.classList.add("dark");
    }
    const font = params.get("font") as "mono" | "serif" | "sans" | null;
    if (font && ["mono", "serif", "sans"].includes(font)) {
      setDisplayPrefs((prev) => ({ ...prev, font }));
    }

    // Notify native app that editor is ready
    if ((window as any).webkit?.messageHandlers?.editorReady) {
      (window as any).webkit.messageHandlers.editorReady.postMessage(true);
    }

    return () => {
      delete (window as any).editorAPI;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[--background] text-[--foreground] p-4">
      <MarkdownEditor
        content={content}
        onChange={handleContentChange}
        noteId={noteId}
        placeholder="Start writing..."
        displayPrefs={displayPrefs}
      />
    </div>
  );
}

// Mount the app
const root = createRoot(document.getElementById("root")!);
root.render(<EmbeddedEditor />);
