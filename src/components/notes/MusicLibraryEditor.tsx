"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import { NoteItem, updateNote } from "@/lib/notes";
import { useAutosave } from "@/hooks/useAutosave";
import { useFocusSync } from "@/hooks/useFocusSync";
import { useSignedUrls } from "@/hooks/useSignedUrls";
import { extractPathFromUrl } from "@/lib/signed-url-cache";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useCachedSongs } from "@/hooks/useCachedSongs";
import { setupSongsListener } from "@/lib/cache-sync";
import { Song, getSongsByLibrary, getLibraryStats, deleteSong, updateSong, sortSongs, searchSongs } from "@/lib/songs";
import { uploadAudioFiles, deleteSongFiles, isAudioFile, getSongIdFromPath } from "@/lib/music-storage";
import { useMusicQueue } from "@/hooks/useMusicQueue";
import MusicPlayer from "./MusicPlayer";
import ExportSongsModal from "./ExportSongsModal";
import EditMetadataModal from "./EditMetadataModal";
import RadioRecorderModal from "./RadioRecorderModal";
import dynamic from "next/dynamic";

// Lazy load the DataGrid component
const SongsDataGrid = dynamic(() => import("./SongsDataGrid"), {
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-[--muted] text-sm">Loading...</p>
    </div>
  ),
  ssr: false,
});

export interface MusicLibraryEditorRef {
  save: () => Promise<void>;
}

interface MusicLibraryEditorProps {
  library: NoteItem;
  parentFolder: NoteItem | null;
  onUpdate: (library: NoteItem) => void;
  onBack: () => void;
  isFullWidth: boolean;
  onUnsavedChangesChange?: (hasUnsaved: boolean) => void;
}

const MusicLibraryEditor = forwardRef<MusicLibraryEditorRef, MusicLibraryEditorProps>(
  function MusicLibraryEditor(
    { library, parentFolder, onUpdate, onBack, isFullWidth, onUnsavedChangesChange },
    ref
  ) {
    // Local state
    const [localLibrary, setLocalLibrary] = useState<NoteItem>(library);
    const [songs, setSongs] = useState<Song[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{
      current: number;
      total: number;
      fileName: string;
    } | null>(null);
    const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
    const [showExportModal, setShowExportModal] = useState(false);
    const [songsToEdit, setSongsToEdit] = useState<Song[]>([]);
    const [showRecorderModal, setShowRecorderModal] = useState(false);

    // Sync conflict state
    const [showConflictDialog, setShowConflictDialog] = useState(false);
    const [remoteVersion, setRemoteVersion] = useState<NoteItem | null>(null);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const playFnRef = useRef<((song: Song) => void) | null>(null);
    const displayedSongsRef = useRef<Song[]>([]);

    // Callback to autoplay next song when queue is exhausted
    const handleQueueExhausted = useCallback((currentSong: Song | null) => {
      if (!currentSong) return;

      // Find current song in displayed list and play the next one
      const currentIndex = displayedSongsRef.current.findIndex((s) => s.id === currentSong.id);
      if (currentIndex !== -1 && currentIndex < displayedSongsRef.current.length - 1) {
        const nextSong = displayedSongsRef.current[currentIndex + 1];
        if (nextSong && playFnRef.current) {
          // Small delay to ensure state is settled
          setTimeout(() => {
            playFnRef.current?.(nextSong);
          }, 50);
        }
      }
    }, []);

    // Music playback with autoplay
    const musicQueue = useMusicQueue({ onQueueExhausted: handleQueueExhausted });

    // Update play function ref
    useEffect(() => {
      playFnRef.current = musicQueue.play;
    }, [musicQueue.play]);

    // Handle remote update (no local changes - auto-apply)
    const handleRemoteUpdate = useCallback((remoteDoc: NoteItem) => {
      setLocalLibrary(remoteDoc);
      setLastSavedAt(remoteDoc.updatedAt?.toDate() || null);
      onUpdate(remoteDoc);
    }, [onUpdate]);

    // Handle sync conflict
    const handleConflict = useCallback((remoteDoc: NoteItem) => {
      setRemoteVersion(remoteDoc);
      setShowConflictDialog(true);
    }, []);

    // Use cached songs for instant loading
    const { songs: cachedSongs, isLoading: songsLoading } = useCachedSongs(library.id);

    // Sync cached songs to local state
    useEffect(() => {
      if (cachedSongs.length > 0 || !songsLoading) {
        setSongs(cachedSongs);
      }
    }, [cachedSongs, songsLoading]);

    // Collect paths that need signed URLs (only /api/files/ URLs)
    const songPaths = useMemo(() => {
      const paths: string[] = [];
      const needsSigning = (url: string | null | undefined): url is string =>
        typeof url === "string" && url.startsWith("/api/files/");

      for (const song of songs) {
        if (needsSigning(song.storageUrl)) paths.push(extractPathFromUrl(song.storageUrl));
        if (needsSigning(song.albumArtUrl)) paths.push(extractPathFromUrl(song.albumArtUrl));
        if (needsSigning(song.albumArtThumbUrl)) paths.push(extractPathFromUrl(song.albumArtThumbUrl));
      }
      return paths;
    }, [songs]);

    // Get signed URLs for all song resources
    const { getSignedUrl, isLoading: isLoadingUrls } = useSignedUrls(songPaths);

    // Transform songs to use signed URLs
    const songsWithSignedUrls = useMemo(() => {
      const needsSigning = (url: string | null | undefined): url is string => {
        if (!url) return false;
        // Firebase Storage URLs work as-is
        if (url.includes("firebasestorage.googleapis.com")) return false;
        // Direct https URLs that aren't /api/files/ work as-is
        if (url.startsWith("https://") && !url.includes("/api/files/")) return false;
        // /api/files/ URLs need signing
        return url.startsWith("/api/files/");
      };

      return songs.map((song) => {
        let storageUrl = song.storageUrl;
        let albumArtUrl = song.albumArtUrl;
        let albumArtThumbUrl = song.albumArtThumbUrl;

        if (needsSigning(song.storageUrl)) {
          const signed = getSignedUrl(song.storageUrl);
          storageUrl = signed || ""; // Empty while loading
        }

        if (needsSigning(song.albumArtUrl)) {
          const signed = getSignedUrl(song.albumArtUrl);
          albumArtUrl = signed || null;
        }

        if (needsSigning(song.albumArtThumbUrl)) {
          const signed = getSignedUrl(song.albumArtThumbUrl);
          albumArtThumbUrl = signed || null;
        }

        return { ...song, storageUrl, albumArtUrl, albumArtThumbUrl };
      });
    }, [songs, getSignedUrl]);

    // Compute displayed songs list for autoplay (same sorting as DataGrid)
    // Use songsWithSignedUrls so playback uses signed URLs
    const displayedSongs = useMemo(() => {
      let result = songsWithSignedUrls;
      if (searchQuery) {
        result = searchSongs(result, searchQuery);
      }
      result = sortSongs(result, localLibrary.musicSortColumn || "artist", localLibrary.musicSortDirection || "asc");
      return result;
    }, [songsWithSignedUrls, searchQuery, localLibrary.musicSortColumn, localLibrary.musicSortDirection]);

    // Keep displayedSongs in ref for autoplay callback
    useEffect(() => {
      displayedSongsRef.current = displayedSongs;
    }, [displayedSongs]);

    // Set up Firestore listener to keep cache in sync
    useEffect(() => {
      if (!library.id) return;
      const unsubscribe = setupSongsListener(library.id);
      return () => unsubscribe();
    }, [library.id]);

    // Keyboard shortcut for import (Cmd+I)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "i") {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Autosave data - memoized to prevent unnecessary re-renders
    const autosaveData = useMemo(() => ({
      title: localLibrary.title,
      musicSortColumn: localLibrary.musicSortColumn,
      musicSortDirection: localLibrary.musicSortDirection,
    }), [localLibrary.title, localLibrary.musicSortColumn, localLibrary.musicSortDirection]);

    // Autosave callback - saves to Firestore
    const handleAutosave = useCallback(async (data: typeof autosaveData) => {
      if (!library.id) return;

      await updateNote(library.id, {
        title: data.title,
        musicSortColumn: data.musicSortColumn,
        musicSortDirection: data.musicSortDirection,
      });

      setLastSavedAt(new Date());
      onUpdate({ ...localLibrary, ...data });
    }, [library.id, localLibrary, onUpdate]);

    // Use autosave hook
    const { status: autosaveStatus, isDirty, save: triggerSave } = useAutosave({
      data: autosaveData,
      onSave: handleAutosave,
      debounceMs: 1000,
      enabled: !!library.id,
    });

    const isSaving = autosaveStatus === "saving";

    // Check for remote updates when user returns to tab after inactivity
    useFocusSync({
      documentId: library.id,
      localUpdatedAt: lastSavedAt,
      hasLocalChanges: isDirty,
      onRemoteUpdate: handleRemoteUpdate,
      onConflict: handleConflict,
    });

    // Conflict resolution: accept remote version
    const handleAcceptRemote = useCallback(() => {
      if (!remoteVersion) return;
      handleRemoteUpdate(remoteVersion);
      setShowConflictDialog(false);
    }, [remoteVersion, handleRemoteUpdate]);

    // Conflict resolution: keep local and overwrite remote
    const handleKeepLocal = useCallback(async () => {
      setShowConflictDialog(false);
      triggerSave();
    }, [triggerSave]);

    // Notify parent of unsaved changes
    useEffect(() => {
      onUnsavedChangesChange?.(isDirty);
    }, [isDirty, onUnsavedChangesChange]);

    // Expose save method to parent
    useImperativeHandle(ref, () => ({
      save: async () => { triggerSave(); },
    }), [triggerSave]);

    // Handle field changes
    const handleTitleChange = (title: string) => {
      setLocalLibrary((prev) => ({ ...prev, title }));
    };

    const handleSortChange = (
      column: "title" | "artist" | "album" | "year" | "trackNumber" | "duration" | "fileSize",
      direction: "asc" | "desc"
    ) => {
      setLocalLibrary((prev) => ({
        ...prev,
        musicSortColumn: column,
        musicSortDirection: direction,
      }));
    };

    // Handle file upload
    const handleFilesUpload = useCallback(
      async (files: File[]) => {
        if (!library.id || files.length === 0 || isUploading) return;

        const audioFiles = files.filter(isAudioFile);
        if (audioFiles.length === 0) return;

        setIsUploading(true);
        setUploadProgress({ current: 0, total: audioFiles.length, fileName: audioFiles[0].name });

        try {
          await uploadAudioFiles(audioFiles, library.id, (current, total, fileName) => {
            setUploadProgress({ current, total, fileName });
          });
          // Manually refresh songs after upload in case subscription didn't trigger
          const updatedSongs = await getSongsByLibrary(library.id);
          setSongs(updatedSongs);
        } catch (error) {
          console.error("Upload failed:", error);
        } finally {
          setIsUploading(false);
          setUploadProgress(null);
        }
      },
      [library.id, isUploading]
    );

    // Recursively get files from a directory entry
    const getFilesFromEntry = async (entry: FileSystemEntry): Promise<File[]> => {
      if (entry.isFile) {
        return new Promise((resolve) => {
          (entry as FileSystemFileEntry).file((file) => resolve([file]), () => resolve([]));
        });
      } else if (entry.isDirectory) {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader();
        const entries = await new Promise<FileSystemEntry[]>((resolve) => {
          dirReader.readEntries((entries) => resolve(entries), () => resolve([]));
        });
        const allFiles: File[] = [];
        for (const subEntry of entries) {
          const files = await getFilesFromEntry(subEntry);
          allFiles.push(...files);
        }
        return allFiles;
      }
      return [];
    };

    // Handle file drop (supports folders via webkitGetAsEntry)
    const handleDrop = useCallback(
      async (e: React.DragEvent) => {
        e.preventDefault();
        const items = Array.from(e.dataTransfer.items);
        const allFiles: File[] = [];

        // Try to use webkitGetAsEntry for folder support
        for (const item of items) {
          if (item.kind === "file") {
            const entry = item.webkitGetAsEntry?.();
            if (entry) {
              const files = await getFilesFromEntry(entry);
              allFiles.push(...files);
            } else {
              // Fallback: just get the file directly
              const file = item.getAsFile();
              if (file) allFiles.push(file);
            }
          }
        }

        // If webkitGetAsEntry didn't work, fall back to e.dataTransfer.files
        if (allFiles.length === 0) {
          allFiles.push(...Array.from(e.dataTransfer.files));
        }

        handleFilesUpload(allFiles);
      },
      [handleFilesUpload]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
    }, []);

    // Handle file input
    const handleFileSelect = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        handleFilesUpload(files);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      [handleFilesUpload]
    );

    // Handle song deletion
    const handleDeleteSong = useCallback(
      async (song: Song) => {
        if (!song.id || !library.id) return;

        try {
          const songId = getSongIdFromPath(song.storagePath);
          if (songId) {
            await deleteSongFiles(song.storagePath, library.id, songId);
          }
          await deleteSong(song.id);
        } catch (error) {
          console.error("Failed to delete song:", error);
        }
      },
      [library.id]
    );

    // Handle deleting selected songs
    const handleDeleteSelected = useCallback(async () => {
      if (!library.id || selectedSongIds.length === 0) return;

      const selectedSongs = songs.filter((s) => s.id && selectedSongIds.includes(s.id));
      for (const song of selectedSongs) {
        await handleDeleteSong(song);
      }
      setSelectedSongIds([]);
    }, [library.id, selectedSongIds, songs, handleDeleteSong]);

    // Handle song metadata update
    const handleUpdateSong = useCallback(async (song: Song) => {
      if (!song.id) return;
      try {
        await updateSong(song.id, {
          title: song.title,
          artist: song.artist,
          album: song.album,
          year: song.year,
        });
      } catch (error) {
        console.error("Failed to update song:", error);
      }
    }, []);

    // Calculate stats - for selection if items are selected, otherwise for all songs
    const selectedSongs = useMemo(() =>
      songs.filter((s) => s.id && selectedSongIds.includes(s.id)),
      [songs, selectedSongIds]
    );
    const stats = getLibraryStats(songs);
    const selectionStats = selectedSongIds.length > 0 ? getLibraryStats(selectedSongs) : null;

    return (
      <div
        className="flex-1 flex flex-col h-full overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Header with breadcrumb and search */}
        <div className="flex items-center justify-between px-4 py-1 border-b border-[--border] bg-[--sidebar-bg]">
          <div className="flex items-center gap-0 flex-1 min-w-0">
            <nav className="breadcrumb-nav" style={{ fontSize: "12px" }}>
              <button type="button" onClick={onBack} className="breadcrumb-item">
                Music
              </button>
              {parentFolder && (
                <>
                  <span className="breadcrumb-separator">&gt;</span>
                  <button type="button" onClick={onBack} className="breadcrumb-item">
                    {parentFolder.title}
                  </button>
                </>
              )}
              <span className="breadcrumb-separator">&gt;</span>
            </nav>
            <input
              type="text"
              value={localLibrary.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Untitled"
              className="text-sm font-medium text-[--foreground] bg-transparent border-none outline-none flex-1 min-w-0 ml-1"
              style={{ fontFamily: "'Lucida Grande', 'Lucida Sans Unicode', sans-serif" }}
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Record button */}
            <button
              type="button"
              onClick={() => setShowRecorderModal(true)}
              className="p-1.5 text-[--muted] hover:text-red-500 hover:bg-[--hover] rounded"
              title="Record from browser tab"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
              </svg>
            </button>
            {/* Search box - compact, on the right */}
            <div className="relative">
              <svg
                className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[--muted]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-40 pl-6 pr-2 py-1 text-xs bg-[--background] border border-[--border] rounded focus:outline-none focus:border-[--accent] text-[--foreground] placeholder:text-[--muted]"
                style={{ fontFamily: "'Lucida Grande', 'Lucida Sans Unicode', sans-serif" }}
              />
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
              title="Import audio files (Cmd+I)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </button>
          </div>
        </div>


        {/* Songs DataGrid */}
        <div className={`flex-1 overflow-hidden ${isFullWidth ? "" : "max-w-3xl mx-auto w-full"}`}>
          {songs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-[--muted]">
              <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5l-10.5 3v8.553m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
              <p className="text-sm mb-2">No songs yet</p>
              <p className="text-xs mb-4">Drag and drop audio files here</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 bg-[--foreground] text-[--background] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : "Import Audio Files"}
              </button>
              <p className="text-xs text-[--muted] mt-2">or press Cmd+I</p>
            </div>
          ) : (
            <SongsDataGrid
              songs={songsWithSignedUrls}
              searchQuery={searchQuery}
              sortColumn={localLibrary.musicSortColumn || "artist"}
              sortDirection={localLibrary.musicSortDirection || "asc"}
              selectedIds={selectedSongIds}
              currentPlayingSongId={musicQueue.currentSong?.id}
              isPlaying={musicQueue.isPlaying}
              onSortChange={handleSortChange}
              onSelectionChange={setSelectedSongIds}
              onDeleteSong={handleDeleteSong}
              onDeleteSelected={handleDeleteSelected}
              onPlaySong={musicQueue.play}
              onTogglePlayPause={musicQueue.togglePlayPause}
              onQueueSong={musicQueue.addToQueue}
              onExportSelected={() => setShowExportModal(true)}
              onExportLibrary={() => {
                setSelectedSongIds(songsWithSignedUrls.map((s) => s.id || "").filter(Boolean));
                setShowExportModal(true);
              }}
              onEditMetadata={setSongsToEdit}
              onUpdateSong={handleUpdateSong}
            />
          )}
        </div>

        {/* Footer with stats */}
        <div className={`px-4 py-2 border-t border-[--border] text-xs text-[--muted] ${isFullWidth ? "" : "max-w-3xl mx-auto w-full"}`}>
          {selectionStats ? (
            <>{selectionStats.count} of {stats.count} selected · {selectionStats.totalDuration} · {selectionStats.totalSize}</>
          ) : (
            <>{stats.count} songs · {stats.totalDuration} · {stats.totalSize}</>
          )}
        </div>

        {/* Music Player */}
        <MusicPlayer
          currentSong={musicQueue.currentSong}
          isPlaying={musicQueue.isPlaying}
          currentTime={musicQueue.currentTime}
          duration={musicQueue.duration}
          volume={musicQueue.volume}
          isMuted={musicQueue.isMuted}
          queue={musicQueue.queue}
          currentIndex={musicQueue.currentIndex}
          onPlayPause={musicQueue.togglePlayPause}
          onNext={musicQueue.next}
          onPrevious={musicQueue.previous}
          onSeek={musicQueue.seek}
          onVolumeChange={musicQueue.setVolume}
          onToggleMute={musicQueue.toggleMute}
          onPlayFromQueue={musicQueue.playFromQueue}
          onRemoveFromQueue={musicQueue.removeFromQueue}
          onReorderQueue={musicQueue.reorderQueue}
          onClearQueue={musicQueue.clearQueue}
        />

        {/* Hidden file input - supports folders via webkitdirectory */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          // @ts-expect-error webkitdirectory is non-standard but widely supported
          webkitdirectory=""
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload progress overlay */}
        {isUploading && uploadProgress && (
          <div
            className="fixed bottom-24 right-4 border border-[--border] rounded-lg shadow-lg px-4 py-3"
            style={{ backgroundColor: "var(--background)", zIndex: 9999 }}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
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

        {/* Export Modal */}
        {showExportModal && (
          <ExportSongsModal
            songs={songsWithSignedUrls.filter((s) => s.id && selectedSongIds.includes(s.id))}
            onClose={() => {
              setShowExportModal(false);
              setSelectedSongIds([]);
            }}
          />
        )}

        {/* Edit Metadata Modal */}
        {songsToEdit.length > 0 && (
          <EditMetadataModal
            songs={songsToEdit}
            onClose={() => setSongsToEdit([])}
            onSaved={() => setSelectedSongIds([])}
          />
        )}

        {/* Radio Recorder Modal */}
        {showRecorderModal && library.id && (
          <RadioRecorderModal
            libraryId={library.id}
            existingSongs={songs}
            onClose={() => setShowRecorderModal(false)}
            onSongsAdded={() => {
              // Songs will appear via subscription, just close modal
              setShowRecorderModal(false);
            }}
          />
        )}

        {/* Sync Conflict Dialog */}
        <ConfirmDialog
          open={showConflictDialog}
          title="Sync Conflict"
          message="This music library was updated on another device. What would you like to do with your local changes?"
          confirmLabel="Save Mine"
          cancelLabel="Load Theirs"
          variant="danger"
          onConfirm={handleKeepLocal}
          onCancel={handleAcceptRemote}
        />
      </div>
    );
  }
);

export default MusicLibraryEditor;
