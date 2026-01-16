import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

const SONGS_COLLECTION = "songs";

export interface Song {
  id?: string;
  libraryId: string;           // Parent music library NoteItem ID
  title: string;
  artist: string;
  album: string;
  year: number | null;
  trackNumber: number | null;  // For manual ordering (collapsed from disc+track)
  discNumber: number | null;   // Original disc number from metadata
  originalTrackNumber: number | null; // Original track number before disc collapse
  genre: string;
  duration: number;            // Seconds
  fileSize: number;            // Bytes
  albumArtUrl: string | null;
  albumArtThumbUrl: string | null;
  storageUrl: string;          // Audio file URL
  storagePath: string;         // For deletion
  fileName: string;
  fileType: string;            // mp3, m4a, flac, wav, ogg
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Get all songs in a music library
export async function getSongsByLibrary(libraryId: string): Promise<Song[]> {
  const q = query(
    collection(db, SONGS_COLLECTION),
    where("libraryId", "==", libraryId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Song[];
}

// Subscribe to real-time updates for songs in a library
export function subscribeToSongs(
  libraryId: string,
  callback: (songs: Song[]) => void
): () => void {
  const q = query(
    collection(db, SONGS_COLLECTION),
    where("libraryId", "==", libraryId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const songs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Song[];
      callback(songs);
    },
    (error) => {
      console.error("Error subscribing to songs:", error);
      callback([]);
    }
  );
}

// Get a single song by ID
export async function getSongById(id: string): Promise<Song | null> {
  const docRef = doc(db, SONGS_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Song;
}

// Create a new song
export async function createSong(
  song: Omit<Song, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, SONGS_COLLECTION), {
    ...song,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// Update an existing song
export async function updateSong(
  id: string,
  updates: Partial<Omit<Song, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, SONGS_COLLECTION, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// Delete a song
export async function deleteSong(id: string): Promise<void> {
  const docRef = doc(db, SONGS_COLLECTION, id);
  await deleteDoc(docRef);
}

// Delete all songs in a library (for when library is deleted)
export async function deleteSongsByLibrary(libraryId: string): Promise<void> {
  const songs = await getSongsByLibrary(libraryId);
  const batch = writeBatch(db);

  for (const song of songs) {
    if (song.id) {
      const docRef = doc(db, SONGS_COLLECTION, song.id);
      batch.delete(docRef);
    }
  }

  await batch.commit();
}

// Batch update track numbers for multiple songs
export async function updateTrackNumbers(
  updates: Array<{ id: string; trackNumber: number }>
): Promise<void> {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  for (const { id, trackNumber } of updates) {
    const docRef = doc(db, SONGS_COLLECTION, id);
    batch.update(docRef, { trackNumber, updatedAt: now });
  }

  await batch.commit();
}

// Copy a song to another library
export async function copySong(
  songId: string,
  targetLibraryId: string,
  newStorageUrl: string,
  newStoragePath: string,
  newAlbumArtUrl?: string | null,
  newAlbumArtThumbUrl?: string | null
): Promise<string> {
  const song = await getSongById(songId);
  if (!song) throw new Error("Song not found");

  const { id, createdAt, updatedAt, ...songData } = song;
  return createSong({
    ...songData,
    libraryId: targetLibraryId,
    storageUrl: newStorageUrl,
    storagePath: newStoragePath,
    albumArtUrl: newAlbumArtUrl ?? song.albumArtUrl,
    albumArtThumbUrl: newAlbumArtThumbUrl ?? song.albumArtThumbUrl,
    trackNumber: null, // Reset track number in new library
  });
}

// Search songs within a library
export function searchSongs(songs: Song[], queryStr: string): Song[] {
  const q = queryStr.toLowerCase().trim();
  if (!q) return [];

  return songs
    .map((song) => ({
      song,
      score: getSearchScore(song, q),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.song);
}

function getSearchScore(song: Song, query: string): number {
  // Priority: title (3) > album (2) > artist (1)
  if (song.title.toLowerCase().includes(query)) return 3;
  if (song.album.toLowerCase().includes(query)) return 2;
  if (song.artist.toLowerCase().includes(query)) return 1;
  return 0;
}

// Sort songs by column with secondary sort
export function sortSongs(
  songs: Song[],
  column: "title" | "artist" | "album" | "year" | "trackNumber" | "duration" | "genre" | "fileSize",
  direction: "asc" | "desc"
): Song[] {
  const sorted = [...songs].sort((a, b) => {
    let result = 0;

    switch (column) {
      case "title":
        result = a.title.localeCompare(b.title);
        break;
      case "artist":
        // Artist sorts secondarily by album, then track number
        result = a.artist.localeCompare(b.artist);
        if (result === 0) result = a.album.localeCompare(b.album);
        if (result === 0) result = (a.trackNumber ?? 999) - (b.trackNumber ?? 999);
        break;
      case "album":
        // Album sorts secondarily by track number
        result = a.album.localeCompare(b.album);
        if (result === 0) result = (a.trackNumber ?? 999) - (b.trackNumber ?? 999);
        break;
      case "year":
        result = (a.year ?? 0) - (b.year ?? 0);
        break;
      case "trackNumber":
        result = (a.trackNumber ?? 999) - (b.trackNumber ?? 999);
        break;
      case "duration":
        result = a.duration - b.duration;
        break;
      case "genre":
        result = a.genre.localeCompare(b.genre);
        break;
      case "fileSize":
        result = a.fileSize - b.fileSize;
        break;
    }

    return direction === "desc" ? -result : result;
  });

  return sorted;
}

// Format duration as "m:ss" or "h:mm:ss"
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Format total duration as "Xh Ym" or "Xm"
export function formatTotalDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

// Format file size as "X MB" or "X KB"
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

// Calculate library stats
export function getLibraryStats(songs: Song[]): {
  count: number;
  totalDuration: string;
  totalSize: string;
} {
  const totalSeconds = songs.reduce((sum, song) => sum + song.duration, 0);
  const totalBytes = songs.reduce((sum, song) => sum + song.fileSize, 0);

  return {
    count: songs.length,
    totalDuration: formatTotalDuration(totalSeconds),
    totalSize: formatFileSize(totalBytes),
  };
}

// Get download URL for a song's audio file
export async function getSongAudioUrl(storagePath: string): Promise<string | null> {
  try {
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Failed to get audio URL:", error);
    return null;
  }
}
