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
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  playFromQueue: (index: number) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

export interface UseMusicQueueOptions {
  onQueueExhausted?: (currentSong: Song | null) => void;
}

export function useMusicQueue(options?: UseMusicQueueOptions): MusicQueueState & MusicQueueActions {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSongUrlRef = useRef<string | null>(null);
  const queueRef = useRef<Song[]>([]);
  const currentIndexRef = useRef(-1);
  const isPlayingRef = useRef(false);
  const onQueueExhaustedRef = useRef(options?.onQueueExhausted);

  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Keep refs in sync with state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    onQueueExhaustedRef.current = options?.onQueueExhausted;
  }, [options?.onQueueExhausted]);

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
        const audioDuration = audioRef.current?.duration;
        // For webm recordings, duration might be Infinity or NaN
        // Only use it if it's a valid finite number
        if (audioDuration && isFinite(audioDuration) && !isNaN(audioDuration)) {
          setDuration(audioDuration);
        }
      });

      audioRef.current.addEventListener("ended", () => {
        // Auto-advance to next song using refs for current values
        const nextIndex = currentIndexRef.current + 1;
        if (nextIndex < queueRef.current.length) {
          setCurrentIndex(nextIndex);
          // Force play the next song
          setTimeout(() => {
            audioRef.current?.play().catch(console.error);
          }, 50);
        } else {
          // Queue exhausted - call callback if provided
          const currentSong = queueRef.current[currentIndexRef.current] || null;
          if (onQueueExhaustedRef.current) {
            onQueueExhaustedRef.current(currentSong);
          } else {
            setIsPlaying(false);
          }
        }
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

  // Load song when current song changes
  useEffect(() => {
    if (!audioRef.current) return;

    const song = queue[currentIndex];
    const songUrl = song?.storageUrl || null;

    // Only reload if the actual song URL changed
    if (songUrl && songUrl !== currentSongUrlRef.current) {
      currentSongUrlRef.current = songUrl;
      audioRef.current.src = song.storageUrl;
      audioRef.current.load();

      // Set initial duration from song metadata (for webm files that don't report duration)
      if (song.duration && isFinite(song.duration) && song.duration > 0) {
        setDuration(song.duration);
      }

      // Auto-play when a new song is loaded (if we were playing or just started)
      audioRef.current.play().catch(console.error);
    } else if (!songUrl) {
      currentSongUrlRef.current = null;
    }
  }, [currentIndex, queue]);

  const currentSong = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  const play = useCallback((song?: Song) => {
    if (!audioRef.current) return;

    if (song) {
      setQueue((prevQueue) => {
        const existingIndex = prevQueue.findIndex((s) => s.id === song.id);
        if (existingIndex >= 0) {
          setCurrentIndex(existingIndex);
          return prevQueue;
        } else {
          const newIndex = prevQueue.length;
          setCurrentIndex(newIndex);
          return [...prevQueue, song];
        }
      });
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlayingRef.current) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < queueRef.current.length - 1) {
        return prev + 1;
      }
      return prev;
    });
  }, []);

  const previous = useCallback(() => {
    // If more than 3 seconds in, restart current song
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else {
      setCurrentIndex((prev) => {
        if (prev > 0) {
          return prev - 1;
        }
        return prev;
      });
    }
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => {
      const newQueue = [...prev, song];
      // Start playing if queue was empty
      if (prev.length === 0) {
        setCurrentIndex(0);
      }
      return newQueue;
    });
  }, []);

  const addMultipleToQueue = useCallback((songs: Song[]) => {
    setQueue((prev) => {
      const newQueue = [...prev, ...songs];
      if (prev.length === 0 && songs.length > 0) {
        setCurrentIndex(0);
      }
      return newQueue;
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    setCurrentIndex((prev) => {
      if (index < prev) {
        return prev - 1;
      } else if (index === prev) {
        // Current song removed - stay at same index (will play next song)
        // But if we're at the end, go back one
        if (index >= queueRef.current.length - 1) {
          audioRef.current?.pause();
          return Math.max(0, prev - 1);
        }
        return prev;
      }
      return prev;
    });
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      const newQueue = [...prev];
      const [moved] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, moved);
      return newQueue;
    });
    setCurrentIndex((prev) => {
      if (fromIndex === prev) {
        return toIndex;
      } else if (fromIndex < prev && toIndex >= prev) {
        return prev - 1;
      } else if (fromIndex > prev && toIndex <= prev) {
        return prev + 1;
      }
      return prev;
    });
  }, []);

  const clearQueue = useCallback(() => {
    audioRef.current?.pause();
    currentSongUrlRef.current = null;
    setQueue([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
  }, []);

  const playFromQueue = useCallback((index: number) => {
    if (index >= 0 && index < queueRef.current.length) {
      // If clicking on the same song, just toggle play/pause
      if (index === currentIndexRef.current) {
        if (isPlayingRef.current) {
          audioRef.current?.pause();
        } else {
          audioRef.current?.play().catch(console.error);
        }
      } else {
        setCurrentIndex(index);
      }
    }
  }, []);

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
    if (clampedVolume > 0) {
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (audioRef.current) {
        audioRef.current.volume = prev ? volume : 0;
      }
      return !prev;
    });
  }, [volume]);

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
    reorderQueue,
    clearQueue,
    playFromQueue,
    seek,
    setVolume,
    toggleMute,
  };
}
