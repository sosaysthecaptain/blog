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
  updateSortOrders,
} from "@/lib/notes";
import { getAllPosts, Post } from "@/lib/firestore";
import { deleteNoteImages, downloadImageBlob } from "@/lib/notes-storage";
import { useDarkMode } from "@/hooks/useDarkMode";
import Sidebar from "@/components/notes/Sidebar";
import NoteEditor from "@/components/notes/NoteEditor";
import FolderView from "@/components/notes/FolderView";
import { ConfirmDialog, AlertDialog } from "@/components/ui/Dialog";
import JSZip from "jszip";

export default function NotesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NoteItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<NoteItem | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<"date-desc" | "date-asc" | "title-asc" | "title-desc" | "updated-desc">("date-desc");
  const { isDark, toggle: toggleDarkMode, mounted } = useDarkMode();

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "default" | "danger";
  }>({ open: false, title: "", message: "", onConfirm: () => {} });
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });

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
      published: false,
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
    // Auto-select the folder and enter rename mode
    setSelectedItem(newFolder);
    setCurrentFolderId(id);
    setRenamingId(id);
  };

  const handleDelete = async (item: NoteItem) => {
    if (!item.id) return;

    const doDelete = async () => {
      if (item.type === "folder") {
        await deleteFolderRecursive(item.id!);
      } else {
        await deleteNoteImages(item.id!);
        await deleteNote(item.id!);
      }

      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
      await loadNotes();
    };

    setConfirmDialog({
      open: true,
      title: item.type === "folder" ? "Delete Folder" : "Delete Note",
      message: item.type === "folder"
        ? "Delete this folder and all its contents? This cannot be undone."
        : "Delete this note? This cannot be undone.",
      variant: "danger",
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        doDelete();
      },
    });
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

  const handleReorder = async (itemId: string, targetId: string, position: "before" | "after") => {
    const draggedItem = items.find(i => i.id === itemId);
    const targetItem = items.find(i => i.id === targetId);
    if (!draggedItem || !targetItem) return;

    // Only reorder if same parent
    if (draggedItem.parentId !== targetItem.parentId) return;

    // Get siblings in this parent, sorted by sortOrder
    const siblings = items
      .filter(i => i.parentId === draggedItem.parentId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    // Remove dragged item from list
    const withoutDragged = siblings.filter(s => s.id !== itemId);
    const targetIndex = withoutDragged.findIndex(s => s.id === targetId);

    // Insert at new position
    const newIndex = position === "before" ? targetIndex : targetIndex + 1;
    withoutDragged.splice(newIndex, 0, draggedItem);

    // Assign new sort orders (10, 20, 30, etc.)
    const updates = withoutDragged.map((item, index) => ({
      id: item.id!,
      sortOrder: (index + 1) * 10,
    }));

    // Update in batch
    await updateSortOrders(updates);

    // Update local state
    setItems(prev => {
      const updatedMap = new Map(updates.map(u => [u.id, u.sortOrder]));
      return prev.map(i => {
        const newOrder = updatedMap.get(i.id!);
        return newOrder !== undefined ? { ...i, sortOrder: newOrder } : i;
      }).sort((a, b) => {
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder;
        }
        if (a.sortOrder !== undefined) return -1;
        if (b.sortOrder !== undefined) return 1;
        return 0;
      });
    });
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

    // Find all image URLs in notes (handle both single and double quotes)
    const allImageUrls = new Set<string>();
    for (const note of notesToExport) {
      if (!note.content) continue;
      // Match src with double or single quotes
      const imageMatches = note.content.matchAll(/<img[^>]+src=["']([^"']+)["']/g);
      for (const match of imageMatches) {
        const url = match[1];
        if (url.startsWith("http")) {
          allImageUrls.add(url);
        }
      }
    }

    // Download images
    let imageCount = 0;
    let failedCount = 0;
    console.log(`[Export] Found ${allImageUrls.size} images to download`);

    for (const url of allImageUrls) {
      try {
        console.log(`[Export] Downloading image ${imageCount + 1}/${allImageUrls.size}: ${url.substring(0, 80)}...`);
        const blob = await downloadImageBlob(url);
        if (blob && blob.size > 0) {
          // Extract extension from URL, handling query strings
          const urlPath = url.split('?')[0];
          const ext = urlPath.split('.').pop()?.toLowerCase() || 'jpg';
          const validExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ? ext : 'jpg';
          const imgFilename = `image-${imageCount}.${validExt}`;
          imageMap[url] = imgFilename;
          imagesFolder?.file(imgFilename, blob);
          console.log(`[Export] ✓ Saved as ${imgFilename} (${blob.size} bytes)`);
          imageCount++;
        } else {
          console.warn(`[Export] ✗ Failed: got empty or null blob for ${url.substring(0, 80)}...`);
          failedCount++;
        }
      } catch (e) {
        console.warn(`[Export] ✗ Exception downloading: ${url.substring(0, 80)}...`, e);
        failedCount++;
      }
    }

    console.log(`[Export] Images complete: ${imageCount} downloaded, ${failedCount} failed`);

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

      // First, convert images to markdown format (before stripping other HTML)
      // Handle figure with figcaption
      content = content.replace(
        /<figure[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<figcaption[^>]*>([\s\S]*?)<\/figcaption>[\s\S]*?<\/figure>/gi,
        (_, src, caption) => {
          const localPath = imageMap[src] ? `./images/${imageMap[src]}` : src;
          return caption?.trim() ? `![${caption.trim()}](${localPath})\n\n` : `![](${localPath})\n\n`;
        }
      );
      // Handle standalone img tags
      content = content.replace(
        /<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi,
        (_, src, alt) => {
          const localPath = imageMap[src] ? `./images/${imageMap[src]}` : src;
          return `![${alt || ""}](${localPath})`;
        }
      );
      content = content.replace(
        /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
        (_, src) => {
          const localPath = imageMap[src] ? `./images/${imageMap[src]}` : src;
          return `![](${localPath})`;
        }
      );

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
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

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
    const doImport = async () => {
      try {
        // Get all blog posts
        const posts = await getAllPosts();
        if (posts.length === 0) {
          setAlertDialog({ open: true, title: "No Posts", message: "No blog posts found to import." });
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
            published: false,
            createdAt: now as any,
            updatedAt: now as any,
          };
          const noteId = await createNote(newNote);
          newNotes.push({ ...newNote, id: noteId });
        }

        setItems((prev) => [...prev, ...newNotes]);
        setAlertDialog({
          open: true,
          title: "Import Complete",
          message: `Imported ${newNotes.length} blog posts into the 'blog' folder.`,
        });
      } catch (error) {
        console.error("Import error:", error);
        setAlertDialog({
          open: true,
          title: "Import Failed",
          message: "Failed to import blog posts. See console for details.",
        });
      }
    };

    setConfirmDialog({
      open: true,
      title: "Import Blog Posts",
      message: "Import all blog posts into a 'blog' folder? This will create a new folder and convert posts to notes.",
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        doImport();
      },
    });
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
      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:relative
          fixed inset-y-0 left-0 z-50 h-full
          transition-transform duration-200 ease-out
          md:transition-none
        `}
        style={{ backgroundColor: 'var(--sidebar-bg)' }}
      >
        <Sidebar
          items={items}
          selectedId={selectedItem?.id || null}
          searchQuery={searchQuery}
          collapsed={sidebarCollapsed}
          currentFolderId={currentFolderId}
          isDark={isDark}
          sortOption={sortOption}
          onSelect={(item) => {
            handleSelect(item);
            setMobileSidebarOpen(false);
          }}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCreateNote={handleCreateNote}
          onCreateFolder={handleCreateFolder}
          onDelete={handleDelete}
          onRename={handleRename}
          onRenameSubmit={handleRenameSubmit}
          onRenameCancel={handleRenameCancel}
          renamingId={renamingId}
          onMove={handleMove}
          onReorder={handleReorder}
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
          onSortChange={setSortOption}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile header with hamburger */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-[--border] bg-[--sidebar-bg]">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="text-sm font-medium text-[--foreground] truncate">
            {selectedItem?.title || "Notes"}
          </span>
        </div>

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
            sortOption={sortOption}
            onSortChange={setSortOption}
            onSelect={handleSelect}
            onBack={handleBack}
            onCreateNote={handleCreateNote}
          />
        )}
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        confirmLabel={confirmDialog.variant === "danger" ? "Delete" : "Confirm"}
      />
      <AlertDialog
        open={alertDialog.open}
        title={alertDialog.title}
        message={alertDialog.message}
        onClose={() => setAlertDialog(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
