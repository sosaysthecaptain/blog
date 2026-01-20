"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import {
  getCachedUrl,
  cacheUrls,
  getUncachedPaths,
  extractPathFromUrl,
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
}

/**
 * Hook to get signed URLs for B2 storage paths.
 * Automatically caches URLs and batches requests.
 *
 * @param paths - Array of storage paths or URLs that need signing
 * @returns Object with getSignedUrl function, loading state, and error
 */
export function useSignedUrls(paths: string[]): UseSignedUrlsResult {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track which paths we've already requested to avoid duplicate calls
  const requestedPathsRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!paths || paths.length === 0) return;

    // Normalize paths (extract from URLs if needed)
    const normalizedPaths = paths
      .filter(Boolean)
      .map(extractPathFromUrl)
      .filter(Boolean);

    if (normalizedPaths.length === 0) return;

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

    const fetchSignedUrls = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const getSignedUrlsFn = httpsCallable<
          { paths: string[] },
          SignedUrlsResponse
        >(functions, "getSignedUrls");

        const result = await getSignedUrlsFn({ paths: uncachedPaths });
        const { urls, expiresAt } = result.data;

        // Cache the results
        cacheUrls(urls, expiresAt);

        // Update state
        if (isMountedRef.current) {
          setSignedUrls((prev) => ({ ...prev, ...urls }));
        }
      } catch (err) {
        console.error("Failed to fetch signed URLs:", err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error("Failed to fetch signed URLs"));
        }
        // Clear requested paths on error so they can be retried
        uncachedPaths.forEach((p) => requestedPathsRef.current.delete(p));
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchSignedUrls();
  }, [paths]);

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

  return { getSignedUrl, isLoading, error };
}

/**
 * Simpler hook for a single URL.
 */
export function useSignedUrl(pathOrUrl: string | undefined): string | null {
  const paths = pathOrUrl ? [pathOrUrl] : [];
  const { getSignedUrl } = useSignedUrls(paths);
  return pathOrUrl ? getSignedUrl(pathOrUrl) : null;
}
