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

  const { status, isDirty, save, markSaved } = useAutosave({
    data: { title, content, date, tags },
    onSave: saveNote,
    interval: 10000,
    enabled: !!note.id,
  });

  // Mark as saved after initial load
  useEffect(() => {
    markSaved();
  }, [note.id, markSaved]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[--border] bg-[--sidebar-bg]">
        <div className="flex items-center gap-3">
          <StatusIndicator status={status} />
          <span className="text-xs text-[--muted]">
            {status === "saving"
              ? "Saving..."
              : status === "unsaved"
              ? "Unsaved changes"
              : "Saved"}
          </span>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!isDirty}
          className="px-3 py-1 text-xs bg-[--accent] text-white rounded hover:opacity-90 disabled:opacity-50"
        >
          Save now
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full text-3xl font-bold bg-transparent outline-none text-[--foreground] placeholder:text-[--muted] mb-4"
          />

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <label className="text-[--muted]">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-2 py-1 bg-[--editor-bg] border border-[--border] rounded text-[--foreground]"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm text-[--muted] mb-1">Tags</label>
            <TagInput
              tags={tags}
              availableTags={availableTags}
              onChange={setTags}
            />
          </div>

          {/* Content */}
          <div className="border border-[--border] rounded overflow-hidden">
            <TiptapEditor
              content={content}
              onChange={setContent}
              noteId={note.id || "new"}
              placeholder="Start writing..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusIndicator({ status }: { status: "saved" | "saving" | "unsaved" }) {
  const colors = {
    saved: "bg-[--success]",
    saving: "bg-[--warning] animate-pulse",
    unsaved: "bg-[--warning]",
  };

  return <div className={`w-2 h-2 rounded-full ${colors[status]}`} />;
}
