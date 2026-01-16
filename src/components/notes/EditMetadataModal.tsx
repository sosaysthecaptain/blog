"use client";

import { useState } from "react";
import { Song, updateSong } from "@/lib/songs";

interface EditMetadataModalProps {
  songs: Song[];
  onClose: () => void;
  onSaved: () => void;
}

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function EditMetadataModal({ songs, onClose, onSaved }: EditMetadataModalProps) {
  const isMultiple = songs.length > 1;

  // For single song, use its values. For multiple, leave blank (only filled fields will update)
  const [title, setTitle] = useState(isMultiple ? "" : songs[0]?.title || "");
  const [artist, setArtist] = useState(isMultiple ? "" : songs[0]?.artist || "");
  const [album, setAlbum] = useState(isMultiple ? "" : songs[0]?.album || "");
  const [year, setYear] = useState(isMultiple ? "" : songs[0]?.year?.toString() || "");
  const [trackNumber, setTrackNumber] = useState(isMultiple ? "" : songs[0]?.trackNumber?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const song of songs) {
        if (!song.id) continue;

        const updates: Partial<Song> = {};

        // For single song, update all fields
        // For multiple songs, only update non-empty fields
        if (!isMultiple || title.trim()) {
          updates.title = title.trim() || song.title;
        }
        if (!isMultiple || artist.trim()) {
          updates.artist = artist.trim();
        }
        if (!isMultiple || album.trim()) {
          updates.album = album.trim();
        }
        if (!isMultiple || year.trim()) {
          const yearNum = parseInt(year, 10);
          updates.year = isNaN(yearNum) ? null : yearNum;
        }
        if (!isMultiple || trackNumber.trim()) {
          const trackNum = parseInt(trackNumber, 10);
          updates.trackNumber = isNaN(trackNum) ? null : trackNum;
        }

        if (Object.keys(updates).length > 0) {
          await updateSong(song.id, updates);
        }
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save metadata:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-96 bg-[--background] border border-[--border] rounded-lg shadow-xl"
        style={{ fontFamily: FONT_FAMILY }}
      >
        <div className="px-5 py-4 border-b border-[--border]">
          <h2 className="text-sm font-semibold text-[--foreground]">
            {isMultiple ? `Edit ${songs.length} Songs` : "Edit Metadata"}
          </h2>
          {isMultiple && (
            <p className="text-xs text-[--muted] mt-1">
              Only filled fields will be updated
            </p>
          )}
        </div>

        <div className="px-5 py-4 space-y-3">
          {!isMultiple && (
            <div>
              <label className="block text-xs text-[--muted] mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-[--sidebar-bg] border border-[--border] rounded focus:outline-none focus:border-blue-500 text-[--foreground]"
                style={{ fontFamily: FONT_FAMILY }}
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-[--muted] mb-1">Artist</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder={isMultiple ? "Leave blank to keep existing" : ""}
              className="w-full px-2 py-1.5 text-sm bg-[--sidebar-bg] border border-[--border] rounded focus:outline-none focus:border-blue-500 text-[--foreground] placeholder:text-[--muted]/50"
              style={{ fontFamily: FONT_FAMILY }}
            />
          </div>

          <div>
            <label className="block text-xs text-[--muted] mb-1">Album</label>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              placeholder={isMultiple ? "Leave blank to keep existing" : ""}
              className="w-full px-2 py-1.5 text-sm bg-[--sidebar-bg] border border-[--border] rounded focus:outline-none focus:border-blue-500 text-[--foreground] placeholder:text-[--muted]/50"
              style={{ fontFamily: FONT_FAMILY }}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[--muted] mb-1">Year</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder={isMultiple ? "—" : ""}
                className="w-full px-2 py-1.5 text-sm bg-[--sidebar-bg] border border-[--border] rounded focus:outline-none focus:border-blue-500 text-[--foreground] placeholder:text-[--muted]/50"
                style={{ fontFamily: FONT_FAMILY }}
              />
            </div>
            {!isMultiple && (
              <div className="flex-1">
                <label className="block text-xs text-[--muted] mb-1">Track #</label>
                <input
                  type="text"
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-[--sidebar-bg] border border-[--border] rounded focus:outline-none focus:border-blue-500 text-[--foreground]"
                  style={{ fontFamily: FONT_FAMILY }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[--border] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs text-[--muted] hover:text-[--foreground] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}
