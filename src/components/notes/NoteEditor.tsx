"use client";

import { useState, useEffect, useCallback, useRef, useMemo, useImperativeHandle, forwardRef } from "react";
import { NoteItem, EmbeddedMedia, EditorDisplayPrefs, updateNote, getAllNoteTags, getTagColors, setTagColor, TagColorsMap, generateSlug, blogSlugExists, recipeSlugExists } from "@/lib/notes";
import { findRemovedFiles, deleteFileByUrl } from "@/lib/notes-storage";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";
import { useAutosave } from "@/hooks/useAutosave";
import { useFocusSync } from "@/hooks/useFocusSync";
import { useSignedUrls } from "@/hooks/useSignedUrls";
import MarkdownEditor from "./MarkdownEditor";
import TagInput from "./TagInput";
import ImageLightbox, { extractImagesFromHtml } from "@/components/ImageLightbox";
import { ConfirmDialog } from "@/components/ui/Dialog";

export interface NoteEditorRef {
  save: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
}

interface NoteEditorProps {
  note: NoteItem;
  parentFolder: NoteItem | null;
  folderPath?: NoteItem[]; // Full path from root to parent folder
  onUpdate: (note: NoteItem) => void;
  onBack: () => void;
  onNavigateToFolder?: (folderId: string | null) => void; // null = root
  isFullWidth: boolean;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
}

const NoteEditor = forwardRef<NoteEditorRef, NoteEditorProps>(function NoteEditor(
  { note, parentFolder, folderPath = [], onUpdate, onBack, onNavigateToFolder, isFullWidth, onUnsavedChangesChange },
  ref
) {
  // Local editing state
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || "");
  const [date, setDate] = useState(note.date || new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(note.time || "");
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [published, setPublished] = useState(note.published || false);
  const [slug, setSlug] = useState(note.slug || "");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagColors, setTagColors] = useState<TagColorsMap>({});
  const [embeddedMedia, setEmbeddedMedia] = useState<EmbeddedMedia[]>(note.embeddedMedia || []);
  const [displayPrefs, setDisplayPrefs] = useState<EditorDisplayPrefs>(
    note.displayPrefs || { wordWrap: true, font: "mono", showMarkdownSyntax: false }
  );

  // Save state (isSaving and hasLocalChanges now managed by autosave hook)

  // Remote sync state
  const [remoteNote, setRemoteNote] = useState<NoteItem | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // File cleanup state
  const [pendingDeleteFiles, setPendingDeleteFiles] = useState<string[]>([]);
  const [showDeleteFilesDialog, setShowDeleteFilesDialog] = useState(false);

  // Image delete state
  const [pendingImageDelete, setPendingImageDelete] = useState<{
    src: string;
    lineFrom: number;
    lineTo: number;
  } | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Track the "saved" version to compare against
  const savedVersionRef = useRef<{
    title: string;
    content: string;
    date: string;
    time: string;
    tags: string[];
    published: boolean;
    slug: string;
    embeddedMedia: EmbeddedMedia[];
    displayPrefs: EditorDisplayPrefs;
  } | null>(null);

  // Check if this note is in a publishable folder
  const isBlogNote = parentFolder?.title === "blog" && parentFolder?.parentId === null;
  const isRecipeNote = parentFolder?.title === "recipes" && parentFolder?.parentId === null;
  const currentUser = getCurrentUser();
  const canPublish = (isBlogNote || isRecipeNote) && isAdminEmail(currentUser?.email || null);
  const publishPath = isBlogNote ? "/blog/" : isRecipeNote ? "/recipes/" : "";

  // Autosave data - memoized to prevent unnecessary re-renders
  const autosaveData = useMemo(() => ({
    title,
    content,
    date,
    time,
    tags,
    published,
    slug,
    embeddedMedia,
    displayPrefs,
  }), [title, content, date, time, tags, published, slug, embeddedMedia, displayPrefs]);

  // Autosave callback - saves to Firestore
  const handleAutosave = useCallback(async (data: typeof autosaveData) => {
    if (!note.id) return;

    await updateNote(note.id, {
      title: data.title,
      content: data.content,
      date: data.date,
      time: data.time || null,
      tags: data.tags,
      published: data.published,
      slug: data.slug,
      embeddedMedia: data.embeddedMedia,
      displayPrefs: data.displayPrefs,
    });

    // Update saved version reference
    savedVersionRef.current = { ...data };
    setLastSavedAt(new Date());

    // Notify parent
    onUpdate({ ...note, ...data });
  }, [note, onUpdate]);

  // Use autosave hook
  const { status: autosaveStatus, isDirty: hasLocalChanges, save: triggerSave, markSaved } = useAutosave({
    data: autosaveData,
    onSave: handleAutosave,
    debounceMs: 2000,
    enabled: !!note.id,
  });

  const isSaving = autosaveStatus === "saving";

  // Extract images for lightbox
  const allImageUrls = useMemo(() => extractImagesFromHtml(content), [content]);

  // Sign URLs that need signing (B2 storage URLs)
  const { getSignedUrl } = useSignedUrls(allImageUrls);

  // Get signed versions of all images for the lightbox
  const signedImages = useMemo(() => {
    return allImageUrls.map(url => {
      // Check if this URL needs signing
      if (url.startsWith("/api/files/")) {
        return getSignedUrl(url) || url; // Fall back to original if not yet signed
      }
      return url;
    });
  }, [allImageUrls, getSignedUrl]);

  const openLightbox = useCallback((src: string) => {
    // Find by original URL
    const index = allImageUrls.indexOf(src);
    setLightboxIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  }, [allImageUrls]);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const nextImage = useCallback(() => setLightboxIndex((i) => (i + 1) % signedImages.length), [signedImages.length]);
  const prevImage = useCallback(() => setLightboxIndex((i) => (i - 1 + signedImages.length) % signedImages.length), [signedImages.length]);

  // Image delete handlers
  const handleImageDeleteRequest = useCallback((src: string, lineFrom: number, lineTo: number) => {
    setPendingImageDelete({ src, lineFrom, lineTo });
  }, []);

  const handleImageDeleteConfirm = useCallback(async () => {
    if (!pendingImageDelete) return;

    const { src } = pendingImageDelete;

    try {
      // Delete from Backblaze
      await deleteFileByUrl(src);

      // Remove from content - find the line with this image
      const lines = content.split("\n");
      const newLines = lines.filter(line => {
        // Check if this line contains the image markdown
        const imageMatch = line.match(/^!\[[^\]]*\]\(([^\s)"=]+)/);
        return !(imageMatch && imageMatch[1] === src);
      });
      setContent(newLines.join("\n"));
    } catch (error) {
      console.error("Failed to delete image:", error);
    }

    setPendingImageDelete(null);
  }, [pendingImageDelete, content]);

  const handleImageDeleteCancel = useCallback(() => {
    setPendingImageDelete(null);
  }, []);

  // Load available tags and tag colors
  useEffect(() => {
    getAllNoteTags().then(setAvailableTags);
    getTagColors().then(setTagColors);
  }, []);

  // Default display preferences
  const defaultDisplayPrefs: EditorDisplayPrefs = { wordWrap: true, font: "mono", showMarkdownSyntax: false };

  // Initialize state when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || "");
    setDate(note.date || new Date().toISOString().split("T")[0]);
    setTime(note.time || "");
    setTags(note.tags || []);
    setPublished(note.published || false);
    setSlug(note.slug || "");
    setEmbeddedMedia(note.embeddedMedia || []);
    setDisplayPrefs(note.displayPrefs || defaultDisplayPrefs);
    setSlugError(null);
    setRemoteNote(null);

    // Store the saved version for comparison
    savedVersionRef.current = {
      title: note.title,
      content: note.content || "",
      date: note.date || new Date().toISOString().split("T")[0],
      time: note.time || "",
      tags: note.tags || [],
      published: note.published || false,
      slug: note.slug || "",
      embeddedMedia: note.embeddedMedia || [],
      displayPrefs: note.displayPrefs || defaultDisplayPrefs,
    };
  }, [note.id]); // Only reset when note ID changes

  // Handle remote update when no local changes (auto-apply)
  const handleRemoteUpdate = useCallback((remoteDoc: NoteItem) => {
    setTitle(remoteDoc.title);
    setContent(remoteDoc.content || "");
    setDate(remoteDoc.date || new Date().toISOString().split("T")[0]);
    setTime(remoteDoc.time || "");
    setTags(remoteDoc.tags || []);
    setPublished(remoteDoc.published || false);
    setSlug(remoteDoc.slug || "");
    setEmbeddedMedia(remoteDoc.embeddedMedia || []);
    setDisplayPrefs(remoteDoc.displayPrefs || defaultDisplayPrefs);

    savedVersionRef.current = {
      title: remoteDoc.title,
      content: remoteDoc.content || "",
      date: remoteDoc.date || new Date().toISOString().split("T")[0],
      time: remoteDoc.time || "",
      tags: remoteDoc.tags || [],
      published: remoteDoc.published || false,
      slug: remoteDoc.slug || "",
      embeddedMedia: remoteDoc.embeddedMedia || [],
      displayPrefs: remoteDoc.displayPrefs || defaultDisplayPrefs,
    };
    setLastSavedAt(remoteDoc.updatedAt?.toDate() || null);
    onUpdate(remoteDoc);
  }, [onUpdate]);

  // Handle sync conflict (local changes exist + remote has updates)
  const handleConflict = useCallback((remoteDoc: NoteItem) => {
    setRemoteNote(remoteDoc);
    setShowConflictDialog(true);
  }, []);

  // Check for remote updates when user returns to tab after inactivity
  useFocusSync({
    documentId: note.id,
    localUpdatedAt: lastSavedAt,
    hasLocalChanges,
    onRemoteUpdate: handleRemoteUpdate,
    onConflict: handleConflict,
  });

  // Notify parent of unsaved changes
  useEffect(() => {
    onUnsavedChangesChange?.(hasLocalChanges);
  }, [hasLocalChanges, onUnsavedChangesChange]);

  // Core save function - handles file deletion then triggers autosave
  const performSave = useCallback(async (filesToDelete: string[] = []) => {
    if (!note.id || isSaving) return;

    try {
      // Delete removed files from storage
      for (const url of filesToDelete) {
        await deleteFileByUrl(url);
      }

      // Trigger the autosave hook's save function
      triggerSave();
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  }, [note.id, isSaving, triggerSave]);

  // Save function - checks for removed files first
  const handleSave = useCallback(async () => {
    if (!note.id || isSaving) return;

    // Check for removed files
    const savedContent = savedVersionRef.current?.content || "";
    const removedFiles = findRemovedFiles(savedContent, content);

    if (removedFiles.length > 0) {
      // Show confirmation dialog
      setPendingDeleteFiles(removedFiles);
      setShowDeleteFilesDialog(true);
    } else {
      // No files to delete, save directly
      await performSave();
    }
  }, [note.id, isSaving, content, performSave]);

  // Expose save function and unsaved state to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => { triggerSave(); },
    hasUnsavedChanges: () => hasLocalChanges,
  }), [triggerSave, hasLocalChanges]);

  // Handle confirming file deletion
  const handleConfirmDeleteFiles = useCallback(async () => {
    setShowDeleteFilesDialog(false);
    await performSave(pendingDeleteFiles);
    setPendingDeleteFiles([]);
  }, [pendingDeleteFiles, performSave]);

  // Handle skipping file deletion (save without deleting)
  const handleSkipDeleteFiles = useCallback(async () => {
    setShowDeleteFilesDialog(false);
    await performSave();
    setPendingDeleteFiles([]);
  }, [performSave]);

  // Discard local changes and load remote version
  const handleDiscardLocal = useCallback(() => {
    if (!remoteNote) return;

    setTitle(remoteNote.title);
    setContent(remoteNote.content || "");
    setDate(remoteNote.date || new Date().toISOString().split("T")[0]);
    setTime(remoteNote.time || "");
    setTags(remoteNote.tags || []);
    setPublished(remoteNote.published || false);
    setSlug(remoteNote.slug || "");
    setEmbeddedMedia(remoteNote.embeddedMedia || []);
    setDisplayPrefs(remoteNote.displayPrefs || defaultDisplayPrefs);

    savedVersionRef.current = {
      title: remoteNote.title,
      content: remoteNote.content || "",
      date: remoteNote.date || new Date().toISOString().split("T")[0],
      time: remoteNote.time || "",
      tags: remoteNote.tags || [],
      published: remoteNote.published || false,
      slug: remoteNote.slug || "",
      embeddedMedia: remoteNote.embeddedMedia || [],
      displayPrefs: remoteNote.displayPrefs || defaultDisplayPrefs,
    };

    // Mark as saved so autosave knows this is the baseline
    markSaved();
    setShowConflictDialog(false);
    onUpdate(remoteNote);
  }, [remoteNote, onUpdate, markSaved]);

  // Overwrite remote with local changes
  const handleOverwriteRemote = useCallback(async () => {
    setShowConflictDialog(false);
    await handleSave();
  }, [handleSave]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (hasLocalChanges) {
      // Could show a confirmation dialog here
      // For now, just warn in console
      console.log("Warning: Unsaved changes will be lost");
    }
    onBack();
  }, [hasLocalChanges, onBack]);

  // Handle publish toggle
  const handlePublishToggle = async () => {
    if (!note.id) return;

    const newPublished = !published;
    let newSlug = slug;

    if (newPublished && !slug) {
      newSlug = generateSlug(title);
      const slugChecker = isRecipeNote ? recipeSlugExists : blogSlugExists;
      const exists = await slugChecker(newSlug, note.id);
      if (exists) {
        setSlugError("This slug is already in use - edit it before publishing");
        return;
      }
    }

    setPublished(newPublished);
    setSlug(newSlug);
    setSlugError(null);
  };

  // Validate slug when it changes
  const handleSlugChange = async (newSlug: string) => {
    setSlug(newSlug);
    if (newSlug) {
      const slugChecker = isRecipeNote ? recipeSlugExists : blogSlugExists;
      const exists = await slugChecker(newSlug, note.id);
      setSlugError(exists ? "This slug is already in use" : null);
    } else {
      setSlugError(null);
    }
  };

  const handleTagColorChange = async (tag: string, colorIndex: number) => {
    await setTagColor(tag, colorIndex);
    setTagColors(prev => ({ ...prev, [tag]: colorIndex }));
  };

  // Handle new media added to the note
  const handleMediaAdded = useCallback((media: EmbeddedMedia) => {
    setEmbeddedMedia(prev => [...prev, media]);
  }, []);

  // Keyboard shortcut: Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-[--background]">
      {/* Header with breadcrumbs */}
      <div className="hidden md:flex items-center px-4 py-2 bg-[--sidebar-bg]">
        <nav className="breadcrumb-nav">
          <button
            type="button"
            onClick={() => onNavigateToFolder ? onNavigateToFolder(null) : handleBack()}
            className="breadcrumb-item"
          >
            root
          </button>
          {folderPath.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => onNavigateToFolder ? onNavigateToFolder(folder.id!) : handleBack()}
              className="breadcrumb-item"
            >
              {folder.title}
            </button>
          ))}
          {parentFolder && !folderPath.find(f => f.id === parentFolder.id) && (
            <button
              type="button"
              onClick={handleBack}
              className="breadcrumb-item"
            >
              {parentFolder.title}
            </button>
          )}
          <span className="breadcrumb-item breadcrumb-current">
            {title || "Untitled"}
          </span>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
      <div className={isFullWidth ? "px-4 py-6 md:px-8 md:py-8" : "max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8"}>
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-2xl md:text-4xl font-bold bg-transparent outline-none text-[--foreground] placeholder:text-[--muted] mb-2"
          style={{
            fontFamily: displayPrefs.font === "mono"
              ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              : displayPrefs.font === "serif"
              ? "var(--font-serif), Georgia, serif"
              : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          }}
        />

        {/* Date, Time & Tags row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm text-[--muted]">
          <div className="flex items-center gap-2 group/datetime">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent outline-none italic cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
            />
            {time ? (
              <span className="group/time inline-flex items-center gap-1">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-transparent outline-none italic cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <button
                  type="button"
                  onClick={() => setTime("")}
                  className="text-[--muted] hover:text-[--foreground] opacity-0 group-hover/time:opacity-100 transition-opacity"
                  title="Clear time"
                >
                  ×
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setTime(new Date().toTimeString().slice(0, 5))}
                className="px-2 py-0.5 text-xs border border-dashed border-[--border] rounded hover:border-[--accent] hover:text-[--accent] italic opacity-0 group-hover/datetime:opacity-100 transition-opacity"
              >
                + time
              </button>
            )}
          </div>
          <div className="flex-1 min-w-[120px]">
            <TagInput
              tags={tags}
              availableTags={availableTags}
              tagColors={tagColors}
              onChange={setTags}
              onTagColorChange={handleTagColorChange}
            />
          </div>
        </div>

        {/* Publish controls */}
        {canPublish && (
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6 text-sm">
            <div className="flex items-center gap-1.5 text-[--muted]">
              <span className="hidden md:inline">{publishPath}</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder={generateSlug(title)}
                className="w-32 md:w-40 px-2 py-1 bg-[--sidebar-bg] border border-[--border] rounded outline-none focus:border-[--accent] text-[--foreground]"
              />
            </div>
            {slugError && (
              <span className="text-xs text-red-500">{slugError}</span>
            )}
            <button
              type="button"
              onClick={handlePublishToggle}
              className={`px-3 py-1 text-xs rounded border ${
                published
                  ? "border-[--success] text-[--success] hover:bg-[--success] hover:text-white"
                  : "border-[--border] text-[--muted] hover:border-[--accent] hover:text-[--accent]"
              }`}
            >
              {published ? "Published" : "Publish"}
            </button>
          </div>
        )}

        {/* Editor */}
        <MarkdownEditor
          content={content}
          onChange={setContent}
          onImageClick={openLightbox}
          onImageDelete={handleImageDeleteRequest}
          noteId={note.id!}
          onMediaAdded={handleMediaAdded}
          displayPrefs={displayPrefs}
          onDisplayPrefsChange={setDisplayPrefs}
        />
      </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && signedImages.length > 0 && (
        <ImageLightbox
          images={signedImages}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}

      {/* Conflict Dialog */}
      <ConfirmDialog
        open={showConflictDialog}
        title="Sync Conflict"
        message="This note was updated on another device. What would you like to do with your local changes?"
        confirmLabel="Save Mine"
        cancelLabel="Load Theirs"
        variant="danger"
        onConfirm={handleOverwriteRemote}
        onCancel={handleDiscardLocal}
      />

      {/* Delete Files Dialog */}
      <ConfirmDialog
        open={showDeleteFilesDialog}
        title="Delete Removed Files?"
        message={`You removed ${pendingDeleteFiles.length} file${pendingDeleteFiles.length === 1 ? '' : 's'} from this note. Do you want to permanently delete ${pendingDeleteFiles.length === 1 ? 'it' : 'them'} from storage?`}
        confirmLabel="Delete Files"
        cancelLabel="Keep Files"
        variant="danger"
        onConfirm={handleConfirmDeleteFiles}
        onCancel={handleSkipDeleteFiles}
      />

      {/* Image Delete Confirmation */}
      <ConfirmDialog
        open={!!pendingImageDelete}
        title="Delete Image"
        message="This will permanently delete the image from storage. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleImageDeleteConfirm}
        onCancel={handleImageDeleteCancel}
      />
    </div>
  );
});

export default NoteEditor;
