"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number; // milliseconds after last change, default 2000
  enabled?: boolean;
}

export function useAutosave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const lastSavedRef = useRef<string>(JSON.stringify(data));
  const pendingDataRef = useRef<T | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onSaveRef = useRef(onSave);

  // Keep onSave ref current to avoid stale closures
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const isDirty = JSON.stringify(data) !== lastSavedRef.current;

  // Perform the actual save (non-blocking, fire-and-forget)
  const doSave = useCallback((dataToSave: T) => {
    setStatus("saving");

    // Fire and forget - don't await
    onSaveRef.current(dataToSave)
      .then(() => {
        lastSavedRef.current = JSON.stringify(dataToSave);
        setStatus("saved");
        pendingDataRef.current = null;
      })
      .catch((error) => {
        console.error("Autosave failed:", error);
        setStatus("unsaved");
        // Keep pendingDataRef so we can retry
      });
  }, []);

  // Flush any pending saves immediately (for unmount/beforeunload)
  const flush = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingDataRef.current !== null) {
      doSave(pendingDataRef.current);
    }
  }, [doSave]);

  // Debounced save - schedules a save after debounceMs of inactivity
  useEffect(() => {
    if (!enabled) return;

    const currentJson = JSON.stringify(data);
    if (currentJson === lastSavedRef.current) {
      // No changes, clear any pending timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pendingDataRef.current = null;
      return;
    }

    // Data changed - mark as pending and start/reset debounce timer
    pendingDataRef.current = data;
    setStatus("unsaved");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (pendingDataRef.current !== null) {
        doSave(pendingDataRef.current);
      }
      debounceTimerRef.current = null;
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, enabled, debounceMs, doSave]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (pendingDataRef.current !== null) {
        // Try to save synchronously via sendBeacon if possible
        // Otherwise just do the async save
        doSave(pendingDataRef.current);
      }
    };
  }, [doSave]);

  // Flush on page close/navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingDataRef.current !== null) {
        // Use sendBeacon for reliable delivery on page close
        // This requires a backend endpoint, so for now just try the regular save
        doSave(pendingDataRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [doSave]);

  // Manual save (flushes immediately)
  const save = useCallback(() => {
    const currentJson = JSON.stringify(data);
    if (currentJson !== lastSavedRef.current) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      doSave(data);
    }
  }, [data, doSave]);

  // Mark as saved (for external use after initial load)
  const markSaved = useCallback(() => {
    lastSavedRef.current = JSON.stringify(data);
    pendingDataRef.current = null;
    setStatus("saved");
  }, [data]);

  return { status, isDirty, save, flush, markSaved };
}
