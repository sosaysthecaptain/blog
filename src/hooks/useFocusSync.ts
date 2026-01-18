"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { NoteItem, getNoteById } from "@/lib/notes";

interface UseFocusSyncOptions {
  documentId: string | undefined;
  localUpdatedAt: Date | null; // When we last saved
  hasLocalChanges: boolean;
  onRemoteUpdate: (remoteDoc: NoteItem) => void;
  onConflict: (remoteDoc: NoteItem) => void;
  inactivityThresholdMs?: number; // How long before we check on focus (default 30s)
}

/**
 * Hook that checks for remote updates when the user returns to the tab
 * after a period of inactivity. This replaces real-time subscriptions
 * with a simpler "check on focus" pattern.
 *
 * - If user was away > inactivityThreshold and returns:
 *   - Fetch latest from server
 *   - If server is newer and no local changes: auto-apply
 *   - If server is newer and local changes exist: call onConflict
 */
export function useFocusSync({
  documentId,
  localUpdatedAt,
  hasLocalChanges,
  onRemoteUpdate,
  onConflict,
  inactivityThresholdMs = 30000, // 30 seconds default
}: UseFocusSyncOptions) {
  const lastActivityRef = useRef<number>(Date.now());
  const [isChecking, setIsChecking] = useState(false);

  // Update last activity on any user interaction
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Track common user interactions
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("mousedown", updateActivity);
    window.addEventListener("touchstart", updateActivity);
    window.addEventListener("scroll", updateActivity);

    return () => {
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("mousedown", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      window.removeEventListener("scroll", updateActivity);
    };
  }, []);

  // Check for remote updates
  const checkForUpdates = useCallback(async () => {
    if (!documentId || isChecking) return;

    const timeSinceActivity = Date.now() - lastActivityRef.current;

    // Only check if user was inactive for a while
    if (timeSinceActivity < inactivityThresholdMs) {
      return;
    }

    setIsChecking(true);
    try {
      const remoteDoc = await getNoteById(documentId);
      if (!remoteDoc) {
        setIsChecking(false);
        return;
      }

      // Compare timestamps
      const remoteUpdatedAt = remoteDoc.updatedAt?.toDate?.() || new Date(0);
      const localTime = localUpdatedAt || new Date(0);

      // If remote is newer than our last save
      if (remoteUpdatedAt > localTime) {
        if (hasLocalChanges) {
          // Conflict: we have unsaved changes but server has newer data
          onConflict(remoteDoc);
        } else {
          // No local changes, safe to update
          onRemoteUpdate(remoteDoc);
        }
      }
    } catch (error) {
      console.error("Failed to check for remote updates:", error);
    } finally {
      setIsChecking(false);
    }
  }, [documentId, localUpdatedAt, hasLocalChanges, onRemoteUpdate, onConflict, inactivityThresholdMs, isChecking]);

  // Check on window focus
  useEffect(() => {
    const handleFocus = () => {
      checkForUpdates();
    };

    window.addEventListener("focus", handleFocus);

    // Also check on visibility change (handles mobile better)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkForUpdates]);

  return { isChecking, checkForUpdates };
}
