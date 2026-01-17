"use client";

import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { LocalCache } from "./local-cache";
import { Song } from "./songs";
import { NoteItem } from "./notes";

const SONGS_COLLECTION = "songs";
const NOTES_COLLECTION = "notes";

// Track active subscriptions for cleanup
let songsUnsubscribe: (() => void) | null = null;
let notesUnsubscribe: (() => void) | null = null;
let isInitialized = false;

// Callbacks for notifying components of updates
type SongsCallback = (libraryId: string, songs: Song[]) => void;
type NotesCallback = (notes: NoteItem[]) => void;

const songsCallbacks: Map<string, Set<SongsCallback>> = new Map();
const notesCallbacks: Set<NotesCallback> = new Set();

/**
 * Initialize the cache and start syncing from Firestore
 * Call this once at app startup (e.g., in a top-level useEffect)
 */
export async function initCacheSync(): Promise<void> {
  if (isInitialized) {
    console.log("[CacheSync] Already initialized");
    return;
  }

  console.log("[CacheSync] Starting initialization...");

  // Initialize SQLite cache
  const cache = await LocalCache.init();

  // Check if we have persisted data
  const stats = cache.getStats();
  console.log(`[CacheSync] Cache stats: ${stats.songs} songs, ${stats.notes} notes`);

  // If cache is empty, do initial fetch from Firestore
  if (stats.notes === 0) {
    console.log("[CacheSync] Cache empty, doing initial sync...");
    await initialSync(cache);
  }

  // Set up real-time listeners
  setupNotesListener(cache);
  // Songs listeners are set up per-library when needed

  isInitialized = true;
  console.log("[CacheSync] Initialization complete");
}

/**
 * Initial sync - fetch all data from Firestore
 */
async function initialSync(cache: LocalCache): Promise<void> {
  console.log("[CacheSync] Fetching notes from Firestore...");

  // Fetch all notes
  const notesSnapshot = await getDocs(collection(db, NOTES_COLLECTION));
  const notes = notesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as NoteItem[];

  cache.upsertNotes(notes);
  console.log(`[CacheSync] Synced ${notes.length} notes`);

  // Persist to IndexedDB
  await cache.persist();
}

/**
 * Set up real-time listener for notes collection
 */
function setupNotesListener(cache: LocalCache): void {
  if (notesUnsubscribe) {
    notesUnsubscribe();
  }

  notesUnsubscribe = onSnapshot(
    collection(db, NOTES_COLLECTION),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const note = { id: change.doc.id, ...change.doc.data() } as NoteItem;

        if (change.type === "added" || change.type === "modified") {
          cache.upsertNote(note);
        } else if (change.type === "removed") {
          cache.deleteNote(change.doc.id);
        }
      });

      // Notify all notes callbacks
      const allNotes = cache.getAllNotes();
      notesCallbacks.forEach((callback) => callback(allNotes));

      // Persist changes (debounced would be better, but this works)
      cache.persist().catch(console.error);
    },
    (error) => {
      console.error("[CacheSync] Notes listener error:", error);
    }
  );
}

/**
 * Set up real-time listener for songs in a specific library
 */
export function setupSongsListener(libraryId: string): () => void {
  if (!LocalCache.isInitialized()) {
    console.warn("[CacheSync] Cache not initialized, cannot set up songs listener");
    return () => {};
  }

  const cache = LocalCache.getInstance();

  const q = query(
    collection(db, SONGS_COLLECTION),
    where("libraryId", "==", libraryId)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const song = { id: change.doc.id, ...change.doc.data() } as Song;

        if (change.type === "added" || change.type === "modified") {
          cache.upsertSong(song);
        } else if (change.type === "removed") {
          cache.deleteSong(change.doc.id);
        }
      });

      // Notify callbacks for this library
      const songs = cache.getSongsByLibrary(libraryId);
      const callbacks = songsCallbacks.get(libraryId);
      if (callbacks) {
        callbacks.forEach((callback) => callback(libraryId, songs));
      }

      // Persist changes
      cache.persist().catch(console.error);
    },
    (error) => {
      console.error(`[CacheSync] Songs listener error for ${libraryId}:`, error);
    }
  );

  return unsubscribe;
}

/**
 * Sync songs for a library (initial fetch + listener)
 */
export async function syncLibrarySongs(libraryId: string): Promise<Song[]> {
  const cache = await LocalCache.init();

  // Check if we have songs for this library
  let songs = cache.getSongsByLibrary(libraryId);

  if (songs.length === 0) {
    // Fetch from Firestore
    console.log(`[CacheSync] Fetching songs for library ${libraryId}...`);
    const q = query(
      collection(db, SONGS_COLLECTION),
      where("libraryId", "==", libraryId)
    );
    const snapshot = await getDocs(q);
    songs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Song[];

    cache.upsertSongs(songs);
    await cache.persist();
    console.log(`[CacheSync] Synced ${songs.length} songs for library ${libraryId}`);
  }

  return songs;
}

// ============================================
// Subscription API for components
// ============================================

/**
 * Subscribe to songs updates for a library
 * Returns unsubscribe function
 */
export function subscribeToCachedSongs(
  libraryId: string,
  callback: (songs: Song[]) => void
): () => void {
  // Add callback to the set for this library
  if (!songsCallbacks.has(libraryId)) {
    songsCallbacks.set(libraryId, new Set());
  }
  const callbackWrapper: SongsCallback = (libId, songs) => {
    if (libId === libraryId) callback(songs);
  };
  songsCallbacks.get(libraryId)!.add(callbackWrapper);

  // Immediately call with current data if cache is initialized
  if (LocalCache.isInitialized()) {
    const cache = LocalCache.getInstance();
    const songs = cache.getSongsByLibrary(libraryId);
    callback(songs);
  }

  // Return unsubscribe function
  return () => {
    const callbacks = songsCallbacks.get(libraryId);
    if (callbacks) {
      callbacks.delete(callbackWrapper);
      if (callbacks.size === 0) {
        songsCallbacks.delete(libraryId);
      }
    }
  };
}

/**
 * Subscribe to notes updates
 * Returns unsubscribe function
 */
export function subscribeToCachedNotes(
  callback: (notes: NoteItem[]) => void
): () => void {
  notesCallbacks.add(callback);

  // Immediately call with current data if cache is initialized
  if (LocalCache.isInitialized()) {
    const cache = LocalCache.getInstance();
    const notes = cache.getAllNotes();
    callback(notes);
  }

  return () => {
    notesCallbacks.delete(callback);
  };
}

// ============================================
// Write-through helpers
// ============================================

/**
 * Mirror a song write to the local cache
 * Call this after successfully writing to Firestore
 */
export function mirrorSongToCache(song: Song): void {
  if (!LocalCache.isInitialized()) return;
  const cache = LocalCache.getInstance();
  cache.upsertSong(song);
}

/**
 * Mirror a song deletion to the local cache
 */
export function mirrorSongDeletionToCache(songId: string): void {
  if (!LocalCache.isInitialized()) return;
  const cache = LocalCache.getInstance();
  cache.deleteSong(songId);
}

/**
 * Mirror a note write to the local cache
 */
export function mirrorNoteToCache(note: NoteItem): void {
  if (!LocalCache.isInitialized()) return;
  const cache = LocalCache.getInstance();
  cache.upsertNote(note);
}

/**
 * Mirror a note deletion to the local cache
 */
export function mirrorNoteDeletionToCache(noteId: string): void {
  if (!LocalCache.isInitialized()) return;
  const cache = LocalCache.getInstance();
  cache.deleteNote(noteId);
}

// ============================================
// Cleanup
// ============================================

/**
 * Clean up all listeners (call on app unmount)
 */
export function cleanupCacheSync(): void {
  if (songsUnsubscribe) {
    songsUnsubscribe();
    songsUnsubscribe = null;
  }
  if (notesUnsubscribe) {
    notesUnsubscribe();
    notesUnsubscribe = null;
  }
  songsCallbacks.clear();
  notesCallbacks.clear();
  isInitialized = false;
  console.log("[CacheSync] Cleaned up");
}
