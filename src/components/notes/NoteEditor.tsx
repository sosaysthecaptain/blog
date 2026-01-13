"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { NoteItem, updateNote, subscribeToNote, getAllNoteTags, getTagColors, setTagColor, TagColorsMap, generateSlug, blogSlugExists, recipeSlugExists } from "@/lib/notes";
import { findRemovedFiles, deleteFileByUrl } from "@/lib/notes-storage";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";
import TiptapEditor from "./TiptapEditor";
import TagInput from "./TagInput";
import ImageLightbox, { extractImagesFromHtml } from "@/components/ImageLightbox";
import { ConfirmDialog } from "@/components/ui/Dialog";

interface NoteEditorProps {
  note: NoteItem;
  parentFolder: NoteItem | null;
  onUpdate: (note: NoteItem) => void;
  onBack: () => void;
  isFullWidth: boolean;
}

export default function NoteEditor({ note, parentFolder, onUpdate, onBack, isFullWidth }: NoteEditorProps) {
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

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Remote sync state
  const [remoteNote, setRemoteNote] = useState<NoteItem | null>(null);
  const [hasRemoteChanges, setHasRemoteChanges] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  // File cleanup state
  const [pendingDeleteFiles, setPendingDeleteFiles] = useState<string[]>([]);
  const [showDeleteFilesDialog, setShowDeleteFilesDialog] = useState(false);

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
  } | null>(null);

  // Check if this note is in a publishable folder
  const isBlogNote = parentFolder?.title === "blog" && parentFolder?.parentId === null;
  const isRecipeNote = parentFolder?.title === "recipes" && parentFolder?.parentId === null;
  const currentUser = getCurrentUser();
  const canPublish = (isBlogNote || isRecipeNote) && isAdminEmail(currentUser?.email || null);
  const publishPath = isBlogNote ? "/blog/" : isRecipeNote ? "/recipes/" : "";

  // Extract images for lightbox
  const allImages = useMemo(() => extractImagesFromHtml(content), [content]);

  const openLightbox = useCallback((src: string) => {
    const index = allImages.indexOf(src);
    setLightboxIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  }, [allImages]);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const nextImage = useCallback(() => setLightboxIndex((i) => (i + 1) % allImages.length), [allImages.length]);
  const prevImage = useCallback(() => setLightboxIndex((i) => (i - 1 + allImages.length) % allImages.length), [allImages.length]);

  // Load available tags and tag colors
  useEffect(() => {
    getAllNoteTags().then(setAvailableTags);
    getTagColors().then(setTagColors);
  }, []);

  // Initialize state when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || "");
    setDate(note.date || new Date().toISOString().split("T")[0]);
    setTime(note.time || "");
    setTags(note.tags || []);
    setPublished(note.published || false);
    setSlug(note.slug || "");
    setSlugError(null);
    setHasLocalChanges(false);
    setHasRemoteChanges(false);
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
    };
  }, [note.id]); // Only reset when note ID changes

  // Subscribe to real-time updates
  useEffect(() => {
    if (!note.id) return;

    const unsubscribe = subscribeToNote(note.id, (updatedNote) => {
      if (!updatedNote) return;

      setRemoteNote(updatedNote);

      // Check if remote has changes compared to our saved version
      const saved = savedVersionRef.current;
      if (saved) {
        const remoteChanged =
          updatedNote.title !== saved.title ||
          (updatedNote.content || "") !== saved.content ||
          (updatedNote.date || "") !== saved.date ||
          (updatedNote.time || "") !== saved.time ||
          JSON.stringify(updatedNote.tags || []) !== JSON.stringify(saved.tags) ||
          (updatedNote.published || false) !== saved.published ||
          (updatedNote.slug || "") !== saved.slug;

        if (remoteChanged) {
          // Only show conflict if we have local changes AND we're not currently saving
          // (our own save triggers the listener too, so ignore during save)
          if (hasLocalChanges && !isSaving) {
            setShowConflictDialog(true);
          } else if (!hasLocalChanges) {
            // No local changes - auto-apply remote changes
            setTitle(updatedNote.title);
            setContent(updatedNote.content || "");
            setDate(updatedNote.date || new Date().toISOString().split("T")[0]);
            setTime(updatedNote.time || "");
            setTags(updatedNote.tags || []);
            setPublished(updatedNote.published || false);
            setSlug(updatedNote.slug || "");

            // Update saved version
            savedVersionRef.current = {
              title: updatedNote.title,
              content: updatedNote.content || "",
              date: updatedNote.date || new Date().toISOString().split("T")[0],
              time: updatedNote.time || "",
              tags: updatedNote.tags || [],
              published: updatedNote.published || false,
              slug: updatedNote.slug || "",
            };

            onUpdate(updatedNote);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [note.id, hasLocalChanges, isSaving, onUpdate]);

  // Track local changes
  useEffect(() => {
    const saved = savedVersionRef.current;
    if (!saved) return;

    const changed =
      title !== saved.title ||
      content !== saved.content ||
      date !== saved.date ||
      time !== saved.time ||
      JSON.stringify(tags) !== JSON.stringify(saved.tags) ||
      published !== saved.published ||
      slug !== saved.slug;

    setHasLocalChanges(changed);
  }, [title, content, date, time, tags, published, slug]);

  // Core save function (actually performs the save)
  const performSave = useCallback(async (filesToDelete: string[] = []) => {
    if (!note.id || isSaving) return;

    setIsSaving(true);
    try {
      // Delete removed files from storage
      for (const url of filesToDelete) {
        await deleteFileByUrl(url);
      }

      await updateNote(note.id, {
        title,
        content,
        date,
        time: time || null, // Firestore accepts null but not undefined
        tags,
        published,
        slug,
      });

      // Update saved version reference
      savedVersionRef.current = { title, content, date, time, tags, published, slug };
      setHasLocalChanges(false);

      // Notify parent
      onUpdate({ ...note, title, content, date, time, tags, published, slug });
    } catch (error) {
      console.error("Failed to save note:", error);
    }
    setIsSaving(false);
  }, [note, title, content, date, time, tags, published, slug, isSaving, onUpdate]);

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

    savedVersionRef.current = {
      title: remoteNote.title,
      content: remoteNote.content || "",
      date: remoteNote.date || new Date().toISOString().split("T")[0],
      time: remoteNote.time || "",
      tags: remoteNote.tags || [],
      published: remoteNote.published || false,
      slug: remoteNote.slug || "",
    };

    setHasLocalChanges(false);
    setShowConflictDialog(false);
    onUpdate(remoteNote);
  }, [remoteNote, onUpdate]);

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
    <div className="flex-1 h-full overflow-y-auto bg-[--background]">
      <div className={isFullWidth ? "px-4 py-6 md:px-8 md:py-12" : "max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-12"}>
        {/* Header row with back button and save button */}
        <div className="flex items-center justify-between mb-6">
          {/* Back button */}
          {parentFolder ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-[--muted] hover:text-[--foreground]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back to {parentFolder.title}</span>
              <span className="sm:hidden">Back</span>
            </button>
          ) : (
            <div />
          )}

          {/* Save button - floppy disk */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasLocalChanges || isSaving}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
              hasLocalChanges
                ? "bg-[--foreground] text-[--background] hover:opacity-90"
                : "bg-[--hover] text-[--muted] cursor-default"
            }`}
            title={hasLocalChanges ? "Save changes (Cmd+S)" : "No unsaved changes"}
          >
            {isSaving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
              </svg>
            )}
            <span className="text-sm font-medium hidden sm:inline">
              {isSaving ? "Saving..." : hasLocalChanges ? "Save" : "Saved"}
            </span>
          </button>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-2xl md:text-4xl font-bold bg-transparent outline-none text-[--foreground] placeholder:text-[--muted] mb-2 font-serif"
        />

        {/* Date & Time row */}
        <div className="flex items-center gap-4 mb-6 text-sm text-[--muted]">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent outline-none italic cursor-pointer"
            style={{ colorScheme: 'light dark' }}
          />
          <div className="flex items-center gap-1">
            {time ? (
              <>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-transparent outline-none italic cursor-pointer"
                  style={{ colorScheme: 'light dark' }}
                />
                <button
                  type="button"
                  onClick={() => setTime("")}
                  className="p-0.5 hover:bg-[--hover] rounded text-[--muted] hover:text-[--foreground]"
                  title="Clear time"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setTime(new Date().toTimeString().slice(0, 5))}
                className="px-2 py-0.5 text-xs border border-dashed border-[--border] rounded hover:border-[--accent] hover:text-[--accent] italic"
              >
                + time
              </button>
            )}
          </div>
        </div>

        {/* Tags and Publish */}
        <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <TagInput
              tags={tags}
              availableTags={availableTags}
              tagColors={tagColors}
              onChange={setTags}
              onTagColorChange={handleTagColorChange}
            />
          </div>

          {/* Publish controls */}
          {canPublish && (
            <div className="flex flex-wrap items-center gap-2 md:gap-4 shrink-0 text-sm">
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
        </div>

        {/* Editor */}
        <TiptapEditor
          content={content}
          onChange={setContent}
          onImageClick={openLightbox}
          noteId={note.id!}
        />
      </div>

      {/* Lightbox */}
      {lightboxOpen && allImages.length > 0 && (
        <ImageLightbox
          images={allImages}
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
    </div>
  );
}
