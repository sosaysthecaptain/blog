"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { CacheProvider, useCacheStatus } from "@/components/CacheProvider";
import { useCachedNotes } from "@/hooks/useCachedNotes";
import { getAllPosts, Post } from "@/lib/firestore";
import { deleteNoteImages, downloadImageBlob } from "@/lib/notes-storage";
import { useDarkMode } from "@/hooks/useDarkMode";
import Sidebar from "@/components/notes/Sidebar";
import NoteEditor, { NoteEditorRef } from "@/components/notes/NoteEditor";
import MoodboardEditor, { MoodboardEditorRef } from "@/components/notes/MoodboardEditor";
import MusicLibraryEditor, { MusicLibraryEditorRef } from "@/components/notes/MusicLibraryEditor";
import FolderView from "@/components/notes/FolderView";
import { ConfirmDialog, AlertDialog, ProgressDialog, SaveDiscardDialog } from "@/components/ui/Dialog";
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
  const [sortOption, setSortOption] = useState<"manual" | "date-desc" | "date-asc" | "title-asc" | "title-desc" | "updated-desc">("manual");
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
  const [exportProgress, setExportProgress] = useState<{
    open: boolean;
    message: string;
    progress: number;
    detail: string;
  }>({ open: false, message: "", progress: 0, detail: "" });
  const [exportCancelled, setExportCancelled] = useState(false);

  // Unsaved changes state
  const noteEditorRef = useRef<NoteEditorRef>(null);
  const moodboardEditorRef = useRef<MoodboardEditorRef>(null);
  const musicLibraryEditorRef = useRef<MusicLibraryEditorRef>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{
    item: NoteItem | null;
    action: "select" | "back";
  } | null>(null);
  const [unsavedDialog, setUnsavedDialog] = useState(false);

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

  // Use cached notes for instant loading
  const { notes: cachedNotes, isLoading: notesLoading } = useCachedNotes();

  // Sync cached notes to items state
  useEffect(() => {
    if (user && cachedNotes.length > 0) {
      setItems(cachedNotes);
    }
  }, [user, cachedNotes]);

  // Legacy loadNotes function for manual refresh (still needed for some operations)
  const loadNotes = async () => {
    const notes = await getAllNotes();
    setItems(notes);
    return notes;
  };

  // URL routing helpers
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const getNotePath = useCallback((item: NoteItem, allItems: NoteItem[]): string => {
    const parts: string[] = [];
    let current: NoteItem | undefined = item;

    while (current) {
      parts.unshift(slugify(current.title || "untitled"));
      current = allItems.find((i) => i.id === current?.parentId);
    }

    return parts.join("/");
  }, []);

  const findNoteByPath = useCallback((path: string, allItems: NoteItem[]): NoteItem | null => {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) return null;

    let currentParentId: string | null = null;
    let foundItem: NoteItem | null = null;

    for (const part of parts) {
      foundItem = allItems.find((item) => {
        const itemSlug = slugify(item.title || "untitled");
        return itemSlug === part && item.parentId === currentParentId;
      }) || null;

      if (!foundItem) return null;
      currentParentId = foundItem.id!;
    }

    return foundItem;
  }, []);

  // Sync URL with selected item (using hash for static export compatibility)
  const updateUrlForItem = useCallback((item: NoteItem | null, allItems: NoteItem[]) => {
    if (!item) {
      window.history.replaceState({}, "", "/notes");
      return;
    }
    const path = getNotePath(item, allItems);
    window.history.replaceState({}, "", `/notes#${path}`);
  }, [getNotePath]);

  // Parse URL hash on initial load and hash changes
  useEffect(() => {
    if (!user || items.length === 0) return;

    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const item = findNoteByPath(hash, items);
        if (item) {
          setSelectedItem(item);
          if (item.type === "folder") {
            setCurrentFolderId(item.id!);
          } else if (item.parentId) {
            setCurrentFolderId(item.parentId);
          }
        }
      }
    };

    // Check on initial load
    handleHashChange();

    // Listen for hash changes (browser back/forward)
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [user, items, findNoteByPath]);

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

  // Perform the actual navigation
  const performNavigation = useCallback((item: NoteItem | null, action: "select" | "back") => {
    if (action === "select" && item) {
      setSelectedItem(item);
      if (item.type === "folder") {
        setCurrentFolderId(item.id!);
      }
      updateUrlForItem(item, items);
    } else if (action === "back") {
      // Navigate back to parent folder or root
      if (selectedItem?.parentId) {
        const parent = items.find(i => i.id === selectedItem.parentId);
        if (parent) {
          setSelectedItem(parent);
          setCurrentFolderId(parent.id!);
          updateUrlForItem(parent, items);
        } else {
          setSelectedItem(null);
          setCurrentFolderId(null);
          updateUrlForItem(null, items);
        }
      } else {
        setSelectedItem(null);
        setCurrentFolderId(null);
        updateUrlForItem(null, items);
      }
    }
    setHasUnsavedChanges(false);
  }, [items, selectedItem, updateUrlForItem]);

  // Handle unsaved changes dialog actions
  const handleSaveAndNavigate = useCallback(async () => {
    if (noteEditorRef.current) {
      await noteEditorRef.current.save();
    }
    if (moodboardEditorRef.current) {
      await moodboardEditorRef.current.save();
    }
    if (musicLibraryEditorRef.current) {
      await musicLibraryEditorRef.current.save();
    }
    setUnsavedDialog(false);
    if (pendingNavigation) {
      performNavigation(pendingNavigation.item, pendingNavigation.action);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, performNavigation]);

  const handleDiscardAndNavigate = useCallback(() => {
    setUnsavedDialog(false);
    if (pendingNavigation) {
      performNavigation(pendingNavigation.item, pendingNavigation.action);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, performNavigation]);

  const handleCancelNavigation = useCallback(() => {
    setUnsavedDialog(false);
    setPendingNavigation(null);
  }, []);

  const handleSelect = (item: NoteItem) => {
    // Check if we're leaving a note, moodboard, or music library with unsaved changes
    if ((selectedItem?.type === "note" || selectedItem?.type === "moodboard" || selectedItem?.type === "music") && hasUnsavedChanges && item.id !== selectedItem.id) {
      setPendingNavigation({ item, action: "select" });
      setUnsavedDialog(true);
      return;
    }
    performNavigation(item, "select");
  };

  const handleBackWithUnsavedCheck = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingNavigation({ item: null, action: "back" });
      setUnsavedDialog(true);
      return;
    }
    performNavigation(null, "back");
  }, [hasUnsavedChanges, performNavigation]);

  const handleCreateNote = async (parentId: string | null) => {
    const now = new Date();
    // Format: YYYY-MM-DD HH:MM
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().slice(0, 5);
    const newNote: NoteItem = {
      type: "note",
      title: `${dateStr} ${timeStr}`,
      parentId,
      content: "",
      date: dateStr,
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
    // Auto-enter rename mode with name highlighted
    setRenamingId(id);
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

  const handleCreateMoodboard = async (parentId: string | null) => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().slice(0, 5);
    const newMoodboard: NoteItem = {
      type: "moodboard",
      title: `${dateStr} ${timeStr}`,
      parentId,
      date: dateStr,
      time: timeStr,
      images: [],
      gridSize: "medium",
      tags: [],
      createdAt: now as any,
      updatedAt: now as any,
    };
    const id = await createNote(newMoodboard);
    newMoodboard.id = id;
    setItems((prev) => [...prev, newMoodboard]);
    setSelectedItem(newMoodboard);
    // Auto-enter rename mode with name highlighted
    setRenamingId(id);
  };

  const handleCreateMusicLibrary = async (parentId: string | null) => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().slice(0, 5);
    const newMusicLibrary: NoteItem = {
      type: "music",
      title: `${dateStr} ${timeStr}`,
      parentId,
      date: dateStr,
      musicSortColumn: "artist",
      musicSortDirection: "asc",
      createdAt: now as any,
      updatedAt: now as any,
    };
    const id = await createNote(newMusicLibrary);
    newMusicLibrary.id = id;
    setItems((prev) => [...prev, newMusicLibrary]);
    setSelectedItem(newMusicLibrary);
    // Auto-enter rename mode with name highlighted
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
        updateUrlForItem(null, items);
      }
      await loadNotes();
    };

    const typeLabel = item.type === "folder" ? "Folder" : item.type === "moodboard" ? "Moodboard" : "Note";
    setConfirmDialog({
      open: true,
      title: `Delete ${typeLabel}`,
      message: item.type === "folder"
        ? "Delete this folder and all its contents? This cannot be undone."
        : `Delete this ${typeLabel.toLowerCase()}? This cannot be undone.`,
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
      updateUrlForItem(parent || null, items);
    } else {
      setSelectedItem(null);
      updateUrlForItem(null, items);
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
    // Reset cancellation flag
    setExportCancelled(false);

    // Show progress dialog
    setExportProgress({
      open: true,
      message: "Collecting images...",
      progress: 0,
      detail: "Scanning notes for images",
    });

    await new Promise(r => setTimeout(r, 50));

    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    const imageMap: Record<string, string> = {};

    // Step 1: Find all image URLs
    const allImageUrls: string[] = [];
    for (const note of notesToExport) {
      if (!note.content) continue;
      const matches = note.content.matchAll(/<img[^>]+src=["']([^"']+)["']/g);
      for (const match of matches) {
        const url = match[1];
        if (url.startsWith("http") && !allImageUrls.includes(url)) {
          allImageUrls.push(url);
        }
      }
    }

    // Step 2: Download all images
    let downloadedCount = 0;
    let failedCount = 0;
    let cancelled = false;

    for (let i = 0; i < allImageUrls.length; i++) {
      // Check for cancellation
      if (exportCancelled) {
        cancelled = true;
        break;
      }

      const url = allImageUrls[i];
      const progress = Math.round(((i + 1) / allImageUrls.length) * 50);

      setExportProgress({
        open: true,
        message: `Downloading images (${i + 1}/${allImageUrls.length})`,
        progress,
        detail: `Image ${i + 1}...`,
      });

      await new Promise(r => setTimeout(r, 10));

      try {
        const blob = await downloadImageBlob(url);
        if (blob && blob.size > 0) {
          const imgFilename = `image-${downloadedCount}.png`;
          imageMap[url] = imgFilename;
          imagesFolder?.file(imgFilename, blob);
          downloadedCount++;
        } else {
          failedCount++;
          console.warn(`Failed to download image ${i + 1}: empty blob`);
        }
      } catch (e) {
        failedCount++;
        console.warn(`Failed to download image ${i + 1}:`, e);
      }
    }

    if (cancelled) {
      setExportProgress({ open: false, message: "", progress: 0, detail: "" });
      return;
    }

    console.log(`Images: ${downloadedCount} downloaded, ${failedCount} failed`);

    // Build folder structure helper
    const getPath = (item: NoteItem): string => {
      if (!item.parentId) return "";
      const parent = items.find((i) => i.id === item.parentId);
      if (!parent) return "";
      const parentPath = getPath(parent);
      return parentPath ? `${parentPath}/${parent.title}` : parent.title;
    };

    // Step 3: Create markdown files with local image paths
    for (let i = 0; i < notesToExport.length; i++) {
      const note = notesToExport[i];
      const progress = 50 + Math.round(((i + 1) / notesToExport.length) * 40);

      setExportProgress({
        open: true,
        message: `Processing notes (${i + 1}/${notesToExport.length})`,
        progress,
        detail: note.title || "Untitled",
      });

      await new Promise(r => setTimeout(r, 5));

      let content = note.content || "";

      // Convert images to markdown with LOCAL paths (relative from note location)
      content = content.replace(
        /<figure[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<figcaption[^>]*>([\s\S]*?)<\/figcaption>[\s\S]*?<\/figure>/gi,
        (_, src, caption) => {
          const localPath = imageMap[src] ? `../images/${imageMap[src]}` : src;
          return caption?.trim() ? `![${caption.trim()}](${localPath})\n\n` : `![](${localPath})\n\n`;
        }
      );
      content = content.replace(
        /<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi,
        (_, src, alt) => {
          const localPath = imageMap[src] ? `../images/${imageMap[src]}` : src;
          return `![${alt || ""}](${localPath})`;
        }
      );
      content = content.replace(
        /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
        (_, src) => {
          const localPath = imageMap[src] ? `../images/${imageMap[src]}` : src;
          return `![](${localPath})`;
        }
      );

      // Convert HTML to markdown
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

    // Generate ZIP
    setExportProgress({
      open: true,
      message: "Creating ZIP...",
      progress: 95,
      detail: "Compressing files",
    });

    const blob = await zip.generateAsync({ type: "blob" });

    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    // Show completion with stats
    setExportProgress({
      open: true,
      message: "Export complete!",
      progress: 100,
      detail: `${notesToExport.length} notes, ${downloadedCount} images${failedCount > 0 ? ` (${failedCount} failed)` : ""}`,
    });

    setTimeout(() => {
      setExportProgress({ open: false, message: "", progress: 0, detail: "" });
    }, 1500);
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

  const handleExportArchivable = async (folderId: string) => {
    const folder = items.find((i) => i.id === folderId);
    const notes = getNotesInFolder(folderId);
    const folderName = folder?.title || "folder";

    // Build a single markdown file with all notes
    let archiveContent = `# ${folderName}\n\nExported: ${new Date().toLocaleDateString()}\n\n---\n\n`;

    for (const note of notes) {
      let content = note.content || "";

      // Convert HTML to markdown
      content = content
        // Remove images entirely for print version
        .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, "")
        .replace(/<img[^>]*>/gi, "")
        // Convert headers
        .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/g, "# $1\n\n")
        .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, "## $1\n\n")
        .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, "### $1\n\n")
        .replace(/<p[^>]*>([\s\S]*?)<\/p>/g, "$1\n\n")
        .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/g, "**$1**")
        .replace(/<em[^>]*>([\s\S]*?)<\/em>/g, "*$1*")
        .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, "$1")
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/g, "- $1\n")
        .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g, "> $1\n\n")
        .replace(/<code[^>]*>([\s\S]*?)<\/code>/g, "`$1`")
        .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, "```\n$1\n```\n\n")
        .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      // Add note header
      archiveContent += `## ${note.title || "Untitled"}\n\n`;
      if (note.date) {
        archiveContent += `*${note.date}*\n\n`;
      }
      if (note.tags && note.tags.length > 0) {
        archiveContent += `Tags: ${note.tags.join(", ")}\n\n`;
      }
      archiveContent += `${content}\n\n---\n\n`;
    }

    // Download as .md file
    const blob = new Blob([archiveContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderName}-archive-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="flex items-center gap-3 mb-8">
          {/* Dirigible logo */}
          <svg className="w-10 h-10 text-[--foreground]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <g transform="scale(-1,1) translate(-24,0)">
              <ellipse cx="11" cy="9" rx="8" ry="4.5" />
              <path d="M18 6.5 L21 4.5 L21 8" />
              <path d="M18 11.5 L21 13.5 L21 10" />
              <rect x="7" y="16" width="8" height="2.5" rx="0.75" />
              <path d="M8.5 13.5 L8 16" />
              <path d="M13.5 13.5 L14 16" />
            </g>
          </svg>
          <h1 className="text-2xl font-bold text-[--foreground]">Dirigible</h1>
        </div>
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
    <CacheProvider>
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
          onCreateMoodboard={handleCreateMoodboard}
          onCreateMusicLibrary={handleCreateMusicLibrary}
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
              updateUrlForItem(null, items);
            }
          }}
          onExport={handleExport}
          onExportFolder={handleExportFolder}
          onExportArchivable={handleExportArchivable}
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
            ref={noteEditorRef}
            note={selectedItem}
            parentFolder={selectedItem.parentId ? items.find(i => i.id === selectedItem.parentId && i.type === "folder") || null : null}
            onUpdate={handleNoteUpdate}
            onBack={handleBackWithUnsavedCheck}
            isFullWidth={isFullWidth}
            onUnsavedChangesChange={setHasUnsavedChanges}
          />
        ) : selectedItem?.type === "moodboard" ? (
          <MoodboardEditor
            ref={moodboardEditorRef}
            moodboard={selectedItem}
            parentFolder={selectedItem.parentId ? items.find(i => i.id === selectedItem.parentId && i.type === "folder") || null : null}
            onUpdate={handleNoteUpdate}
            onBack={handleBackWithUnsavedCheck}
            isFullWidth={isFullWidth}
            onUnsavedChangesChange={setHasUnsavedChanges}
          />
        ) : selectedItem?.type === "music" ? (
          <MusicLibraryEditor
            ref={musicLibraryEditorRef}
            library={selectedItem}
            parentFolder={selectedItem.parentId ? items.find(i => i.id === selectedItem.parentId && i.type === "folder") || null : null}
            onUpdate={handleNoteUpdate}
            onBack={handleBackWithUnsavedCheck}
            isFullWidth={isFullWidth}
            onUnsavedChangesChange={setHasUnsavedChanges}
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
            onCreateFolder={handleCreateFolder}
            onCreateMoodboard={handleCreateMoodboard}
            onDelete={handleDelete}
            onRename={(item) => setRenamingId(item.id!)}
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
      <ProgressDialog
        open={exportProgress.open}
        title="Exporting Notes"
        message={exportProgress.message}
        progress={exportProgress.progress}
        detail={exportProgress.detail}
        onCancel={() => {
          setExportCancelled(true);
          setExportProgress({ open: false, message: "", progress: 0, detail: "" });
        }}
      />
      <SaveDiscardDialog
        open={unsavedDialog}
        title="Unsaved Changes"
        message="You have unsaved changes. Would you like to save them before leaving?"
        onSave={handleSaveAndNavigate}
        onDiscard={handleDiscardAndNavigate}
        onCancel={handleCancelNavigation}
      />
    </div>
    </CacheProvider>
  );
}
