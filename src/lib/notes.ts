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
} from "firebase/firestore";
import { db } from "./firebase";

const NOTES_COLLECTION = "notes";

export interface MoodboardImage {
  id: string;           // Unique ID within moodboard
  url: string;          // Original image URL (Firebase Storage)
  thumbnailUrl?: string; // Generated thumbnail URL
  caption?: string;
  source?: string;      // Attribution/reference URL
  width: number;        // Original dimensions (for masonry layout)
  height: number;
  fileSize: number;     // File size in bytes
  order: number;        // For manual ordering
  createdAt: Timestamp; // When image was added
}

export interface EmbeddedMedia {
  id: string;           // Unique ID
  url: string;          // Storage URL (B2 proxy path)
  path: string;         // B2 storage path for deletion
  type: "image" | "file";
  filename?: string;    // Original filename for files
  fileSize: number;     // File size in bytes
}

export interface EditorDisplayPrefs {
  wordWrap: boolean;
  font: "mono" | "serif" | "sans";
  fontSize?: "xs" | "sm" | "base" | "lg" | "xl"; // Relative size steps
  showMarkdownSyntax: boolean;
}

export interface NoteItem {
  id?: string;
  type: "note" | "folder" | "moodboard" | "music";
  title: string;
  parentId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Note-specific fields
  content?: string;
  date?: string;
  time?: string | null; // HH:MM format, optional
  tags?: string[];
  embeddedMedia?: EmbeddedMedia[]; // Track images/files for size calculation and cleanup
  displayPrefs?: EditorDisplayPrefs; // Editor display preferences (font, word wrap, etc.)

  // Moodboard-specific fields
  images?: MoodboardImage[];
  gridSize?: "small" | "medium" | "large"; // User preference for grid density
  sortMode?: "chronological" | "manual"; // How images are sorted/displayed

  // Music library-specific fields
  musicSortColumn?: "title" | "artist" | "album" | "year" | "trackNumber" | "duration" | "fileSize";
  musicSortDirection?: "asc" | "desc";

  // Publishing fields (for blog folder)
  published?: boolean;
  slug?: string;

  // Sort order for manual reordering (lower = earlier)
  sortOrder?: number;
}

// Get all notes and folders
export async function getAllNotes(): Promise<NoteItem[]> {
  const snapshot = await getDocs(collection(db, NOTES_COLLECTION));
  const notes = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as NoteItem[];
  // Sort by sortOrder first (if present), then by createdAt
  return notes.sort((a, b) => {
    // Items with sortOrder come first, sorted by sortOrder
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder;
    }
    if (a.sortOrder !== undefined) return -1;
    if (b.sortOrder !== undefined) return 1;
    // Fall back to createdAt
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return aTime - bTime;
  });
}

// Batch update sort orders for multiple items
export async function updateSortOrders(
  updates: Array<{ id: string; sortOrder: number }>
): Promise<void> {
  const { writeBatch } = await import("firebase/firestore");
  const batch = writeBatch(db);

  for (const { id, sortOrder } of updates) {
    const docRef = doc(db, NOTES_COLLECTION, id);
    batch.update(docRef, { sortOrder, updatedAt: Timestamp.now() });
  }

  await batch.commit();
}

// Get notes/folders by parent ID
export async function getNotesByParent(
  parentId: string | null
): Promise<NoteItem[]> {
  const q = query(
    collection(db, NOTES_COLLECTION),
    where("parentId", "==", parentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as NoteItem[];
}

// Get a single note/folder by ID
export async function getNoteById(id: string): Promise<NoteItem | null> {
  const docRef = doc(db, NOTES_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as NoteItem;
}

// Subscribe to real-time updates for a single note
export function subscribeToNote(
  id: string,
  callback: (note: NoteItem | null) => void
): () => void {
  const docRef = doc(db, NOTES_COLLECTION, id);
  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ id: snapshot.id, ...snapshot.data() } as NoteItem);
  });
}

// Create a new note or folder
export async function createNote(
  note: Omit<NoteItem, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, NOTES_COLLECTION), {
    ...note,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// Update an existing note or folder
export async function updateNote(
  id: string,
  updates: Partial<Omit<NoteItem, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, NOTES_COLLECTION, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// Delete a note or folder
export async function deleteNote(id: string): Promise<void> {
  const docRef = doc(db, NOTES_COLLECTION, id);
  await deleteDoc(docRef);
}

// Delete a folder and all its contents recursively
export async function deleteFolderRecursive(folderId: string): Promise<void> {
  const children = await getNotesByParent(folderId);
  for (const child of children) {
    if (child.id) {
      if (child.type === "folder") {
        await deleteFolderRecursive(child.id);
      } else {
        // Both notes and moodboards are deleted the same way
        await deleteNote(child.id);
      }
    }
  }
  await deleteNote(folderId);
}

// Get all unique tags from notes
export async function getAllNoteTags(): Promise<string[]> {
  const snapshot = await getDocs(collection(db, NOTES_COLLECTION));
  const tagSet = new Set<string>();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.tags && Array.isArray(data.tags)) {
      data.tags.forEach((tag: string) => tagSet.add(tag));
    }
  });
  return Array.from(tagSet).sort();
}

// Search notes by tags, title, and content (with priority)
export function searchNotes(
  items: NoteItem[],
  query: string,
  folderId: string | null
): NoteItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // Get all descendants of the folder (or root)
  const scope = getDescendants(items, folderId);

  return scope
    .filter((item) => item.type === "note" || item.type === "moodboard")
    .map((note) => ({
      note,
      score: getSearchScore(note, q),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.note);
}

function getSearchScore(note: NoteItem, query: string): number {
  // Priority: tags (3) > title (2) > body (1)
  if (note.tags?.some((t) => t.toLowerCase().includes(query))) return 3;
  if (note.title.toLowerCase().includes(query)) return 2;
  if (note.content?.toLowerCase().includes(query)) return 1;
  return 0;
}

function getDescendants(
  items: NoteItem[],
  parentId: string | null
): NoteItem[] {
  const result: NoteItem[] = [];
  const children = items.filter((i) => i.parentId === parentId);
  for (const child of children) {
    result.push(child);
    if (child.type === "folder" && child.id) {
      result.push(...getDescendants(items, child.id));
    }
  }
  return result;
}

// Tag colors storage
const TAG_COLORS_DOC_ID = "_tagColors";

export interface TagColorsMap {
  [tag: string]: number; // Color index
}

// Get tag colors from Firestore
export async function getTagColors(): Promise<TagColorsMap> {
  try {
    const docRef = doc(db, NOTES_COLLECTION, TAG_COLORS_DOC_ID);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return {};
    const data = snapshot.data();
    return data.colors || {};
  } catch (error) {
    console.error("Failed to load tag colors:", error);
    return {};
  }
}

// Save tag colors to Firestore
export async function saveTagColors(colors: TagColorsMap): Promise<void> {
  const docRef = doc(db, NOTES_COLLECTION, TAG_COLORS_DOC_ID);
  await updateDoc(docRef, { colors, updatedAt: Timestamp.now() }).catch(async () => {
    // If doc doesn't exist, create it
    const { setDoc } = await import("firebase/firestore");
    await setDoc(docRef, {
      colors,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

// Set color for a single tag
export async function setTagColor(tag: string, colorIndex: number): Promise<void> {
  const colors = await getTagColors();
  colors[tag] = colorIndex;
  await saveTagColors(colors);
}

// ============ BLOG PUBLISHING ============

// The hardcoded blog folder name
const BLOG_FOLDER_NAME = "blog";

// Get the blog folder ID
export async function getBlogFolderId(): Promise<string | null> {
  try {
    const q = query(
      collection(db, NOTES_COLLECTION),
      where("type", "==", "folder"),
      where("title", "==", BLOG_FOLDER_NAME),
      where("parentId", "==", null)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].id;
  } catch (error) {
    console.error("Error getting blog folder:", error);
    return null;
  }
}

// Get all published blog posts (for public blog)
export async function getPublishedBlogPosts(): Promise<NoteItem[]> {
  try {
    const blogFolderId = await getBlogFolderId();
    if (!blogFolderId) return [];

    const q = query(
      collection(db, NOTES_COLLECTION),
      where("parentId", "==", blogFolderId),
      where("type", "==", "note"),
      where("published", "==", true)
    );
    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as NoteItem[];

    // Sort by date descending, then by createdAt descending for same day
    return posts.sort((a, b) => {
      const dateCompare = (b.date || "").localeCompare(a.date || "");
      if (dateCompare !== 0) return dateCompare;
      // Same date - sort by createdAt (newer first)
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error("Error getting published blog posts:", error);
    return [];
  }
}

// Get a single published blog post by slug
export async function getPublishedBlogPostBySlug(slug: string): Promise<NoteItem | null> {
  try {
    const blogFolderId = await getBlogFolderId();
    if (!blogFolderId) return null;

    const q = query(
      collection(db, NOTES_COLLECTION),
      where("parentId", "==", blogFolderId),
      where("slug", "==", slug),
      where("published", "==", true)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as NoteItem;
  } catch (error) {
    console.error("Error getting blog post by slug:", error);
    return null;
  }
}

// Generate a slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// Check if slug exists in blog folder
export async function blogSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const blogFolderId = await getBlogFolderId();
  if (!blogFolderId) return false;

  const q = query(
    collection(db, NOTES_COLLECTION),
    where("parentId", "==", blogFolderId),
    where("slug", "==", slug)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return false;
  if (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId) {
    return false;
  }
  return true;
}

// Get adjacent blog posts for navigation
export async function getAdjacentBlogPosts(currentSlug: string): Promise<{
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}> {
  const posts = await getPublishedBlogPosts();
  const currentIndex = posts.findIndex((p) => p.slug === currentSlug);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  // Posts are sorted newest first, so "next" is older (higher index), "prev" is newer (lower index)
  const prev = currentIndex > 0
    ? { slug: posts[currentIndex - 1].slug!, title: posts[currentIndex - 1].title }
    : null;
  const next = currentIndex < posts.length - 1
    ? { slug: posts[currentIndex + 1].slug!, title: posts[currentIndex + 1].title }
    : null;

  return { prev, next };
}

// ============ RECIPES PUBLISHING ============

const RECIPES_FOLDER_NAME = "recipes";

// Get the recipes folder ID
export async function getRecipesFolderId(): Promise<string | null> {
  try {
    const q = query(
      collection(db, NOTES_COLLECTION),
      where("type", "==", "folder"),
      where("title", "==", RECIPES_FOLDER_NAME),
      where("parentId", "==", null)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].id;
  } catch (error) {
    console.error("Error getting recipes folder:", error);
    return null;
  }
}

// Get all published recipes (for public recipes page)
export async function getPublishedRecipes(): Promise<NoteItem[]> {
  try {
    const recipesFolderId = await getRecipesFolderId();
    if (!recipesFolderId) return [];

    const q = query(
      collection(db, NOTES_COLLECTION),
      where("parentId", "==", recipesFolderId),
      where("type", "==", "note"),
      where("published", "==", true)
    );
    const snapshot = await getDocs(q);
    const recipes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as NoteItem[];

    // Sort alphabetically by title
    return recipes.sort((a, b) => a.title.localeCompare(b.title));
  } catch (error) {
    console.error("Error getting published recipes:", error);
    return [];
  }
}

// Get a single published recipe by slug
export async function getPublishedRecipeBySlug(slug: string): Promise<NoteItem | null> {
  try {
    const recipesFolderId = await getRecipesFolderId();
    if (!recipesFolderId) return null;

    const q = query(
      collection(db, NOTES_COLLECTION),
      where("parentId", "==", recipesFolderId),
      where("slug", "==", slug),
      where("published", "==", true)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as NoteItem;
  } catch (error) {
    console.error("Error getting recipe by slug:", error);
    return null;
  }
}

// Check if slug exists in recipes folder
export async function recipeSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const recipesFolderId = await getRecipesFolderId();
  if (!recipesFolderId) return false;

  const q = query(
    collection(db, NOTES_COLLECTION),
    where("parentId", "==", recipesFolderId),
    where("slug", "==", slug)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return false;
  if (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId) {
    return false;
  }
  return true;
}
