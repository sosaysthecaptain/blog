/**
 * Client-side B2 upload utilities
 * These call the server-side /api/upload route
 */

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

/**
 * Upload a file to B2 via the API route
 */
export async function uploadToB2(
  file: Blob,
  path: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  onProgress?.(10);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", path);

  onProgress?.(30);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  onProgress?.(90);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Upload failed");
  }

  const result = await response.json();
  onProgress?.(100);

  return result;
}

/**
 * Upload multiple files to B2
 */
export async function uploadMultipleToB2(
  files: Array<{ blob: Blob; path: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i, files.length);
    const { blob, path } = files[i];
    const result = await uploadToB2(blob, path);
    results.push(result);
  }

  onProgress?.(files.length, files.length);
  return results;
}

/**
 * Delete a file from B2 via the API route
 */
export async function deleteFromB2(path: string): Promise<void> {
  const response = await fetch("/api/upload", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Delete failed");
  }
}

/**
 * Get the URL for a B2 file via our proxy endpoint
 * This keeps files private while allowing authenticated access
 */
export function getB2Url(path: string): string {
  // Use our API proxy to serve files from private B2 bucket
  return `/api/files/${path}`;
}
