import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "./firebase";

// Upload an image for a note
export async function uploadNoteImage(
  blob: Blob,
  noteId: string
): Promise<string> {
  const timestamp = Date.now();
  const extension = blob.type.split("/")[1] || "png";
  const path = `notes/${noteId}/${timestamp}.${extension}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

// Delete a single image
export async function deleteNoteImage(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting image:", error);
  }
}

// List all images for a note
export async function listNoteImages(noteId: string): Promise<string[]> {
  const listRef = ref(storage, `notes/${noteId}`);
  try {
    const result = await listAll(listRef);
    return Promise.all(result.items.map((item) => getDownloadURL(item)));
  } catch {
    return [];
  }
}

// Delete all images for a note
export async function deleteNoteImages(noteId: string): Promise<void> {
  const listRef = ref(storage, `notes/${noteId}`);
  try {
    const result = await listAll(listRef);
    await Promise.all(result.items.map((item) => deleteObject(item)));
  } catch (error) {
    console.error("Error deleting note images:", error);
  }
}
