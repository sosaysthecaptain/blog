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
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  // Collapsed view - just a thin bar
  if (isCollapsed) {
    return (
      <div
        className="border-t border-[--border] bg-[--sidebar-bg] cursor-pointer"
        style={{ fontFamily: FONT_FAMILY }}
        onClick={() => setIsCollapsed(false)}
      >
        <div className="flex items-center gap-3 px-3 py-1.5">
          {currentSong?.albumArtThumbUrl && (
            <img src={currentSong.albumArtThumbUrl} alt="" className="w-6 h-6 rounded" />
          )}
          <span className="text-xs text-[--foreground] truncate flex-1">
            {currentSong?.title} - {currentSong?.artist}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlayPause();
            }}
            className="p-1 text-[--muted] hover:text-[--foreground]"
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
          <svg className="w-3 h-3 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>
        {/* Thin progress bar */}
        <div className="h-0.5" style={{ backgroundColor: 'rgba(128, 128, 128, 0.2)' }}>
          <div className="h-full" style={{ width: `${progress}%`, backgroundColor: '#3b82f6' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[--border] bg-[--sidebar-bg] relative" style={{ fontFamily: FONT_FAMILY }}>
      {/* Album art modal */}
      {showArtModal && currentSong?.albumArtUrl && (
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
      )}

      {/* Queue popup panel */}
      {showQueue && queue.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowQueue(false)} />
          <div className="absolute bottom-full right-4 mb-2 w-72 max-h-80 bg-[--background] border border-[--border] rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[--border]">
              <span className="text-xs font-medium text-[--foreground]">Queue ({queue.length})</span>
              <button
                type="button"
                onClick={onClearQueue}
                className="text-[10px] text-[--muted] hover:text-[--foreground]"
              >
                Clear
              </button>
            </div>
            <div className="overflow-y-auto max-h-64">
              {queue.map((song, index) => (
                <div
                  key={`${song.id}-${index}`}
                  className={`group flex items-center gap-2 px-3 py-1.5 hover:bg-[--hover] cursor-pointer ${
                    index === currentIndex ? "bg-[--hover]" : ""
                  }`}
                  onClick={() => onPlayFromQueue(index)}
                >
                  <span className="w-4 text-center text-[--muted] text-[10px]">
                    {index === currentIndex && isPlaying ? (
                      <svg className="w-2.5 h-2.5 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate text-[--foreground]">{song.title}</p>
                    <p className="text-[10px] truncate text-[--muted]">{song.artist}</p>
                  </div>
                  <span className="text-[10px] text-[--muted] tabular-nums">{formatDuration(song.duration)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromQueue(index);
                    }}
                    className="p-0.5 text-[--muted] hover:text-[--foreground] opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main player - compact with full-height album art */}
      <div className="flex items-stretch h-14">
        {/* Album art - full height, clickable */}
        <div className="flex-shrink-0 h-14 w-14">
          {currentSong?.albumArtThumbUrl ? (
            <img
              src={currentSong.albumArtThumbUrl}
              alt=""
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowArtModal(true)}
            />
          ) : (
            <div className="w-full h-full bg-[--muted]/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5l-10.5 3v8.553m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            </div>
          )}
        </div>

        {/* Song info, controls, and progress */}
        <div className="flex-1 flex flex-col justify-center px-3 min-w-0">
          {/* Top row: song info and controls */}
          <div className="flex items-center gap-3">
            {/* Song info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[--foreground] truncate">
                {currentSong?.title || "No song"}
              </p>
              <p className="text-[10px] text-[--muted] truncate">
                {currentSong?.artist}
              </p>
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPrevious}
                className="p-1 text-[--muted] hover:text-[--foreground] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={onPlayPause}
                className="p-1.5 bg-[--foreground] text-[--background] rounded-full hover:opacity-90 transition-opacity"
              >
                {isPlaying ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={onNext}
                className="p-1 text-[--muted] hover:text-[--foreground] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleMute}
                className="p-1 text-[--muted] hover:text-[--foreground] transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
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
                className="w-14 h-1 cursor-pointer accent-blue-500"
              />
            </div>

            {/* Queue toggle */}
            <button
              type="button"
              onClick={() => setShowQueue(!showQueue)}
              className={`p-1 rounded transition-colors ${showQueue ? "bg-blue-500 text-white" : "text-[--muted] hover:text-[--foreground]"}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            </button>

            {/* Collapse button */}
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1 text-[--muted] hover:text-[--foreground] transition-colors"
              title="Minimize player"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] text-[--muted] tabular-nums w-8">{formatDuration(currentTime)}</span>
            <div
              ref={progressRef}
              className="flex-1 h-1 rounded-full cursor-pointer group"
              style={{ backgroundColor: 'rgba(128, 128, 128, 0.3)' }}
              onClick={handleProgressClick}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onMouseMove={handleProgressDrag}
            >
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{ width: `${progress}%`, backgroundColor: '#3b82f6' }}
              />
            </div>
            <span className="text-[9px] text-[--muted] tabular-nums w-8 text-right">{formatDuration(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
