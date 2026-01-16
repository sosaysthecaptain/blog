"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { formatDuration } from "@/lib/songs";

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";

interface Split {
  id: string;
  time: number; // in seconds
}

interface WaveformTimelineProps {
  // For live recording mode
  isRecording?: boolean;
  liveWaveformData?: number[]; // Growing array of peak values
  liveDuration?: number;

  // For playback mode (after recording)
  audioBlob?: Blob | null;

  // Splits
  splits: Split[];
  onSplitsChange: (splits: Split[]) => void;
}

export default function WaveformTimeline({
  isRecording = false,
  liveWaveformData,
  liveDuration = 0,
  audioBlob,
  splits,
  onSplitsChange,
}: WaveformTimelineProps) {
  // Audio state (for playback after recording)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [staticWaveformData, setStaticWaveformData] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

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

  // Use live data during recording, static data after
  const waveformData = isRecording ? (liveWaveformData || []) : staticWaveformData;
  const totalDuration = isRecording ? liveDuration : duration;

  // Decode audio when blob changes (only after recording)
  useEffect(() => {
    if (isRecording || !audioBlob) {
      return;
    }

    setIsLoading(true);

    const decodeAudio = async () => {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);

        setAudioBuffer(buffer);
        setDuration(buffer.duration);

        // Generate waveform data - use fewer samples for cleaner look
        const channelData = buffer.getChannelData(0);
        const samples = 600; // Reduced for cleaner waveform
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

        setStaticWaveformData(waveform);
        audioContext.close();
      } catch (err) {
        console.error("Failed to decode audio:", err);
      } finally {
        setIsLoading(false);
      }
    };

    decodeAudio();
  }, [audioBlob, isRecording]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

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
    const timeScaleHeight = 18; // Space for time markers at top
    const waveformTop = timeScaleHeight + 4;
    const waveformHeight = height - waveformTop - 4;

    // Clear with background
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-bg').trim() || '#f5f5f5';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw time scale background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background').trim() || '#ffffff';
    ctx.fillRect(0, 0, width, timeScaleHeight);

    // Bottom border for time scale
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, timeScaleHeight);
    ctx.lineTo(width, timeScaleHeight);
    ctx.stroke();

    if (totalDuration === 0) {
      // Empty state
      ctx.fillStyle = '#9ca3af';
      ctx.font = `11px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText(isRecording ? 'Waiting for audio...' : 'No audio', width / 2, height / 2);
      return;
    }

    // Draw time markers
    ctx.fillStyle = '#6b7280';
    ctx.font = `9px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';

    const timeInterval = totalDuration > 300 ? 60 : totalDuration > 120 ? 30 : totalDuration > 60 ? 15 : 10;
    for (let t = 0; t <= totalDuration; t += timeInterval) {
      const x = (t / totalDuration) * width;
      ctx.fillText(formatDuration(t), x, 12);

      // Small tick
      ctx.strokeStyle = '#d1d5db';
      ctx.beginPath();
      ctx.moveTo(x, timeScaleHeight - 3);
      ctx.lineTo(x, timeScaleHeight);
      ctx.stroke();
    }

    // Draw waveform
    if (waveformData.length > 0) {
      const barWidth = width / waveformData.length;
      const centerY = waveformTop + waveformHeight / 2;
      const maxBarHeight = waveformHeight * 0.85; // Leave some padding

      ctx.fillStyle = '#94a3b8'; // slate-400 - subtle color
      waveformData.forEach((value, i) => {
        const barHeight = Math.max(1, value * maxBarHeight);
        const x = i * barWidth;
        ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 0.5), barHeight);
      });
    }

    // Draw playback position (only when not recording)
    if (!isRecording && playbackTime > 0 && playbackTime <= totalDuration) {
      const x = (playbackTime / totalDuration) * width;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x - 1, waveformTop, 2, waveformHeight);
    }

    // Draw split markers
    const sortedSplits = [...splits].sort((a, b) => a.time - b.time);
    sortedSplits.forEach((split, index) => {
      if (split.time <= totalDuration) {
        const x = (split.time / totalDuration) * width;

        // Draw line
        ctx.strokeStyle = draggingSplitId === split.id ? '#dc2626' : '#f97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, waveformTop);
        ctx.lineTo(x, height - 4);
        ctx.stroke();

        // Draw handle triangle at top
        ctx.fillStyle = draggingSplitId === split.id ? '#dc2626' : '#f97316';
        ctx.beginPath();
        ctx.moveTo(x - 5, waveformTop);
        ctx.lineTo(x + 5, waveformTop);
        ctx.lineTo(x, waveformTop + 8);
        ctx.closePath();
        ctx.fill();

        // Draw segment number below handle
        ctx.fillStyle = '#374151';
        ctx.font = `bold 9px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${index + 1}`, x, waveformTop + 18);
      }
    });

    // Draw hover indicator
    if (hoveredTime !== null && hoveredTime <= totalDuration) {
      const x = (hoveredTime / totalDuration) * width;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, waveformTop);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

  }, [waveformData, totalDuration, splits, playbackTime, draggingSplitId, hoveredTime, isRecording]);

  // Get time from mouse position
  const getTimeFromMouseEvent = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || totalDuration === 0) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * totalDuration;
    return Math.max(0, Math.min(totalDuration, time));
  }, [totalDuration]);

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
    const threshold = totalDuration * 0.015; // 1.5% of total width
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
  }, [getTimeFromMouseEvent, totalDuration, splits, onSplitsChange]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDraggingSplitId(null);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoveredTime(null);
    setDraggingSplitId(null);
  }, []);

  // Play/pause (only after recording)
  const togglePlayback = useCallback((startTime?: number, endTime?: number) => {
    if (!audioBuffer || isRecording) return;

    if (isPlaying) {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsPlaying(false);
      return;
    }

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

    source.onended = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const updatePlayback = () => {
      if (!audioContextRef.current) return;
      const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
      setPlaybackTime(playbackOffsetRef.current + elapsed);
      animationFrameRef.current = requestAnimationFrame(updatePlayback);
    };
    updatePlayback();
  }, [audioBuffer, isPlaying, duration, isRecording]);

  // Play segment
  const playSegment = useCallback((segmentIndex: number) => {
    if (isRecording) return;
    const sortedSplits = [...splits].sort((a, b) => a.time - b.time);
    const start = segmentIndex === 0 ? 0 : sortedSplits[segmentIndex - 1].time;
    const end = segmentIndex < sortedSplits.length ? sortedSplits[segmentIndex].time : totalDuration;
    togglePlayback(start, end);
  }, [splits, totalDuration, togglePlayback, isRecording]);

  // Delete split
  const deleteSplit = useCallback((splitId: string) => {
    onSplitsChange(splits.filter(s => s.id !== splitId));
  }, [splits, onSplitsChange]);

  // Compute segments for display
  const segments = useMemo(() => {
    const sortedSplits = [...splits].sort((a, b) => a.time - b.time);
    const times = [0, ...sortedSplits.map(s => s.time), totalDuration];
    const result: Array<{ index: number; start: number; end: number; duration: number; splitId?: string }> = [];

    for (let i = 0; i < times.length - 1; i++) {
      result.push({
        index: i,
        start: times[i],
        end: times[i + 1],
        duration: times[i + 1] - times[i],
        splitId: i < sortedSplits.length ? sortedSplits[i].id : undefined,
      });
    }

    return result;
  }, [splits, totalDuration]);

  return (
    <div className="flex flex-col" style={{ fontFamily: FONT_FAMILY }}>
      {/* Waveform canvas - compact height */}
      <div
        ref={containerRef}
        className="h-20 cursor-crosshair relative border-b border-[--border]"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* Time tooltip */}
        {hoveredTime !== null && totalDuration > 0 && (
          <div
            className="absolute top-0 px-1.5 py-0.5 bg-black/80 text-white text-[9px] rounded pointer-events-none z-10"
            style={{
              left: `${(hoveredTime / totalDuration) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {formatDuration(hoveredTime)}
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[--sidebar-bg]/80">
            <span className="text-xs text-[--muted]">Loading waveform...</span>
          </div>
        )}
      </div>

      {/* Segments list - minimal */}
      {segments.length > 0 && totalDuration > 0 && (
        <div className="flex items-center gap-1 px-2 py-1.5 text-[10px] bg-[--background] overflow-x-auto">
          {segments.map((seg, i) => (
            <div
              key={i}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[--sidebar-bg] border border-[--border] whitespace-nowrap"
            >
              <span className="text-[--muted]">#{i + 1}</span>
              <span className="text-[--foreground]">{formatDuration(seg.duration)}</span>
              {!isRecording && (
                <button
                  type="button"
                  onClick={() => playSegment(i)}
                  className="text-blue-500 hover:text-blue-600 ml-1"
                  title="Play segment"
                >
                  ▶
                </button>
              )}
              {seg.splitId && (
                <button
                  type="button"
                  onClick={() => deleteSplit(seg.splitId!)}
                  className="text-[--muted] hover:text-red-500 ml-0.5"
                  title="Remove split"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <span className="text-[--muted] ml-2">
            Double-click to add split
          </span>
        </div>
      )}
    </div>
  );
}
