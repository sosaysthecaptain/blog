"use client";

import { useState, useEffect, useCallback } from "react";
import { Song, subscribeToSongs as subscribeToFirestoreSongs } from "@/lib/songs";
import { LocalCache } from "@/lib/local-cache";
import { subscribeToCachedSongs, setupSongsListener, syncLibrarySongs } from "@/lib/cache-sync";

/**
 * Hook to get songs for a library with local cache
 *
 * Flow:
 * 1. Return cached songs immediately (if available)
 * 2. Sync from Firestore in background
 * 3. Listen for real-time updates
 */
export function useCachedSongs(libraryId: string | undefined) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!libraryId) {
      setSongs([]);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    let firestoreUnsubscribe: (() => void) | null = null;
    let cacheUnsubscribe: (() => void) | null = null;

    async function init() {
      try {
        // Check if cache is available
        if (LocalCache.isInitialized() && libraryId) {
          // Get cached songs immediately
          const cache = LocalCache.getInstance();
          const cachedSongs = cache.getSongsByLibrary(libraryId);

          if (mounted && cachedSongs.length > 0) {
            console.log(`[useCachedSongs] Loaded ${cachedSongs.length} songs from cache`);
            setSongs(cachedSongs);
            setIsLoading(false);
          }

          // Subscribe to cache updates
          cacheUnsubscribe = subscribeToCachedSongs(libraryId, (updatedSongs) => {
            if (mounted) {
              setSongs(updatedSongs);
            }
          });

          // Set up Firestore listener to keep cache in sync
          firestoreUnsubscribe = setupSongsListener(libraryId);

          // If cache was empty, sync from Firestore
          if (cachedSongs.length === 0) {
            const syncedSongs = await syncLibrarySongs(libraryId);
            if (mounted) {
              setSongs(syncedSongs);
              setIsLoading(false);
            }
          }
        } else if (libraryId) {
          // Cache not available, fall back to direct Firestore subscription
          console.log("[useCachedSongs] Cache not available, using Firestore directly");
          firestoreUnsubscribe = subscribeToFirestoreSongs(libraryId, (songs) => {
            if (mounted) {
              setSongs(songs);
              setIsLoading(false);
            }
          });
        }
      } catch (e) {
        console.error("[useCachedSongs] Error:", e);
        if (mounted) {
          setError(e as Error);
          setIsLoading(false);
        }

        // Fall back to Firestore on error
        if (libraryId) {
          firestoreUnsubscribe = subscribeToFirestoreSongs(libraryId, (songs) => {
            if (mounted) {
              setSongs(songs);
              setIsLoading(false);
            }
          });
        }
      }
    }

    init();

    return () => {
      mounted = false;
      if (firestoreUnsubscribe) firestoreUnsubscribe();
      if (cacheUnsubscribe) cacheUnsubscribe();
    };
  }, [libraryId]);

  return { songs, isLoading, error };
}
