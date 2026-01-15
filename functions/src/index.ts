import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import sharp from "sharp";
import * as path from "path";

admin.initializeApp();

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_SUFFIX = "_thumb";

/**
 * Cloud Function triggered when an image is uploaded to Firebase Storage.
 * Generates a thumbnail for moodboard images.
 *
 * Storage path pattern: notes/{noteId}/moodboard/{imageId}.{ext}
 * Thumbnail path:       notes/{noteId}/moodboard/{imageId}_thumb.webp
 */
export const generateMoodboardThumbnail = onObjectFinalized(
  {
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const bucket = event.data.bucket;

    // Exit conditions
    if (!filePath || !contentType) {
      console.log("No file path or content type");
      return;
    }

    // Only process images
    if (!contentType.startsWith("image/")) {
      console.log("Not an image:", contentType);
      return;
    }

    // Only process moodboard images (path: notes/{noteId}/moodboard/{filename})
    if (!filePath.includes("/moodboard/")) {
      console.log("Not a moodboard image:", filePath);
      return;
    }

    // Don't process thumbnails (avoid infinite loop)
    const fileName = path.basename(filePath);
    if (fileName.includes(THUMBNAIL_SUFFIX)) {
      console.log("Already a thumbnail:", filePath);
      return;
    }

    console.log("Processing moodboard image:", filePath);

    const storageBucket = admin.storage().bucket(bucket);
    const file = storageBucket.file(filePath);

    try {
      // Download the original image
      const [imageBuffer] = await file.download();
      console.log("Downloaded image, size:", imageBuffer.length);

      // Get image metadata for dimensions
      const metadata = await sharp(imageBuffer).metadata();
      const originalWidth = metadata.width || 0;
      const originalHeight = metadata.height || 0;

      // Generate thumbnail using sharp
      // Resize to THUMBNAIL_WIDTH, maintaining aspect ratio
      // Convert to WebP for better compression
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(THUMBNAIL_WIDTH, null, {
          withoutEnlargement: true, // Don't upscale small images
        })
        .webp({ quality: 80 })
        .toBuffer();

      console.log("Generated thumbnail, size:", thumbnailBuffer.length);

      // Build thumbnail path
      const dirName = path.dirname(filePath);
      const baseName = path.basename(filePath, path.extname(filePath));
      const thumbnailPath = `${dirName}/${baseName}${THUMBNAIL_SUFFIX}.webp`;

      // Upload thumbnail
      const thumbnailFile = storageBucket.file(thumbnailPath);
      await thumbnailFile.save(thumbnailBuffer, {
        metadata: {
          contentType: "image/webp",
          metadata: {
            originalPath: filePath,
            originalWidth: String(originalWidth),
            originalHeight: String(originalHeight),
          },
        },
      });

      // Make thumbnail publicly accessible
      await thumbnailFile.makePublic();

      // Get the public URL for the thumbnail
      const thumbnailUrl = `https://storage.googleapis.com/${bucket}/${thumbnailPath}`;

      console.log("Thumbnail uploaded:", thumbnailUrl);

      // Extract noteId and imageId from path to update Firestore
      // Path format: notes/{noteId}/moodboard/{imageId}.{ext}
      const pathParts = filePath.split("/");
      const noteId = pathParts[1];
      const imageId = baseName;

      // Update the moodboard document in Firestore with thumbnail info
      const db = admin.firestore();
      const noteRef = db.collection("notes").doc(noteId);
      const noteDoc = await noteRef.get();

      if (noteDoc.exists) {
        const data = noteDoc.data();
        if (data && data.type === "moodboard" && Array.isArray(data.images)) {
          // Find the image and update its thumbnailUrl
          const updatedImages = data.images.map((img: { id: string; thumbnailUrl?: string }) => {
            if (img.id === imageId) {
              return { ...img, thumbnailUrl };
            }
            return img;
          });

          await noteRef.update({
            images: updatedImages,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log("Updated Firestore document with thumbnail URL");
        }
      }

      return { thumbnailPath, thumbnailUrl };
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      throw error;
    }
  }
);

/**
 * HTTP function to manually regenerate thumbnails for a moodboard.
 * Useful for fixing missing thumbnails or regenerating after changing sizes.
 */
export const regenerateMoodboardThumbnails = onCall(
  {
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated to regenerate thumbnails"
      );
    }

    const { noteId } = request.data;
    if (!noteId) {
      throw new HttpsError("invalid-argument", "noteId is required");
    }

    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({
      prefix: `notes/${noteId}/moodboard/`,
    });

    const originalFiles = files.filter(
      (f) => !f.name.includes(THUMBNAIL_SUFFIX) && !f.name.endsWith("/")
    );

    console.log(`Found ${originalFiles.length} original images to process`);

    let processed = 0;
    let errors = 0;

    for (const file of originalFiles) {
      try {
        // Download and process
        const [imageBuffer] = await file.download();

        const thumbnailBuffer = await sharp(imageBuffer)
          .resize(THUMBNAIL_WIDTH, null, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        const baseName = path.basename(file.name, path.extname(file.name));
        const dirName = path.dirname(file.name);
        const thumbnailPath = `${dirName}/${baseName}${THUMBNAIL_SUFFIX}.webp`;

        const thumbnailFile = bucket.file(thumbnailPath);
        await thumbnailFile.save(thumbnailBuffer, {
          metadata: { contentType: "image/webp" },
        });
        await thumbnailFile.makePublic();

        processed++;
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        errors++;
      }
    }

    return { processed, errors, total: originalFiles.length };
  }
);
