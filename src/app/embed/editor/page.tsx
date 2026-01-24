"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import MarkdownEditor from "@/components/notes/MarkdownEditor";
import { EditorDisplayPrefs } from "@/lib/notes";

// This page is designed to be embedded in a native app WebView
// Communication happens via window.postMessage and webkit messageHandlers

export default function EmbeddedEditorPage() {
  const [content, setContent] = useState("");
  const [noteId, setNoteId] = useState("embedded");
  const [ready, setReady] = useState(false);
  const [displayPrefs, setDisplayPrefs] = useState<EditorDisplayPrefs>({
    wordWrap: true,
    font: "mono",
    fontSize: "base",
    showMarkdownSyntax: false,
  });
  const contentRef = useRef(content);

  // Keep ref in sync
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Notify native app of content changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    // Send to native app via webkit messageHandler (iOS)
    if ((window as any).webkit?.messageHandlers?.contentChanged) {
      (window as any).webkit.messageHandlers.contentChanged.postMessage(newContent);
    }
    // Also post to parent window (for web embedding)
    window.parent?.postMessage({ type: "contentChanged", content: newContent }, "*");
  }, []);

  // Listen for messages from native app
  useEffect(() => {
    // Expose functions for native app to call
    (window as any).setContent = (markdown: string) => {
      setContent(markdown);
    };

    (window as any).getContent = () => {
      return contentRef.current;
    };

    (window as any).setNoteId = (id: string) => {
      setNoteId(id);
    };

    (window as any).setFont = (font: "mono" | "serif" | "sans") => {
      setDisplayPrefs(prev => ({ ...prev, font }));
    };

    (window as any).setFontSize = (fontSize: "xs" | "sm" | "base" | "lg" | "xl") => {
      setDisplayPrefs(prev => ({ ...prev, fontSize }));
    };

    (window as any).setShowMarkdownSyntax = (show: boolean) => {
      setDisplayPrefs(prev => ({ ...prev, showMarkdownSyntax: show }));
    };

    (window as any).updateDarkMode = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    // Handle postMessage from parent (for web embedding)
    const handleMessage = (event: MessageEvent) => {
      const { type, ...data } = event.data || {};
      switch (type) {
        case "setContent":
          setContent(data.content || "");
          break;
        case "setNoteId":
          setNoteId(data.noteId || "embedded");
          break;
        case "setFont":
          setDisplayPrefs(prev => ({ ...prev, font: data.font }));
          break;
        case "setDarkMode":
          if (data.dark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    // Notify native app that editor is ready
    setReady(true);
    if ((window as any).webkit?.messageHandlers?.editorReady) {
      (window as any).webkit.messageHandlers.editorReady.postMessage(true);
    }
    window.parent?.postMessage({ type: "editorReady" }, "*");

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Check URL params for initial dark mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dark") === "true") {
      document.documentElement.classList.add("dark");
    }
    if (params.get("font")) {
      const font = params.get("font") as "mono" | "serif" | "sans";
      if (["mono", "serif", "sans"].includes(font)) {
        setDisplayPrefs(prev => ({ ...prev, font }));
      }
    }
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[--background] flex items-center justify-center">
        <div className="text-[--muted] text-sm">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      <div className="p-4">
        <MarkdownEditor
          content={content}
          onChange={handleContentChange}
          noteId={noteId}
          placeholder="Start writing..."
          displayPrefs={displayPrefs}
        />
      </div>
    </div>
  );
}
