"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Song } from "@/lib/songs";
import { uploadRecordedAudio } from "@/lib/music-storage";

interface RecordedSong {
  id: string;
  blob: Blob;
  duration: number;
  startTime: number;
  // Editable metadata
  title: string;
  artist: string;
  album: string;
  year: string;
  genre: string;
  // Identification status
  status: "recording" | "identifying" | "identified" | "failed" | "manual";
  candidates?: Array<{
    title: string;
    artist: string;
    album: string;
    year: string;
    score: number;
  }>;
}

interface RadioRecorderModalProps {
  libraryId: string;
  onClose: () => void;
  onSongsAdded: (songs: Song[]) => void;
}

type RecordingState = "idle" | "requesting" | "recording" | "paused";

export default function RadioRecorderModal({
  libraryId,
  onClose,
  onSongsAdded,
}: RadioRecorderModalProps) {
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordedSongs, setRecordedSongs] = useState<RecordedSong[]>([]);
  const [currentRecordingDuration, setCurrentRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceDetected, setSilenceDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [silenceThreshold, setSilenceThreshold] = useState(-40); // dB
  const [silenceDuration, setSilenceDuration] = useState(2); // seconds
  const [autoSplit, setAutoSplit] = useState(true);

  // Refs for audio processing
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Editing state
  const [editingSongId, setEditingSongId] = useState<string | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Start capturing audio from a tab
  const startRecording = useCallback(async () => {
    setRecordingState("requesting");
    setError(null);

    try {
      // Request tab audio capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required, but we'll ignore it
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Stop video track - we only want audio
      stream.getVideoTracks().forEach((track) => track.stop());

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error("No audio track available. Make sure to share a tab with audio.");
      }

      mediaStreamRef.current = stream;

      // Set up audio analysis for level metering and silence detection
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
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

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setRecordingState("recording");

      // Start audio level monitoring
      monitorAudioLevel();

      // Handle stream ending (user stops sharing)
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

  // Monitor audio level and detect silence
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkLevel = () => {
      if (recordingState !== "recording") return;

      analyser.getByteFrequencyData(dataArray);

      // Calculate RMS level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const db = 20 * Math.log10(rms / 255);

      setAudioLevel(Math.max(-60, db)); // Clamp to -60 dB minimum

      // Update recording duration
      setCurrentRecordingDuration(Date.now() - recordingStartTimeRef.current);

      // Silence detection
      if (autoSplit) {
        const isSilent = db < silenceThreshold;

        if (isSilent) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else {
            const silenceDurationMs = Date.now() - silenceStartRef.current;
            if (silenceDurationMs >= silenceDuration * 1000) {
              setSilenceDetected(true);
              // Auto-split after silence
              handleSplit();
              silenceStartRef.current = null;
              setSilenceDetected(false);
            }
          }
        } else {
          silenceStartRef.current = null;
          setSilenceDetected(false);
        }
      }

      animationFrameRef.current = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }, [recordingState, autoSplit, silenceThreshold, silenceDuration]);

  // Restart monitoring when recording state changes
  useEffect(() => {
    if (recordingState === "recording") {
      monitorAudioLevel();
    }
  }, [recordingState, monitorAudioLevel]);

  // Split current recording into a song
  const handleSplit = useCallback(() => {
    if (!mediaRecorderRef.current || chunksRef.current.length === 0) return;

    // Stop current recorder to finalize chunks
    mediaRecorderRef.current.stop();

    // Create blob from chunks
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const duration = Date.now() - recordingStartTimeRef.current;

    // Only add if duration is meaningful (> 10 seconds)
    if (duration > 10000) {
      const newSong: RecordedSong = {
        id: `rec-${Date.now()}`,
        blob,
        duration,
        startTime: recordingStartTimeRef.current,
        title: `Recording ${recordedSongs.length + 1}`,
        artist: "",
        album: "",
        year: "",
        genre: "",
        status: "manual", // Will change to "identifying" when we add that feature
      };

      setRecordedSongs((prev) => [...prev, newSong]);
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
      mediaRecorder.start(1000);
    }
  }, [recordedSongs.length, recordingState]);

  // Stop recording entirely
  const stopRecording = useCallback(() => {
    // Save any remaining recording
    if (chunksRef.current.length > 0 && recordingStartTimeRef.current) {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const duration = Date.now() - recordingStartTimeRef.current;

      if (duration > 10000) {
        const newSong: RecordedSong = {
          id: `rec-${Date.now()}`,
          blob,
          duration,
          startTime: recordingStartTimeRef.current,
          title: `Recording ${recordedSongs.length + 1}`,
          artist: "",
          album: "",
          year: "",
          genre: "",
          status: "manual",
        };
        setRecordedSongs((prev) => [...prev, newSong]);
      }
    }

    // Clean up
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

    setRecordingState("idle");
    setCurrentRecordingDuration(0);
    setAudioLevel(0);
  }, [recordedSongs.length]);

  // Update song metadata
  const updateSongMetadata = useCallback((songId: string, field: keyof RecordedSong, value: string) => {
    setRecordedSongs((prev) =>
      prev.map((song) => (song.id === songId ? { ...song, [field]: value } : song))
    );
  }, []);

  // Delete a recorded song
  const deleteSong = useCallback((songId: string) => {
    setRecordedSongs((prev) => prev.filter((song) => song.id !== songId));
  }, []);

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
          duration: song.duration,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg shadow-xl border border-[--border] overflow-hidden"
        style={{ backgroundColor: "var(--background)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[--border]">
          <h2 className="text-base font-semibold">Radio Recorder</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Recording Controls */}
          <div className="mb-6">
            {recordingState === "idle" ? (
              <div className="text-center">
                <p className="text-sm text-[--muted] mb-4">
                  Share a browser tab playing music to start recording.
                  <br />
                  Songs will be automatically split on silence, or you can split manually.
                </p>
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-6 py-3 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors flex items-center gap-2 mx-auto"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                  Start Recording
                </button>
              </div>
            ) : recordingState === "requesting" ? (
              <div className="text-center">
                <p className="text-sm text-[--muted]">Select a tab to share...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Recording indicator and level meter */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium">Recording</span>
                    <span className="text-sm text-[--muted]">
                      {formatDuration(currentRecordingDuration)}
                    </span>
                  </div>

                  {/* Level meter */}
                  <div className="flex-1 h-2 bg-[--sidebar-bg] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-75"
                      style={{
                        width: `${Math.max(0, ((audioLevel + 60) / 60) * 100)}%`,
                        backgroundColor: audioLevel > -10 ? "#ef4444" : audioLevel > -20 ? "#eab308" : "#22c55e",
                      }}
                    />
                  </div>

                  {silenceDetected && (
                    <span className="text-xs text-yellow-500">Silence detected...</span>
                  )}
                </div>

                {/* Recording controls */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSplit}
                    className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600 transition-colors text-sm"
                  >
                    Split Here
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2 bg-[--sidebar-bg] text-[--foreground] rounded font-medium hover:bg-[--hover] transition-colors text-sm"
                  >
                    Stop Recording
                  </button>

                  <div className="flex-1" />

                  {/* Auto-split toggle */}
                  <label className="flex items-center gap-2 text-xs text-[--muted]">
                    <input
                      type="checkbox"
                      checked={autoSplit}
                      onChange={(e) => setAutoSplit(e.target.checked)}
                      className="rounded"
                    />
                    Auto-split on silence
                  </label>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Recorded Songs List */}
          {recordedSongs.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">
                Recorded Songs ({recordedSongs.length})
              </h3>
              <div className="space-y-3">
                {recordedSongs.map((song) => (
                  <div
                    key={song.id}
                    className="p-3 rounded-lg border border-[--border] bg-[--sidebar-bg]"
                  >
                    {editingSongId === song.id ? (
                      /* Expanded edit view */
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-[--muted] mb-1">Title</label>
                            <input
                              type="text"
                              value={song.title}
                              onChange={(e) => updateSongMetadata(song.id, "title", e.target.value)}
                              className="w-full px-2 py-1.5 text-sm bg-[--background] border border-[--border] rounded focus:outline-none focus:border-blue-500"
                              placeholder="Song title"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[--muted] mb-1">Artist</label>
                            <input
                              type="text"
                              value={song.artist}
                              onChange={(e) => updateSongMetadata(song.id, "artist", e.target.value)}
                              className="w-full px-2 py-1.5 text-sm bg-[--background] border border-[--border] rounded focus:outline-none focus:border-blue-500"
                              placeholder="Artist name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[--muted] mb-1">Album</label>
                            <input
                              type="text"
                              value={song.album}
                              onChange={(e) => updateSongMetadata(song.id, "album", e.target.value)}
                              className="w-full px-2 py-1.5 text-sm bg-[--background] border border-[--border] rounded focus:outline-none focus:border-blue-500"
                              placeholder="Album name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[--muted] mb-1">Year</label>
                            <input
                              type="text"
                              value={song.year}
                              onChange={(e) => updateSongMetadata(song.id, "year", e.target.value)}
                              className="w-full px-2 py-1.5 text-sm bg-[--background] border border-[--border] rounded focus:outline-none focus:border-blue-500"
                              placeholder="Year"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-[--muted] mb-1">Genre</label>
                          <input
                            type="text"
                            value={song.genre}
                            onChange={(e) => updateSongMetadata(song.id, "genre", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-[--background] border border-[--border] rounded focus:outline-none focus:border-blue-500"
                            placeholder="Genre"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => deleteSong(song.id)}
                            className="text-xs text-red-500 hover:text-red-600"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSongId(null)}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Collapsed view */
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {song.title || "Untitled"}
                            </span>
                            <span className="text-xs text-[--muted]">
                              {formatDuration(song.duration)}
                            </span>
                          </div>
                          {(song.artist || song.album) && (
                            <p className="text-xs text-[--muted] truncate">
                              {[song.artist, song.album].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingSongId(song.id)}
                          className="px-3 py-1 text-xs bg-[--background] border border-[--border] rounded hover:bg-[--hover]"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[--border] bg-[--sidebar-bg]">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm text-[--muted] hover:text-[--foreground] disabled:opacity-50"
          >
            {recordedSongs.length > 0 ? "Discard All" : "Cancel"}
          </button>
          {recordedSongs.length > 0 && (
            <button
              type="button"
              onClick={handleAddToLibrary}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-500 text-white rounded font-medium text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading {uploadProgress?.current ?? 0 + 1} of {uploadProgress?.total ?? 0}...
                </>
              ) : (
                `Add ${recordedSongs.length} Song${recordedSongs.length !== 1 ? "s" : ""} to Library`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
