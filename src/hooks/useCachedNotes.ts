"use client";

import { useState, useEffect } from "react";
import { NoteItem, getAllNotes as getAllNotesFromFirestore } from "@/lib/notes";
import { LocalCache } from "@/lib/local-cache";
import { subscribeToCachedNotes } from "@/lib/cache-sync";

/**
 * Hook to get all notes with local cache
 *
 * Flow:
 * 1. Return cached notes immediately (if available)
 * 2. Firestore listener keeps cache updated
 * 3. Falls back to direct Firestore if cache unavailable
 */
export function useCachedNotes() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function init() {
      try {
        // Check if cache is available
        if (LocalCache.isInitialized()) {
          // Get cached notes immediately
          const cache = LocalCache.getInstance();
          const cachedNotes = cache.getAllNotes();

          if (mounted && cachedNotes.length > 0) {
            console.log(`[useCachedNotes] Loaded ${cachedNotes.length} notes from cache`);
            setNotes(cachedNotes);
            setIsLoading(false);
          }

          // Subscribe to cache updates (Firestore listener updates cache)
          unsubscribe = subscribeToCachedNotes((updatedNotes) => {
            if (mounted) {
              // Sort by sortOrder first, then alphabetically by title
              const sorted = [...updatedNotes].sort((a, b) => {
                if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
                  return a.sortOrder - b.sortOrder;
                }
                if (a.sortOrder !== undefined) return -1;
                if (b.sortOrder !== undefined) return 1;
                const aTitle = a.title || "";
                const bTitle = b.title || "";
                return aTitle.localeCompare(bTitle);
              });
              setNotes(sorted);
              setIsLoading(false);
            }
          });
        } else {
          // Cache not available, fall back to direct Firestore fetch
          console.log("[useCachedNotes] Cache not available, fetching from Firestore");
          const firestoreNotes = await getAllNotesFromFirestore();
          if (mounted) {
            setNotes(firestoreNotes);
            setIsLoading(false);
          }
        }
      } catch (e) {
        console.error("[useCachedNotes] Error:", e);
        if (mounted) {
          setError(e as Error);
        }

        // Fall back to Firestore on error
        try {
          const firestoreNotes = await getAllNotesFromFirestore();
          if (mounted) {
            setNotes(firestoreNotes);
            setIsLoading(false);
          }
        } catch (e2) {
          console.error("[useCachedNotes] Firestore fallback error:", e2);
          if (mounted) {
            setIsLoading(false);
          }
        }
      }
    }

    init();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { notes, isLoading, error };
}
