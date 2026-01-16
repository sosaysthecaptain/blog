"use client";

import { useState, useRef } from "react";
import { Song, formatDuration } from "@/lib/songs";

interface MusicPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: Song[];
  currentIndex: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onPlayFromQueue: (index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
}

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function MusicPlayer({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  queue,
  currentIndex,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onPlayFromQueue,
  onRemoveFromQueue,
  onClearQueue,
}: MusicPlayerProps) {
  const [showQueue, setShowQueue] = useState(false);
  const [showArtModal, setShowArtModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  if (!currentSong && queue.length === 0) {
    return null;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percent * duration);
  };

  const handleProgressDrag = (e: React.MouseEvent) => {
    if (!isDragging || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percent * duration);
  };

  return (
    <div className="border-t border-[--border] bg-[--sidebar-bg] relative" style={{ fontFamily: FONT_FAMILY }}>
      {/* Album art modal */}
      {showArtModal && currentSong?.albumArtUrl && (
        <>
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center cursor-pointer"
            onClick={() => setShowArtModal(false)}
          >
            <img
              src={currentSong.albumArtUrl}
              alt={`${currentSong.album} album art`}
              className="max-w-[80vw] max-h-[80vh] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </>
      )}

      {/* Queue popup panel */}
      {showQueue && queue.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowQueue(false)}
          />
          <div
            className="absolute bottom-full right-4 mb-2 w-80 max-h-96 bg-[--background] border border-[--border] rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[--border]">
              <span className="text-sm font-medium text-[--foreground]">Queue ({queue.length})</span>
              <button
                type="button"
                onClick={onClearQueue}
                className="text-xs text-[--muted] hover:text-[--foreground]"
              >
                Clear all
              </button>
            </div>
            <div className="overflow-y-auto max-h-80">
              {queue.map((song, index) => (
                <div
                  key={`${song.id}-${index}`}
                  className={`group flex items-center gap-3 px-4 py-2 hover:bg-[--hover] cursor-pointer ${
                    index === currentIndex ? "bg-[--hover]" : ""
                  }`}
                  onClick={() => onPlayFromQueue(index)}
                >
                  <span className="w-5 text-center text-[--muted] text-xs">
                    {index === currentIndex && isPlaying ? (
                      <svg className="w-3 h-3 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  {song.albumArtThumbUrl && (
                    <img src={song.albumArtThumbUrl} alt="" className="w-8 h-8 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-[--foreground]">{song.title}</p>
                    <p className="text-xs truncate text-[--muted]">{song.artist}</p>
                  </div>
                  <span className="text-xs text-[--muted] tabular-nums">{formatDuration(song.duration)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromQueue(index);
                    }}
                    className="p-1 text-[--muted] hover:text-[--foreground] opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main player */}
      <div className="flex items-center gap-6 px-6 py-5">
        {/* Album art - larger, clickable */}
        <div className="flex-shrink-0">
          {currentSong?.albumArtThumbUrl ? (
            <img
              src={currentSong.albumArtThumbUrl}
              alt=""
              className="w-24 h-24 rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowArtModal(true)}
            />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-[--muted]/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5l-10.5 3v8.553m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            </div>
          )}
        </div>

        {/* Song info and controls */}
        <div className="flex-1 min-w-0">
          {/* Song title and artist */}
          <div className="mb-3">
            <p className="text-base font-medium text-[--foreground] truncate">
              {currentSong?.title || "No song"}
            </p>
            <p className="text-sm text-[--muted] truncate">
              {currentSong?.artist}
            </p>
          </div>

          {/* Big progress bar - using explicit colors for visibility */}
          <div className="mb-3">
            <div
              ref={progressRef}
              className="h-2 rounded-full cursor-pointer relative group"
              style={{ backgroundColor: 'rgba(128, 128, 128, 0.3)' }}
              onClick={handleProgressClick}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onMouseMove={handleProgressDrag}
            >
              <div
                className="h-full rounded-full transition-all duration-100 relative"
                style={{ width: `${progress}%`, backgroundColor: '#3b82f6' }}
              >
                {/* Thumb */}
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  style={{ backgroundColor: '#fff', border: '2px solid #3b82f6' }}
                />
              </div>
            </div>
            {/* Time display */}
            <div className="flex justify-between mt-1.5 text-xs text-[--muted] tabular-nums">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            {/* Playback controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onPrevious}
                className="p-1 text-[--muted] hover:text-[--foreground] transition-colors"
                title="Previous"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={onPlayPause}
                className="p-3 bg-[--foreground] text-[--background] rounded-full hover:opacity-90 transition-opacity"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={onNext}
                className="p-1 text-[--muted] hover:text-[--foreground] transition-colors"
                title="Next"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>

            {/* Volume and queue */}
            <div className="flex items-center gap-4">
              {/* Volume control */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="p-1 text-[--muted] hover:text-[--foreground] transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-1 cursor-pointer accent-blue-500"
                />
              </div>

              {/* Queue toggle */}
              <button
                type="button"
                onClick={() => setShowQueue(!showQueue)}
                className={`p-2 rounded-lg transition-colors ${showQueue ? "bg-blue-500 text-white" : "text-[--muted] hover:text-[--foreground] hover:bg-[--hover]"}`}
                title="Queue"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
