import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import sharp from "sharp";
import * as path from "path";
import * as crypto from "crypto";

admin.initializeApp();

// AcoustID API key - get from https://acoustid.org/
const ACOUSTID_API_KEY = process.env.ACOUSTID_API_KEY || "";

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

/**
 * Identify an audio recording using AcoustID fingerprinting.
 *
 * This function:
 * 1. Downloads the audio file from Storage
 * 2. Generates an audio fingerprint using Chromaprint
 * 3. Queries AcoustID API for matches
 * 4. Returns metadata candidates from MusicBrainz
 *
 * Storage path expected: notes/{libraryId}/music/{songId}.webm
 *
 * NOTE: Actual fingerprinting requires chromaprint binary.
 * This is a placeholder that returns unidentified status.
 * To enable: install fpcalc binary and implement fingerprint generation.
 */
export const identifyAudio = onCall(
  {
    memory: "1GiB",
    timeoutSeconds: 120,
  },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated to identify audio"
      );
    }

    const { storagePath } = request.data;
    if (!storagePath) {
      throw new HttpsError("invalid-argument", "storagePath is required");
    }

    console.log("Identifying audio:", storagePath);

    // Check if AcoustID API key is configured
    if (!ACOUSTID_API_KEY) {
      console.warn("ACOUSTID_API_KEY not configured, skipping identification");
      return {
        status: "unconfigured",
        message: "Audio identification not configured. Please set ACOUSTID_API_KEY.",
        candidates: [],
      };
    }

    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new HttpsError("not-found", "Audio file not found");
      }

      // Download the audio file
      const [audioBuffer] = await file.download();
      console.log("Downloaded audio, size:", audioBuffer.length);

      // TODO: Generate fingerprint using chromaprint/fpcalc
      // This requires either:
      // 1. Bundling fpcalc binary with the function (complex)
      // 2. Using a WebAssembly port of chromaprint (if available)
      // 3. Using a third-party fingerprinting service
      //
      // For now, return a placeholder response indicating manual entry is needed.

      // Placeholder response - actual implementation would:
      // 1. Convert webm to raw PCM using ffmpeg
      // 2. Run fpcalc to generate fingerprint
      // 3. Query AcoustID API: https://api.acoustid.org/v2/lookup
      // 4. Fetch metadata from MusicBrainz for each match

      return {
        status: "manual",
        message: "Automatic identification not yet implemented. Please enter metadata manually.",
        candidates: [],
        // Future response format with candidates:
        // candidates: [
        //   {
        //     score: 0.95,
        //     title: "Song Title",
        //     artist: "Artist Name",
        //     album: "Album Name",
        //     year: "2023",
        //     musicbrainzId: "...",
        //   },
        // ],
      };
    } catch (error) {
      console.error("Error identifying audio:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Failed to identify audio");
    }
  }
);

// B2 configuration from environment
const B2_KEY_ID = process.env.B2_KEY_ID || "";
const B2_APP_KEY = process.env.B2_APPLICATION_KEY || "";
const B2_BUCKET = process.env.B2_BUCKET_NAME || "dirigible-content";

// Cache B2 auth token
let b2AuthCache: {
  apiUrl: string;
  authorizationToken: string;
  downloadUrl: string;
  bucketId: string;
  expiresAt: number;
} | null = null;

async function getB2Auth() {
  if (b2AuthCache && Date.now() < b2AuthCache.expiresAt - 5 * 60 * 1000) {
    return b2AuthCache;
  }

  const authResponse = await fetch(
    "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString("base64")}`,
      },
    }
  );

  if (!authResponse.ok) {
    throw new Error(`B2 auth failed: ${authResponse.statusText}`);
  }

  const authData = await authResponse.json();
  let bucketId = authData.allowed?.bucketId;

  // If no bucketId (master key), list buckets to find it
  if (!bucketId) {
    const listResponse = await fetch(
      `${authData.apiUrl}/b2api/v2/b2_list_buckets`,
      {
        method: "POST",
        headers: {
          Authorization: authData.authorizationToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId: authData.accountId, bucketName: B2_BUCKET }),
      }
    );
    const bucketsData = await listResponse.json();
    const bucket = bucketsData.buckets?.find((b: { bucketName: string }) => b.bucketName === B2_BUCKET);
    if (bucket) bucketId = bucket.bucketId;
  }

  b2AuthCache = {
    apiUrl: authData.apiUrl,
    authorizationToken: authData.authorizationToken,
    downloadUrl: authData.downloadUrl,
    bucketId,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
  };

  return b2AuthCache;
}

/**
 * Callable function to upload files to B2.
 * Accepts base64-encoded file data and path.
 */
export const uploadToB2 = onCall(
  {
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated to upload files"
      );
    }

    if (!B2_KEY_ID || !B2_APP_KEY) {
      throw new HttpsError("internal", "B2 credentials not configured");
    }

    const { fileData, path: filePath, contentType = "application/octet-stream" } = request.data as {
      fileData: string;
      path: string;
      contentType?: string;
    };

    if (!fileData || !filePath) {
      throw new HttpsError("invalid-argument", "fileData and path are required");
    }

    try {
      // Decode base64 file data
      const buffer = Buffer.from(fileData, "base64");

      // Get B2 auth
      const auth = await getB2Auth();

      // Get upload URL
      const uploadUrlResponse = await fetch(
        `${auth.apiUrl}/b2api/v2/b2_get_upload_url`,
        {
          method: "POST",
          headers: {
            Authorization: auth.authorizationToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bucketId: auth.bucketId }),
        }
      );

      if (!uploadUrlResponse.ok) {
        throw new Error(`Failed to get upload URL: ${uploadUrlResponse.statusText}`);
      }

      const uploadData = await uploadUrlResponse.json();

      // Compute SHA1 hash
      const sha1 = crypto.createHash("sha1").update(buffer).digest("hex");

      // Upload file
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: "POST",
        headers: {
          Authorization: uploadData.authorizationToken,
          "Content-Type": contentType,
          "Content-Length": buffer.length.toString(),
          "X-Bz-File-Name": encodeURIComponent(filePath),
          "X-Bz-Content-Sha1": sha1,
        },
        body: new Uint8Array(buffer),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.statusText} - ${errorText}`);
      }

      const result = await uploadResponse.json();

      // Return the path (client will use getSignedUrls to get viewable URLs)
      return {
        url: `/api/files/${filePath}`,
        path: filePath,
        size: result.contentLength,
      };
    } catch (error) {
      console.error("Upload error:", error);
      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "Upload failed"
      );
    }
  }
);

/**
 * Callable function to delete a file from B2
 */
export const deleteFromB2 = onCall(
  {
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated to delete files"
      );
    }

    if (!B2_KEY_ID || !B2_APP_KEY) {
      throw new HttpsError("internal", "B2 credentials not configured");
    }

    const { path: filePath } = request.data as { path: string };

    if (!filePath) {
      throw new HttpsError("invalid-argument", "path is required");
    }

    try {
      const auth = await getB2Auth();

      // List file versions to get fileId
      const listResponse = await fetch(
        `${auth.apiUrl}/b2api/v2/b2_list_file_names`,
        {
          method: "POST",
          headers: {
            Authorization: auth.authorizationToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bucketId: auth.bucketId,
            prefix: filePath,
            maxFileCount: 1,
          }),
        }
      );

      if (!listResponse.ok) {
        throw new Error(`Failed to list files: ${listResponse.statusText}`);
      }

      const listData = await listResponse.json();
      const file = listData.files.find((f: { fileName: string }) => f.fileName === filePath);

      if (!file) {
        return { success: true, message: "File not found" };
      }

      // Delete file
      const deleteResponse = await fetch(
        `${auth.apiUrl}/b2api/v2/b2_delete_file_version`,
        {
          method: "POST",
          headers: {
            Authorization: auth.authorizationToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: filePath,
            fileId: file.fileId,
          }),
        }
      );

      if (!deleteResponse.ok) {
        throw new Error(`Delete failed: ${deleteResponse.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error("Delete error:", error);
      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "Delete failed"
      );
    }
  }
);

/**
 * Extract the container prefix from a file path.
 * e.g., "notes/abc123/moodboard/image1.jpg" -> "notes/abc123/moodboard/"
 *       "notes/abc123/music/song1.mp3" -> "notes/abc123/music/"
 */
function getContainerPrefix(filePath: string): string {
  const parts = filePath.split("/");
  // For paths like "notes/{id}/moodboard/{file}" or "notes/{id}/music/{file}"
  // Return "notes/{id}/moodboard/" or "notes/{id}/music/"
  if (parts.length >= 4) {
    return parts.slice(0, 3).join("/") + "/";
  }
  // For shorter paths, use the directory
  if (parts.length >= 2) {
    return parts.slice(0, parts.length - 1).join("/") + "/";
  }
  // Single file at root
  return "";
}

/**
 * Generate signed URLs for B2 files using B2's native download authorization.
 * Accepts an array of paths and returns authorized URLs valid for 1 hour.
 * Optimized to use prefix-based authorization (one auth per container).
 * Requires authentication.
 */
export const getSignedUrls = onCall(
  {
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated to get signed URLs"
      );
    }

    const { paths } = request.data as { paths: string[] };

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      throw new HttpsError("invalid-argument", "paths array is required");
    }

    // Limit batch size to prevent abuse
    if (paths.length > 100) {
      throw new HttpsError(
        "invalid-argument",
        "Maximum 100 paths per request"
      );
    }

    if (!B2_KEY_ID || !B2_APP_KEY) {
      throw new HttpsError("internal", "B2 credentials not configured");
    }

    try {
      // Get B2 auth (reuses cached auth if valid)
      const auth = await getB2Auth();

      const validDurationInSeconds = 3600; // 1 hour

      // Group paths by container prefix to minimize API calls
      // e.g., all moodboard images for a note share the same prefix
      const prefixToFiles = new Map<string, string[]>();
      for (const filePath of paths) {
        const prefix = getContainerPrefix(filePath);
        if (!prefixToFiles.has(prefix)) {
          prefixToFiles.set(prefix, []);
        }
        prefixToFiles.get(prefix)!.push(filePath);
      }

      // Cache for authorization tokens by prefix
      const prefixToToken = new Map<string, string>();

      // Fetch authorization tokens for each unique prefix (much fewer API calls)
      await Promise.all(
        Array.from(prefixToFiles.keys()).map(async (prefix) => {
          try {
            const authResponse = await fetch(
              `${auth.apiUrl}/b2api/v2/b2_get_download_authorization`,
              {
                method: "POST",
                headers: {
                  Authorization: auth.authorizationToken,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  bucketId: auth.bucketId,
                  fileNamePrefix: prefix,
                  validDurationInSeconds,
                }),
              }
            );

            if (!authResponse.ok) {
              console.error(`Failed to get download auth for prefix ${prefix}:`, await authResponse.text());
              return;
            }

            const authData = await authResponse.json();
            prefixToToken.set(prefix, authData.authorizationToken);
          } catch (error) {
            console.error(`Failed to get auth for prefix ${prefix}:`, error);
          }
        })
      );

      // Generate signed URLs using the cached prefix tokens
      const signedUrls: Record<string, string> = {};
      for (const filePath of paths) {
        const prefix = getContainerPrefix(filePath);
        const token = prefixToToken.get(prefix);
        if (token) {
          signedUrls[filePath] = `${auth.downloadUrl}/file/${B2_BUCKET}/${filePath}?Authorization=${token}`;
        }
      }

      console.log(`Generated ${Object.keys(signedUrls).length} signed URLs using ${prefixToToken.size} prefix auth calls (down from ${paths.length} individual calls)`);

      return {
        urls: signedUrls,
        expiresIn: validDurationInSeconds,
        expiresAt: Date.now() + validDurationInSeconds * 1000,
      };
    } catch (error) {
      console.error("Error generating signed URLs:", error);
      throw new HttpsError("internal", "Failed to generate signed URLs");
    }
  }
);
