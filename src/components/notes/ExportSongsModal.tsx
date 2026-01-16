"use client";

import { useState } from "react";
import { Song, getSongAudioUrl } from "@/lib/songs";

type FolderStructure = "flat" | "artist" | "album" | "artist-album";

interface ExportSongsModalProps {
  songs: Song[];
  onClose: () => void;
}

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function ExportSongsModal({ songs, onClose }: ExportSongsModalProps) {
  const [folderStructure, setFolderStructure] = useState<FolderStructure>("artist-album");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleExport = async () => {
    if (songs.length === 0) return;

    setIsExporting(true);
    setProgress({ current: 0, total: songs.length });

    try {
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        setProgress({ current: i + 1, total: songs.length });

        // Get the audio URL
        const audioUrl = await getSongAudioUrl(song.storagePath);
        if (!audioUrl) continue;

        // Fetch the audio file
        const response = await fetch(audioUrl);
        const blob = await response.blob();

        // Create filename based on folder structure
        let filename = "";
        const safeTitle = sanitizeFilename(song.title || "Unknown");
        const safeArtist = sanitizeFilename(song.artist || "Unknown Artist");
        const safeAlbum = sanitizeFilename(song.album || "Unknown Album");
        const ext = song.fileType || "mp3";

        switch (folderStructure) {
          case "flat":
            filename = `${safeArtist} - ${safeTitle}.${ext}`;
            break;
          case "artist":
            filename = `${safeArtist}/${safeTitle}.${ext}`;
            break;
          case "album":
            filename = `${safeAlbum}/${safeTitle}.${ext}`;
            break;
          case "artist-album":
            filename = `${safeArtist}/${safeAlbum}/${safeTitle}.${ext}`;
            break;
        }

        // Download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Small delay between downloads to avoid overwhelming the browser
        if (i < songs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
      onClose();
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
          <h2 className="text-base font-semibold text-[--foreground]">
            Export {songs.length} Song{songs.length !== 1 ? "s" : ""}
          </h2>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-[--muted] mb-4">
            Choose how to organize exported files:
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="folderStructure"
                value="flat"
                checked={folderStructure === "flat"}
                onChange={() => setFolderStructure("flat")}
                className="accent-blue-500"
              />
              <div>
                <p className="text-sm text-[--foreground]">No folders</p>
                <p className="text-xs text-[--muted]">Artist - Title.mp3</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="folderStructure"
                value="artist"
                checked={folderStructure === "artist"}
                onChange={() => setFolderStructure("artist")}
                className="accent-blue-500"
              />
              <div>
                <p className="text-sm text-[--foreground]">By artist</p>
                <p className="text-xs text-[--muted]">Artist/Title.mp3</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="folderStructure"
                value="album"
                checked={folderStructure === "album"}
                onChange={() => setFolderStructure("album")}
                className="accent-blue-500"
              />
              <div>
                <p className="text-sm text-[--foreground]">By album</p>
                <p className="text-xs text-[--muted]">Album/Title.mp3</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="folderStructure"
                value="artist-album"
                checked={folderStructure === "artist-album"}
                onChange={() => setFolderStructure("artist-album")}
                className="accent-blue-500"
              />
              <div>
                <p className="text-sm text-[--foreground]">By artist and album</p>
                <p className="text-xs text-[--muted]">Artist/Album/Title.mp3</p>
              </div>
            </label>
          </div>

          {isExporting && (
            <div className="mt-4 p-3 bg-[--sidebar-bg] rounded">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm text-[--foreground]">
                  Exporting {progress.current} of {progress.total}...
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[--border] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-3 py-1.5 text-sm text-[--muted] hover:text-[--foreground] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </>
  );
}

function sanitizeFilename(name: string): string {
  // Remove or replace characters that are invalid in filenames
  return name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
