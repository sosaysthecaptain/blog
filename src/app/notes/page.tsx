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
    <div className="h-screen bg-[--background] flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        items={items}
        selectedId={selectedItem?.id || null}
        collapsed={sidebarCollapsed}
        currentFolderId={currentFolderId}
        isDark={isDark}
        onSelect={handleSelect}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onCreateNote={handleCreateNote}
        onCreateFolder={handleCreateFolder}
        onDelete={handleDelete}
        onRename={handleRename}
        onSearch={setSearchQuery}
        onExport={handleExport}
        onToggleDarkMode={toggleDarkMode}
        onSignOut={handleSignOut}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
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
