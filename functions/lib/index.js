"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifyAudio = exports.regenerateMoodboardThumbnails = exports.generateMoodboardThumbnail = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const sharp_1 = __importDefault(require("sharp"));
const path = __importStar(require("path"));
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
exports.generateMoodboardThumbnail = (0, storage_1.onObjectFinalized)({
    memory: "512MiB",
    timeoutSeconds: 120,
}, async (event) => {
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
        const metadata = await (0, sharp_1.default)(imageBuffer).metadata();
        const originalWidth = metadata.width || 0;
        const originalHeight = metadata.height || 0;
        // Generate thumbnail using sharp
        // Resize to THUMBNAIL_WIDTH, maintaining aspect ratio
        // Convert to WebP for better compression
        const thumbnailBuffer = await (0, sharp_1.default)(imageBuffer)
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
                const updatedImages = data.images.map((img) => {
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
    }
    catch (error) {
        console.error("Error generating thumbnail:", error);
        throw error;
    }
});
/**
 * HTTP function to manually regenerate thumbnails for a moodboard.
 * Useful for fixing missing thumbnails or regenerating after changing sizes.
 */
exports.regenerateMoodboardThumbnails = (0, https_1.onCall)({
    memory: "512MiB",
    timeoutSeconds: 300,
}, async (request) => {
    // Check authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be authenticated to regenerate thumbnails");
    }
    const { noteId } = request.data;
    if (!noteId) {
        throw new https_1.HttpsError("invalid-argument", "noteId is required");
    }
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({
        prefix: `notes/${noteId}/moodboard/`,
    });
    const originalFiles = files.filter((f) => !f.name.includes(THUMBNAIL_SUFFIX) && !f.name.endsWith("/"));
    console.log(`Found ${originalFiles.length} original images to process`);
    let processed = 0;
    let errors = 0;
    for (const file of originalFiles) {
        try {
            // Download and process
            const [imageBuffer] = await file.download();
            const thumbnailBuffer = await (0, sharp_1.default)(imageBuffer)
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
        }
        catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            errors++;
        }
    }
    return { processed, errors, total: originalFiles.length };
});
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
exports.identifyAudio = (0, https_1.onCall)({
    memory: "1GiB",
    timeoutSeconds: 120,
}, async (request) => {
    // Check authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be authenticated to identify audio");
    }
    const { storagePath } = request.data;
    if (!storagePath) {
        throw new https_1.HttpsError("invalid-argument", "storagePath is required");
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
            throw new https_1.HttpsError("not-found", "Audio file not found");
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
    }
    catch (error) {
        console.error("Error identifying audio:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "Failed to identify audio");
    }
});
//# sourceMappingURL=index.js.map