"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  interval?: number; // milliseconds, default 10000
  enabled?: boolean;
}

export function useAutosave<T>({
  data,
  onSave,
  interval = 10000,
  enabled = true,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const lastSavedRef = useRef<string>(JSON.stringify(data));
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isDirty = JSON.stringify(data) !== lastSavedRef.current;

  const save = useCallback(async () => {
    if (!isDirty) return;
    setStatus("saving");
    try {
      await onSave(data);
      lastSavedRef.current = JSON.stringify(data);
      setStatus("saved");
    } catch (error) {
      console.error("Autosave failed:", error);
      setStatus("unsaved");
    }
  }, [data, isDirty, onSave]);

  // Update status when data changes
  useEffect(() => {
    if (isDirty && status === "saved") {
      setStatus("unsaved");
    }
  }, [isDirty, status]);

  // Set up autosave timer
  useEffect(() => {
    if (!enabled) return;

    timerRef.current = setInterval(() => {
      if (isDirty) {
        save();
      }
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, interval, isDirty, save]);

  // Mark as saved (for external use after initial load)
  const markSaved = useCallback(() => {
    lastSavedRef.current = JSON.stringify(data);
    setStatus("saved");
  }, [data]);

  return { status, isDirty, save, markSaved };
}
