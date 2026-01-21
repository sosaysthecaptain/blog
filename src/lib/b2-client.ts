/**
 * Client-side B2 upload utilities
 * These call Firebase callable functions
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

/**
 * Upload a file to B2 via Firebase callable function
 */
export async function uploadToB2(
  file: Blob,
  path: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  onProgress?.(10);

  // Convert blob to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ""
    )
  );

  onProgress?.(30);

  const uploadFn = httpsCallable<
    { fileData: string; path: string; contentType: string },
    UploadResult
  >(functions, "uploadToB2");

  onProgress?.(50);

  const result = await uploadFn({
    fileData: base64,
    path,
    contentType: file.type || "application/octet-stream",
  });

  onProgress?.(100);

  return result.data;
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
 * Delete a file from B2 via Firebase callable function
 */
export async function deleteFromB2(path: string): Promise<void> {
  const deleteFn = httpsCallable<{ path: string }, { success: boolean }>(
    functions,
    "deleteFromB2"
  );

  await deleteFn({ path });
}

/**
 * Get the URL for a B2 file (uses /api/files/ format for signed URL system)
 */
export function getB2Url(path: string): string {
  return `/api/files/${path}`;
}

