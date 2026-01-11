"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NoteItem, updateNote, getAllNoteTags, getTagColors, setTagColor, TagColorsMap } from "@/lib/notes";
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
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagColors, setTagColors] = useState<TagColorsMap>({});
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // Track previous note to save when switching
  const prevNoteRef = useRef<{ id: string; title: string; content: string; date: string; tags: string[] } | null>(null);
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
    data: { title: string; content: string; date: string; tags: string[] }
  ) => {
    try {
      await updateNote(noteId, {
        title: data.title,
        content: data.content,
        date: data.date,
        tags: data.tags,
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
      });
    }

    // Reset state for new note
    setTitle(note.title);
    setContent(note.content || "");
    setDate(note.date || new Date().toISOString().split("T")[0]);
    setTags(note.tags || []);
    setSaveStatus("saved");

    // Update ref with new note's initial data
    prevNoteRef.current = {
      id: note.id || "",
      title: note.title,
      content: note.content || "",
      date: note.date || new Date().toISOString().split("T")[0],
      tags: note.tags || [],
    };
  }, [note.id, note.title, note.content, note.date, note.tags, saveNoteData]);

  // Update prevNoteRef when data changes (for autosave and switch-save)
  useEffect(() => {
    if (prevNoteRef.current && prevNoteRef.current.id === note.id) {
      prevNoteRef.current = { id: note.id || "", title, content, date, tags };
    }
  }, [note.id, title, content, date, tags]);

  // Mark as unsaved when data changes
  useEffect(() => {
    // Check if data actually changed from the note prop
    const hasChanges =
      title !== note.title ||
      content !== (note.content || "") ||
      date !== (note.date || new Date().toISOString().split("T")[0]) ||
      JSON.stringify(tags) !== JSON.stringify(note.tags || []);

    if (hasChanges) {
      setSaveStatus("unsaved");
    }
  }, [title, content, date, tags, note]);

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
      const success = await saveNoteData(note.id!, { title, content, date, tags });

      if (isMountedRef.current && success) {
        setSaveStatus("saved");
        onUpdate({ ...note, title, content, date, tags });
      }
    }, 2000); // 2 second debounce - much faster than before

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [saveStatus, note, title, content, date, tags, saveNoteData, onUpdate]);

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
        });
      }
    };
  }, [saveNoteData]);

  const handleBack = () => {
    // Save before navigating back
    if (saveStatus === "unsaved" && note.id) {
      saveNoteData(note.id, { title, content, date, tags });
    }
    onBack();
  };

  const handleTagColorChange = async (tag: string, colorIndex: number) => {
    await setTagColor(tag, colorIndex);
    setTagColors(prev => ({ ...prev, [tag]: colorIndex }));
  };

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

        {/* Tags */}
        <div className="mb-8">
          <TagInput
            tags={tags}
            availableTags={availableTags}
            tagColors={tagColors}
            onChange={setTags}
            onTagColorChange={handleTagColorChange}
          />
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
