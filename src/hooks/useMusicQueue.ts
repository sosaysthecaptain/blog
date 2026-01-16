"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Song } from "@/lib/songs";

export interface MusicQueueState {
  queue: Song[];
  currentIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

export interface MusicQueueActions {
  play: (song?: Song) => void;
  pause: () => void;
  togglePlayPause: () => void;
  next: () => void;
  previous: () => void;
  addToQueue: (song: Song) => void;
  addMultipleToQueue: (songs: Song[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playFromQueue: (index: number) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

export function useMusicQueue(): MusicQueueState & MusicQueueActions {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;

      // Event listeners
      audioRef.current.addEventListener("timeupdate", () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });

      audioRef.current.addEventListener("durationchange", () => {
        setDuration(audioRef.current?.duration || 0);
      });

      audioRef.current.addEventListener("ended", () => {
        // Auto-advance to next song
        setCurrentIndex((prev) => {
          if (prev < queue.length - 1) {
            return prev + 1;
          }
          setIsPlaying(false);
          return prev;
        });
      });

      audioRef.current.addEventListener("play", () => setIsPlaying(true));
      audioRef.current.addEventListener("pause", () => setIsPlaying(false));
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Load song when current index changes
  useEffect(() => {
    if (!audioRef.current) return;

    const song = queue[currentIndex];
    if (song) {
      audioRef.current.src = song.storageUrl;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentIndex, queue]);

  const currentSong = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  const play = useCallback((song?: Song) => {
    if (!audioRef.current) return;

    if (song) {
      // Find song in queue or add it
      const existingIndex = queue.findIndex((s) => s.id === song.id);
      if (existingIndex >= 0) {
        setCurrentIndex(existingIndex);
      } else {
        setQueue((prev) => [...prev, song]);
        setCurrentIndex(queue.length);
      }
    }

    audioRef.current.play().catch(console.error);
  }, [queue]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, [isPlaying]);

  const next = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, queue.length]);

  const previous = useCallback(() => {
    // If more than 3 seconds in, restart current song
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => [...prev, song]);
    // Start playing if queue was empty
    if (queue.length === 0) {
      setCurrentIndex(0);
    }
  }, [queue.length]);

  const addMultipleToQueue = useCallback((songs: Song[]) => {
    setQueue((prev) => [...prev, ...songs]);
    if (queue.length === 0 && songs.length > 0) {
      setCurrentIndex(0);
    }
  }, [queue.length]);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    // Adjust current index if needed
    if (index < currentIndex) {
      setCurrentIndex((prev) => prev - 1);
    } else if (index === currentIndex) {
      // Current song removed - pause and reset
      audioRef.current?.pause();
      setCurrentIndex((prev) => Math.min(prev, queue.length - 2));
    }
  }, [currentIndex, queue.length]);

  const clearQueue = useCallback(() => {
    audioRef.current?.pause();
    setQueue([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
  }, []);

  const playFromQueue = useCallback((index: number) => {
    if (index >= 0 && index < queue.length) {
      setCurrentIndex(index);
      audioRef.current?.play().catch(console.error);
    }
  }, [queue.length]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    if (clampedVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
      } else {
        audioRef.current.volume = 0;
      }
    }
    setIsMuted(!isMuted);
  }, [isMuted, volume]);

  return {
    // State
    queue,
    currentIndex,
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    // Actions
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    addToQueue,
    addMultipleToQueue,
    removeFromQueue,
    clearQueue,
    playFromQueue,
    seek,
    setVolume,
    toggleMute,
  };
}
