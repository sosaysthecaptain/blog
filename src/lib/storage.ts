import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "./firebase";

// Upload image and return URL
export async function uploadImage(
  file: File | Blob,
  path: string
): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// Upload image from paste (dataURL or blob)
export async function uploadImageFromBlob(
  blob: Blob,
  slug: string
): Promise<string> {
  const timestamp = Date.now();
  const extension = blob.type.split("/")[1] || "png";
  const path = `posts/${slug}/${timestamp}.${extension}`;
  return uploadImage(blob, path);
}

// Delete image
export async function deleteImage(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting image:", error);
  }
}

// List all images for a post
export async function listPostImages(slug: string): Promise<string[]> {
  const listRef = ref(storage, `posts/${slug}`);
  try {
    const result = await listAll(listRef);
    return Promise.all(result.items.map((item) => getDownloadURL(item)));
  } catch {
    return [];
  }
}

// Delete all images for a post
export async function deletePostImages(slug: string): Promise<void> {
  const listRef = ref(storage, `posts/${slug}`);
  try {
    const result = await listAll(listRef);
    await Promise.all(result.items.map((item) => deleteObject(item)));
  } catch (error) {
    console.error("Error deleting post images:", error);
  }
}
