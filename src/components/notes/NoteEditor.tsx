"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NoteItem, updateNote, getAllNoteTags, getTagColors, setTagColor, TagColorsMap } from "@/lib/notes";
import { useAutosave } from "@/hooks/useAutosave";
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

  // Refs for immediate save
  const dataRef = useRef({ title, content, date, tags });
  const noteRef = useRef(note);
  const hasUnsavedChanges = useRef(false);

  // Update refs when data changes
  useEffect(() => {
    dataRef.current = { title, content, date, tags };
  }, [title, content, date, tags]);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  // Load available tags and tag colors
  useEffect(() => {
    getAllNoteTags().then(setAvailableTags);
    getTagColors().then(setTagColors);
  }, []);

  // Reset when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || "");
    setDate(note.date || new Date().toISOString().split("T")[0]);
    setTags(note.tags || []);
    hasUnsavedChanges.current = false;
  }, [note.id]);

  const saveNote = useCallback(async (data: { title: string; content: string; date: string; tags: string[] }) => {
    if (!noteRef.current.id) return;
    await updateNote(noteRef.current.id, {
      title: data.title,
      content: data.content,
      date: data.date,
      tags: data.tags,
    });
    onUpdate({
      ...noteRef.current,
      title: data.title,
      content: data.content,
      date: data.date,
      tags: data.tags,
    });
    hasUnsavedChanges.current = false;
  }, [onUpdate]);

  const { markSaved, status, save: forceSave } = useAutosave({
    data: { title, content, date, tags },
    onSave: saveNote,
    interval: 10000,
    enabled: !!note.id,
  });

  // Mark when there are unsaved changes
  useEffect(() => {
    if (status === "unsaved") {
      hasUnsavedChanges.current = true;
    }
  }, [status]);

  // Mark as saved after initial load
  useEffect(() => {
    markSaved();
  }, [note.id, markSaved]);

  // Save immediately when navigating away (component unmount or note change)
  useEffect(() => {
    return () => {
      // Save on unmount if there are unsaved changes
      if (hasUnsavedChanges.current && noteRef.current.id) {
        const data = dataRef.current;
        updateNote(noteRef.current.id, {
          title: data.title,
          content: data.content,
          date: data.date,
          tags: data.tags,
        }).catch(console.error);
      }
    };
  }, [note.id]);

  const handleBack = () => {
    // Force save before navigating back
    if (status === "unsaved") {
      forceSave();
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
