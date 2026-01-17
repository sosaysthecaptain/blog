"use client";

import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef, useMemo } from "react";
import { NoteItem, MoodboardImage, updateNote, subscribeToNote, getAllNoteTags, getTagColors, setTagColor, TagColorsMap } from "@/lib/notes";
import { useAutosave } from "@/hooks/useAutosave";
import { uploadMoodboardImages, deleteMoodboardImage, getImageIdFromUrl, getExtensionFromUrl } from "@/lib/moodboard-storage";
import JSZip from "jszip";
import TagInput from "./TagInput";
import MoodboardCarousel from "./MoodboardCarousel";
import SortableImageGrid from "./SortableImageGrid";
import JustifiedImageGrid from "./JustifiedImageGrid";

export interface MoodboardEditorRef {
  save: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
}

interface MoodboardEditorProps {
  moodboard: NoteItem;
  parentFolder: NoteItem | null;
  onUpdate: (moodboard: NoteItem) => void;
  onBack: () => void;
  isFullWidth: boolean;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
}

const MoodboardEditor = forwardRef<MoodboardEditorRef, MoodboardEditorProps>(function MoodboardEditor(
  { moodboard, parentFolder, onUpdate, onBack, isFullWidth, onUnsavedChangesChange },
  ref
) {
  // Local editing state
  const [title, setTitle] = useState(moodboard.title);
  const [date, setDate] = useState(moodboard.date || new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(moodboard.time || "");
  const [tags, setTags] = useState<string[]>(moodboard.tags || []);
  const [images, setImages] = useState<MoodboardImage[]>(moodboard.images || []);
  const [gridSize, setGridSize] = useState<"small" | "medium" | "large">(moodboard.gridSize || "medium");
  const [sortMode, setSortMode] = useState<"chronological" | "manual">(moodboard.sortMode || "manual");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagColors, setTagColors] = useState<TagColorsMap>({});

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);

  // Drag state (for file drops from outside)
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  // Calculate total size
  const totalSizeBytes = images.reduce((sum, img) => sum + (img.fileSize || 0), 0);
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(1);

  // Carousel state
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselInitialIndex, setCarouselInitialIndex] = useState(0);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Dropdown menu state
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const gridMenuRef = useRef<HTMLDivElement>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track the "saved" version to compare against
  const savedVersionRef = useRef<{
    title: string;
    date: string;
    time: string;
    tags: string[];
    images: MoodboardImage[];
    gridSize: "small" | "medium" | "large";
    sortMode: "chronological" | "manual";
  } | null>(null);

  // Load available tags
  useEffect(() => {
    getAllNoteTags().then(setAvailableTags);
    getTagColors().then(setTagColors);
  }, []);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setSortMenuOpen(false);
      }
      if (gridMenuRef.current && !gridMenuRef.current.contains(e.target as Node)) {
        setGridMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize state when moodboard changes
  useEffect(() => {
    setTitle(moodboard.title);
    setDate(moodboard.date || new Date().toISOString().split("T")[0]);
    setTime(moodboard.time || "");
    setTags(moodboard.tags || []);
    setImages(moodboard.images || []);
    setGridSize(moodboard.gridSize || "medium");
    setSortMode(moodboard.sortMode || "manual");

    savedVersionRef.current = {
      title: moodboard.title,
      date: moodboard.date || new Date().toISOString().split("T")[0],
      time: moodboard.time || "",
      tags: moodboard.tags || [],
      images: moodboard.images || [],
      gridSize: moodboard.gridSize || "medium",
      sortMode: moodboard.sortMode || "manual",
    };
  }, [moodboard.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!moodboard.id) return;

    const unsubscribe = subscribeToNote(moodboard.id, (updated) => {
      if (!updated) return;
      // Always update from remote - autosave means we should stay in sync
      setTitle(updated.title);
      setDate(updated.date || new Date().toISOString().split("T")[0]);
      setTime(updated.time || "");
      setTags(updated.tags || []);
      setImages(updated.images || []);
      setGridSize(updated.gridSize || "medium");
      setSortMode(updated.sortMode || "manual");

      // Update saved version ref to match remote
      savedVersionRef.current = {
        title: updated.title,
        date: updated.date || new Date().toISOString().split("T")[0],
        time: updated.time || "",
        tags: updated.tags || [],
        images: updated.images || [],
        gridSize: updated.gridSize || "medium",
        sortMode: updated.sortMode || "manual",
      };
      onUpdate(updated);
    });

    return () => unsubscribe();
  }, [moodboard.id, onUpdate]);

  // Autosave data - memoized to prevent unnecessary re-renders
  const autosaveData = useMemo(() => ({
    title,
    date,
    time,
    tags,
    images,
    gridSize,
    sortMode,
  }), [title, date, time, tags, images, gridSize, sortMode]);

  // Autosave callback - saves to Firestore
  const handleAutosave = useCallback(async (data: typeof autosaveData) => {
    if (!moodboard.id) return;

    await updateNote(moodboard.id, {
      title: data.title,
      date: data.date,
      time: data.time || null,
      tags: data.tags,
      images: data.images,
      gridSize: data.gridSize,
      sortMode: data.sortMode,
    });

    savedVersionRef.current = { ...data };
    onUpdate({ ...moodboard, ...data });
  }, [moodboard, onUpdate]);

  // Use autosave hook
  const { status: autosaveStatus, isDirty: hasLocalChanges, save: triggerSave, markSaved } = useAutosave({
    data: autosaveData,
    onSave: handleAutosave,
    debounceMs: 1000,
    enabled: !!moodboard.id,
  });

  const isSaving = autosaveStatus === "saving";

  // Notify parent of unsaved changes
  useEffect(() => {
    onUnsavedChangesChange?.(hasLocalChanges);
  }, [hasLocalChanges, onUnsavedChangesChange]);

  // Manual save function (for keyboard shortcut and ref)
  const handleSave = useCallback(async () => {
    triggerSave();
  }, [triggerSave]);

  // Expose save function via ref
  useImperativeHandle(ref, () => ({
    save: handleSave,
    hasUnsavedChanges: () => hasLocalChanges,
  }), [handleSave, hasLocalChanges]);

  // Handle tag color changes
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

  // Handle file upload
  const handleFilesUpload = useCallback(async (files: File[]) => {
    if (!moodboard.id || files.length === 0 || isUploading) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length, fileName: files[0].name });

    try {
      const newImages = await uploadMoodboardImages(
        files,
        moodboard.id,
        (current, total, fileName) => {
          setUploadProgress({ current, total, fileName });
        }
      );

      // Add new images to state
      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);

      // Auto-save after upload
      await updateNote(moodboard.id, { images: updatedImages });
      savedVersionRef.current = { ...savedVersionRef.current!, images: updatedImages };
      onUpdate({ ...moodboard, images: updatedImages });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [moodboard, images, isUploading, onUpdate]);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length === 0) return;

    handleFilesUpload(files);
  }, [handleFilesUpload]);

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || []).filter(f => f.type.startsWith("image/"));
      if (files.length === 0) return;

      e.preventDefault();
      handleFilesUpload(files);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFilesUpload]);

  // Handle image deletion
  const handleDeleteImage = useCallback(async (imageToDelete: MoodboardImage) => {
    if (!moodboard.id) return;

    // Remove from local state immediately for responsiveness
    const updatedImages = images.filter(img => img.id !== imageToDelete.id);
    setImages(updatedImages);

    // Delete from storage
    try {
      const extension = getExtensionFromUrl(imageToDelete.url);
      await deleteMoodboardImage(moodboard.id, imageToDelete.id, extension);
    } catch (error) {
      console.error("Failed to delete from storage:", error);
      // Continue anyway - the image reference will be removed from Firestore
    }

    // Save to Firestore
    try {
      await updateNote(moodboard.id, { images: updatedImages });
      savedVersionRef.current = { ...savedVersionRef.current!, images: updatedImages };
      onUpdate({ ...moodboard, images: updatedImages });
    } catch (error) {
      console.error("Failed to save after deletion:", error);
      // Revert local state on error
      setImages(images);
    }
  }, [moodboard, images, onUpdate]);

  // Handle image reorder from sortable grid
  const handleReorder = useCallback((reorderedImages: MoodboardImage[]) => {
    setImages(reorderedImages);
  }, []);

  // Open carousel at specific image
  const openCarousel = useCallback((index: number) => {
    setCarouselInitialIndex(index);
    setCarouselOpen(true);
  }, []);

  // Update image caption
  const handleUpdateCaption = useCallback((imageId: string, caption: string) => {
    const updatedImages = images.map(img =>
      img.id === imageId ? { ...img, caption } : img
    );
    setImages(updatedImages);
  }, [images]);

  // Export moodboard as zip
  const handleExport = useCallback(async () => {
    if (images.length === 0 || isExporting) return;

    setIsExporting(true);
    try {
      const zip = new JSZip();

      // Fetch and add each image to the zip
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        try {
          const response = await fetch(image.url);
          const blob = await response.blob();

          // Get extension from URL or default to jpg
          const ext = getExtensionFromUrl(image.url);
          const fileName = `${String(i + 1).padStart(3, "0")}_${image.id}.${ext}`;

          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to fetch image ${image.id}:`, error);
        }
      }

      // Generate and download the zip
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "moodboard"}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [images, isExporting, title]);

  // Handle file drag enter (only for external files, not internal reorder)
  const handleFileDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only react to file drags, not internal image reorder drags
    if (!e.dataTransfer.types.includes("Files")) return;
    dragCounter.current++;
    if (dragCounter.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes("Files")) return;
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only show drop effect for file drags
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  return (
    <div
      className="flex-1 h-full overflow-y-auto bg-[--background]"
      onDragEnter={handleFileDragEnter}
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={(e) => {
        dragCounter.current = 0;
        setIsDragOver(false);
        handleDrop(e);
      }}
    >
      <div className={isFullWidth ? "px-4 py-6 md:px-8 md:py-12" : "max-w-4xl mx-auto px-4 py-6 md:px-8 md:py-12"}>
        {/* Header row with back button and controls */}
        <div className="flex items-center justify-between mb-6">
          {/* Back button */}
          {parentFolder ? (
            <button
              type="button"
              onClick={onBack}
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

          {/* Action buttons and controls */}
          <div className="flex items-center gap-2">
            {/* Sort mode dropdown */}
            {images.length > 0 && (
              <div className="relative" ref={sortMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setSortMenuOpen(!sortMenuOpen);
                    setGridMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors bg-[--hover] text-[--muted] hover:text-[--foreground]"
                  title={sortMode === "chronological" ? "Album (chronological)" : "Moodboard (manual)"}
                >
                  {sortMode === "chronological" ? (
                    // Stacked photos icon for album view
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="6" y="3" width="14" height="10" rx="1" />
                      <rect x="4" y="6" width="14" height="10" rx="1" />
                      <rect x="2" y="9" width="14" height="10" rx="1" />
                    </svg>
                  ) : (
                    // Masonry grid icon for moodboard view
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="2" width="9" height="6" rx="1" />
                      <rect x="13" y="2" width="9" height="9" rx="1" />
                      <rect x="2" y="10" width="9" height="12" rx="1" />
                      <rect x="13" y="13" width="9" height="9" rx="1" />
                    </svg>
                  )}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {sortMenuOpen && (
                  <div className="absolute right-0 mt-1 bg-[--background] border border-[--border] rounded-lg shadow-lg py-1 z-20 min-w-[220px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSortMode("chronological");
                        setSortMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        sortMode === "chronological"
                          ? "text-[--foreground] bg-[--hover]"
                          : "text-[--muted] hover:text-[--foreground] hover:bg-[--hover]"
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <rect x="6" y="3" width="14" height="10" rx="1" />
                        <rect x="4" y="6" width="14" height="10" rx="1" />
                        <rect x="2" y="9" width="14" height="10" rx="1" />
                      </svg>
                      Album (chronological)
                      {sortMode === "chronological" && (
                        <svg className="w-4 h-4 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSortMode("manual");
                        setSortMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        sortMode === "manual"
                          ? "text-[--foreground] bg-[--hover]"
                          : "text-[--muted] hover:text-[--foreground] hover:bg-[--hover]"
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="2" y="2" width="9" height="6" rx="1" />
                        <rect x="13" y="2" width="9" height="9" rx="1" />
                        <rect x="2" y="10" width="9" height="12" rx="1" />
                        <rect x="13" y="13" width="9" height="9" rx="1" />
                      </svg>
                      Moodboard (manual)
                      {sortMode === "manual" && (
                        <svg className="w-4 h-4 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Grid size dropdown */}
            {images.length > 0 && (
              <div className="relative" ref={gridMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setGridMenuOpen(!gridMenuOpen);
                    setSortMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors bg-[--hover] text-[--muted] hover:text-[--foreground]"
                  title={`${gridSize.charAt(0).toUpperCase() + gridSize.slice(1)} grid`}
                >
                  {gridSize === "small" && (
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="1" y="1" width="3" height="3" rx="0.5" />
                      <rect x="6" y="1" width="3" height="3" rx="0.5" />
                      <rect x="11" y="1" width="3" height="3" rx="0.5" />
                      <rect x="1" y="6" width="3" height="3" rx="0.5" />
                      <rect x="6" y="6" width="3" height="3" rx="0.5" />
                      <rect x="11" y="6" width="3" height="3" rx="0.5" />
                      <rect x="1" y="11" width="3" height="3" rx="0.5" />
                      <rect x="6" y="11" width="3" height="3" rx="0.5" />
                      <rect x="11" y="11" width="3" height="3" rx="0.5" />
                    </svg>
                  )}
                  {gridSize === "medium" && (
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="1" y="1" width="4" height="4" rx="0.5" />
                      <rect x="6" y="1" width="4" height="4" rx="0.5" />
                      <rect x="11" y="1" width="4" height="4" rx="0.5" />
                      <rect x="1" y="6" width="4" height="4" rx="0.5" />
                      <rect x="6" y="6" width="4" height="4" rx="0.5" />
                      <rect x="11" y="6" width="4" height="4" rx="0.5" />
                    </svg>
                  )}
                  {gridSize === "large" && (
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="1" y="1" width="6" height="6" rx="0.5" />
                      <rect x="9" y="1" width="6" height="6" rx="0.5" />
                      <rect x="1" y="9" width="6" height="6" rx="0.5" />
                      <rect x="9" y="9" width="6" height="6" rx="0.5" />
                    </svg>
                  )}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {gridMenuOpen && (
                  <div className="absolute right-0 mt-1 bg-[--background] border border-[--border] rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                    {(["small", "medium", "large"] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setGridSize(size);
                          setGridMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          gridSize === size
                            ? "text-[--foreground] bg-[--hover]"
                            : "text-[--muted] hover:text-[--foreground] hover:bg-[--hover]"
                        }`}
                      >
                        {size === "small" && (
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="1" y="1" width="3" height="3" rx="0.5" />
                            <rect x="6" y="1" width="3" height="3" rx="0.5" />
                            <rect x="11" y="1" width="3" height="3" rx="0.5" />
                            <rect x="1" y="6" width="3" height="3" rx="0.5" />
                            <rect x="6" y="6" width="3" height="3" rx="0.5" />
                            <rect x="11" y="6" width="3" height="3" rx="0.5" />
                            <rect x="1" y="11" width="3" height="3" rx="0.5" />
                            <rect x="6" y="11" width="3" height="3" rx="0.5" />
                            <rect x="11" y="11" width="3" height="3" rx="0.5" />
                          </svg>
                        )}
                        {size === "medium" && (
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="1" y="1" width="4" height="4" rx="0.5" />
                            <rect x="6" y="1" width="4" height="4" rx="0.5" />
                            <rect x="11" y="1" width="4" height="4" rx="0.5" />
                            <rect x="1" y="6" width="4" height="4" rx="0.5" />
                            <rect x="6" y="6" width="4" height="4" rx="0.5" />
                            <rect x="11" y="6" width="4" height="4" rx="0.5" />
                          </svg>
                        )}
                        {size === "large" && (
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="1" y="1" width="6" height="6" rx="0.5" />
                            <rect x="9" y="1" width="6" height="6" rx="0.5" />
                            <rect x="1" y="9" width="6" height="6" rx="0.5" />
                            <rect x="9" y="9" width="6" height="6" rx="0.5" />
                          </svg>
                        )}
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                        {gridSize === size && (
                          <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Export button */}
            {images.length > 0 && (
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors bg-[--hover] text-[--muted] hover:text-[--foreground] disabled:opacity-50"
                title="Export as ZIP"
              >
                {isExporting ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
              </button>
            )}

            {/* Save status indicator */}
            <div className="flex items-center gap-1.5 text-xs text-[--muted]">
              {isSaving ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : hasLocalChanges ? (
                <span className="text-[--accent]">Unsaved</span>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Saved</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled Moodboard"
          className="w-full text-2xl md:text-4xl font-bold bg-transparent outline-none text-[--foreground] placeholder:text-[--muted] mb-2 font-serif"
        />

        {/* Date, Time & Tags row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-sm text-[--muted]">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent outline-none italic cursor-pointer"
            style={{ colorScheme: 'light dark' }}
          />
          {time ? (
            <span className="flex items-center gap-1">
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
                className="text-[--muted] hover:text-[--foreground] p-0.5"
                title="Clear time"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setTime(new Date().toTimeString().slice(0, 5))}
              className="text-[--muted] hover:text-[--foreground] italic"
            >
              + time
            </button>
          )}
          <span className="text-xs">
            {images.length} {images.length === 1 ? "image" : "images"}
            {totalSizeBytes > 0 && ` · ${totalSizeMB} MB`}
          </span>
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

        {/* Image grid or empty state */}
        {images.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragOver
                ? "border-[--accent] bg-[--accent]/5"
                : "border-[--border]"
            }`}
          >
            <svg className="w-12 h-12 mx-auto mb-4 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <h3 className="text-lg font-medium text-[--foreground] mb-2">
              Add images to your moodboard
            </h3>
            <p className="text-sm text-[--muted] mb-4">
              Drag and drop images here, paste from clipboard, or use the button below
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-[--foreground] text-[--background] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Choose Images"}
            </button>
          </div>
        ) : (
          <>
            {sortMode === "chronological" ? (
              <JustifiedImageGrid
                images={images}
                targetRowHeight={gridSize === "small" ? 120 : gridSize === "medium" ? 180 : 250}
                gap={8}
                onDelete={handleDeleteImage}
                onImageClick={openCarousel}
              />
            ) : (
              <SortableImageGrid
                images={images}
                gridSize={gridSize}
                onReorder={handleReorder}
                onDelete={handleDeleteImage}
                onImageClick={openCarousel}
              />
            )}

            {/* Add more images button */}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 text-sm text-[--muted] hover:text-[--foreground] border border-dashed border-[--border] hover:border-[--muted] rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add more images
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            handleFilesUpload(files);
          }
          // Reset input so same file can be selected again
          e.target.value = "";
        }}
      />

      {/* Upload progress overlay */}
      {isUploading && uploadProgress && (
        <div className="fixed bottom-4 right-4 bg-[--background] border border-[--border] rounded-lg shadow-lg px-4 py-3 z-50">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 animate-spin text-[--accent]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[--foreground]">
                Uploading {uploadProgress.current + 1} of {uploadProgress.total}
              </p>
              <p className="text-xs text-[--muted] truncate max-w-[200px]">
                {uploadProgress.fileName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 bg-[--accent]/10 border-4 border-dashed border-[--accent] pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-[--background] rounded-lg px-6 py-4 shadow-lg">
            <p className="text-lg font-medium text-[--foreground]">Drop images here</p>
          </div>
        </div>
      )}

      {/* Carousel view */}
      {carouselOpen && images.length > 0 && (
        <MoodboardCarousel
          images={images}
          initialIndex={carouselInitialIndex}
          onClose={() => setCarouselOpen(false)}
          onUpdateCaption={handleUpdateCaption}
        />
      )}
    </div>
  );
});

export default MoodboardEditor;
