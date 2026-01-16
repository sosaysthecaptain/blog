import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "./firebase";
import { Song, createSong } from "./songs";
import * as musicMetadata from "music-metadata";

const ALBUM_ART_THUMB_SIZE = 200;

// Supported audio file types
export const SUPPORTED_AUDIO_TYPES = [
  "audio/mpeg",       // mp3
  "audio/mp4",        // m4a
  "audio/x-m4a",      // m4a alternate
  "audio/flac",       // flac
  "audio/x-flac",     // flac alternate
  "audio/wav",        // wav
  "audio/wave",       // wav alternate
  "audio/x-wav",      // wav alternate
  "audio/ogg",        // ogg
  "audio/vorbis",     // ogg alternate
];

export const SUPPORTED_EXTENSIONS = ["mp3", "m4a", "flac", "wav", "ogg"];

export function isAudioFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (
    SUPPORTED_AUDIO_TYPES.includes(file.type) ||
    SUPPORTED_EXTENSIONS.includes(ext || "")
  );
}

export function getFileExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() || "mp3";
}

/**
 * Extract audio metadata using music-metadata library
 */
export async function extractAudioMetadata(file: File): Promise<{
  title: string;
  artist: string;
  album: string;
  year: number | null;
  trackNumber: number | null;
  discNumber: number | null;
  totalTracksOnDisc: number | null;
  genre: string;
  duration: number;
  albumArt: Blob | null;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const metadata = await musicMetadata.parseBuffer(
      new Uint8Array(arrayBuffer),
      { mimeType: file.type || "audio/mpeg" }
    );

    const common = metadata.common;
    const format = metadata.format;

    // Extract album art if present
    let albumArt: Blob | null = null;
    if (common.picture && common.picture.length > 0) {
      const picture = common.picture[0];
      // Create a new Uint8Array copy to avoid TypeScript SharedArrayBuffer issues
      const artData = new Uint8Array(picture.data);
      albumArt = new Blob([artData], { type: picture.format });
    }

    return {
      title: common.title || file.name.replace(/\.[^/.]+$/, ""),
      artist: common.artist || "Unknown Artist",
      album: common.album || "Unknown Album",
      year: common.year || null,
      trackNumber: common.track?.no || null,
      discNumber: common.disk?.no || null,
      totalTracksOnDisc: common.track?.of || null,
      genre: common.genre?.[0] || "",
      duration: format.duration || 0,
      albumArt,
    };
  } catch (error) {
    console.error("Failed to extract metadata:", error);
    // Return defaults if metadata extraction fails
    return {
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Unknown Artist",
      album: "Unknown Album",
      year: null,
      trackNumber: null,
      discNumber: null,
      totalTracksOnDisc: null,
      genre: "",
      duration: 0,
      albumArt: null,
    };
  }
}

/**
 * Generate a thumbnail from album art
 */
async function generateAlbumArtThumbnail(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = ALBUM_ART_THUMB_SIZE;
      canvas.height = ALBUM_ART_THUMB_SIZE;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Draw image centered and cropped to square
      const size = Math.min(img.width, img.height);
      const x = (img.width - size) / 2;
      const y = (img.height - size) / 2;

      ctx.drawImage(
        img,
        x,
        y,
        size,
        size,
        0,
        0,
        ALBUM_ART_THUMB_SIZE,
        ALBUM_ART_THUMB_SIZE
      );

      canvas.toBlob(
        (thumbBlob) => {
          if (thumbBlob) {
            resolve(thumbBlob);
          } else {
            reject(new Error("Failed to generate thumbnail"));
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
 * Upload album art and generate thumbnail
 */
async function uploadAlbumArt(
  albumArt: Blob,
  libraryId: string,
  songId: string
): Promise<{ albumArtUrl: string; albumArtThumbUrl: string }> {
  // Upload original album art
  const artPath = `notes/${libraryId}/music/${songId}_art.webp`;
  const artRef = ref(storage, artPath);

  // Convert to webp if needed
  let artBlob = albumArt;
  if (!albumArt.type.includes("webp")) {
    try {
      const canvas = document.createElement("canvas");
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = URL.createObjectURL(albumArt);
      });
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const webpBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", 0.9)
        );
        if (webpBlob) artBlob = webpBlob;
      }
    } catch {
      // Keep original if conversion fails
    }
  }

  await uploadBytes(artRef, artBlob);
  const albumArtUrl = await getDownloadURL(artRef);

  // Generate and upload thumbnail
  const thumbBlob = await generateAlbumArtThumbnail(albumArt);
  const thumbPath = `notes/${libraryId}/music/${songId}_art_thumb.webp`;
  const thumbRef = ref(storage, thumbPath);
  await uploadBytes(thumbRef, thumbBlob);
  const albumArtThumbUrl = await getDownloadURL(thumbRef);

  return { albumArtUrl, albumArtThumbUrl };
}

/**
 * Upload a single audio file
 */
export async function uploadAudioFile(
  file: File,
  libraryId: string,
  onProgress?: (progress: number) => void
): Promise<Song> {
  const songId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const extension = getFileExtension(file);

  // Extract metadata
  onProgress?.(10);
  const metadata = await extractAudioMetadata(file);
  onProgress?.(30);

  // Upload audio file
  const storagePath = `notes/${libraryId}/music/${songId}.${extension}`;
  const audioRef = ref(storage, storagePath);
  await uploadBytes(audioRef, file);
  const storageUrl = await getDownloadURL(audioRef);
  onProgress?.(70);

  // Upload album art if present
  let albumArtUrl: string | null = null;
  let albumArtThumbUrl: string | null = null;

  if (metadata.albumArt) {
    try {
      const artUrls = await uploadAlbumArt(metadata.albumArt, libraryId, songId);
      albumArtUrl = artUrls.albumArtUrl;
      albumArtThumbUrl = artUrls.albumArtThumbUrl;
    } catch (error) {
      console.error("Failed to upload album art:", error);
    }
  }
  onProgress?.(90);

  // Create song document in Firestore
  const songData: Omit<Song, "id" | "dateAdded" | "createdAt" | "updatedAt"> = {
    libraryId,
    title: metadata.title,
    artist: metadata.artist,
    album: metadata.album,
    year: metadata.year,
    trackNumber: metadata.trackNumber, // Will be collapsed later if multi-disc
    discNumber: metadata.discNumber,
    originalTrackNumber: metadata.trackNumber,
    genre: metadata.genre,
    duration: metadata.duration,
    fileSize: file.size,
    albumArtUrl,
    albumArtThumbUrl,
    storageUrl,
    storagePath,
    fileName: file.name,
    fileType: extension,
  };

  const id = await createSong(songData);
  onProgress?.(100);

  return {
    id,
    ...songData,
  } as Song;
}

/**
 * Collapse disc numbers into continuous track numbers for a batch of songs
 * E.g., Disc 1 tracks 1-10, Disc 2 tracks 1-8 → tracks 1-18
 */
export function collapseDiscNumbers(songs: Song[]): Song[] {
  // Group songs by album
  const albumGroups = new Map<string, Song[]>();
  for (const song of songs) {
    const key = `${song.artist}|||${song.album}`;
    if (!albumGroups.has(key)) {
      albumGroups.set(key, []);
    }
    albumGroups.get(key)!.push(song);
  }

  const result: Song[] = [];

  for (const albumSongs of albumGroups.values()) {
    // Check if this album has multiple discs
    const discs = new Set(albumSongs.map(s => s.discNumber).filter(d => d != null));

    if (discs.size <= 1) {
      // Single disc or no disc info - just use track numbers as-is
      result.push(...albumSongs);
      continue;
    }

    // Multi-disc album - need to collapse
    // Sort by disc, then by track
    const sorted = [...albumSongs].sort((a, b) => {
      const discA = a.discNumber ?? 1;
      const discB = b.discNumber ?? 1;
      if (discA !== discB) return discA - discB;
      return (a.originalTrackNumber ?? 0) - (b.originalTrackNumber ?? 0);
    });

    // Find max track per disc
    const maxTrackPerDisc = new Map<number, number>();
    for (const song of sorted) {
      const disc = song.discNumber ?? 1;
      const track = song.originalTrackNumber ?? 0;
      if (!maxTrackPerDisc.has(disc) || track > maxTrackPerDisc.get(disc)!) {
        maxTrackPerDisc.set(disc, track);
      }
    }

    // Calculate offset for each disc
    const discOffsets = new Map<number, number>();
    const sortedDiscs = [...maxTrackPerDisc.keys()].sort((a, b) => a - b);
    let offset = 0;
    for (const disc of sortedDiscs) {
      discOffsets.set(disc, offset);
      offset += maxTrackPerDisc.get(disc) ?? 0;
    }

    // Apply collapsed track numbers
    for (const song of sorted) {
      const disc = song.discNumber ?? 1;
      const discOffset = discOffsets.get(disc) ?? 0;
      const newTrackNumber = (song.originalTrackNumber ?? 0) + discOffset;
      result.push({
        ...song,
        trackNumber: newTrackNumber > 0 ? newTrackNumber : null,
      });
    }
  }

  return result;
}

/**
 * Upload multiple audio files
 */
export async function uploadAudioFiles(
  files: File[],
  libraryId: string,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<Song[]> {
  const songs: Song[] = [];
  const audioFiles = files.filter(isAudioFile);

  for (let i = 0; i < audioFiles.length; i++) {
    const file = audioFiles[i];
    onProgress?.(i, audioFiles.length, file.name);

    try {
      const song = await uploadAudioFile(file, libraryId);
      songs.push(song);
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
    }
  }

  // Check for multi-disc albums and collapse track numbers
  const hasMultiDisc = songs.some(s => s.discNumber && s.discNumber > 1);
  if (hasMultiDisc) {
    const collapsedSongs = collapseDiscNumbers(songs);

    // Update songs in Firestore with collapsed track numbers
    const { updateSong } = await import("./songs");
    for (const song of collapsedSongs) {
      if (song.id) {
        const originalSong = songs.find(s => s.id === song.id);
        if (originalSong && originalSong.trackNumber !== song.trackNumber) {
          await updateSong(song.id, { trackNumber: song.trackNumber });
        }
      }
    }

    onProgress?.(audioFiles.length, audioFiles.length, "Complete");
    return collapsedSongs;
  }

  onProgress?.(audioFiles.length, audioFiles.length, "Complete");
  return songs;
}

/**
 * Delete a song's audio file and album art from storage
 */
export async function deleteSongFiles(
  storagePath: string,
  libraryId: string,
  songId: string
): Promise<void> {
  // Delete audio file
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (error) {
    console.error("Error deleting audio file:", error);
  }

  // Delete album art
  try {
    await deleteObject(ref(storage, `notes/${libraryId}/music/${songId}_art.webp`));
  } catch {
    // Album art might not exist
  }

  // Delete album art thumbnail
  try {
    await deleteObject(ref(storage, `notes/${libraryId}/music/${songId}_art_thumb.webp`));
  } catch {
    // Thumbnail might not exist
  }
}

/**
 * Delete all audio files for a music library
 */
export async function deleteAllMusicFiles(libraryId: string): Promise<void> {
  const listRef = ref(storage, `notes/${libraryId}/music`);
  try {
    const result = await listAll(listRef);
    await Promise.all(result.items.map((item) => deleteObject(item)));
  } catch (error) {
    console.error("Error deleting music files:", error);
  }
}

/**
 * Copy a song's files to another library
 */
export async function copySongFiles(
  sourceStoragePath: string,
  sourceSongId: string,
  sourceLibraryId: string,
  targetLibraryId: string
): Promise<{
  storagePath: string;
  storageUrl: string;
  albumArtUrl: string | null;
  albumArtThumbUrl: string | null;
}> {
  const newSongId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const extension = sourceStoragePath.split(".").pop() || "mp3";

  // Download and re-upload audio file
  const sourceAudioRef = ref(storage, sourceStoragePath);
  const sourceUrl = await getDownloadURL(sourceAudioRef);
  const response = await fetch(sourceUrl);
  const audioBlob = await response.blob();

  const newStoragePath = `notes/${targetLibraryId}/music/${newSongId}.${extension}`;
  const newAudioRef = ref(storage, newStoragePath);
  await uploadBytes(newAudioRef, audioBlob);
  const storageUrl = await getDownloadURL(newAudioRef);

  // Try to copy album art
  let albumArtUrl: string | null = null;
  let albumArtThumbUrl: string | null = null;

  try {
    const sourceArtRef = ref(storage, `notes/${sourceLibraryId}/music/${sourceSongId}_art.webp`);
    const artUrl = await getDownloadURL(sourceArtRef);
    const artResponse = await fetch(artUrl);
    const artBlob = await artResponse.blob();

    const newArtRef = ref(storage, `notes/${targetLibraryId}/music/${newSongId}_art.webp`);
    await uploadBytes(newArtRef, artBlob);
    albumArtUrl = await getDownloadURL(newArtRef);

    // Copy thumbnail
    const sourceThumbRef = ref(storage, `notes/${sourceLibraryId}/music/${sourceSongId}_art_thumb.webp`);
    const thumbUrl = await getDownloadURL(sourceThumbRef);
    const thumbResponse = await fetch(thumbUrl);
    const thumbBlob = await thumbResponse.blob();

    const newThumbRef = ref(storage, `notes/${targetLibraryId}/music/${newSongId}_art_thumb.webp`);
    await uploadBytes(newThumbRef, thumbBlob);
    albumArtThumbUrl = await getDownloadURL(newThumbRef);
  } catch {
    // Album art might not exist
  }

  return {
    storagePath: newStoragePath,
    storageUrl,
    albumArtUrl,
    albumArtThumbUrl,
  };
}

/**
 * Extract song ID from a storage path
 */
export function getSongIdFromPath(storagePath: string): string | null {
  // Path format: notes/{libraryId}/music/{songId}.{ext}
  const match = storagePath.match(/\/music\/([^.]+)\./);
  return match ? match[1] : null;
}

/**
 * Upload a recorded audio blob to the library
 * Used by the Radio Recorder feature
 */
export async function uploadRecordedAudio(
  blob: Blob,
  libraryId: string,
  metadata: {
    title: string;
    artist: string;
    album: string;
    year: string;
    genre: string;
    duration: number; // in milliseconds
  }
): Promise<Song> {
  const songId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const extension = "webm"; // Recordings are in webm format

  // Upload audio file
  const storagePath = `notes/${libraryId}/music/${songId}.${extension}`;
  const audioRef = ref(storage, storagePath);
  await uploadBytes(audioRef, blob);
  const storageUrl = await getDownloadURL(audioRef);

  // Create song document in Firestore
  const songData: Omit<Song, "id" | "dateAdded" | "createdAt" | "updatedAt"> = {
    libraryId,
    title: metadata.title || "Untitled Recording",
    artist: metadata.artist || "Unknown Artist",
    album: metadata.album || "",
    year: metadata.year ? parseInt(metadata.year, 10) : null,
    trackNumber: null,
    discNumber: null,
    originalTrackNumber: null,
    genre: metadata.genre || "",
    duration: metadata.duration / 1000, // Convert to seconds
    fileSize: blob.size,
    albumArtUrl: null,
    albumArtThumbUrl: null,
    storageUrl,
    storagePath,
    fileName: `${metadata.title || "recording"}.${extension}`,
    fileType: extension,
  };

  const id = await createSong(songData);

  return {
    id,
    ...songData,
  } as Song;
}
