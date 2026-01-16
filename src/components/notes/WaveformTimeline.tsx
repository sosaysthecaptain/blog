"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatDuration } from "@/lib/songs";

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const WAVEFORM_COLOR = "#e85d4c"; // Warm coral red

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

        // Generate waveform data - smooth continuous samples
        const channelData = buffer.getChannelData(0);
        const samples = Math.min(800, Math.floor(buffer.duration * 4)); // ~4 samples per second
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];

        for (let i = 0; i < samples; i++) {
          const start = i * blockSize;
          let sum = 0;
          let count = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[start + j] || 0);
            count++;
          }
          // RMS-like average for smoother waveform
          waveform.push(Math.min(1, (sum / count) * 2.5));
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
    const waveformHeight = height - 2; // Small padding
    const centerY = height / 2;

    // Clear with background
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-bg').trim() || '#f5f5f5';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    if (totalDuration === 0 || waveformData.length === 0) {
      // Empty state
      ctx.fillStyle = '#9ca3af';
      ctx.font = `11px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText(isRecording ? 'Waiting for audio...' : 'No audio', width / 2, height / 2);
      return;
    }

    // Draw smooth filled waveform using bezier curves
    const pointSpacing = width / waveformData.length;
    const maxAmplitude = waveformHeight * 0.45;

    // Top half
    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let i = 0; i < waveformData.length; i++) {
      const x = i * pointSpacing;
      const amplitude = waveformData[i] * maxAmplitude;
      const y = centerY - amplitude;

      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        // Smooth curve between points
        const prevX = (i - 1) * pointSpacing;
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, centerY - waveformData[i - 1] * maxAmplitude, cpX, (centerY - waveformData[i - 1] * maxAmplitude + y) / 2);
        ctx.quadraticCurveTo(cpX, y, x, y);
      }
    }

    // Complete top, go to bottom
    ctx.lineTo(width, centerY);

    // Bottom half (mirror)
    for (let i = waveformData.length - 1; i >= 0; i--) {
      const x = i * pointSpacing;
      const amplitude = waveformData[i] * maxAmplitude;
      const y = centerY + amplitude;

      if (i === waveformData.length - 1) {
        ctx.lineTo(x, y);
      } else {
        const nextX = (i + 1) * pointSpacing;
        const cpX = (nextX + x) / 2;
        ctx.quadraticCurveTo(nextX, centerY + waveformData[i + 1] * maxAmplitude, cpX, (centerY + waveformData[i + 1] * maxAmplitude + y) / 2);
        ctx.quadraticCurveTo(cpX, y, x, y);
      }
    }

    ctx.closePath();
    ctx.fillStyle = WAVEFORM_COLOR;
    ctx.fill();

    // Draw playback position (only when not recording)
    if (!isRecording && playbackTime > 0 && playbackTime <= totalDuration) {
      const x = (playbackTime / totalDuration) * width;
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(x - 1, 0, 2, height);
    }

    // Draw split markers
    const sortedSplits = [...splits].sort((a, b) => a.time - b.time);
    sortedSplits.forEach((split) => {
      if (split.time <= totalDuration && split.time > 0) {
        const x = (split.time / totalDuration) * width;

        // Draw line
        ctx.strokeStyle = draggingSplitId === split.id ? '#dc2626' : '#000000';
        ctx.lineWidth = draggingSplitId === split.id ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Draw handle triangle at top
        ctx.fillStyle = draggingSplitId === split.id ? '#dc2626' : '#000000';
        ctx.beginPath();
        ctx.moveTo(x - 6, 0);
        ctx.lineTo(x + 6, 0);
        ctx.lineTo(x, 10);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Draw hover indicator
    if (hoveredTime !== null && hoveredTime <= totalDuration) {
      const x = (hoveredTime / totalDuration) * width;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
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
    const threshold = totalDuration * 0.015;
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

  return (
    <div className="flex flex-col" style={{ fontFamily: FONT_FAMILY }}>
      {/* Waveform canvas */}
      <div
        ref={containerRef}
        className="h-16 cursor-crosshair relative"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* Time tooltip */}
        {hoveredTime !== null && totalDuration > 0 && (
          <div
            className="absolute top-1 px-1.5 py-0.5 bg-black/80 text-white text-[9px] rounded pointer-events-none z-10"
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
            <span className="text-xs text-[--muted]">Loading...</span>
          </div>
        )}
      </div>
    </div>
  );
}
