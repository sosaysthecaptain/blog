/**
 * Client-side cache for signed B2 URLs.
 * Stores URLs with their expiration times and handles refresh.
 */

interface CachedUrl {
  signedUrl: string;
  expiresAt: number;
}

// In-memory cache
const urlCache = new Map<string, CachedUrl>();

// Buffer time before expiry to refresh (5 minutes)
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Get a cached signed URL if it exists and is still valid.
 * Returns null if not cached or expired.
 */
export function getCachedUrl(path: string): string | null {
  const cached = urlCache.get(path);
  if (!cached) return null;

  // Check if URL is still valid (with buffer)
  if (Date.now() > cached.expiresAt - REFRESH_BUFFER_MS) {
    urlCache.delete(path);
    return null;
  }

  return cached.signedUrl;
}

/**
 * Store signed URLs in the cache.
 */
export function cacheUrls(
  urls: Record<string, string>,
  expiresAt: number
): void {
  for (const [path, signedUrl] of Object.entries(urls)) {
    urlCache.set(path, { signedUrl, expiresAt });
  }
}

/**
 * Get all paths that need signed URLs (not cached or expired).
 * Takes an array of paths, returns only the ones that need fetching.
 */
export function getUncachedPaths(paths: string[]): string[] {
  return paths.filter((path) => getCachedUrl(path) === null);
}

/**
 * Get cached URLs for multiple paths.
 * Returns a map of path -> signedUrl for all cached paths.
 */
export function getCachedUrls(paths: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const path of paths) {
    const cached = getCachedUrl(path);
    if (cached) {
      result[path] = cached;
    }
  }
  return result;
}

/**
 * Clear all cached URLs (useful for logout).
 */
export function clearUrlCache(): void {
  urlCache.clear();
}

/**
 * Get the earliest expiration time for a set of paths.
 * Returns null if no paths are cached.
 */
export function getEarliestExpiration(paths: string[]): number | null {
  let earliest: number | null = null;
  for (const path of paths) {
    const cached = urlCache.get(path);
    if (cached) {
      if (earliest === null || cached.expiresAt < earliest) {
        earliest = cached.expiresAt;
      }
    }
  }
  return earliest;
}

/**
 * Invalidate (remove) cached URLs for specific paths.
 * This forces them to be re-fetched on next request.
 */
export function invalidatePaths(paths: string[]): void {
  for (const path of paths) {
    urlCache.delete(path);
  }
}

/**
 * Check if any cached URLs for the given paths will expire soon.
 * Returns true if at least one URL will expire within the refresh buffer.
 */
export function hasExpiringUrls(paths: string[]): boolean {
  const now = Date.now();
  for (const path of paths) {
    const cached = urlCache.get(path);
    if (cached && now > cached.expiresAt - REFRESH_BUFFER_MS) {
      return true;
    }
  }
  return false;
}

/**
 * Extract the storage path from various URL formats.
 * Handles:
 * - /api/files/{path} (old proxy format)
 * - Direct paths (notes/xxx/moodboard/yyy.jpg)
 */
export function extractPathFromUrl(url: string): string {
  if (!url) return url;

  // Handle old proxy URLs
  if (url.startsWith("/api/files/")) {
    return url.replace("/api/files/", "");
  }

  // Handle direct B2 URLs (extract path after bucket name)
  const b2Match = url.match(/backblazeb2\.com\/file\/[^/]+\/(.+)$/);
  if (b2Match) {
    return decodeURIComponent(b2Match[1]);
  }

  // Handle S3-style URLs
  const s3Match = url.match(/s3\.[^/]+\.backblazeb2\.com\/(.+?)(?:\?|$)/);
  if (s3Match) {
    return decodeURIComponent(s3Match[1]);
  }

  // Assume it's already a path
  return url;
}
