import { uploadToB2, deleteFromB2, getB2Url } from "./b2-client";
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
  await uploadToB2(blob, originalPath);
  const url = getB2Url(originalPath);
  onProgress?.(70);

  // Upload thumbnail
  const thumbnailPath = `notes/${moodboardId}/moodboard/${imageId}_thumb.webp`;
  await uploadToB2(thumbnailBlob, thumbnailPath);
  const thumbnailUrl = getB2Url(thumbnailPath);
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
    await deleteFromB2(originalPath);
  } catch (error) {
    console.error("Error deleting original:", error);
  }

  try {
    await deleteFromB2(thumbnailPath);
  } catch (error) {
    console.error("Error deleting thumbnail:", error);
  }
}

/**
 * Delete all images for a moodboard
 * Note: This requires the image list to be passed in since B2 doesn't support listing by prefix client-side
 */
export async function deleteAllMoodboardImages(
  moodboardId: string,
  images?: Array<{ id: string; url: string }>
): Promise<void> {
  if (!images || images.length === 0) {
    console.warn("No images provided for deletion");
    return;
  }

  for (const image of images) {
    const extension = getExtensionFromUrl(image.url);
    try {
      await deleteMoodboardImage(moodboardId, image.id, extension);
    } catch (error) {
      console.error(`Error deleting image ${image.id}:`, error);
    }
  }
}

/**
 * Extract image ID from a storage URL
 */
export function getImageIdFromUrl(url: string): string | null {
  // URL format: .../moodboard/{imageId}.{ext} (B2) or .../moodboard/{imageId}.{ext}?... (Firebase)
  const match = url.match(/\/moodboard\/([^.?]+)\./);
  return match ? match[1] : null;
}

/**
 * Get extension from URL
 */
export function getExtensionFromUrl(url: string): string {
  // Handle both B2 URLs (no query string) and Firebase URLs (with query string)
  const match = url.match(/\.([a-z]+)(?:\?|$)/i);
  return match ? match[1] : "png";
}
