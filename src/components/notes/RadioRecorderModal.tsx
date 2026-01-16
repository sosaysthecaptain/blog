"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { DataGrid, GridColDef, GridRenderCellParams, GridRowParams, useGridApiRef } from "@mui/x-data-grid";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Song, formatDuration } from "@/lib/songs";
import { uploadRecordedAudio } from "@/lib/music-storage";
import { identifyAudio, IdentificationCandidate } from "@/lib/audio-fingerprint";
import WaveformTimeline from "./WaveformTimeline";

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";

// MUI DataGrid styles
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

interface Split {
  id: string;
  time: number;
}

interface RecordedSong {
  id: string;
  blob: Blob;
  startTime: number;
  endTime: number;
  duration: number;
  title: string;
  artist: string;
  album: string;
  year: string;
  genre: string;
  status: "pending" | "identifying" | "identified" | "failed" | "manual";
  candidates?: IdentificationCandidate[];
}

interface RadioRecorderModalProps {
  libraryId: string;
  existingSongs?: Song[];
  onClose: () => void;
  onSongsAdded: (songs: Song[]) => void;
}

type Phase = "idle" | "requesting" | "recording" | "editing" | "metadata";

export default function RadioRecorderModal({
  libraryId,
  existingSongs = [],
  onClose,
  onSongsAdded,
}: RadioRecorderModalProps) {
  // Phase state
  const [phase, setPhase] = useState<Phase>("idle");

  // Recording state
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [currentRecordingDuration, setCurrentRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(64).fill(0));
  const [error, setError] = useState<string | null>(null);

  // Auto-split state (for live detection)
  const [silenceThreshold, setSilenceThreshold] = useState(0.02);
  const [silenceDurationSetting, setSilenceDurationSetting] = useState(1);
  const [autoSplit, setAutoSplit] = useState(true);
  const [silenceProgress, setSilenceProgress] = useState(0);

  // Editing state (waveform splits)
  const [splits, setSplits] = useState<Split[]>([]);

  // Metadata state (song list)
  const [recordedSongs, setRecordedSongs] = useState<RecordedSong[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteField, setAutocompleteField] = useState<"artist" | "album">("artist");

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const detectedSplitsRef = useRef<number[]>([]);
  const apiRef = useGridApiRef();

  // Get unique artists and albums from existing songs
  const uniqueArtists = useMemo(() => {
    const artists = new Set<string>();
    existingSongs.forEach(s => {
      if (s.artist && s.artist !== "Unknown Artist") artists.add(s.artist);
    });
    return Array.from(artists).sort();
  }, [existingSongs]);

  const uniqueAlbums = useMemo(() => {
    const albums = new Set<string>();
    existingSongs.forEach(s => {
      if (s.album && s.album !== "Unknown Album") albums.add(s.album);
    });
    return Array.from(albums).sort();
  }, [existingSongs]);

  const filteredSuggestions = useMemo(() => {
    const suggestions = autocompleteField === "artist" ? uniqueArtists : uniqueAlbums;
    if (!editValue.trim()) return suggestions.slice(0, 8);
    const lower = editValue.toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(lower)).slice(0, 8);
  }, [autocompleteField, uniqueArtists, uniqueAlbums, editValue]);

  // MUI theme
  const theme = useMemo(() => createTheme({
    palette: { mode: typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light" },
    typography: { fontFamily: FONT_FAMILY, fontSize: 12 },
  }), []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    setPhase("requesting");
    setError(null);
    detectedSplitsRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });

      stream.getVideoTracks().forEach(track => track.stop());

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error("No audio track available. Make sure to share a tab with audio.");
      }

      mediaStreamRef.current = stream;

      // Audio analysis
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.start(500);
      setPhase("recording");
      monitorAudioLevel();

      stream.getAudioTracks()[0].onended = () => {
        finishRecording();
      };
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setPhase("idle");
    }
  }, []);

  // Monitor audio levels
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const checkLevel = () => {
      if (phase !== "recording") return;

      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const amplitude = (dataArray[i] - 128) / 128;
        sum += amplitude * amplitude;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setAudioLevel(rms);

      analyser.getByteFrequencyData(frequencyData);
      setWaveformData(Array.from(frequencyData.slice(0, 64)).map(v => v / 255));

      if (recordingStartTimeRef.current > 0) {
        setCurrentRecordingDuration((Date.now() - recordingStartTimeRef.current) / 1000);
      }

      // Auto-detect silence for split markers
      if (autoSplit) {
        const isSilent = rms < silenceThreshold;
        if (isSilent) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          }
          const silenceDurationMs = Date.now() - silenceStartRef.current;
          setSilenceProgress(Math.min(1, silenceDurationMs / (silenceDurationSetting * 1000)));

          if (silenceDurationMs >= silenceDurationSetting * 1000) {
            const splitTime = (Date.now() - recordingStartTimeRef.current) / 1000;
            // Only add if not too close to last split
            const lastSplit = detectedSplitsRef.current[detectedSplitsRef.current.length - 1] || 0;
            if (splitTime - lastSplit > 10) {
              detectedSplitsRef.current.push(splitTime);
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
  }, [phase, autoSplit, silenceThreshold, silenceDurationSetting]);

  useEffect(() => {
    if (phase === "recording") monitorAudioLevel();
  }, [phase, monitorAudioLevel]);

  // Finish recording and move to editing phase
  const finishRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Wait a bit for final chunks
    setTimeout(() => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setRecordingBlob(blob);

      // Convert detected splits to Split objects
      const initialSplits: Split[] = detectedSplitsRef.current.map((time, i) => ({
        id: `split-${i}-${Date.now()}`,
        time,
      }));
      setSplits(initialSplits);

      // Clean up recording resources
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
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

      setPhase("editing");
    }, 100);
  }, []);

  // Stop recording (cancel)
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
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

    setPhase("idle");
    setCurrentRecordingDuration(0);
    setAudioLevel(0);
    setSilenceProgress(0);
    setWaveformData(new Array(64).fill(0));
  }, []);

  // Handle splits confirmed - create song segments
  const handleSplitsConfirmed = useCallback(async () => {
    if (!recordingBlob) return;

    const sortedSplits = [...splits].sort((a, b) => a.time - b.time);
    const totalDuration = currentRecordingDuration;
    const times = [0, ...sortedSplits.map(s => s.time), totalDuration];

    const songs: RecordedSong[] = [];
    for (let i = 0; i < times.length - 1; i++) {
      const start = times[i];
      const end = times[i + 1];
      const duration = end - start;

      if (duration < 5) continue; // Skip very short segments

      songs.push({
        id: `song-${i}-${Date.now()}`,
        blob: recordingBlob, // We'll slice this on upload
        startTime: start,
        endTime: end,
        duration,
        title: `Track ${i + 1}`,
        artist: "",
        album: "",
        year: "",
        genre: "",
        status: "pending",
      });
    }

    setRecordedSongs(songs);
    setPhase("metadata");

    // Try to identify each song
    for (const song of songs) {
      tryIdentifySong(song.id);
    }
  }, [recordingBlob, splits, currentRecordingDuration]);

  // Try to identify a song
  const tryIdentifySong = useCallback(async (songId: string) => {
    setRecordedSongs(prev => prev.map(s => s.id === songId ? { ...s, status: "identifying" as const } : s));

    try {
      const song = recordedSongs.find(s => s.id === songId);
      if (!song) return;

      const result = await identifyAudio(song.blob);

      if (result.success && result.candidates.length > 0) {
        const best = result.candidates[0];
        setRecordedSongs(prev => prev.map(s =>
          s.id === songId
            ? { ...s, status: "identified" as const, title: best.title, artist: best.artist, album: best.album, year: best.year, candidates: result.candidates }
            : s
        ));
      } else {
        setRecordedSongs(prev => prev.map(s => s.id === songId ? { ...s, status: "manual" as const } : s));
      }
    } catch (error) {
      console.error("Identification failed:", error);
      setRecordedSongs(prev => prev.map(s => s.id === songId ? { ...s, status: "failed" as const } : s));
    }
  }, [recordedSongs]);

  // Update song field
  const updateSongField = useCallback((songId: string, field: keyof RecordedSong, value: string) => {
    setRecordedSongs(prev => prev.map(s => s.id === songId ? { ...s, [field]: value } : s));
  }, []);

  // Delete songs
  const deleteSongs = useCallback((ids: string[]) => {
    setRecordedSongs(prev => prev.filter(s => !ids.includes(s.id)));
    setSelectedIds([]);
  }, []);

  // Start editing
  const startEditing = useCallback((id: string, field: string, currentValue: string) => {
    setEditingCell({ id, field });
    setEditValue(currentValue);
    if (field === "artist" || field === "album") {
      setAutocompleteField(field);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  }, []);

  // Finish editing
  const finishEditing = useCallback(() => {
    if (editingCell) {
      updateSongField(editingCell.id, editingCell.field as keyof RecordedSong, editValue);
    }
    setEditingCell(null);
    setEditValue("");
    setShowAutocomplete(false);
  }, [editingCell, editValue, updateSongField]);

  // Row click
  const handleRowClick = useCallback((params: GridRowParams, event: React.MouseEvent) => {
    const rowId = String(params.id);
    if (event.shiftKey && selectedIds.length > 0) {
      const allIds = recordedSongs.map(s => s.id);
      const lastIdx = allIds.indexOf(selectedIds[selectedIds.length - 1]);
      const currIdx = allIds.indexOf(rowId);
      const [start, end] = lastIdx < currIdx ? [lastIdx, currIdx] : [currIdx, lastIdx];
      setSelectedIds(allIds.slice(start, end + 1));
    } else if (event.metaKey || event.ctrlKey) {
      setSelectedIds(prev => prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]);
    } else {
      setSelectedIds([rowId]);
    }
  }, [selectedIds, recordedSongs]);

  // Upload songs
  const handleAddToLibrary = useCallback(async () => {
    if (recordedSongs.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: recordedSongs.length });

    const uploadedSongs: Song[] = [];

    for (let i = 0; i < recordedSongs.length; i++) {
      const song = recordedSongs[i];
      setUploadProgress({ current: i, total: recordedSongs.length });

      try {
        const uploaded = await uploadRecordedAudio(song.blob, libraryId, {
          title: song.title,
          artist: song.artist,
          album: song.album,
          year: song.year,
          genre: song.genre,
          duration: song.duration * 1000,
        });
        uploadedSongs.push(uploaded);
      } catch (error) {
        console.error(`Failed to upload ${song.title}:`, error);
      }
    }

    setIsUploading(false);
    if (uploadedSongs.length > 0) onSongsAdded(uploadedSongs);
    onClose();
  }, [recordedSongs, libraryId, onSongsAdded, onClose]);

  // DataGrid columns
  const columns: GridColDef[] = useMemo(() => [
    {
      field: "title",
      headerName: "Title",
      flex: 1.5,
      minWidth: 120,
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
          <span className="truncate cursor-text hover:underline" onClick={(e) => { e.stopPropagation(); startEditing(params.row.id, "title", params.value || ""); }}>
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
                    <button key={s} type="button" className="w-full px-2 py-1 text-left text-xs hover:bg-[--hover] truncate"
                      onMouseDown={(e) => { e.preventDefault(); setEditValue(s); updateSongField(params.row.id, "artist", s); setShowAutocomplete(false); }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <span className="truncate cursor-text hover:underline" onClick={(e) => { e.stopPropagation(); startEditing(params.row.id, "artist", params.value || ""); }}>
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
                    <button key={s} type="button" className="w-full px-2 py-1 text-left text-xs hover:bg-[--hover] truncate"
                      onMouseDown={(e) => { e.preventDefault(); setEditValue(s); updateSongField(params.row.id, "album", s); setShowAutocomplete(false); }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <span className="truncate cursor-text hover:underline" onClick={(e) => { e.stopPropagation(); startEditing(params.row.id, "album", params.value || ""); }}>
            {params.value || <span className="text-[--muted] italic">—</span>}
          </span>
        );
      },
    },
    {
      field: "year",
      headerName: "Year",
      width: 50,
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
          <span className="cursor-text hover:underline" onClick={(e) => { e.stopPropagation(); startEditing(params.row.id, "year", params.value || ""); }}>
            {params.value || <span className="text-[--muted]">—</span>}
          </span>
        );
      },
    },
    {
      field: "duration",
      headerName: "Time",
      width: 50,
      renderCell: (params: GridRenderCellParams) => formatDuration(params.value || 0),
    },
    {
      field: "status",
      headerName: "",
      width: 40,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        if (params.value === "identifying") {
          return <svg className="w-3 h-3 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>;
        }
        if (params.value === "identified") {
          return <span className="text-[9px] text-green-600" title="Identified">✓</span>;
        }
        return null;
      },
    },
    {
      field: "actions",
      headerName: "",
      width: 32,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); deleteSongs([params.row.id]); }}
          className="p-1 text-[--muted] hover:text-red-500 rounded" title="Delete">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ),
    },
  ], [editingCell, editValue, finishEditing, startEditing, showAutocomplete, autocompleteField, filteredSuggestions, updateSongField, deleteSongs]);

  // Selection styles
  const selectionStyles = useMemo(() => {
    if (selectedIds.length === 0) return "";
    const selectors = selectedIds.map(id => `.MuiDataGrid-row[data-id="${id}"]`).join(",\n");
    return `${selectors} { background-color: #1e6bbd !important; color: #fff !important; }
      ${selectors}:hover { background-color: #2277cc !important; }
      ${selectors} .MuiDataGrid-cell { color: #fff !important; }`;
  }, [selectedIds]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-6xl h-[90vh] flex flex-col rounded-lg shadow-xl border border-[--border] overflow-hidden"
        style={{ backgroundColor: "var(--background)", fontFamily: FONT_FAMILY }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[--border]">
          <h2 className="text-sm font-semibold">
            {phase === "idle" && "Record from Tab"}
            {phase === "requesting" && "Select Tab..."}
            {phase === "recording" && "Recording..."}
            {phase === "editing" && "Edit Splits"}
            {phase === "metadata" && "Edit Metadata"}
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Idle / Requesting */}
          {(phase === "idle" || phase === "requesting") && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-[--muted] mb-4">
                  Share a browser tab playing music to start recording.<br />
                  Silence between songs will be automatically detected.
                </p>
                <button type="button" onClick={startRecording} disabled={phase === "requesting"}
                  className="px-6 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-2 mx-auto">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" /></svg>
                  {phase === "requesting" ? "Select a tab..." : "Start Recording"}
                </button>
              </div>
            </div>
          )}

          {/* Recording */}
          {phase === "recording" && (
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-3 border-b border-[--border] bg-[--sidebar-bg]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-medium">REC</span>
                    <span className="text-xs text-[--muted] tabular-nums w-14">{formatDuration(currentRecordingDuration)}</span>
                  </div>

                  {/* Live waveform */}
                  <div className="flex-1 flex items-center gap-px h-8">
                    {waveformData.map((value, i) => (
                      <div key={i} className="flex-1 max-w-1 rounded-sm transition-all duration-75"
                        style={{ height: `${Math.max(2, value * 28)}px`, backgroundColor: value > 0.8 ? "#ef4444" : value > 0.4 ? "#22c55e" : "#94a3b8" }} />
                    ))}
                  </div>

                  {silenceProgress > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-[--border] rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 transition-all" style={{ width: `${silenceProgress * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-yellow-600">silence</span>
                    </div>
                  )}

                  <button type="button" onClick={finishRecording} className="px-4 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600">
                    Done Recording
                  </button>
                  <button type="button" onClick={stopRecording} className="px-3 py-1.5 text-[--muted] hover:text-[--foreground] text-xs">
                    Cancel
                  </button>
                </div>

                {/* Settings */}
                <div className="flex items-center gap-6 text-[10px] text-[--muted]">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={autoSplit} onChange={(e) => setAutoSplit(e.target.checked)} className="w-3 h-3" />
                    Auto-detect silence
                  </label>
                  <label className="flex items-center gap-2">
                    Threshold:
                    <input type="range" min="0.005" max="0.1" step="0.005" value={silenceThreshold}
                      onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))} className="w-32 h-1" />
                    <span className="w-6">{(silenceThreshold * 100).toFixed(0)}%</span>
                  </label>
                  <label className="flex items-center gap-2">
                    Duration:
                    <input type="range" min="0.5" max="8" step="0.5" value={silenceDurationSetting}
                      onChange={(e) => setSilenceDurationSetting(parseFloat(e.target.value))} className="w-32 h-1" />
                    <span className="w-6">{silenceDurationSetting}s</span>
                  </label>
                </div>

                {detectedSplitsRef.current.length > 0 && (
                  <div className="mt-2 text-[10px] text-[--muted]">
                    {detectedSplitsRef.current.length} split{detectedSplitsRef.current.length !== 1 ? 's' : ''} detected
                  </div>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center text-sm text-[--muted]">
                Recording in progress... Click "Done Recording" when finished.
              </div>
            </div>
          )}

          {/* Editing (Waveform) */}
          {phase === "editing" && recordingBlob && (
            <div className="flex-1 flex flex-col min-h-0">
              <WaveformTimeline
                audioBlob={recordingBlob}
                splits={splits}
                onSplitsChange={setSplits}
                onExportSegments={() => {}}
              />

              <div className="px-4 py-3 border-t border-[--border] bg-[--sidebar-bg] flex items-center justify-between">
                <button type="button" onClick={() => { setPhase("idle"); setRecordingBlob(null); setSplits([]); }}
                  className="px-3 py-1.5 text-xs text-[--muted] hover:text-[--foreground]">
                  Start Over
                </button>
                <button type="button" onClick={handleSplitsConfirmed}
                  className="px-4 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600">
                  Confirm Splits ({splits.length + 1} segment{splits.length !== 0 ? 's' : ''})
                </button>
              </div>
            </div>
          )}

          {/* Metadata */}
          {phase === "metadata" && (
            <div className="flex-1 min-h-0">
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
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === "metadata" && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-[--border] bg-[--sidebar-bg]">
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <button type="button" onClick={() => deleteSongs(selectedIds)}
                  className="px-2 py-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded">
                  Delete {selectedIds.length > 1 ? `(${selectedIds.length})` : ""}
                </button>
              )}
              <span className="text-[10px] text-[--muted]">
                {recordedSongs.length} song{recordedSongs.length !== 1 ? 's' : ''} · {formatDuration(recordedSongs.reduce((sum, s) => sum + s.duration, 0))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPhase("editing")} className="px-3 py-1.5 text-xs text-[--muted] hover:text-[--foreground]">
                Back to Splits
              </button>
              <button type="button" onClick={handleAddToLibrary} disabled={isUploading || recordedSongs.length === 0}
                className="px-4 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
                {isUploading ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {(uploadProgress?.current ?? 0) + 1} / {uploadProgress?.total ?? 0}
                  </>
                ) : "Add to Library"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
