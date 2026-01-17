"use client";

import { useMemo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NoteItem } from "@/lib/notes";
import { getSongsByLibrary, Song } from "@/lib/songs";

interface PropertiesModalProps {
  item: NoteItem;
  onClose: () => void;
  onExport?: (item: NoteItem) => void;
}

export default function PropertiesModal({ item, onClose, onExport }: PropertiesModalProps) {
  const [musicSongs, setMusicSongs] = useState<Song[] | null>(null);
  const [loadingSongs, setLoadingSongs] = useState(false);

  // Fetch songs for music libraries
  useEffect(() => {
    if (item.type === "music" && item.id) {
      setLoadingSongs(true);
      getSongsByLibrary(item.id)
        .then(setMusicSongs)
        .catch(() => setMusicSongs([]))
        .finally(() => setLoadingSongs(false));
    }
  }, [item.type, item.id]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Format date
  const formatDate = (date: Date | { toDate: () => Date } | string | null | undefined) => {
    if (!date) return "—";
    let d: Date;
    if (typeof date === "string") {
      d = new Date(date);
    } else if ("toDate" in date) {
      d = date.toDate();
    } else {
      d = date;
    }
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Calculate cumulative size
  const totalSize = useMemo(() => {
    if (item.type === "moodboard" && item.images) {
      return item.images.reduce((sum, img) => sum + (img.fileSize || 0), 0);
    }
    if (item.type === "music" && musicSongs) {
      return musicSongs.reduce((sum, song) => sum + (song.fileSize || 0), 0);
    }
    if (item.type === "note" && item.content) {
      return new Blob([item.content]).size;
    }
    return 0;
  }, [item, musicSongs]);

  // Calculate item-specific stats
  const stats = useMemo(() => {
    const result: { label: string; value: string }[] = [];

    // Type
    const typeLabels: Record<string, string> = {
      folder: "Folder",
      note: "Note",
      moodboard: "Album",
      music: "Music Library",
    };
    result.push({ label: "Type", value: typeLabels[item.type] || item.type });

    // Title
    result.push({ label: "Title", value: item.title || "Untitled" });

    // Size - always show (with loading state for music)
    if (item.type === "music" && loadingSongs) {
      result.push({ label: "Size", value: "Loading..." });
    } else {
      result.push({ label: "Size", value: totalSize > 0 ? formatSize(totalSize) : "—" });
    }

    // Date created
    result.push({ label: "Created", value: formatDate(item.createdAt) });

    // Date modified
    result.push({ label: "Modified", value: formatDate(item.updatedAt) });

    // Item date (if set)
    if (item.date) {
      result.push({ label: "Date", value: item.date });
    }

    // Type-specific stats
    if (item.type === "moodboard" && item.images) {
      result.push({ label: "Images", value: `${item.images.length}` });
    }

    if (item.type === "note" && item.content) {
      const wordCount = item.content.trim().split(/\s+/).filter(Boolean).length;
      const charCount = item.content.length;
      result.push({ label: "Words", value: `${wordCount.toLocaleString()}` });
      result.push({ label: "Characters", value: `${charCount.toLocaleString()}` });
    }

    if (item.type === "music") {
      if (musicSongs) {
        result.push({ label: "Songs", value: `${musicSongs.length}` });
        const totalDuration = musicSongs.reduce((sum, s) => sum + (s.duration || 0), 0);
        if (totalDuration > 0) {
          const hours = Math.floor(totalDuration / 3600);
          const mins = Math.floor((totalDuration % 3600) / 60);
          result.push({ label: "Duration", value: hours > 0 ? `${hours}h ${mins}m` : `${mins}m` });
        }
      } else if (loadingSongs) {
        result.push({ label: "Songs", value: "Loading..." });
      }
    }

    // Tags
    if (item.tags && item.tags.length > 0) {
      result.push({ label: "Tags", value: item.tags.join(", ") });
    }

    return result;
  }, [item, totalSize, loadingSongs, musicSongs]);

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop - simple darkening */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-xs border border-[--border]"
        style={{ backgroundColor: 'var(--background)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[--border]">
          <span className="text-xs font-medium text-[--foreground] uppercase tracking-wide">Properties</span>
          <button
            type="button"
            onClick={onClose}
            className="p-0.5 text-[--muted] hover:text-[--foreground]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-3 py-2">
          {stats.map(({ label, value }) => (
            <div key={label} className="flex py-1 text-xs">
              <span className="w-20 flex-shrink-0 text-[--muted]">{label}</span>
              <span className="text-[--foreground] break-words min-w-0">{value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-[--border]">
          {onExport && (
            <button
              type="button"
              onClick={() => onExport(item)}
              className="dialog-btn dialog-btn-secondary"
            >
              Export
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="dialog-btn dialog-btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level
  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
