"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Song, formatDuration } from "@/lib/songs";
import { uploadRecordedAudio, sliceAudioBlob } from "@/lib/music-storage";
import { identifyAudio, IdentificationCandidate } from "@/lib/audio-fingerprint";
import WaveformTimeline from "./WaveformTimeline";

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MIN_SONG_DURATION = 30; // Minimum 30 seconds for a valid song

interface Split {
  id: string;
  time: number;
}

interface RecordedSong {
  id: string;
  trackNumber: number;
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

export default function RadioRecorderModal({
  libraryId,
  onClose,
  onSongsAdded,
}: RadioRecorderModalProps) {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [liveWaveformData, setLiveWaveformData] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Auto-split settings
  const [silenceThreshold, setSilenceThreshold] = useState(0.02);
  const [silenceDurationSetting, setSilenceDurationSetting] = useState(1);
  const [autoSplit, setAutoSplit] = useState(true);
  const [silenceProgress, setSilenceProgress] = useState(0);

  // Splits state
  const [splits, setSplits] = useState<Split[]>([]);

  // Metadata state
  const [recordedSongs, setRecordedSongs] = useState<RecordedSong[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Batch edit state
  const [batchArtist, setBatchArtist] = useState("");
  const [batchAlbum, setBatchAlbum] = useState("");

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
  const waveformSampleIntervalRef = useRef<number>(0);
  const lastSplitTimeRef = useRef<number>(0);
  const songIdCounterRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // When a split occurs during recording, create a track for the previous segment
  const addTrackFromSplit = useCallback((splitTime: number) => {
    const startTime = lastSplitTimeRef.current;
    const duration = splitTime - startTime;

    // Only add if this looks like a real song (>30s)
    if (duration >= MIN_SONG_DURATION) {
      songIdCounterRef.current++;
      const trackNum = songIdCounterRef.current;
      const newSong: RecordedSong = {
        id: `song-${trackNum}-${Date.now()}`,
        trackNumber: trackNum,
        startTime,
        endTime: splitTime,
        duration,
        title: `Track ${trackNum}`,
        artist: "",
        album: "",
        year: "",
        genre: "",
        status: "pending",
      };
      setRecordedSongs(prev => [...prev, newSong]);
    }

    lastSplitTimeRef.current = splitTime;
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    setIsRequesting(true);
    setError(null);
    setLiveWaveformData([]);
    setSplits([]);
    setRecordedSongs([]);
    setRecordingBlob(null);
    waveformSampleIntervalRef.current = 0;
    lastSplitTimeRef.current = 0;
    songIdCounterRef.current = 0;

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
      setIsRecording(true);
      setIsRequesting(false);

      stream.getAudioTracks()[0].onended = () => finishRecording();
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setIsRequesting(false);
    }
  }, []);

  // Monitor audio levels and build waveform
  useEffect(() => {
    if (!isRecording || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const checkLevel = () => {
      if (!isRecording) return;

      analyser.getByteTimeDomainData(dataArray);

      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const amplitude = (dataArray[i] - 128) / 128;
        sum += amplitude * amplitude;
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Update duration
      const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
      setCurrentDuration(elapsed);

      // Sample waveform data (~4 samples per second)
      waveformSampleIntervalRef.current++;
      if (waveformSampleIntervalRef.current >= 15) {
        waveformSampleIntervalRef.current = 0;
        setLiveWaveformData(prev => [...prev, Math.min(1, rms * 3)]);
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
            const splitTime = elapsed;
            // Only add if not too close to last split (min 30s apart)
            if (splitTime - lastSplitTimeRef.current > MIN_SONG_DURATION) {
              const newSplit = { id: `split-${Date.now()}`, time: splitTime };
              setSplits(prev => [...prev, newSplit]);
              addTrackFromSplit(splitTime);
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

    animationFrameRef.current = requestAnimationFrame(checkLevel);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRecording, autoSplit, silenceThreshold, silenceDurationSetting, addTrackFromSplit]);

  // Finish recording
  const finishRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    const finalDuration = (Date.now() - recordingStartTimeRef.current) / 1000;

    setTimeout(() => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setRecordingBlob(blob);
      setIsRecording(false);

      // Add final track if there's remaining audio
      const lastStart = lastSplitTimeRef.current;
      const lastDuration = finalDuration - lastStart;
      if (lastDuration >= MIN_SONG_DURATION) {
        songIdCounterRef.current++;
        const trackNum = songIdCounterRef.current;
        setRecordedSongs(prev => [...prev, {
          id: `song-${trackNum}-${Date.now()}`,
          trackNumber: trackNum,
          startTime: lastStart,
          endTime: finalDuration,
          duration: lastDuration,
          title: `Track ${trackNum}`,
          artist: "",
          album: "",
          year: "",
          genre: "",
          status: "pending",
        }]);
      }

      // Clean up
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close();

      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      audioContextRef.current = null;
      analyserRef.current = null;
    }, 100);
  }, []);

  // Stop recording (cancel)
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];

    setIsRecording(false);
    setCurrentDuration(0);
    setSilenceProgress(0);
    setLiveWaveformData([]);
  }, []);

  // Try to identify a song
  const tryIdentifySong = useCallback(async (songId: string) => {
    if (!recordingBlob) return;

    const song = recordedSongs.find(s => s.id === songId);
    if (!song) return;

    console.log("[AcoustID] Starting identification for:", song.title, "range:", song.startTime, "-", song.endTime);

    setRecordedSongs(prev => prev.map(s => s.id === songId ? { ...s, status: "identifying" as const } : s));

    try {
      // Slice the recording to just this song's segment
      console.log("[AcoustID] Slicing audio...");
      const { blob: segmentBlob, duration } = await sliceAudioBlob(
        recordingBlob,
        song.startTime,
        song.endTime,
        true // trim silence
      );
      console.log("[AcoustID] Sliced blob size:", segmentBlob.size, "duration:", duration);

      console.log("[AcoustID] Calling identifyAudio...");
      const result = await identifyAudio(segmentBlob);
      console.log("[AcoustID] Result:", result);

      if (result.success && result.candidates.length > 0) {
        const best = result.candidates[0];
        setRecordedSongs(prev => prev.map(s =>
          s.id === songId
            ? { ...s, status: "identified" as const, title: best.title, artist: best.artist, album: best.album, year: best.year, candidates: result.candidates }
            : s
        ));
      } else {
        console.log("[AcoustID] No matches found:", result.error);
        setRecordedSongs(prev => prev.map(s => s.id === songId ? { ...s, status: "failed" as const } : s));
      }
    } catch (error) {
      console.error("[AcoustID] Identification failed:", error);
      setRecordedSongs(prev => prev.map(s => s.id === songId ? { ...s, status: "failed" as const } : s));
    }
  }, [recordingBlob, recordedSongs]);

  // Update song field directly
  const updateSongField = useCallback((songId: string, field: keyof RecordedSong, value: string) => {
    setRecordedSongs(prev => prev.map(s => s.id === songId ? { ...s, [field]: value } : s));
  }, []);

  // Batch update selected songs
  const applyBatchEdit = useCallback((field: "artist" | "album", value: string) => {
    if (!value.trim() || selectedIds.length === 0) return;
    setRecordedSongs(prev => prev.map(s =>
      selectedIds.includes(s.id) ? { ...s, [field]: value } : s
    ));
  }, [selectedIds]);

  // Delete songs
  const deleteSong = useCallback((id: string) => {
    setRecordedSongs(prev => prev.filter(s => s.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
  }, []);

  // Toggle selection
  const toggleSelect = useCallback((id: string, event: React.MouseEvent) => {
    if (event.shiftKey && selectedIds.length > 0) {
      const allIds = recordedSongs.map(s => s.id);
      const lastIdx = allIds.indexOf(selectedIds[selectedIds.length - 1]);
      const currIdx = allIds.indexOf(id);
      const [start, end] = lastIdx < currIdx ? [lastIdx, currIdx] : [currIdx, lastIdx];
      setSelectedIds(allIds.slice(start, end + 1));
    } else if (event.metaKey || event.ctrlKey) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedIds(prev => prev.includes(id) && prev.length === 1 ? [] : [id]);
    }
  }, [selectedIds, recordedSongs]);

  // Upload songs
  const handleAddToLibrary = useCallback(async () => {
    if (recordedSongs.length === 0 || !recordingBlob) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: recordedSongs.length });

    const uploadedSongs: Song[] = [];

    for (let i = 0; i < recordedSongs.length; i++) {
      const song = recordedSongs[i];
      setUploadProgress({ current: i, total: recordedSongs.length });

      try {
        // Slice the recording to just this song's segment
        const { blob: segmentBlob, duration: trimmedDuration } = await sliceAudioBlob(
          recordingBlob,
          song.startTime,
          song.endTime,
          true // trim silence
        );

        // Upload the sliced segment
        const uploaded = await uploadRecordedAudio(segmentBlob, libraryId, {
          title: song.title || `Track ${song.trackNumber}`,
          artist: song.artist || "Unknown Artist",
          album: song.album || "",
          year: song.year,
          genre: song.genre,
          duration: trimmedDuration,
          trackNumber: song.trackNumber,
        });
        uploadedSongs.push(uploaded);
      } catch (error) {
        console.error(`Failed to upload ${song.title}:`, error);
      }
    }

    setIsUploading(false);
    if (uploadedSongs.length > 0) onSongsAdded(uploadedSongs);
    onClose();
  }, [recordedSongs, recordingBlob, libraryId, onSongsAdded, onClose]);

  const hasStarted = isRecording || recordingBlob;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-5xl h-[85vh] flex flex-col rounded-lg shadow-xl border border-[--border] overflow-hidden"
        style={{ backgroundColor: "var(--background)", fontFamily: FONT_FAMILY }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[--border] bg-[--sidebar-bg]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Record from Tab</h2>
            {isRecording && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium tabular-nums">{formatDuration(currentDuration)}</span>
                {silenceProgress > 0 && (
                  <div className="flex items-center gap-1 ml-2">
                    <div className="w-12 h-1 bg-[--border] rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 transition-all" style={{ width: `${silenceProgress * 100}%` }} />
                    </div>
                    <span className="text-[9px] text-yellow-600">silence</span>
                  </div>
                )}
              </div>
            )}
            {!isRecording && recordingBlob && (
              <span className="text-xs text-[--muted]">{formatDuration(currentDuration)} recorded</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!hasStarted && (
              <button type="button" onClick={startRecording} disabled={isRequesting}
                className="px-4 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /></svg>
                {isRequesting ? "Select tab..." : "Start Recording"}
              </button>
            )}
            {isRecording && (
              <>
                <button type="button" onClick={finishRecording}
                  className="px-4 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600">
                  Done
                </button>
                <button type="button" onClick={stopRecording} className="px-3 py-1.5 text-[--muted] hover:text-[--foreground] text-xs">
                  Cancel
                </button>
              </>
            )}
            <button type="button" onClick={onClose} className="p-1 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded ml-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings bar */}
        {hasStarted && (
          <div className="flex items-center gap-4 px-4 py-1.5 text-[10px] text-[--muted] border-b border-[--border]">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={autoSplit} onChange={(e) => setAutoSplit(e.target.checked)} className="w-3 h-3" />
              Auto-split on silence
            </label>
            <label className="flex items-center gap-2">
              Threshold:
              <input type="range" min="0.005" max="0.1" step="0.005" value={silenceThreshold}
                onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))} className="w-20 h-1" />
              <span className="w-5 tabular-nums">{(silenceThreshold * 100).toFixed(0)}%</span>
            </label>
            <label className="flex items-center gap-2">
              Duration:
              <input type="range" min="0.5" max="8" step="0.5" value={silenceDurationSetting}
                onChange={(e) => setSilenceDurationSetting(parseFloat(e.target.value))} className="w-20 h-1" />
              <span className="w-5 tabular-nums">{silenceDurationSetting}s</span>
            </label>
            <span className="ml-auto">
              {recordedSongs.length} track{recordedSongs.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Waveform */}
        {hasStarted && (
          <WaveformTimeline
            isRecording={isRecording}
            liveWaveformData={liveWaveformData}
            liveDuration={currentDuration}
            audioBlob={recordingBlob}
            splits={splits}
            onSplitsChange={setSplits}
          />
        )}

        {/* Batch edit bar - shown when multiple tracks selected */}
        {selectedIds.length > 1 && !isRecording && (
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-200">
            <span className="text-xs text-blue-700 font-medium">{selectedIds.length} selected</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Set artist..."
                value={batchArtist}
                onChange={(e) => setBatchArtist(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { applyBatchEdit("artist", batchArtist); setBatchArtist(""); } }}
                className="px-2 py-1 text-xs border border-blue-300 rounded bg-white text-gray-900 w-32"
              />
              <button type="button" onClick={() => { applyBatchEdit("artist", batchArtist); setBatchArtist(""); }}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded"
                disabled={!batchArtist.trim()}>
                Apply
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Set album..."
                value={batchAlbum}
                onChange={(e) => setBatchAlbum(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { applyBatchEdit("album", batchAlbum); setBatchAlbum(""); } }}
                className="px-2 py-1 text-xs border border-blue-300 rounded bg-white text-gray-900 w-32"
              />
              <button type="button" onClick={() => { applyBatchEdit("album", batchAlbum); setBatchAlbum(""); }}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded"
                disabled={!batchAlbum.trim()}>
                Apply
              </button>
            </div>
            <button type="button" onClick={() => setSelectedIds([])}
              className="ml-auto text-xs text-blue-600 hover:text-blue-700">
              Clear selection
            </button>
          </div>
        )}

        {/* Content area - Simple HTML table */}
        <div className="flex-1 min-h-0 overflow-auto">
          {!hasStarted ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <p className="text-sm text-[--muted] mb-2">
                  Share a browser tab playing music to start recording.
                </p>
                <p className="text-xs text-[--muted]">
                  Silence between songs will be automatically detected.
                  Tracks under 30 seconds will be discarded.
                </p>
              </div>
            </div>
          ) : recordedSongs.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-[--muted]">
                {isRecording ? "Recording... tracks will appear as songs are detected" : "No tracks yet"}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs" style={{ fontFamily: FONT_FAMILY }}>
              <thead className="sticky top-0 bg-[--background] border-b border-[--border]">
                <tr className="text-left text-[10px] text-[--muted]">
                  <th className="w-6 p-1.5"></th>
                  <th className="w-8 p-1.5">#</th>
                  <th className="p-1.5">Title</th>
                  <th className="p-1.5">Artist</th>
                  <th className="p-1.5">Album</th>
                  <th className="w-12 p-1.5">Time</th>
                  <th className="w-16 p-1.5"></th>
                  <th className="w-6 p-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {recordedSongs.map((song, idx) => {
                  const isSelected = selectedIds.includes(song.id);
                  return (
                    <tr
                      key={song.id}
                      onClick={(e) => toggleSelect(song.id, e)}
                      className={`border-b border-[--border] cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : idx % 2 === 0 ? 'bg-[--background]' : 'bg-[--sidebar-bg]'
                      } hover:bg-blue-500 hover:text-white`}
                    >
                      <td className="p-1.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-3 h-3"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="p-1.5 text-[--muted]">{song.trackNumber}</td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={song.title}
                          onChange={(e) => updateSongField(song.id, "title", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-1.5 py-0.5 bg-white text-gray-900 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                          placeholder="Title"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={song.artist}
                          onChange={(e) => updateSongField(song.id, "artist", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-1.5 py-0.5 bg-white text-gray-900 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                          placeholder="Artist"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={song.album}
                          onChange={(e) => updateSongField(song.id, "album", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-1.5 py-0.5 bg-white text-gray-900 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                          placeholder="Album"
                        />
                      </td>
                      <td className="p-1.5 tabular-nums">{formatDuration(song.duration)}</td>
                      <td className="p-1.5">
                        {song.status === "identifying" && (
                          <span className="text-[9px] text-blue-500">identifying...</span>
                        )}
                        {song.status === "identified" && (
                          <span className="text-[9px] text-green-600">✓ found</span>
                        )}
                        {song.status === "failed" && (
                          <span className="text-[9px] text-gray-400">not found</span>
                        )}
                        {song.status === "pending" && recordingBlob && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); tryIdentifySong(song.id); }}
                            className="text-[9px] text-blue-500 hover:underline"
                          >
                            identify
                          </button>
                        )}
                      </td>
                      <td className="p-1.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteSong(song.id); }}
                          className="p-0.5 text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {hasStarted && !isRecording && recordedSongs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-[--border] bg-[--sidebar-bg]">
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <button type="button" onClick={() => { selectedIds.forEach(deleteSong); }}
                  className="px-2 py-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded">
                  Delete {selectedIds.length > 1 ? `(${selectedIds.length})` : ""}
                </button>
              )}
              <span className="text-[10px] text-[--muted]">
                {recordedSongs.length} song{recordedSongs.length !== 1 ? 's' : ''} · {formatDuration(recordedSongs.reduce((sum, s) => sum + s.duration, 0))}
              </span>
            </div>
            <button type="button" onClick={handleAddToLibrary} disabled={isUploading}
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
