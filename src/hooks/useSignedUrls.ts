"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import {
  getCachedUrl,
  cacheUrls,
  getUncachedPaths,
  extractPathFromUrl,
  getEarliestExpiration,
  invalidatePaths,
} from "@/lib/signed-url-cache";

interface SignedUrlsResponse {
  urls: Record<string, string>;
  expiresIn: number;
  expiresAt: number;
}

interface UseSignedUrlsResult {
  getSignedUrl: (pathOrUrl: string) => string | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

// How often to check for expiring URLs (every 2 minutes)
const REFRESH_CHECK_INTERVAL_MS = 2 * 60 * 1000;
// How long before expiry to trigger refresh (10 minutes)
const REFRESH_BEFORE_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Hook to get signed URLs for B2 storage paths.
 * Automatically caches URLs, batches requests, and proactively refreshes before expiry.
 *
 * @param paths - Array of storage paths or URLs that need signing
 * @returns Object with getSignedUrl function, loading state, error, and refresh function
 */
export function useSignedUrls(paths: string[]): UseSignedUrlsResult {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track which paths we've already requested to avoid duplicate calls
  const requestedPathsRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  // Store normalized paths for refresh
  const normalizedPathsRef = useRef<string[]>([]);
  // Track if a refresh is in progress to avoid duplicate refresh calls
  const refreshInProgressRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Core fetch function that can be called for initial load or refresh
  const fetchUrls = useCallback(async (pathsToFetch: string[], isRefresh = false) => {
    if (pathsToFetch.length === 0) return;
    if (refreshInProgressRef.current && isRefresh) return;

    if (isRefresh) {
      refreshInProgressRef.current = true;
    }

    setIsLoading(true);
    if (!isRefresh) {
      setError(null);
    }

    try {
      const getSignedUrlsFn = httpsCallable<
        { paths: string[] },
        SignedUrlsResponse
      >(functions, "getSignedUrls");

      const result = await getSignedUrlsFn({ paths: pathsToFetch });
      const { urls, expiresAt } = result.data;

      // Cache the results
      cacheUrls(urls, expiresAt);

      // Update state
      if (isMountedRef.current) {
        setSignedUrls((prev) => ({ ...prev, ...urls }));
      }
    } catch (err) {
      console.error("Failed to fetch signed URLs:", err);
      if (isMountedRef.current && !isRefresh) {
        setError(err instanceof Error ? err : new Error("Failed to fetch signed URLs"));
      }
      // Clear requested paths on error so they can be retried
      if (!isRefresh) {
        pathsToFetch.forEach((p) => requestedPathsRef.current.delete(p));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      if (isRefresh) {
        refreshInProgressRef.current = false;
      }
    }
  }, []);

  // Manual refresh function - invalidates cache and re-fetches all paths
  const refresh = useCallback(() => {
    const currentPaths = normalizedPathsRef.current;
    if (currentPaths.length === 0) return;

    // Invalidate the cache for these paths
    invalidatePaths(currentPaths);
    // Clear from requested set so they can be re-fetched
    currentPaths.forEach((p) => requestedPathsRef.current.delete(p));
    // Fetch fresh URLs
    fetchUrls(currentPaths, true);
  }, [fetchUrls]);

  // Proactive refresh check - runs periodically when user is active
  useEffect(() => {
    if (!paths || paths.length === 0) return;

    const checkAndRefresh = () => {
      // Only refresh if the document is visible (user is active)
      if (document.hidden) return;

      const currentPaths = normalizedPathsRef.current;
      if (currentPaths.length === 0) return;

      // Check earliest expiration
      const earliestExpiry = getEarliestExpiration(currentPaths);
      if (!earliestExpiry) return;

      const timeUntilExpiry = earliestExpiry - Date.now();

      // If URLs are already expired OR will expire within the refresh window, refresh them
      if (timeUntilExpiry < REFRESH_BEFORE_EXPIRY_MS) {
        if (timeUntilExpiry <= 0) {
          console.log("URLs have expired, refreshing...");
        } else {
          console.log(`Proactively refreshing URLs (expiring in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes)`);
        }
        refresh();
      }
    };

    // Set up periodic check
    const intervalId = setInterval(checkAndRefresh, REFRESH_CHECK_INTERVAL_MS);

    // Also check when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAndRefresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [paths, refresh]);

  // Initial fetch effect
  useEffect(() => {
    if (!paths || paths.length === 0) return;

    // Normalize paths (extract from URLs if needed)
    const normalizedPaths = paths
      .filter(Boolean)
      .map(extractPathFromUrl)
      .filter(Boolean);

    if (normalizedPaths.length === 0) return;

    // Store for refresh
    normalizedPathsRef.current = normalizedPaths;

    // Check which paths need fetching
    const uncachedPaths = getUncachedPaths(normalizedPaths).filter(
      (p) => !requestedPathsRef.current.has(p)
    );

    // Load any cached URLs into state
    const cached: Record<string, string> = {};
    for (const path of normalizedPaths) {
      const cachedUrl = getCachedUrl(path);
      if (cachedUrl) {
        cached[path] = cachedUrl;
      }
    }
    if (Object.keys(cached).length > 0) {
      setSignedUrls((prev) => ({ ...prev, ...cached }));
    }

    // Fetch uncached URLs
    if (uncachedPaths.length === 0) return;

    // Mark paths as requested
    uncachedPaths.forEach((p) => requestedPathsRef.current.add(p));

    fetchUrls(uncachedPaths);
  }, [paths, fetchUrls]);

  // Function to get a signed URL for a specific path
  const getSignedUrl = useCallback(
    (pathOrUrl: string): string | null => {
      if (!pathOrUrl) return null;

      const path = extractPathFromUrl(pathOrUrl);

      // First check our local state
      if (signedUrls[path]) {
        return signedUrls[path];
      }

      // Then check the cache (might have been populated by another component)
      const cached = getCachedUrl(path);
      if (cached) {
        return cached;
      }

      // Return null if not yet available
      return null;
    },
    [signedUrls]
  );

  return { getSignedUrl, isLoading, error, refresh };
}

/**
 * Simpler hook for a single URL.
 */
export function useSignedUrl(pathOrUrl: string | undefined): string | null {
  const paths = pathOrUrl ? [pathOrUrl] : [];
  const { getSignedUrl } = useSignedUrls(paths);
  return pathOrUrl ? getSignedUrl(pathOrUrl) : null;
}
