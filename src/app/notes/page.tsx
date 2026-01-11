"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import Link from "next/link";
import {
  signInWithGoogle,
  signOut,
  onAuthChange,
  isAdminEmail,
} from "@/lib/auth";
import {
  NoteItem,
  getAllNotes,
  createNote,
  deleteNote,
  deleteFolderRecursive,
  updateNote,
} from "@/lib/notes";
import { deleteNoteImages } from "@/lib/notes-storage";
import { useDarkMode } from "@/hooks/useDarkMode";
import Sidebar from "@/components/notes/Sidebar";
import NoteEditor from "@/components/notes/NoteEditor";
import FolderView from "@/components/notes/FolderView";
import JSZip from "jszip";

export default function NotesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NoteItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<NoteItem | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const { isDark, toggle: toggleDarkMode, mounted } = useDarkMode();

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      if (u && isAdminEmail(u.email)) {
        setUser(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Load notes
  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user]);

  const loadNotes = async () => {
    const notes = await getAllNotes();
    setItems(notes);
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSelect = (item: NoteItem) => {
    setSelectedItem(item);
    if (item.type === "folder") {
      setCurrentFolderId(item.id!);
    }
  };

  const handleCreateNote = async (parentId: string | null) => {
    const id = await createNote({
      type: "note",
      title: "Untitled",
      parentId,
      content: "",
      date: new Date().toISOString().split("T")[0],
      tags: [],
    });
    await loadNotes();
    const newNote = items.find((i) => i.id === id) || {
      id,
      type: "note" as const,
      title: "Untitled",
      parentId,
      content: "",
      date: new Date().toISOString().split("T")[0],
      tags: [],
      createdAt: null as any,
      updatedAt: null as any,
    };
    setSelectedItem(newNote);
  };

  const handleCreateFolder = async (parentId: string | null) => {
    const id = await createNote({
      type: "folder",
      title: "New Folder",
      parentId,
    });
    await loadNotes();
  };

  const handleDelete = async (item: NoteItem) => {
    if (!item.id) return;
    const confirmed = window.confirm(
      item.type === "folder"
        ? "Delete this folder and all its contents?"
        : "Delete this note?"
    );
    if (!confirmed) return;

    if (item.type === "folder") {
      await deleteFolderRecursive(item.id);
    } else {
      await deleteNoteImages(item.id);
      await deleteNote(item.id);
    }

    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
    }
    await loadNotes();
  };

  const handleRename = async (item: NoteItem) => {
    const newName = window.prompt("Enter new name:", item.title);
    if (newName && newName !== item.title && item.id) {
      await updateNote(item.id, { title: newName });
      await loadNotes();
      if (selectedItem?.id === item.id) {
        setSelectedItem({ ...item, title: newName });
      }
    }
  };

  const handleNoteUpdate = useCallback((updatedNote: NoteItem) => {
    setItems((prev) =>
      prev.map((i) => (i.id === updatedNote.id ? updatedNote : i))
    );
    setSelectedItem(updatedNote);
  }, []);

  const handleBack = () => {
    if (selectedItem?.type === "folder") {
      // Go to parent folder or root
      const parent = items.find((i) => i.id === selectedItem.parentId);
      setSelectedItem(parent || null);
      setCurrentFolderId(parent?.id || null);
    } else {
      setSelectedItem(null);
    }
  };

  const handleExport = async () => {
    const zip = new JSZip();
    const imageMap: Record<string, string> = {};
    const imagesFolder = zip.folder("images");

    // Find all image URLs in notes
    const allImageUrls = new Set<string>();
    const notes = items.filter((i) => i.type === "note");
    for (const note of notes) {
      if (!note.content) continue;
      const imageMatches = note.content.matchAll(/<img[^>]+src="([^"]+)"/g);
      for (const match of imageMatches) {
        const url = match[1];
        if (url.startsWith("http")) {
          allImageUrls.add(url);
        }
      }
    }

    // Download images
    let imageCount = 0;
    for (const url of allImageUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          const ext = url.split(".").pop()?.split("?")[0] || "jpg";
          const filename = `image-${imageCount}.${ext}`;
          imageMap[url] = filename;
          imagesFolder?.file(filename, blob);
          imageCount++;
        }
      } catch (e) {
        console.warn(`Failed to download: ${url}`);
      }
    }

    // Build folder structure helper
    const getPath = (item: NoteItem): string => {
      if (!item.parentId) return "";
      const parent = items.find((i) => i.id === item.parentId);
      if (!parent) return "";
      const parentPath = getPath(parent);
      return parentPath ? `${parentPath}/${parent.title}` : parent.title;
    };

    // Create markdown files
    for (const note of notes) {
      let content = note.content || "";

      // Convert HTML to simple markdown
      content = content
        .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/g, "# $1\n\n")
        .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, "## $1\n\n")
        .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, "### $1\n\n")
        .replace(/<p[^>]*>([\s\S]*?)<\/p>/g, "$1\n\n")
        .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/g, "**$1**")
        .replace(/<em[^>]*>([\s\S]*?)<\/em>/g, "*$1*")
        .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, "$1")
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/g, "- $1\n")
        .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g, "> $1\n\n")
        .replace(/<[^>]+>/g, "");

      // Replace image URLs
      for (const [url, filename] of Object.entries(imageMap)) {
        content = content.replace(url, `./images/${filename}`);
      }

      // Create frontmatter
      const markdown = `---
title: "${note.title}"
date: "${note.date || ""}"
tags: [${note.tags?.map((t) => `"${t}"`).join(", ") || ""}]
---

${content}`;

      const path = getPath(note);
      const filePath = path
        ? `${path}/${note.title || "Untitled"}.md`
        : `${note.title || "Untitled"}.md`;
      zip.file(filePath, markdown);
    }

    // Generate and download
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notes-export-${new Date().toISOString().split("T")[0]}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-[--background] flex items-center justify-center">
        <p className="text-[--muted]">Loading...</p>
      </div>
    );
  }

  // Auth gate
  if (!user) {
    return (
      <div className="min-h-screen bg-[--background] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-[--foreground] mb-8">Notes</h1>
        <button
          onClick={handleSignIn}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sign in with Google
        </button>
        <Link
          href="/"
          className="mt-8 text-[--muted] hover:text-[--accent] text-sm"
        >
          &larr; back to site
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--background] flex">
      {/* Sidebar */}
      <Sidebar
        items={items}
        selectedId={selectedItem?.id || null}
        collapsed={sidebarCollapsed}
        currentFolderId={currentFolderId}
        onSelect={handleSelect}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onCreateNote={handleCreateNote}
        onCreateFolder={handleCreateFolder}
        onDelete={handleDelete}
        onRename={handleRename}
        onSearch={setSearchQuery}
        onExport={handleExport}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-[--border] bg-[--sidebar-bg]">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
          <Link
            href="/admin"
            className="p-2 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
            title="Admin"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <Link
            href="/"
            className="p-2 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
            title="Home"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
          <button
            onClick={handleSignOut}
            className="p-2 text-[--muted] hover:text-red-500 hover:bg-[--hover] rounded"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Content area */}
        {selectedItem?.type === "note" ? (
          <NoteEditor note={selectedItem} onUpdate={handleNoteUpdate} />
        ) : (
          <FolderView
            folder={selectedItem}
            items={items}
            searchQuery={searchQuery}
            onSelect={handleSelect}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
