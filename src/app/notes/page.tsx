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
import { getAllPosts, Post } from "@/lib/firestore";
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
  const [isFullWidth, setIsFullWidth] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
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
    const now = new Date();
    const newNote: NoteItem = {
      type: "note",
      title: "Untitled",
      parentId,
      content: "",
      date: now.toISOString().split("T")[0],
      tags: [],
      createdAt: now as any,
      updatedAt: now as any,
    };
    const id = await createNote(newNote);
    newNote.id = id;
    // Add to items immediately so it shows in the list
    setItems((prev) => [...prev, newNote]);
    setSelectedItem(newNote);
  };

  const handleCreateFolder = async (parentId: string | null) => {
    const now = new Date();
    const newFolder: NoteItem = {
      type: "folder",
      title: "New Folder",
      parentId,
      createdAt: now as any,
      updatedAt: now as any,
    };
    const id = await createNote(newFolder);
    newFolder.id = id;
    setItems((prev) => [...prev, newFolder]);
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

  const handleRename = (item: NoteItem) => {
    if (item.id) {
      setRenamingId(item.id);
    }
  };

  const handleRenameSubmit = async (itemId: string, newName: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || !newName.trim() || newName === item.title) {
      setRenamingId(null);
      return;
    }
    await updateNote(itemId, { title: newName.trim() });
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, title: newName.trim() } : i))
    );
    if (selectedItem?.id === itemId) {
      setSelectedItem({ ...item, title: newName.trim() });
    }
    setRenamingId(null);
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
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

  const handleMove = async (itemId: string, newParentId: string | null) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.parentId === newParentId) return;

    await updateNote(itemId, { parentId: newParentId });
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, parentId: newParentId } : i))
    );
  };

  // Helper to get all descendant notes of a folder
  const getNotesInFolder = (folderId: string | null): NoteItem[] => {
    const result: NoteItem[] = [];
    const addChildren = (parentId: string | null) => {
      for (const item of items) {
        if (item.parentId === parentId) {
          if (item.type === "note") {
            result.push(item);
          } else if (item.type === "folder" && item.id) {
            addChildren(item.id);
          }
        }
      }
    };
    addChildren(folderId);
    return result;
  };

  const exportNotes = async (notesToExport: NoteItem[], filename: string) => {
    const zip = new JSZip();
    const imageMap: Record<string, string> = {};
    const imagesFolder = zip.folder("images");

    // Find all image URLs in notes
    const allImageUrls = new Set<string>();
    for (const note of notesToExport) {
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
          const imgFilename = `image-${imageCount}.${ext}`;
          imageMap[url] = imgFilename;
          imagesFolder?.file(imgFilename, blob);
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
    for (const note of notesToExport) {
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
      for (const [url, imgFilename] of Object.entries(imageMap)) {
        content = content.replace(url, `./images/${imgFilename}`);
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
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    const notes = items.filter((i) => i.type === "note");
    await exportNotes(notes, `notes-export-${new Date().toISOString().split("T")[0]}.zip`);
  };

  const handleExportFolder = async (folderId: string) => {
    const folder = items.find((i) => i.id === folderId);
    const notes = getNotesInFolder(folderId);
    const folderName = folder?.title || "folder";
    await exportNotes(notes, `${folderName}-export-${new Date().toISOString().split("T")[0]}.zip`);
  };

  // Convert markdown to simple HTML for TipTap
  const markdownToHtml = (md: string): string => {
    return md
      // Code blocks (must come before inline code)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Images with captions (custom markdown: ![alt](src "caption"))
      .replace(/!\[([^\]]*)\]\(([^)]+)\s+"([^"]+)"\)/g, '<figure data-image-caption><img src="$2" alt="$1"><figcaption>$3</figcaption></figure>')
      // Regular images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure data-image-caption><img src="$2" alt="$1"><figcaption></figcaption></figure>')
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Blockquotes
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // Unordered lists
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Wrap consecutive list items
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr>')
      // Paragraphs (lines not already wrapped)
      .split('\n\n')
      .map(block => {
        if (block.startsWith('<') || block.trim() === '') return block;
        return `<p>${block.replace(/\n/g, '<br>')}</p>`;
      })
      .join('\n');
  };

  // Import blog posts into notes
  const handleImportBlogPosts = async () => {
    const confirmed = window.confirm(
      "Import all blog posts into a 'blog' folder? This will create a new folder and convert posts to notes."
    );
    if (!confirmed) return;

    try {
      // Get all blog posts
      const posts = await getAllPosts();
      if (posts.length === 0) {
        alert("No blog posts found to import.");
        return;
      }

      // Check if blog folder already exists
      let blogFolder = items.find(
        (i) => i.type === "folder" && i.title.toLowerCase() === "blog" && i.parentId === null
      );

      // Create blog folder if it doesn't exist
      if (!blogFolder) {
        const now = new Date();
        const newFolder: NoteItem = {
          type: "folder",
          title: "blog",
          parentId: null,
          createdAt: now as any,
          updatedAt: now as any,
        };
        const folderId = await createNote(newFolder);
        blogFolder = { ...newFolder, id: folderId };
        setItems((prev) => [...prev, blogFolder!]);
      }

      // Import each post
      const newNotes: NoteItem[] = [];
      for (const post of posts) {
        // Check if a note with this title already exists in the blog folder
        const existingNote = items.find(
          (i) => i.type === "note" && i.parentId === blogFolder!.id && i.title === post.title
        );
        if (existingNote) continue; // Skip duplicates

        const now = new Date();
        const newNote: NoteItem = {
          type: "note",
          title: post.title,
          parentId: blogFolder.id!,
          content: markdownToHtml(post.content || ""),
          date: post.date,
          tags: post.tags || [],
          createdAt: now as any,
          updatedAt: now as any,
        };
        const noteId = await createNote(newNote);
        newNotes.push({ ...newNote, id: noteId });
      }

      setItems((prev) => [...prev, ...newNotes]);
      alert(`Imported ${newNotes.length} blog posts into the 'blog' folder.`);
    } catch (error) {
      console.error("Import error:", error);
      alert("Failed to import blog posts. See console for details.");
    }
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
        searchQuery={searchQuery}
        collapsed={sidebarCollapsed}
        currentFolderId={currentFolderId}
        isDark={isDark}
        onSelect={handleSelect}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onCreateNote={handleCreateNote}
        onCreateFolder={handleCreateFolder}
        onDelete={handleDelete}
        onRename={handleRename}
        onRenameSubmit={handleRenameSubmit}
        onRenameCancel={handleRenameCancel}
        renamingId={renamingId}
        onMove={handleMove}
        onSearch={(query) => {
          setSearchQuery(query);
          // Clear selection when searching so results are visible
          if (query) {
            setSelectedItem(null);
          }
        }}
        onExport={handleExport}
        onExportFolder={handleExportFolder}
        onImportBlogPosts={handleImportBlogPosts}
        onToggleDarkMode={toggleDarkMode}
        onSignOut={handleSignOut}
        isFullWidth={isFullWidth}
        onToggleFullWidth={() => setIsFullWidth(!isFullWidth)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedItem?.type === "note" ? (
          <NoteEditor
            note={selectedItem}
            parentFolder={selectedItem.parentId ? items.find(i => i.id === selectedItem.parentId && i.type === "folder") || null : null}
            onUpdate={handleNoteUpdate}
            onBack={() => {
              // Navigate back to parent folder or root
              const parent = items.find(i => i.id === selectedItem.parentId);
              if (parent) {
                setSelectedItem(parent);
                setCurrentFolderId(parent.id!);
              } else {
                setSelectedItem(null);
                setCurrentFolderId(null);
              }
            }}
            isFullWidth={isFullWidth}
          />
        ) : (
          <FolderView
            folder={selectedItem}
            items={items}
            searchQuery={searchQuery}
            onSelect={handleSelect}
            onBack={handleBack}
            onCreateNote={handleCreateNote}
          />
        )}
      </div>
    </div>
  );
}
