"use client";

import { useState, useEffect, useCallback } from "react";
import { NoteItem, updateNote, getAllNoteTags } from "@/lib/notes";
import { useAutosave } from "@/hooks/useAutosave";
import TiptapEditor from "./TiptapEditor";
import TagInput from "./TagInput";

interface NoteEditorProps {
  note: NoteItem;
  onUpdate: (note: NoteItem) => void;
}

export default function NoteEditor({ note, onUpdate }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || "");
  const [date, setDate] = useState(note.date || new Date().toISOString().split("T")[0]);
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isFullWidth, setIsFullWidth] = useState(true);

  // Load available tags
  useEffect(() => {
    getAllNoteTags().then(setAvailableTags);
  }, []);

  // Reset when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || "");
    setDate(note.date || new Date().toISOString().split("T")[0]);
    setTags(note.tags || []);
  }, [note.id]);

  const saveNote = useCallback(async (data: { title: string; content: string; date: string; tags: string[] }) => {
    if (!note.id) return;
    await updateNote(note.id, {
      title: data.title,
      content: data.content,
      date: data.date,
      tags: data.tags,
    });
    onUpdate({
      ...note,
      title: data.title,
      content: data.content,
      date: data.date,
      tags: data.tags,
    });
  }, [note, onUpdate]);

  const { markSaved, status } = useAutosave({
    data: { title, content, date, tags },
    onSave: saveNote,
    interval: 10000,
    enabled: !!note.id,
  });

  // Mark as saved after initial load
  useEffect(() => {
    markSaved();
  }, [note.id, markSaved]);

  const saveStatus = status === "saving" ? "Saving..." : status === "unsaved" ? "Unsaved" : "Saved";

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[--background]">
      <div className={isFullWidth ? "px-8 py-12" : "max-w-3xl mx-auto px-8 py-12"}>
        {/* Full width toggle */}
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setIsFullWidth(!isFullWidth)}
            className="text-xs text-[--muted] hover:text-[--foreground]"
          >
            {isFullWidth ? "Constrain width" : "Full width"}
          </button>
        </div>

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
            onChange={setTags}
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
