"use client";

import type { Database } from "sql.js";
import { Song } from "./songs";
import { NoteItem, MoodboardImage } from "./notes";
import { Timestamp } from "firebase/firestore";

// Dynamic import of sql.js to avoid SSR issues
async function loadSqlJs() {
  const initSqlJs = (await import("sql.js")).default;
  return initSqlJs;
}

// Singleton instance
let cacheInstance: LocalCache | null = null;
let initPromise: Promise<LocalCache> | null = null;

/**
 * LocalCache - SQLite-based local cache for instant reads
 *
 * Architecture:
 * - Writes: React → Firestore (direct) → LocalCache (mirror)
 * - Reads: React → LocalCache (instant)
 * - Sync: Firestore onSnapshot → LocalCache (background)
 */
export class LocalCache {
  private db: Database;
  private initialized = false;

  private constructor(db: Database) {
    this.db = db;
  }

  /**
   * Initialize the cache - call once at app startup
   */
  static async init(): Promise<LocalCache> {
    if (cacheInstance) return cacheInstance;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      console.log("[LocalCache] Initializing SQLite...");

      // Load sql.js WASM dynamically
      const initSqlJs = await loadSqlJs();
      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
      });

      // Try to load persisted database from IndexedDB
      let data: Uint8Array | null = null;
      try {
        data = await loadFromIndexedDB();
        if (data) {
          console.log("[LocalCache] Loaded persisted database from IndexedDB");
        }
      } catch (e) {
        console.warn("[LocalCache] Failed to load from IndexedDB:", e);
      }

      // Create database (from persisted data or fresh)
      const db = data ? new SQL.Database(data) : new SQL.Database();

      cacheInstance = new LocalCache(db);
      cacheInstance.createTables();
      cacheInstance.initialized = true;

      console.log("[LocalCache] SQLite ready");
      return cacheInstance;
    })();

    return initPromise;
  }

  /**
   * Get the singleton instance (throws if not initialized)
   */
  static getInstance(): LocalCache {
    if (!cacheInstance) {
      throw new Error("LocalCache not initialized. Call LocalCache.init() first.");
    }
    return cacheInstance;
  }

  /**
   * Check if cache is initialized
   */
  static isInitialized(): boolean {
    return cacheInstance !== null && cacheInstance.initialized;
  }

  /**
   * Create database tables
   */
  private createTables() {
    // Songs table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        libraryId TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT NOT NULL,
        year INTEGER,
        trackNumber INTEGER,
        discNumber INTEGER,
        originalTrackNumber INTEGER,
        genre TEXT NOT NULL,
        duration REAL NOT NULL,
        fileSize INTEGER NOT NULL,
        albumArtUrl TEXT,
        albumArtThumbUrl TEXT,
        storageUrl TEXT NOT NULL,
        storagePath TEXT NOT NULL,
        fileName TEXT NOT NULL,
        fileType TEXT NOT NULL,
        dateAdded INTEGER NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )
    `);

    // Create index for library queries
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_songs_library ON songs(libraryId)
    `);

    // Notes table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        parentId TEXT,
        content TEXT,
        date TEXT,
        time TEXT,
        tags TEXT,
        images TEXT,
        gridSize TEXT,
        sortMode TEXT,
        musicSortColumn TEXT,
        musicSortDirection TEXT,
        published INTEGER,
        slug TEXT,
        sortOrder INTEGER,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )
    `);

    // Create index for parent queries
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_notes_parent ON notes(parentId)
    `);

    console.log("[LocalCache] Tables created");
  }

  /**
   * Persist database to IndexedDB
   */
  async persist(): Promise<void> {
    const data = this.db.export();
    await saveToIndexedDB(data);
    console.log("[LocalCache] Persisted to IndexedDB");
  }

  // ============================================
  // SONGS METHODS
  // ============================================

  /**
   * Get all songs for a library (instant local read)
   */
  getSongsByLibrary(libraryId: string): Song[] {
    const stmt = this.db.prepare(
      "SELECT * FROM songs WHERE libraryId = ?"
    );
    stmt.bind([libraryId]);

    const songs: Song[] = [];
    while (stmt.step()) {
      songs.push(this.rowToSong(stmt.getAsObject()));
    }
    stmt.free();
    return songs;
  }

  /**
   * Get a single song by ID
   */
  getSongById(id: string): Song | null {
    const stmt = this.db.prepare("SELECT * FROM songs WHERE id = ?");
    stmt.bind([id]);

    if (stmt.step()) {
      const song = this.rowToSong(stmt.getAsObject());
      stmt.free();
      return song;
    }
    stmt.free();
    return null;
  }

  /**
   * Upsert a song (insert or replace)
   */
  upsertSong(song: Song): void {
    if (!song.id) return;

    this.db.run(`
      INSERT OR REPLACE INTO songs (
        id, libraryId, title, artist, album, year, trackNumber,
        discNumber, originalTrackNumber, genre, duration, fileSize,
        albumArtUrl, albumArtThumbUrl, storageUrl, storagePath,
        fileName, fileType, dateAdded, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      song.id,
      song.libraryId || "",
      song.title || "",
      song.artist || "",
      song.album || "",
      song.year ?? null,
      song.trackNumber ?? null,
      song.discNumber ?? null,
      song.originalTrackNumber ?? null,
      song.genre || "",
      song.duration || 0,
      song.fileSize || 0,
      song.albumArtUrl ?? null,
      song.albumArtThumbUrl ?? null,
      song.storageUrl || "",
      song.storagePath || "",
      song.fileName || "",
      song.fileType || "",
      timestampToMillis(song.dateAdded),
      timestampToMillis(song.createdAt),
      timestampToMillis(song.updatedAt),
    ]);
  }

  /**
   * Bulk upsert songs (for initial sync)
   */
  upsertSongs(songs: Song[]): void {
    this.db.run("BEGIN TRANSACTION");
    try {
      for (const song of songs) {
        this.upsertSong(song);
      }
      this.db.run("COMMIT");
    } catch (e) {
      this.db.run("ROLLBACK");
      throw e;
    }
  }

  /**
   * Delete a song
   */
  deleteSong(id: string): void {
    this.db.run("DELETE FROM songs WHERE id = ?", [id]);
  }

  /**
   * Delete all songs in a library
   */
  deleteSongsByLibrary(libraryId: string): void {
    this.db.run("DELETE FROM songs WHERE libraryId = ?", [libraryId]);
  }

  /**
   * Convert SQLite row to Song object
   */
  private rowToSong(row: Record<string, unknown>): Song {
    return {
      id: row.id as string,
      libraryId: row.libraryId as string,
      title: row.title as string,
      artist: row.artist as string,
      album: row.album as string,
      year: row.year as number | null,
      trackNumber: row.trackNumber as number | null,
      discNumber: row.discNumber as number | null,
      originalTrackNumber: row.originalTrackNumber as number | null,
      genre: row.genre as string,
      duration: row.duration as number,
      fileSize: row.fileSize as number,
      albumArtUrl: row.albumArtUrl as string | null,
      albumArtThumbUrl: row.albumArtThumbUrl as string | null,
      storageUrl: row.storageUrl as string,
      storagePath: row.storagePath as string,
      fileName: row.fileName as string,
      fileType: row.fileType as string,
      dateAdded: millisToTimestamp(row.dateAdded as number),
      createdAt: millisToTimestamp(row.createdAt as number),
      updatedAt: millisToTimestamp(row.updatedAt as number),
    };
  }

  // ============================================
  // NOTES METHODS
  // ============================================

  /**
   * Get all notes (instant local read)
   */
  getAllNotes(): NoteItem[] {
    const stmt = this.db.prepare("SELECT * FROM notes ORDER BY sortOrder ASC, title COLLATE NOCASE ASC");

    const notes: NoteItem[] = [];
    while (stmt.step()) {
      notes.push(this.rowToNote(stmt.getAsObject()));
    }
    stmt.free();
    return notes;
  }

  /**
   * Get notes by parent ID
   */
  getNotesByParent(parentId: string | null): NoteItem[] {
    const stmt = this.db.prepare(
      parentId === null
        ? "SELECT * FROM notes WHERE parentId IS NULL ORDER BY sortOrder ASC, title COLLATE NOCASE ASC"
        : "SELECT * FROM notes WHERE parentId = ? ORDER BY sortOrder ASC, title COLLATE NOCASE ASC"
    );
    if (parentId !== null) {
      stmt.bind([parentId]);
    }

    const notes: NoteItem[] = [];
    while (stmt.step()) {
      notes.push(this.rowToNote(stmt.getAsObject()));
    }
    stmt.free();
    return notes;
  }

  /**
   * Get a single note by ID
   */
  getNoteById(id: string): NoteItem | null {
    const stmt = this.db.prepare("SELECT * FROM notes WHERE id = ?");
    stmt.bind([id]);

    if (stmt.step()) {
      const note = this.rowToNote(stmt.getAsObject());
      stmt.free();
      return note;
    }
    stmt.free();
    return null;
  }

  /**
   * Upsert a note (insert or replace)
   */
  upsertNote(note: NoteItem): void {
    if (!note.id) return;

    this.db.run(`
      INSERT OR REPLACE INTO notes (
        id, type, title, parentId, content, date, time, tags,
        images, gridSize, sortMode, musicSortColumn, musicSortDirection,
        published, slug, sortOrder, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      note.id,
      note.type || "note",
      note.title || "",
      note.parentId ?? null,
      note.content ?? null,
      note.date ?? null,
      note.time ?? null,
      note.tags ? JSON.stringify(note.tags) : null,
      note.images ? JSON.stringify(note.images) : null,
      note.gridSize ?? null,
      note.sortMode ?? null,
      note.musicSortColumn ?? null,
      note.musicSortDirection ?? null,
      note.published ? 1 : 0,
      note.slug ?? null,
      note.sortOrder ?? null,
      timestampToMillis(note.createdAt),
      timestampToMillis(note.updatedAt),
    ]);
  }

  /**
   * Bulk upsert notes (for initial sync)
   */
  upsertNotes(notes: NoteItem[]): void {
    this.db.run("BEGIN TRANSACTION");
    try {
      for (const note of notes) {
        this.upsertNote(note);
      }
      this.db.run("COMMIT");
    } catch (e) {
      this.db.run("ROLLBACK");
      throw e;
    }
  }

  /**
   * Delete a note
   */
  deleteNote(id: string): void {
    this.db.run("DELETE FROM notes WHERE id = ?", [id]);
  }

  /**
   * Convert SQLite row to NoteItem object
   */
  private rowToNote(row: Record<string, unknown>): NoteItem {
    return {
      id: row.id as string,
      type: row.type as NoteItem["type"],
      title: row.title as string,
      parentId: row.parentId as string | null,
      content: row.content as string | undefined,
      date: row.date as string | undefined,
      time: row.time as string | null | undefined,
      tags: row.tags ? JSON.parse(row.tags as string) : undefined,
      images: row.images ? JSON.parse(row.images as string) : undefined,
      gridSize: row.gridSize as NoteItem["gridSize"],
      sortMode: row.sortMode as NoteItem["sortMode"],
      musicSortColumn: row.musicSortColumn as NoteItem["musicSortColumn"],
      musicSortDirection: row.musicSortDirection as NoteItem["musicSortDirection"],
      published: row.published === 1,
      slug: row.slug as string | undefined,
      sortOrder: row.sortOrder as number | undefined,
      createdAt: millisToTimestamp(row.createdAt as number),
      updatedAt: millisToTimestamp(row.updatedAt as number),
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Clear all data (for testing/reset)
   */
  clear(): void {
    this.db.run("DELETE FROM songs");
    this.db.run("DELETE FROM notes");
    console.log("[LocalCache] Cleared all data");
  }

  /**
   * Get cache stats
   */
  getStats(): { songs: number; notes: number } {
    const songsResult = this.db.exec("SELECT COUNT(*) FROM songs");
    const notesResult = this.db.exec("SELECT COUNT(*) FROM notes");

    return {
      songs: songsResult[0]?.values[0]?.[0] as number || 0,
      notes: notesResult[0]?.values[0]?.[0] as number || 0,
    };
  }
}

// ============================================
// IndexedDB persistence helpers
// ============================================

const DB_NAME = "dirigible-cache";
const STORE_NAME = "sqlite";
const DB_KEY = "database";

async function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(data, DB_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(DB_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// ============================================
// Timestamp conversion helpers
// ============================================

function timestampToMillis(ts: Timestamp | undefined): number {
  if (!ts) return Date.now();
  if (typeof ts.toMillis === "function") return ts.toMillis();
  // Handle plain object from Firestore
  if (ts && typeof ts === "object" && "seconds" in ts) {
    return (ts as { seconds: number; nanoseconds: number }).seconds * 1000;
  }
  return Date.now();
}

function millisToTimestamp(millis: number): Timestamp {
  return Timestamp.fromMillis(millis);
}
