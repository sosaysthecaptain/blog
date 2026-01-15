import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "./firebase";
import { MoodboardImage } from "./notes";
import { Timestamp } from "firebase/firestore";

const THUMBNAIL_WIDTH = 800;

/**
 * Generate a thumbnail from an image blob using canvas
 */
async function generateThumbnail(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate thumbnail dimensions maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      const thumbWidth = Math.min(THUMBNAIL_WIDTH, img.width);
      const thumbHeight = thumbWidth / aspectRatio;

      // Create canvas and draw resized image
      const canvas = document.createElement("canvas");
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

      // Convert to WebP blob (fallback to PNG if WebP not supported)
      canvas.toBlob(
        (thumbBlob) => {
          if (thumbBlob) {
            resolve(thumbBlob);
          } else {
            // Fallback to PNG
            canvas.toBlob(
              (pngBlob) => {
                if (pngBlob) resolve(pngBlob);
                else reject(new Error("Failed to generate thumbnail"));
              },
              "image/png",
              0.8
            );
          }
        },
        "image/webp",
        0.8
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Get image dimensions from a blob
 */
async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Upload a moodboard image with automatic thumbnail generation
 */
export async function uploadMoodboardImage(
  blob: Blob,
  moodboardId: string,
  onProgress?: (progress: number) => void
): Promise<MoodboardImage> {
  const imageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const extension = blob.type.split("/")[1] || "png";

  // Get image dimensions
  const { width, height } = await getImageDimensions(blob);

  // Generate thumbnail
  onProgress?.(10);
  const thumbnailBlob = await generateThumbnail(blob);
  onProgress?.(30);

  // Upload original
  const originalPath = `notes/${moodboardId}/moodboard/${imageId}.${extension}`;
  const originalRef = ref(storage, originalPath);
  await uploadBytes(originalRef, blob);
  const url = await getDownloadURL(originalRef);
  onProgress?.(70);

  // Upload thumbnail
  const thumbnailPath = `notes/${moodboardId}/moodboard/${imageId}_thumb.webp`;
  const thumbnailRef = ref(storage, thumbnailPath);
  await uploadBytes(thumbnailRef, thumbnailBlob);
  const thumbnailUrl = await getDownloadURL(thumbnailRef);
  onProgress?.(100);

  return {
    id: imageId,
    url,
    thumbnailUrl,
    width,
    height,
    fileSize: blob.size,
    order: Date.now(),
    createdAt: Timestamp.now(),
  };
}

/**
 * Upload multiple moodboard images
 */
export async function uploadMoodboardImages(
  files: File[],
  moodboardId: string,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<MoodboardImage[]> {
  const images: MoodboardImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length, file.name);

    try {
      const image = await uploadMoodboardImage(file, moodboardId);
      images.push(image);
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
    }
  }

  onProgress?.(files.length, files.length, "Complete");
  return images;
}

/**
 * Delete a moodboard image and its thumbnail
 */
export async function deleteMoodboardImage(
  moodboardId: string,
  imageId: string,
  extension: string = "png"
): Promise<void> {
  const originalPath = `notes/${moodboardId}/moodboard/${imageId}.${extension}`;
  const thumbnailPath = `notes/${moodboardId}/moodboard/${imageId}_thumb.webp`;

  try {
    await deleteObject(ref(storage, originalPath));
  } catch (error) {
    console.error("Error deleting original:", error);
  }

  try {
    await deleteObject(ref(storage, thumbnailPath));
  } catch (error) {
    console.error("Error deleting thumbnail:", error);
  }
}

/**
 * Delete all images for a moodboard
 */
export async function deleteAllMoodboardImages(moodboardId: string): Promise<void> {
  const listRef = ref(storage, `notes/${moodboardId}/moodboard`);
  try {
    const result = await listAll(listRef);
    await Promise.all(result.items.map((item) => deleteObject(item)));
  } catch (error) {
    console.error("Error deleting moodboard images:", error);
  }
}

/**
 * Extract image ID from a storage URL
 */
export function getImageIdFromUrl(url: string): string | null {
  // URL format: .../moodboard/{imageId}.{ext}?...
  const match = url.match(/\/moodboard\/([^.]+)\./);
  return match ? match[1] : null;
}

/**
 * Get extension from URL
 */
export function getExtensionFromUrl(url: string): string {
  const match = url.match(/\.([a-z]+)\?/i);
  return match ? match[1] : "png";
}
