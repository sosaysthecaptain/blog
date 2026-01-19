import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
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
 * HTTP endpoint for uploading files to B2.
 * Accepts multipart form data with 'file' and 'path' fields.
 */
export const uploadToB2 = onRequest(
  {
    memory: "512MiB",
    timeoutSeconds: 120,
    cors: true,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    if (!B2_KEY_ID || !B2_APP_KEY) {
      res.status(500).json({ error: "B2 credentials not configured" });
      return;
    }

    try {
      // Parse multipart form data
      const busboy = await import("busboy");
      const bb = busboy.default({ headers: req.headers });

      let fileBuffer: Buffer | null = null;
      let filePath = "";
      let contentType = "application/octet-stream";

      const parsePromise = new Promise<void>((resolve, reject) => {
        bb.on("file", (name: string, file: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
          const chunks: Buffer[] = [];
          file.on("data", (chunk: Buffer) => chunks.push(chunk));
          file.on("end", () => {
            fileBuffer = Buffer.concat(chunks);
            contentType = info.mimeType || "application/octet-stream";
          });
        });
        bb.on("field", (name: string, val: string) => {
          if (name === "path") filePath = val;
        });
        bb.on("finish", resolve);
        bb.on("error", reject);
      });

      req.pipe(bb);
      await parsePromise;

      if (!fileBuffer || !filePath) {
        res.status(400).json({ error: "Missing file or path" });
        return;
      }

      // Type assertion after null check
      const buffer = fileBuffer as Buffer;

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

      // Return public URL
      const publicUrl = `https://f005.backblazeb2.com/file/${B2_BUCKET}/${filePath}`;

      res.json({
        url: publicUrl,
        path: filePath,
        size: result.contentLength,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }
);

/**
 * Delete a file from B2
 */
export const deleteFromB2 = onRequest(
  {
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (req, res) => {
    if (req.method !== "DELETE" && req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    if (!B2_KEY_ID || !B2_APP_KEY) {
      res.status(500).json({ error: "B2 credentials not configured" });
      return;
    }

    try {
      const { path: filePath } = req.body;

      if (!filePath) {
        res.status(400).json({ error: "Missing path parameter" });
        return;
      }

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
        res.json({ success: true, message: "File not found" });
        return;
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

      res.json({ success: true });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Delete failed",
      });
    }
  }
);
