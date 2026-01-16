"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { formatDuration } from "@/lib/songs";

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";

interface Split {
  id: string;
  time: number; // in seconds
}

interface WaveformTimelineProps {
  audioBlob: Blob | null;
  splits: Split[];
  onSplitsChange: (splits: Split[]) => void;
  onExportSegments: (segments: Array<{ start: number; end: number; blob: Blob }>) => void;
}

export default function WaveformTimeline({
  audioBlob,
  splits,
  onSplitsChange,
  onExportSegments,
}: WaveformTimelineProps) {
  // Audio state
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackSegment, setPlaybackSegment] = useState<{ start: number; end: number } | null>(null);

  // View state
  const [zoom, setZoom] = useState(1); // 1 = fit to width, higher = zoomed in
  const [scrollOffset, setScrollOffset] = useState(0); // in seconds

  // Interaction state
  const [draggingSplitId, setDraggingSplitId] = useState<string | null>(null);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackOffsetRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Decode audio when blob changes
  useEffect(() => {
    if (!audioBlob) {
      setAudioBuffer(null);
      setWaveformData([]);
      setDuration(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    const decodeAudio = async () => {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);

        setAudioBuffer(buffer);
        setDuration(buffer.duration);

        // Generate waveform data
        const channelData = buffer.getChannelData(0);
        const samples = 2000; // Number of samples for waveform
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];

        for (let i = 0; i < samples; i++) {
          const start = i * blockSize;
          let max = 0;
          for (let j = 0; j < blockSize; j++) {
            const abs = Math.abs(channelData[start + j] || 0);
            if (abs > max) max = abs;
          }
          waveform.push(max);
        }

        setWaveformData(waveform);
        audioContext.close();
      } catch (err) {
        console.error("Failed to decode audio:", err);
        setError("Failed to decode audio");
      } finally {
        setIsLoading(false);
      }
    };

    decodeAudio();
  }, [audioBlob]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-bg').trim() || '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Calculate visible range based on zoom and scroll
    const visibleDuration = duration / zoom;
    const startTime = scrollOffset;
    const endTime = Math.min(startTime + visibleDuration, duration);

    // Draw waveform
    const startSample = Math.floor((startTime / duration) * waveformData.length);
    const endSample = Math.ceil((endTime / duration) * waveformData.length);
    const visibleSamples = waveformData.slice(startSample, endSample);

    const barWidth = width / visibleSamples.length;
    const centerY = height / 2;

    ctx.fillStyle = '#6b7280'; // gray-500
    visibleSamples.forEach((value, i) => {
      const barHeight = value * (height - 20);
      const x = i * barWidth;
      ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 1), barHeight);
    });

    // Draw playback position
    if (playbackTime >= startTime && playbackTime <= endTime) {
      const x = ((playbackTime - startTime) / visibleDuration) * width;
      ctx.fillStyle = '#3b82f6'; // blue-500
      ctx.fillRect(x - 1, 0, 2, height);
    }

    // Draw split markers
    const sortedSplits = [...splits].sort((a, b) => a.time - b.time);
    sortedSplits.forEach((split, index) => {
      if (split.time >= startTime && split.time <= endTime) {
        const x = ((split.time - startTime) / visibleDuration) * width;

        // Draw line
        ctx.strokeStyle = draggingSplitId === split.id ? '#ef4444' : '#f97316'; // red or orange
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Draw handle
        ctx.fillStyle = draggingSplitId === split.id ? '#ef4444' : '#f97316';
        ctx.beginPath();
        ctx.moveTo(x - 6, 0);
        ctx.lineTo(x + 6, 0);
        ctx.lineTo(x, 10);
        ctx.closePath();
        ctx.fill();

        // Draw segment number
        ctx.fillStyle = '#374151';
        ctx.font = `10px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${index + 1}`, x, height - 4);
      }
    });

    // Draw hover indicator
    if (hoveredTime !== null && hoveredTime >= startTime && hoveredTime <= endTime) {
      const x = ((hoveredTime - startTime) / visibleDuration) * width;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw time markers
    ctx.fillStyle = '#9ca3af';
    ctx.font = `9px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';

    const timeInterval = visibleDuration > 60 ? 30 : visibleDuration > 30 ? 10 : 5;
    for (let t = Math.ceil(startTime / timeInterval) * timeInterval; t <= endTime; t += timeInterval) {
      const x = ((t - startTime) / visibleDuration) * width;
      ctx.fillText(formatDuration(t), x, 12);
    }

  }, [waveformData, duration, zoom, scrollOffset, splits, playbackTime, draggingSplitId, hoveredTime]);

  // Get time from mouse position
  const getTimeFromMouseEvent = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const visibleDuration = duration / zoom;
    const time = scrollOffset + (x / rect.width) * visibleDuration;
    return Math.max(0, Math.min(duration, time));
  }, [duration, zoom, scrollOffset]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const time = getTimeFromMouseEvent(e);
    setHoveredTime(time);

    if (draggingSplitId && time !== null) {
      onSplitsChange(splits.map(s =>
        s.id === draggingSplitId ? { ...s, time } : s
      ));
    }
  }, [getTimeFromMouseEvent, draggingSplitId, splits, onSplitsChange]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const time = getTimeFromMouseEvent(e);
    if (time === null) return;

    // Check if clicking near a split
    const visibleDuration = duration / zoom;
    const threshold = visibleDuration * 0.01; // 1% of visible width

    const nearSplit = splits.find(s => Math.abs(s.time - time) < threshold);
    if (nearSplit) {
      setDraggingSplitId(nearSplit.id);
      return;
    }

    // Double-click to add split
    if (e.detail === 2) {
      const newSplit: Split = {
        id: `split-${Date.now()}`,
        time,
      };
      onSplitsChange([...splits, newSplit]);
    }
  }, [getTimeFromMouseEvent, duration, zoom, splits, onSplitsChange]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDraggingSplitId(null);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoveredTime(null);
    setDraggingSplitId(null);
  }, []);

  // Play/pause
  const togglePlayback = useCallback((startTime?: number, endTime?: number) => {
    if (!audioBuffer) return;

    if (isPlaying) {
      // Stop
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsPlaying(false);
      setPlaybackSegment(null);
      return;
    }

    // Start
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const start = startTime ?? 0;
    const end = endTime ?? duration;

    playbackStartTimeRef.current = ctx.currentTime;
    playbackOffsetRef.current = start;

    source.start(0, start, end - start);
    sourceNodeRef.current = source;
    setIsPlaying(true);
    setPlaybackSegment(startTime !== undefined ? { start, end } : null);

    source.onended = () => {
      setIsPlaying(false);
      setPlaybackSegment(null);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    // Update playback position
    const updatePlayback = () => {
      if (!audioContextRef.current) return;
      const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
      setPlaybackTime(playbackOffsetRef.current + elapsed);
      animationFrameRef.current = requestAnimationFrame(updatePlayback);
    };
    updatePlayback();
  }, [audioBuffer, isPlaying, duration]);

  // Play segment
  const playSegment = useCallback((segmentIndex: number) => {
    const sortedSplits = [...splits].sort((a, b) => a.time - b.time);
    const start = segmentIndex === 0 ? 0 : sortedSplits[segmentIndex - 1].time;
    const end = segmentIndex < sortedSplits.length ? sortedSplits[segmentIndex].time : duration;
    togglePlayback(start, end);
  }, [splits, duration, togglePlayback]);

  // Delete split
  const deleteSplit = useCallback((splitId: string) => {
    onSplitsChange(splits.filter(s => s.id !== splitId));
  }, [splits, onSplitsChange]);

  // Export segments
  const handleExport = useCallback(async () => {
    if (!audioBuffer || !audioBlob) return;

    const sortedSplits = [...splits].sort((a, b) => a.time - b.time);
    const segments: Array<{ start: number; end: number; blob: Blob }> = [];

    // Create segments
    const times = [0, ...sortedSplits.map(s => s.time), duration];
    for (let i = 0; i < times.length - 1; i++) {
      const start = times[i];
      const end = times[i + 1];
      if (end - start < 5) continue; // Skip segments shorter than 5 seconds

      // For now, we'll export the original blob for each segment
      // In a real implementation, we'd slice the audio
      // This is a placeholder - proper audio slicing requires more work
      segments.push({ start, end, blob: audioBlob });
    }

    onExportSegments(segments);
  }, [audioBuffer, audioBlob, splits, duration, onExportSegments]);

  // Compute segments for display
  const segments = useMemo(() => {
    const sortedSplits = [...splits].sort((a, b) => a.time - b.time);
    const times = [0, ...sortedSplits.map(s => s.time), duration];
    const result: Array<{ index: number; start: number; end: number; duration: number }> = [];

    for (let i = 0; i < times.length - 1; i++) {
      result.push({
        index: i,
        start: times[i],
        end: times[i + 1],
        duration: times[i + 1] - times[i],
      });
    }

    return result;
  }, [splits, duration]);

  // Handle zoom
  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => Math.max(1, Math.min(20, prev + delta)));
  }, []);

  // Handle scroll
  const handleScroll = useCallback((e: React.WheelEvent) => {
    if (e.shiftKey) {
      // Horizontal scroll
      const delta = (e.deltaY / 1000) * (duration / zoom);
      setScrollOffset(prev => Math.max(0, Math.min(duration - duration / zoom, prev + delta)));
    } else if (e.ctrlKey || e.metaKey) {
      // Zoom
      e.preventDefault();
      handleZoom(e.deltaY > 0 ? -0.5 : 0.5);
    }
  }, [duration, zoom, handleZoom]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[--muted]">
        Loading waveform...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-red-500">
        {error}
      </div>
    );
  }

  if (!audioBlob) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[--muted]">
        No audio to display
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT_FAMILY }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[--border] bg-[--sidebar-bg]">
        <button
          type="button"
          onClick={() => togglePlayback()}
          className="p-1.5 rounded bg-[--background] border border-[--border] hover:bg-[--hover]"
          title={isPlaying ? "Pause" : "Play all"}
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="h-4 w-px bg-[--border]" />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleZoom(-0.5)}
            className="p-1 rounded hover:bg-[--hover]"
            title="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <span className="text-[10px] text-[--muted] w-10 text-center">{zoom.toFixed(1)}x</span>
          <button
            type="button"
            onClick={() => handleZoom(0.5)}
            className="p-1 rounded hover:bg-[--hover]"
            title="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>
        </div>

        <div className="h-4 w-px bg-[--border]" />

        <span className="text-[10px] text-[--muted]">
          Double-click to add split · Drag to move · {formatDuration(duration)} total
        </span>

        <div className="flex-1" />

        <span className="text-xs text-[--muted]">
          {segments.length} segment{segments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Waveform canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[120px] cursor-crosshair relative"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleScroll}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* Time tooltip */}
        {hoveredTime !== null && (
          <div
            className="absolute top-2 px-1.5 py-0.5 bg-black/75 text-white text-[10px] rounded pointer-events-none"
            style={{
              left: `${((hoveredTime - scrollOffset) / (duration / zoom)) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {formatDuration(hoveredTime)}
          </div>
        )}
      </div>

      {/* Segments list */}
      <div className="border-t border-[--border] max-h-32 overflow-y-auto">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 gap-y-1 p-2 text-[10px]">
          {segments.map((seg, i) => (
            <div key={i} className="contents group">
              <span className="text-[--muted]">#{i + 1}</span>
              <span className="text-[--foreground]">
                {formatDuration(seg.start)} - {formatDuration(seg.end)}
              </span>
              <span className="text-[--muted]">{formatDuration(seg.duration)}</span>
              <button
                type="button"
                onClick={() => playSegment(i)}
                className="text-blue-500 hover:text-blue-600"
                title="Play segment"
              >
                {isPlaying && playbackSegment?.start === seg.start ? '■' : '▶'}
              </button>
              {i < segments.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const splitToDelete = [...splits].sort((a, b) => a.time - b.time)[i];
                    if (splitToDelete) deleteSplit(splitToDelete.id);
                  }}
                  className="text-[--muted] hover:text-red-500 opacity-0 group-hover:opacity-100"
                  title="Remove split"
                >
                  ×
                </button>
              )}
              {i === segments.length - 1 && <span />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
