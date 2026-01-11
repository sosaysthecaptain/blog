import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getBlob,
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

// Download an image blob from a Firebase Storage URL
export async function downloadImageBlob(url: string): Promise<Blob | null> {
  try {
    // Extract the storage path from the URL
    // Firebase Storage URLs look like: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?alt=media&token=TOKEN
    const match = url.match(/\/o\/([^?]+)/);
    if (!match) {
      // Not a Firebase Storage URL, try regular fetch
      const response = await fetch(url);
      if (response.ok) {
        return response.blob();
      }
      return null;
    }

    const path = decodeURIComponent(match[1]);
    const storageRef = ref(storage, path);
    return await getBlob(storageRef);
  } catch (error) {
    console.error("Error downloading image:", error);
    return null;
  }
}
