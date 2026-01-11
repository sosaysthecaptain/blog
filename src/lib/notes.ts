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
} from "firebase/firestore";
import { db } from "./firebase";

const NOTES_COLLECTION = "notes";

export interface NoteItem {
  id?: string;
  type: "note" | "folder";
  title: string;
  parentId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Note-specific fields
  content?: string;
  date?: string;
  tags?: string[];
}

// Get all notes and folders
export async function getAllNotes(): Promise<NoteItem[]> {
  const snapshot = await getDocs(collection(db, NOTES_COLLECTION));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as NoteItem[];
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
    .filter((item) => item.type === "note")
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
