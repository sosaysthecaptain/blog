import {
  ref,
  deleteObject,
  listAll,
  getBlob,
  getDownloadURL,
} from "firebase/storage";
import { storage } from "./firebase";
import { uploadToB2, deleteFromB2, getB2Url } from "./b2-client";

// Extract all storage URLs from HTML content (images and file attachments)
// Supports both Firebase Storage and B2 URLs
export function extractStorageUrls(html: string): string[] {
  if (!html) return [];

  const urls: string[] = [];
  const seen = new Set<string>();

  // Match Firebase Storage URLs
  // Firebase Storage URLs look like: https://firebasestorage.googleapis.com/v0/b/...
  const firebaseRegex = /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^"'\s<>]+/g;
  const firebaseMatches = html.match(firebaseRegex);

  if (firebaseMatches) {
    for (const url of firebaseMatches) {
      const cleanUrl = url.split('&quot;')[0].split('"')[0];
      if (!seen.has(cleanUrl)) {
        seen.add(cleanUrl);
        urls.push(cleanUrl);
      }
    }
  }

  // Match B2 proxy URLs
  // B2 proxy URLs look like: /api/files/...
  const b2ProxyRegex = /\/api\/files\/[^"'\s<>]+/g;
  const b2ProxyMatches = html.match(b2ProxyRegex);

  if (b2ProxyMatches) {
    for (const url of b2ProxyMatches) {
      const cleanUrl = url.split('&quot;')[0].split('"')[0];
      if (!seen.has(cleanUrl)) {
        seen.add(cleanUrl);
        urls.push(cleanUrl);
      }
    }
  }

  // Also match direct B2 Storage URLs (legacy)
  // B2 URLs look like: https://dirigible-content.s3.us-west-004.backblazeb2.com/...
  const b2DirectRegex = /https:\/\/dirigible-content\.s3\.us-west-004\.backblazeb2\.com\/[^"'\s<>]+/g;
  const b2DirectMatches = html.match(b2DirectRegex);

  if (b2DirectMatches) {
    for (const url of b2DirectMatches) {
      const cleanUrl = url.split('&quot;')[0].split('"')[0];
      if (!seen.has(cleanUrl)) {
        seen.add(cleanUrl);
        urls.push(cleanUrl);
      }
    }
  }

  return urls;
}

// Delete a file from storage by its download URL
// Supports Firebase, B2 direct, and B2 proxy URLs
export async function deleteFileByUrl(url: string): Promise<boolean> {
  try {
    // Check if it's a B2 proxy URL
    if (url.startsWith("/api/files/")) {
      const path = url.replace("/api/files/", "");
      await deleteFromB2(decodeURIComponent(path));
      return true;
    }

    // Check if it's a direct B2 URL (legacy)
    if (url.includes("backblazeb2.com")) {
      // B2 URL format: https://dirigible-content.s3.us-west-004.backblazeb2.com/PATH
      const match = url.match(/backblazeb2\.com\/(.+)$/);
      if (!match) return false;
      const path = decodeURIComponent(match[1]);
      await deleteFromB2(path);
      return true;
    }

    // Firebase Storage URL format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?token=...
    const match = url.match(/\/o\/([^?]+)/);
    if (!match) return false;

    const path = decodeURIComponent(match[1]);
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
}

// Find files that were removed (in oldUrls but not in newUrls)
export function findRemovedFiles(oldContent: string, newContent: string): string[] {
  const oldUrls = new Set(extractStorageUrls(oldContent));
  const newUrls = new Set(extractStorageUrls(newContent));

  const removed: string[] = [];
  for (const url of oldUrls) {
    if (!newUrls.has(url)) {
      removed.push(url);
    }
  }
  return removed;
}

// Upload an image for a note
export async function uploadNoteImage(
  blob: Blob,
  noteId: string
): Promise<string> {
  const timestamp = Date.now();
  const extension = blob.type.split("/")[1] || "png";
  const path = `notes/${noteId}/${timestamp}.${extension}`;
  await uploadToB2(blob, path);
  return getB2Url(path);
}

// Upload a file (any type) for a note
export async function uploadNoteFile(
  file: File,
  noteId: string
): Promise<{ url: string; filename: string; size: number }> {
  const timestamp = Date.now();
  // Preserve original filename but prefix with timestamp for uniqueness
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `notes/${noteId}/files/${timestamp}_${sanitizedName}`;
  await uploadToB2(file, path);
  const url = getB2Url(path);
  return { url, filename: file.name, size: file.size };
}

// Delete a single image
export async function deleteNoteImage(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting image:", error);
  }
}

// List all images for a note
export async function listNoteImages(noteId: string): Promise<string[]> {
  const listRef = ref(storage, `notes/${noteId}`);
  try {
    const result = await listAll(listRef);
    return Promise.all(result.items.map((item) => getDownloadURL(item)));
  } catch {
    return [];
  }
}

// Delete all images for a note
export async function deleteNoteImages(noteId: string): Promise<void> {
  const listRef = ref(storage, `notes/${noteId}`);
  try {
    const result = await listAll(listRef);
    await Promise.all(result.items.map((item) => deleteObject(item)));
  } catch (error) {
    console.error("Error deleting note images:", error);
  }
}

// Helper: wrap a promise with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

// Download an image blob - tries multiple methods with timeouts
export async function downloadImageBlob(url: string): Promise<Blob | null> {
  // Method 1: Direct fetch (fastest if CORS configured)
  try {
    const response = await withTimeout(fetch(url), 5000);
    if (response && response.ok) {
      const blob = await response.blob();
      if (blob.size > 0) {
        console.log("✓ fetch worked");
        return blob;
      }
    }
  } catch (e) {
    console.warn("fetch failed:", e);
  }

  // Method 2: Firebase SDK getBlob
  try {
    const match = url.match(/\/o\/([^?]+)/);
    if (match) {
      const path = decodeURIComponent(match[1]);
      const storageRef = ref(storage, path);
      const blob = await withTimeout(getBlob(storageRef), 5000);
      if (blob && blob.size > 0) {
        console.log("✓ Firebase SDK worked");
        return blob;
      }
    }
  } catch (e) {
    console.warn("Firebase SDK failed:", e);
  }

  // Method 3: Canvas (load as image, convert to blob)
  try {
    const blob = await withTimeout(loadImageAsBlob(url), 5000);
    if (blob && blob.size > 0) {
      console.log("✓ canvas worked");
      return blob;
    }
  } catch (e) {
    console.warn("canvas failed:", e);
  }

  console.warn("All methods failed for:", url.substring(0, 60));
  return null;
}

// Load image via img element and convert to blob via canvas
function loadImageAsBlob(url: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(blob), "image/png");
      } catch (e) {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = url;
  });
}
