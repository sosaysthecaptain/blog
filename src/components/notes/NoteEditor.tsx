"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NoteItem, updateNote, getAllNoteTags, getTagColors, setTagColor, TagColorsMap, generateSlug, blogSlugExists } from "@/lib/notes";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";
import TiptapEditor from "./TiptapEditor";
import TagInput from "./TagInput";

interface NoteEditorProps {
  note: NoteItem;
  parentFolder: NoteItem | null;
  onUpdate: (note: NoteItem) => void;
  onBack: () => void;
  isFullWidth: boolean;
}

export default function NoteEditor({ note, parentFolder, onUpdate, onBack, isFullWidth }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || "");
  const [date, setDate] = useState(note.date || new Date().toISOString().split("T")[0]);
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [published, setPublished] = useState(note.published || false);
  const [slug, setSlug] = useState(note.slug || "");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagColors, setTagColors] = useState<TagColorsMap>({});
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // Check if this note is in the blog folder and user can publish
  const isBlogNote = parentFolder?.title === "blog" && parentFolder?.parentId === null;
  const currentUser = getCurrentUser();
  const canPublish = isBlogNote && isAdminEmail(currentUser?.email || null);

  // Track previous note to save when switching
  const prevNoteRef = useRef<{ id: string; title: string; content: string; date: string; tags: string[]; published: boolean; slug: string } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Load available tags and tag colors
  useEffect(() => {
    getAllNoteTags().then(setAvailableTags);
    getTagColors().then(setTagColors);
  }, []);

  // Save function
  const saveNoteData = useCallback(async (
    noteId: string,
    data: { title: string; content: string; date: string; tags: string[]; published: boolean; slug: string }
  ) => {
    try {
      await updateNote(noteId, {
        title: data.title,
        content: data.content,
        date: data.date,
        tags: data.tags,
        published: data.published,
        slug: data.slug,
      });
      return true;
    } catch (error) {
      console.error("Failed to save note:", error);
      return false;
    }
  }, []);

  // When note changes, save the previous note first
  useEffect(() => {
    const prevNote = prevNoteRef.current;

    // If we have a previous note with different ID, save it
    if (prevNote && prevNote.id && prevNote.id !== note.id) {
      // Clear any pending autosave for the old note
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      // Save the previous note immediately
      saveNoteData(prevNote.id, {
        title: prevNote.title,
        content: prevNote.content,
        date: prevNote.date,
        tags: prevNote.tags,
        published: prevNote.published,
        slug: prevNote.slug,
      });
    }

    // Reset state for new note
    setTitle(note.title);
    setContent(note.content || "");
    setDate(note.date || new Date().toISOString().split("T")[0]);
    setTags(note.tags || []);
    setPublished(note.published || false);
    setSlug(note.slug || "");
    setSlugError(null);
    setSaveStatus("saved");

    // Update ref with new note's initial data
    prevNoteRef.current = {
      id: note.id || "",
      title: note.title,
      content: note.content || "",
      date: note.date || new Date().toISOString().split("T")[0],
      tags: note.tags || [],
      published: note.published || false,
      slug: note.slug || "",
    };
  }, [note.id, note.title, note.content, note.date, note.tags, note.published, note.slug, saveNoteData]);

  // Update prevNoteRef when data changes (for autosave and switch-save)
  useEffect(() => {
    if (prevNoteRef.current && prevNoteRef.current.id === note.id) {
      prevNoteRef.current = { id: note.id || "", title, content, date, tags, published, slug };
    }
  }, [note.id, title, content, date, tags, published, slug]);

  // Mark as unsaved when data changes
  useEffect(() => {
    // Check if data actually changed from the note prop
    const hasChanges =
      title !== note.title ||
      content !== (note.content || "") ||
      date !== (note.date || new Date().toISOString().split("T")[0]) ||
      JSON.stringify(tags) !== JSON.stringify(note.tags || []) ||
      published !== (note.published || false) ||
      slug !== (note.slug || "");

    if (hasChanges) {
      setSaveStatus("unsaved");
    }
  }, [title, content, date, tags, published, slug, note]);

  // Autosave with debounce
  useEffect(() => {
    if (saveStatus !== "unsaved" || !note.id) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for autosave
    saveTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;

      setSaveStatus("saving");
      const success = await saveNoteData(note.id!, { title, content, date, tags, published, slug });

      if (isMountedRef.current && success) {
        setSaveStatus("saved");
        onUpdate({ ...note, title, content, date, tags, published, slug });
      }
    }, 2000); // 2 second debounce - much faster than before

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [saveStatus, note, title, content, date, tags, published, slug, saveNoteData, onUpdate]);

  // Save on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Clear any pending autosave
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Save current note on unmount
      const currentNote = prevNoteRef.current;
      if (currentNote && currentNote.id) {
        saveNoteData(currentNote.id, {
          title: currentNote.title,
          content: currentNote.content,
          date: currentNote.date,
          tags: currentNote.tags,
          published: currentNote.published,
          slug: currentNote.slug,
        });
      }
    };
  }, [saveNoteData]);

  const handleBack = () => {
    // Save before navigating back
    if (saveStatus === "unsaved" && note.id) {
      saveNoteData(note.id, { title, content, date, tags, published, slug });
    }
    onBack();
  };

  // Handle publish toggle
  const handlePublishToggle = async () => {
    const newPublished = !published;

    // Auto-generate slug if publishing and no slug set
    if (newPublished && !slug) {
      const newSlug = generateSlug(title);
      setSlug(newSlug);
      // Check if this slug exists
      const exists = await blogSlugExists(newSlug, note.id);
      if (exists) {
        setSlugError("This slug is already in use - edit it before publishing");
      } else {
        setSlugError(null);
      }
    }

    setPublished(newPublished);
  };

  // Validate slug when it changes
  const handleSlugChange = async (newSlug: string) => {
    setSlug(newSlug);
    if (newSlug) {
      const exists = await blogSlugExists(newSlug, note.id);
      setSlugError(exists ? "This slug is already in use" : null);
    } else {
      setSlugError(null);
    }
  };

  const handleTagColorChange = async (tag: string, colorIndex: number) => {
    await setTagColor(tag, colorIndex);
    setTagColors(prev => ({ ...prev, [tag]: colorIndex }));
  };

  // Save immediately (for Cmd+S)
  const saveNow = useCallback(async () => {
    if (!note.id) return;

    // Clear any pending autosave
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setSaveStatus("saving");
    const success = await saveNoteData(note.id, { title, content, date, tags, published, slug });
    if (success) {
      setSaveStatus("saved");
      onUpdate({ ...note, title, content, date, tags, published, slug });
    }
  }, [note, title, content, date, tags, published, slug, saveNoteData, onUpdate]);

  // Keyboard shortcut: Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveNow();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveNow]);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[--background]">
      <div className={isFullWidth ? "px-8 py-12" : "max-w-3xl mx-auto px-8 py-12"}>
        {/* Back button when in a folder */}
        {parentFolder && (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 mb-6 text-sm text-[--muted] hover:text-[--foreground]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {parentFolder.title}
          </button>
        )}

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-4xl font-bold bg-transparent outline-none text-[--foreground] placeholder:text-[--muted] mb-2 font-serif"
        />

        {/* Subtitle / Date */}
        <div className="flex items-center gap-4 mb-6 text-sm text-[--muted] italic">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent outline-none"
          />
          <span className="text-xs">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "unsaved" && "•"}
          </span>
        </div>

        {/* Tags and Publish */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex-1">
            <TagInput
              tags={tags}
              availableTags={availableTags}
              tagColors={tagColors}
              onChange={setTags}
              onTagColorChange={handleTagColorChange}
            />
          </div>

          {/* Publish controls - only for blog notes */}
          {canPublish && (
            <div className="flex items-center gap-4 shrink-0 text-sm">
              <div className="flex items-center gap-1.5 text-[--muted]">
                <span>/blog/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder={generateSlug(title)}
                  className="w-40 px-2 py-1 bg-[--sidebar-bg] border border-[--border] rounded outline-none focus:border-[--accent] text-[--foreground]"
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
                {published ? "Unpublish" : "Publish"}
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[--border] mb-8" />

        {/* Content */}
        <TiptapEditor
          content={content}
          onChange={setContent}
          noteId={note.id || "new"}
          placeholder="Start writing..."
        />
      </div>
    </div>
  );
}
