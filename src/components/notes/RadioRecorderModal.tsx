"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { DataGrid, GridColDef, GridRenderCellParams, GridRowParams, useGridApiRef } from "@mui/x-data-grid";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Song, formatDuration } from "@/lib/songs";
import { uploadRecordedAudio } from "@/lib/music-storage";
import { identifyAudio, IdentificationCandidate } from "@/lib/audio-fingerprint";

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";

// MUI DataGrid styles matching the main SongsDataGrid
const dataGridSx = {
  border: "none",
  backgroundColor: "var(--background)",
  color: "var(--foreground)",
  fontFamily: FONT_FAMILY,
  "& .MuiDataGrid-cell": {
    border: "none",
    fontSize: "11px",
    padding: "0 6px",
    fontFamily: FONT_FAMILY,
    userSelect: "none",
  },
  "& .MuiDataGrid-columnHeaders": {
    border: "none",
    borderBottom: "1px solid var(--border)",
    backgroundColor: "var(--background)",
    minHeight: "24px !important",
    maxHeight: "24px !important",
  },
  "& .MuiDataGrid-columnHeader": {
    backgroundColor: "var(--background)",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontSize: "10px",
    fontWeight: 500,
    color: "var(--muted)",
    fontFamily: FONT_FAMILY,
  },
  "& .MuiDataGrid-footerContainer": {
    display: "none",
  },
  "& .MuiDataGrid-row:nth-of-type(odd)": {
    backgroundColor: "var(--background)",
  },
  "& .MuiDataGrid-row:nth-of-type(even)": {
    backgroundColor: "var(--sidebar-bg)",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "var(--hover)",
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
    outline: "none",
  },
  "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within": {
    outline: "none",
  },
  "& .MuiDataGrid-sortIcon": {
    color: "var(--muted)",
  },
  "& .MuiDataGrid-columnSeparator": {
    display: "none",
  },
  "& .MuiDataGrid-row": {
    userSelect: "none",
  },
};

interface RecordedSong {
  id: string;
  blob: Blob;
  duration: number; // in seconds
  title: string;
  artist: string;
  album: string;
  year: string;
  genre: string;
  albumArtFile?: File;
  albumArtPreview?: string;
  status: "pending" | "identifying" | "identified" | "failed" | "manual";
  candidates?: IdentificationCandidate[];
}

interface RadioRecorderModalProps {
  libraryId: string;
  existingSongs?: Song[];
  onClose: () => void;
  onSongsAdded: (songs: Song[]) => void;
}

type RecordingState = "idle" | "requesting" | "recording";

export default function RadioRecorderModal({
  libraryId,
  existingSongs = [],
  onClose,
  onSongsAdded,
}: RadioRecorderModalProps) {
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordedSongs, setRecordedSongs] = useState<RecordedSong[]>([]);
  const [currentRecordingDuration, setCurrentRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceProgress, setSilenceProgress] = useState(0); // 0-1 progress toward split
  const [error, setError] = useState<string | null>(null);

  // Waveform data for visualization
  const [waveformData, setWaveformData] = useState<number[]>(new Array(64).fill(0));

  // Settings
  const [silenceThreshold, setSilenceThreshold] = useState(0.02); // Linear amplitude threshold
  const [silenceDurationSetting, setSilenceDurationSetting] = useState(3); // seconds of silence before split
  const [autoSplit, setAutoSplit] = useState(true);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Editing state
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteField, setAutocompleteField] = useState<"artist" | "album">("artist");
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);

  // Refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const songCounterRef = useRef(0);
  const apiRef = useGridApiRef();
  const albumArtInputRef = useRef<HTMLInputElement>(null);
  const [albumArtTargetId, setAlbumArtTargetId] = useState<string | null>(null);

  // Get unique artists and albums from existing songs
  const uniqueArtists = useMemo(() => {
    const artists = new Set<string>();
    existingSongs.forEach(s => {
      if (s.artist && s.artist !== "Unknown Artist") {
        artists.add(s.artist);
      }
    });
    return Array.from(artists).sort();
  }, [existingSongs]);

  const uniqueAlbums = useMemo(() => {
    const albums = new Set<string>();
    existingSongs.forEach(s => {
      if (s.album && s.album !== "Unknown Album") {
        albums.add(s.album);
      }
    });
    return Array.from(albums).sort();
  }, [existingSongs]);

  // MUI theme
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light",
        },
        typography: {
          fontFamily: FONT_FAMILY,
          fontSize: 12,
        },
      }),
    []
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      recordedSongs.forEach(song => {
        if (song.albumArtPreview) {
          URL.revokeObjectURL(song.albumArtPreview);
        }
      });
    };
  }, []);

  // Start capturing audio from a tab
  const startRecording = useCallback(async () => {
    setRecordingState("requesting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      stream.getVideoTracks().forEach((track) => track.stop());

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error("No audio track available. Make sure to share a tab with audio.");
      }

      mediaStreamRef.current = stream;

      // Set up audio analysis
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.start(500); // Collect data every 500ms for smoother splits
      setRecordingState("recording");

      monitorAudioLevel();

      stream.getAudioTracks()[0].onended = () => {
        handleSplit();
        stopRecording();
      };
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setRecordingState("idle");
    }
  }, []);

  // Monitor audio level and detect silence using time domain data
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const checkLevel = () => {
      if (recordingState !== "recording") return;

      // Get time domain data for accurate silence detection
      analyser.getByteTimeDomainData(dataArray);

      // Calculate RMS amplitude (0-1 range)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const amplitude = (dataArray[i] - 128) / 128; // Convert to -1 to 1 range
        sum += amplitude * amplitude;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setAudioLevel(rms);

      // Get frequency data for visualization
      analyser.getByteFrequencyData(frequencyData);
      const waveform = Array.from(frequencyData.slice(0, 64)).map(v => v / 255);
      setWaveformData(waveform);

      // Update recording duration
      if (recordingStartTimeRef.current > 0) {
        const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
        setCurrentRecordingDuration(elapsed);
      }

      // Silence detection
      if (autoSplit) {
        const isSilent = rms < silenceThreshold;

        if (isSilent) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          }
          const silenceDurationMs = Date.now() - silenceStartRef.current;
          const progress = Math.min(1, silenceDurationMs / (silenceDurationSetting * 1000));
          setSilenceProgress(progress);

          if (silenceDurationMs >= silenceDurationSetting * 1000) {
            // Only split if we have meaningful content (> 15 seconds)
            const recordingDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
            if (recordingDuration > 15) {
              handleSplit();
            }
            silenceStartRef.current = null;
            setSilenceProgress(0);
          }
        } else {
          silenceStartRef.current = null;
          setSilenceProgress(0);
        }
      }

      animationFrameRef.current = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }, [recordingState, autoSplit, silenceThreshold, silenceDurationSetting]);

  useEffect(() => {
    if (recordingState === "recording") {
      monitorAudioLevel();
    }
  }, [recordingState, monitorAudioLevel]);

  // Split current recording into a song
  const handleSplit = useCallback(() => {
    if (!mediaRecorderRef.current || chunksRef.current.length === 0) return;
    if (recordingStartTimeRef.current === 0) return;

    mediaRecorderRef.current.stop();

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const durationSeconds = (Date.now() - recordingStartTimeRef.current) / 1000;

    if (durationSeconds > 15 && !isNaN(durationSeconds) && isFinite(durationSeconds)) {
      songCounterRef.current += 1;
      const newSong: RecordedSong = {
        id: `rec-${Date.now()}-${songCounterRef.current}`,
        blob,
        duration: durationSeconds,
        title: `Recording ${songCounterRef.current}`,
        artist: "",
        album: "",
        year: "",
        genre: "",
        status: "pending",
      };

      setRecordedSongs((prev) => [...prev, newSong]);

      // Try to identify the song
      tryIdentifySong(newSong.id, blob);
    }

    // Reset and restart recording
    chunksRef.current = [];
    recordingStartTimeRef.current = Date.now();
    setCurrentRecordingDuration(0);

    if (mediaStreamRef.current && recordingState === "recording") {
      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(500);
    }
  }, [recordingState]);

  // Try to identify a song using audio fingerprinting
  const tryIdentifySong = useCallback(async (songId: string, blob: Blob) => {
    setRecordedSongs((prev) =>
      prev.map((s) => (s.id === songId ? { ...s, status: "identifying" as const } : s))
    );

    try {
      const result = await identifyAudio(blob);

      if (result.success && result.candidates.length > 0) {
        const best = result.candidates[0];
        setRecordedSongs((prev) =>
          prev.map((s) =>
            s.id === songId
              ? {
                  ...s,
                  status: "identified" as const,
                  title: best.title,
                  artist: best.artist,
                  album: best.album,
                  year: best.year,
                  candidates: result.candidates,
                }
              : s
          )
        );
      } else {
        // No match found, mark as manual
        setRecordedSongs((prev) =>
          prev.map((s) => (s.id === songId ? { ...s, status: "manual" as const } : s))
        );
        if (result.error) {
          console.log("Identification note:", result.error);
        }
      }
    } catch (error) {
      console.error("Identification failed:", error);
      setRecordedSongs((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, status: "failed" as const } : s))
      );
    }
  }, []);

  // Stop recording entirely
  const stopRecording = useCallback(() => {
    if (chunksRef.current.length > 0 && recordingStartTimeRef.current > 0) {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const durationSeconds = (Date.now() - recordingStartTimeRef.current) / 1000;

      if (durationSeconds > 15 && !isNaN(durationSeconds) && isFinite(durationSeconds)) {
        songCounterRef.current += 1;
        const newSong: RecordedSong = {
          id: `rec-${Date.now()}-${songCounterRef.current}`,
          blob,
          duration: durationSeconds,
          title: `Recording ${songCounterRef.current}`,
          artist: "",
          album: "",
          year: "",
          genre: "",
          status: "pending",
        };
        setRecordedSongs((prev) => [...prev, newSong]);
        tryIdentifySong(newSong.id, blob);
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
    recordingStartTimeRef.current = 0;

    setRecordingState("idle");
    setCurrentRecordingDuration(0);
    setAudioLevel(0);
    setSilenceProgress(0);
    setWaveformData(new Array(64).fill(0));
  }, [tryIdentifySong]);

  // Update song metadata
  const updateSongField = useCallback((songId: string, field: keyof RecordedSong, value: string) => {
    setRecordedSongs((prev) =>
      prev.map((song) => (song.id === songId ? { ...song, [field]: value } : song))
    );
  }, []);

  // Handle cell edit start
  const startEditing = useCallback((id: string, field: string, currentValue: string) => {
    setEditingCell({ id, field });
    setEditValue(currentValue);

    // Show autocomplete for artist/album
    if (field === "artist" || field === "album") {
      setAutocompleteField(field);
      const suggestions = field === "artist" ? uniqueArtists : uniqueAlbums;
      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(suggestions.length > 0);
    } else {
      setShowAutocomplete(false);
    }
  }, [uniqueArtists, uniqueAlbums]);

  // Handle edit complete
  const finishEditing = useCallback(() => {
    if (editingCell) {
      updateSongField(editingCell.id, editingCell.field as keyof RecordedSong, editValue);
    }
    setEditingCell(null);
    setEditValue("");
    setShowAutocomplete(false);
  }, [editingCell, editValue, updateSongField]);

  // Filter autocomplete suggestions
  const filteredSuggestions = useMemo(() => {
    if (!editValue.trim()) return autocompleteSuggestions.slice(0, 8);
    const lower = editValue.toLowerCase();
    return autocompleteSuggestions
      .filter((s) => s.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [autocompleteSuggestions, editValue]);

  // Delete songs
  const deleteSongs = useCallback((ids: string[]) => {
    setRecordedSongs((prev) => {
      const toDelete = prev.filter((s) => ids.includes(s.id));
      toDelete.forEach((s) => {
        if (s.albumArtPreview) URL.revokeObjectURL(s.albumArtPreview);
      });
      return prev.filter((s) => !ids.includes(s.id));
    });
    setSelectedIds([]);
  }, []);

  // Handle album art selection
  const handleAlbumArtSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !albumArtTargetId) return;

    const previewUrl = URL.createObjectURL(file);
    setRecordedSongs((prev) =>
      prev.map((song) => {
        if (song.id === albumArtTargetId) {
          if (song.albumArtPreview) URL.revokeObjectURL(song.albumArtPreview);
          return { ...song, albumArtFile: file, albumArtPreview: previewUrl };
        }
        return song;
      })
    );
    setAlbumArtTargetId(null);
    event.target.value = "";
  }, [albumArtTargetId]);

  // Row click handler
  const handleRowClick = useCallback((params: GridRowParams, event: React.MouseEvent) => {
    const rowId = String(params.id);
    if (event.shiftKey && selectedIds.length > 0) {
      const allIds = recordedSongs.map((s) => s.id);
      const lastIdx = allIds.indexOf(selectedIds[selectedIds.length - 1]);
      const currIdx = allIds.indexOf(rowId);
      const [start, end] = lastIdx < currIdx ? [lastIdx, currIdx] : [currIdx, lastIdx];
      setSelectedIds(allIds.slice(start, end + 1));
    } else if (event.metaKey || event.ctrlKey) {
      setSelectedIds((prev) =>
        prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
      );
    } else {
      setSelectedIds([rowId]);
    }
  }, [selectedIds, recordedSongs]);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Add songs to library
  const handleAddToLibrary = useCallback(async () => {
    if (recordedSongs.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: recordedSongs.length });

    const uploadedSongs: Song[] = [];

    for (let i = 0; i < recordedSongs.length; i++) {
      const song = recordedSongs[i];
      setUploadProgress({ current: i, total: recordedSongs.length });

      try {
        const uploadedSong = await uploadRecordedAudio(song.blob, libraryId, {
          title: song.title,
          artist: song.artist,
          album: song.album,
          year: song.year,
          genre: song.genre,
          duration: song.duration * 1000, // Convert to ms for the upload function
          albumArtFile: song.albumArtFile,
        });
        uploadedSongs.push(uploadedSong);
      } catch (error) {
        console.error(`Failed to upload ${song.title}:`, error);
      }
    }

    setUploadProgress({ current: recordedSongs.length, total: recordedSongs.length });
    setIsUploading(false);

    if (uploadedSongs.length > 0) {
      onSongsAdded(uploadedSongs);
    }
    onClose();
  }, [recordedSongs, libraryId, onSongsAdded, onClose]);

  // DataGrid columns
  const columns: GridColDef[] = useMemo(() => [
    {
      field: "albumArt",
      headerName: "",
      width: 32,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setAlbumArtTargetId(params.row.id);
            albumArtInputRef.current?.click();
          }}
          className="w-6 h-6 rounded border border-[--border] bg-[--sidebar-bg] flex items-center justify-center overflow-hidden hover:border-blue-500"
        >
          {params.row.albumArtPreview ? (
            <img src={params.row.albumArtPreview} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-3 h-3 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          )}
        </button>
      ),
    },
    {
      field: "title",
      headerName: "Title",
      flex: 1.5,
      minWidth: 120,
      editable: false,
      renderCell: (params: GridRenderCellParams) => {
        const isEditing = editingCell?.id === params.row.id && editingCell?.field === "title";
        if (isEditing) {
          return (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") finishEditing(); }}
              className="w-full px-1 text-xs bg-white border border-blue-500 rounded outline-none"
              style={{ fontFamily: FONT_FAMILY }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return (
          <span
            className="truncate cursor-text hover:underline"
            onClick={(e) => { e.stopPropagation(); startEditing(params.row.id, "title", params.value || ""); }}
          >
            {params.value || <span className="text-[--muted] italic">Untitled</span>}
          </span>
        );
      },
    },
    {
      field: "artist",
      headerName: "Artist",
      flex: 1,
      minWidth: 80,
      renderCell: (params: GridRenderCellParams) => {
        const isEditing = editingCell?.id === params.row.id && editingCell?.field === "artist";
        if (isEditing) {
          return (
            <div className="relative w-full">
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => setTimeout(finishEditing, 150)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") finishEditing(); }}
                className="w-full px-1 text-xs bg-white border border-blue-500 rounded outline-none"
                style={{ fontFamily: FONT_FAMILY }}
                onClick={(e) => e.stopPropagation()}
              />
              {showAutocomplete && autocompleteField === "artist" && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 z-50 mt-1 w-48 max-h-32 overflow-y-auto bg-white border border-[--border] rounded shadow-lg">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="w-full px-2 py-1 text-left text-xs hover:bg-[--hover] truncate"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setEditValue(s);
                        updateSongField(params.row.id, "artist", s);
                        setShowAutocomplete(false);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <span
            className="truncate cursor-text hover:underline"
            onClick={(e) => { e.stopPropagation(); startEditing(params.row.id, "artist", params.value || ""); }}
          >
            {params.value || <span className="text-[--muted] italic">—</span>}
          </span>
        );
      },
    },
    {
      field: "album",
      headerName: "Album",
      flex: 1,
      minWidth: 80,
      renderCell: (params: GridRenderCellParams) => {
        const isEditing = editingCell?.id === params.row.id && editingCell?.field === "album";
        if (isEditing) {
          return (
            <div className="relative w-full">
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => setTimeout(finishEditing, 150)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") finishEditing(); }}
                className="w-full px-1 text-xs bg-white border border-blue-500 rounded outline-none"
                style={{ fontFamily: FONT_FAMILY }}
                onClick={(e) => e.stopPropagation()}
              />
              {showAutocomplete && autocompleteField === "album" && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 z-50 mt-1 w-48 max-h-32 overflow-y-auto bg-white border border-[--border] rounded shadow-lg">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="w-full px-2 py-1 text-left text-xs hover:bg-[--hover] truncate"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setEditValue(s);
                        updateSongField(params.row.id, "album", s);
                        setShowAutocomplete(false);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <span
            className="truncate cursor-text hover:underline"
            onClick={(e) => { e.stopPropagation(); startEditing(params.row.id, "album", params.value || ""); }}
          >
            {params.value || <span className="text-[--muted] italic">—</span>}
          </span>
        );
      },
    },
    {
      field: "year",
      headerName: "Year",
      width: 44,
      renderCell: (params: GridRenderCellParams) => {
        const isEditing = editingCell?.id === params.row.id && editingCell?.field === "year";
        if (isEditing) {
          return (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") finishEditing(); }}
              className="w-full px-1 text-xs bg-white border border-blue-500 rounded outline-none"
              style={{ fontFamily: FONT_FAMILY }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return (
          <span
            className="cursor-text hover:underline"
            onClick={(e) => { e.stopPropagation(); startEditing(params.row.id, "year", params.value || ""); }}
          >
            {params.value || <span className="text-[--muted]">—</span>}
          </span>
        );
      },
    },
    {
      field: "duration",
      headerName: "Time",
      width: 48,
      renderCell: (params: GridRenderCellParams) => formatDuration(params.value || 0),
    },
    {
      field: "status",
      headerName: "",
      width: 60,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const song = params.row as RecordedSong;
        if (params.value === "identifying") {
          return (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-[9px] text-blue-500">ID...</span>
            </div>
          );
        }
        if (params.value === "identified") {
          return (
            <span className="text-[9px] text-green-600" title="Identified">✓</span>
          );
        }
        if (params.value === "manual" || params.value === "failed" || params.value === "pending") {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                tryIdentifySong(song.id, song.blob);
              }}
              className="text-[9px] text-blue-500 hover:text-blue-600 hover:underline"
              title="Try to identify this song"
            >
              ID?
            </button>
          );
        }
        return null;
      },
    },
  ], [editingCell, editValue, finishEditing, startEditing, showAutocomplete, autocompleteField, filteredSuggestions, updateSongField, tryIdentifySong]);

  // Selection styles
  const selectionStyles = useMemo(() => {
    if (selectedIds.length === 0) return "";
    const selectors = selectedIds.map((id) => `.MuiDataGrid-row[data-id="${id}"]`).join(",\n");
    return `
      ${selectors} {
        background-color: #1e6bbd !important;
        color: #fff !important;
      }
      ${selectors}:hover {
        background-color: #2277cc !important;
      }
      ${selectors} .MuiDataGrid-cell {
        color: #fff !important;
      }
    `;
  }, [selectedIds]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-lg shadow-xl border border-[--border] overflow-hidden"
        style={{ backgroundColor: "var(--background)", fontFamily: FONT_FAMILY }}
      >
        <input
          ref={albumArtInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAlbumArtSelect}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[--border]">
          <h2 className="text-sm font-semibold">Record from Tab</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Recording Controls */}
        <div className="px-4 py-3 border-b border-[--border] bg-[--sidebar-bg]">
          {recordingState === "idle" ? (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={startRecording}
                className="px-4 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="6" />
                </svg>
                Start Recording
              </button>
              <span className="text-xs text-[--muted]">
                Share a browser tab to capture audio. Songs split automatically on silence.
              </span>
            </div>
          ) : recordingState === "requesting" ? (
            <div className="text-xs text-[--muted]">Select a tab to share...</div>
          ) : (
            <div className="space-y-2">
              {/* Recording status and controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium">REC</span>
                  <span className="text-xs text-[--muted] tabular-nums w-12">
                    {formatDuration(currentRecordingDuration)}
                  </span>
                </div>

                {/* Waveform */}
                <div className="flex-1 flex items-center gap-px h-6">
                  {waveformData.map((value, i) => (
                    <div
                      key={i}
                      className="flex-1 max-w-1 rounded-sm transition-all duration-75"
                      style={{
                        height: `${Math.max(2, value * 24)}px`,
                        backgroundColor: value > 0.8 ? "#ef4444" : value > 0.4 ? "#22c55e" : "#94a3b8",
                      }}
                    />
                  ))}
                </div>

                {/* Silence progress indicator */}
                {silenceProgress > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-[--border] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all duration-100"
                        style={{ width: `${silenceProgress * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-yellow-600">silence</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSplit}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600"
                >
                  Split
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3 py-1 bg-[--background] border border-[--border] text-[--foreground] rounded text-xs font-medium hover:bg-[--hover]"
                >
                  Stop
                </button>
              </div>

              {/* Settings */}
              <div className="flex items-center gap-4 text-[10px] text-[--muted]">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={autoSplit}
                    onChange={(e) => setAutoSplit(e.target.checked)}
                    className="w-3 h-3"
                  />
                  Auto-split on silence
                </label>
                <label className="flex items-center gap-1">
                  Threshold:
                  <input
                    type="range"
                    min="0.005"
                    max="0.1"
                    step="0.005"
                    value={silenceThreshold}
                    onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))}
                    className="w-16 h-1"
                  />
                  <span className="w-6">{(silenceThreshold * 100).toFixed(0)}%</span>
                </label>
                <label className="flex items-center gap-1">
                  Duration:
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="0.5"
                    value={silenceDurationSetting}
                    onChange={(e) => setSilenceDurationSetting(parseFloat(e.target.value))}
                    className="w-16 h-1"
                  />
                  <span className="w-6">{silenceDurationSetting}s</span>
                </label>
              </div>
            </div>
          )}

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>

        {/* Songs Table */}
        <div className="flex-1 min-h-0">
          {recordedSongs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-[--muted]">
              {recordingState === "recording"
                ? "Recording... Songs will appear here when split"
                : "No recordings yet. Start recording to capture songs."}
            </div>
          ) : (
            <ThemeProvider theme={theme}>
              <style>{selectionStyles}</style>
              <div className="h-full">
                <DataGrid
                  apiRef={apiRef}
                  rows={recordedSongs}
                  columns={columns}
                  disableRowSelectionOnClick
                  disableColumnMenu
                  hideFooter
                  rowHeight={28}
                  columnHeaderHeight={24}
                  sx={dataGridSx}
                  onRowClick={handleRowClick}
                />
              </div>
            </ThemeProvider>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[--border] bg-[--sidebar-bg]">
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => deleteSongs(selectedIds)}
                className="px-2 py-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded"
              >
                Delete {selectedIds.length > 1 ? `(${selectedIds.length})` : ""}
              </button>
            )}
            {recordedSongs.length > 0 && (
              <span className="text-[10px] text-[--muted]">
                {recordedSongs.length} song{recordedSongs.length !== 1 ? "s" : ""} ·{" "}
                {formatDuration(recordedSongs.reduce((sum, s) => sum + s.duration, 0))}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-3 py-1.5 text-xs text-[--muted] hover:text-[--foreground] disabled:opacity-50"
            >
              {recordedSongs.length > 0 ? "Discard" : "Cancel"}
            </button>
            {recordedSongs.length > 0 && (
              <button
                type="button"
                onClick={handleAddToLibrary}
                disabled={isUploading}
                className="px-4 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {(uploadProgress?.current ?? 0) + 1} / {uploadProgress?.total ?? 0}
                  </>
                ) : (
                  `Add to Library`
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
