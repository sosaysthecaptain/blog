"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { extractAudioMetadata } from "@/lib/music-storage";
import { formatDuration } from "@/lib/songs";

// Preview song data (before upload)
interface ImportSong {
  file: File;
  title: string;
  artist: string;
  album: string;
  year: number | null;
  trackNumber: number | null;
  genre: string;
  duration: number;
  albumArtUrl: string | null; // Object URL for preview
  albumArtBlob: Blob | null;
}

interface MusicImportModalProps {
  files: File[];
  onImport: (songs: ImportSong[]) => Promise<void>;
  onCancel: () => void;
}

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function MusicImportModal({ files, onImport, onCancel }: MusicImportModalProps) {
  const [songs, setSongs] = useState<ImportSong[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ current: 0, total: 0 });
  const anchorIndexRef = useRef<number | null>(null);

  // Extract metadata from all files on mount
  useEffect(() => {
    async function loadMetadata() {
      setIsLoading(true);
      setLoadProgress({ current: 0, total: files.length });

      const loadedSongs: ImportSong[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setLoadProgress({ current: i + 1, total: files.length });

        try {
          const metadata = await extractAudioMetadata(file);
          const albumArtUrl = metadata.albumArt
            ? URL.createObjectURL(metadata.albumArt)
            : null;

          loadedSongs.push({
            file,
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            year: metadata.year,
            trackNumber: metadata.trackNumber,
            genre: metadata.genre,
            duration: metadata.duration,
            albumArtUrl,
            albumArtBlob: metadata.albumArt,
          });
        } catch (error) {
          console.error(`Failed to load metadata for ${file.name}:`, error);
          loadedSongs.push({
            file,
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: "Unknown Artist",
            album: "Unknown Album",
            year: null,
            trackNumber: null,
            genre: "",
            duration: 0,
            albumArtUrl: null,
            albumArtBlob: null,
          });
        }
      }

      setSongs(loadedSongs);
      setIsLoading(false);
    }

    loadMetadata();

    // Cleanup object URLs on unmount
    return () => {
      songs.forEach((song) => {
        if (song.albumArtUrl) {
          URL.revokeObjectURL(song.albumArtUrl);
        }
      });
    };
  }, [files]);

  // Handle row click with shift/cmd support
  const handleRowClick = useCallback(
    (index: number, event: React.MouseEvent) => {
      const isShift = event.shiftKey;
      const isMeta = event.metaKey || event.ctrlKey;

      if (isShift && anchorIndexRef.current !== null) {
        // Shift+click: select range
        const minIdx = Math.min(anchorIndexRef.current, index);
        const maxIdx = Math.max(anchorIndexRef.current, index);
        const rangeIndices = Array.from({ length: maxIdx - minIdx + 1 }, (_, i) => minIdx + i);
        setSelectedIndices(rangeIndices);
      } else if (isMeta) {
        // Cmd/Ctrl+click: toggle
        setSelectedIndices((prev) =>
          prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
        );
        if (!selectedIndices.includes(index)) {
          anchorIndexRef.current = index;
        }
      } else {
        // Regular click: select single
        setSelectedIndices([index]);
        anchorIndexRef.current = index;
      }
    },
    [selectedIndices]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (songs.length === 0) return;

      const isArrowUp = event.key === "ArrowUp";
      const isArrowDown = event.key === "ArrowDown";
      if (!isArrowUp && !isArrowDown) return;

      event.preventDefault();

      const currentIdx = selectedIndices.length > 0 ? selectedIndices[selectedIndices.length - 1] : -1;
      let newIdx: number;

      if (currentIdx === -1) {
        newIdx = 0;
      } else if (isArrowUp) {
        newIdx = Math.max(0, currentIdx - 1);
      } else {
        newIdx = Math.min(songs.length - 1, currentIdx + 1);
      }

      if (event.shiftKey && anchorIndexRef.current !== null) {
        const minIdx = Math.min(anchorIndexRef.current, newIdx);
        const maxIdx = Math.max(anchorIndexRef.current, newIdx);
        const rangeIndices = Array.from({ length: maxIdx - minIdx + 1 }, (_, i) => minIdx + i);
        setSelectedIndices(rangeIndices);
      } else {
        setSelectedIndices([newIdx]);
        anchorIndexRef.current = newIdx;
      }
    },
    [songs.length, selectedIndices]
  );

  // Update a single song's metadata
  const updateSong = (index: number, updates: Partial<ImportSong>) => {
    setSongs((prev) => prev.map((song, i) => (i === index ? { ...song, ...updates } : song)));
  };

  // Update all selected songs' metadata
  const updateSelectedSongs = (updates: Partial<ImportSong>) => {
    setSongs((prev) =>
      prev.map((song, i) => (selectedIndices.includes(i) ? { ...song, ...updates } : song))
    );
  };

  // Remove selected songs
  const removeSelected = () => {
    setSongs((prev) => prev.filter((_, i) => !selectedIndices.includes(i)));
    setSelectedIndices([]);
    anchorIndexRef.current = null;
  };

  // Handle import
  const handleImport = async () => {
    setIsImporting(true);
    try {
      await onImport(songs);
    } finally {
      setIsImporting(false);
    }
  };

  // Get selected songs for editing
  const selectedSongs = selectedIndices.map((i) => songs[i]).filter(Boolean);

  // Find common values for multi-edit (only for editable string/number fields)
  type EditableField = "title" | "artist" | "album" | "year" | "trackNumber" | "genre";
  const getCommonValue = (field: EditableField): string | number | null | "mixed" => {
    if (selectedSongs.length === 0) return null;
    const values = selectedSongs.map((s) => s[field]);
    const firstValue = values[0];
    return values.every((v) => v === firstValue) ? firstValue : "mixed";
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div
          className="w-96 rounded-lg shadow-xl p-6 border border-[--border]"
          style={{ backgroundColor: "var(--background)", fontFamily: FONT_FAMILY }}
        >
          <h2 className="text-lg font-semibold text-[--foreground] mb-4">Loading Songs...</h2>
          <div className="h-2 bg-[--sidebar-bg] rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(loadProgress.current / loadProgress.total) * 100}%` }}
            />
          </div>
          <p className="text-sm text-[--muted] mt-2">
            {loadProgress.current} of {loadProgress.total} files
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-[900px] max-w-[90vw] h-[600px] max-h-[80vh] rounded-lg shadow-xl border border-[--border] flex flex-col"
        style={{ backgroundColor: "var(--background)", fontFamily: FONT_FAMILY }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[--border]">
          <h2 className="text-base font-semibold text-[--foreground]">
            Import {songs.length} {songs.length === 1 ? "Song" : "Songs"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-[--muted] hover:text-[--foreground] rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - split view */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Song list */}
          <div className="w-1/2 border-r border-[--border] overflow-auto">
            {songs.map((song, index) => (
              <div
                key={index}
                onClick={(e) => handleRowClick(index, e)}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-[--border]/50 ${
                  selectedIndices.includes(index)
                    ? "bg-[#1e6bbd] text-white"
                    : index % 2 === 0
                    ? "bg-[--background] hover:bg-[--hover]"
                    : "bg-[--sidebar-bg] hover:bg-[--hover]"
                }`}
              >
                {/* Album art thumbnail */}
                <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-[--muted]/20">
                  {song.albumArtUrl ? (
                    <img src={song.albumArtUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5l-10.5 3v8.553m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{song.title}</p>
                  <p className={`text-[10px] truncate ${selectedIndices.includes(index) ? "text-white/70" : "text-[--muted]"}`}>
                    {song.artist} - {song.album}
                  </p>
                </div>
                {/* Duration */}
                <span className={`text-[10px] tabular-nums ${selectedIndices.includes(index) ? "text-white/70" : "text-[--muted]"}`}>
                  {formatDuration(song.duration)}
                </span>
              </div>
            ))}
          </div>

          {/* Right: Edit panel */}
          <div className="w-1/2 p-4 overflow-auto">
            {selectedSongs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[--muted] text-sm">
                Select songs to edit metadata
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[--foreground]">
                    {selectedSongs.length === 1
                      ? "Edit Metadata"
                      : `Edit ${selectedSongs.length} Songs`}
                  </h3>
                  {selectedSongs.length > 0 && (
                    <button
                      type="button"
                      onClick={removeSelected}
                      className="text-xs text-red-500 hover:text-red-400"
                    >
                      Remove Selected
                    </button>
                  )}
                </div>

                {/* Album art preview */}
                {selectedSongs.length === 1 && selectedSongs[0].albumArtUrl && (
                  <div className="w-32 h-32 rounded overflow-hidden mx-auto">
                    <img
                      src={selectedSongs[0].albumArtUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Edit fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-[--muted] mb-1">Title</label>
                    <input
                      type="text"
                      value={selectedSongs.length === 1 ? selectedSongs[0].title : ""}
                      onChange={(e) => {
                        if (selectedSongs.length === 1) {
                          updateSong(selectedIndices[0], { title: e.target.value });
                        }
                      }}
                      disabled={selectedSongs.length !== 1}
                      placeholder={selectedSongs.length > 1 ? "(Multiple values)" : ""}
                      className="w-full px-2 py-1.5 text-xs bg-[--sidebar-bg] border border-[--border] rounded text-[--foreground] placeholder:text-[--muted] disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[--muted] mb-1">Artist</label>
                    <input
                      type="text"
                      value={getCommonValue("artist") === "mixed" ? "" : String(getCommonValue("artist") || "")}
                      onChange={(e) => updateSelectedSongs({ artist: e.target.value })}
                      placeholder={getCommonValue("artist") === "mixed" ? "(Multiple values)" : ""}
                      className="w-full px-2 py-1.5 text-xs bg-[--sidebar-bg] border border-[--border] rounded text-[--foreground] placeholder:text-[--muted]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[--muted] mb-1">Album</label>
                    <input
                      type="text"
                      value={getCommonValue("album") === "mixed" ? "" : String(getCommonValue("album") || "")}
                      onChange={(e) => updateSelectedSongs({ album: e.target.value })}
                      placeholder={getCommonValue("album") === "mixed" ? "(Multiple values)" : ""}
                      className="w-full px-2 py-1.5 text-xs bg-[--sidebar-bg] border border-[--border] rounded text-[--foreground] placeholder:text-[--muted]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-[--muted] mb-1">Year</label>
                      <input
                        type="number"
                        value={getCommonValue("year") === "mixed" ? "" : getCommonValue("year") || ""}
                        onChange={(e) =>
                          updateSelectedSongs({ year: e.target.value ? parseInt(e.target.value) : null })
                        }
                        placeholder={getCommonValue("year") === "mixed" ? "Mixed" : ""}
                        className="w-full px-2 py-1.5 text-xs bg-[--sidebar-bg] border border-[--border] rounded text-[--foreground] placeholder:text-[--muted]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[--muted] mb-1">Track #</label>
                      <input
                        type="number"
                        value={selectedSongs.length === 1 ? selectedSongs[0].trackNumber || "" : ""}
                        onChange={(e) => {
                          if (selectedSongs.length === 1) {
                            updateSong(selectedIndices[0], {
                              trackNumber: e.target.value ? parseInt(e.target.value) : null,
                            });
                          }
                        }}
                        disabled={selectedSongs.length !== 1}
                        placeholder={selectedSongs.length > 1 ? "N/A" : ""}
                        className="w-full px-2 py-1.5 text-xs bg-[--sidebar-bg] border border-[--border] rounded text-[--foreground] placeholder:text-[--muted] disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[--muted] mb-1">Genre</label>
                    <input
                      type="text"
                      value={getCommonValue("genre") === "mixed" ? "" : String(getCommonValue("genre") || "")}
                      onChange={(e) => updateSelectedSongs({ genre: e.target.value })}
                      placeholder={getCommonValue("genre") === "mixed" ? "(Multiple values)" : ""}
                      className="w-full px-2 py-1.5 text-xs bg-[--sidebar-bg] border border-[--border] rounded text-[--foreground] placeholder:text-[--muted]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[--border]">
          <p className="text-xs text-[--muted]">
            {selectedIndices.length > 0
              ? `${selectedIndices.length} selected`
              : "Click to select, Shift+click for range"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isImporting}
              className="px-4 py-1.5 text-xs text-[--foreground] bg-[--sidebar-bg] border border-[--border] rounded hover:bg-[--hover] disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || songs.length === 0}
              className="px-4 py-1.5 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isImporting ? "Importing..." : `Add ${songs.length} to Library`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { ImportSong };
