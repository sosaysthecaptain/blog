/**
 * Migration script to backfill fileSize for existing moodboard images
 * Run this once to populate fileSize for images that were uploaded before tracking was added
 */

import { db, storage } from "../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { ref, getMetadata } from "firebase/storage";
import { NoteItem, MoodboardImage } from "../notes";

export async function backfillImageSizes(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  try {
    // Get all notes
    const notesRef = collection(db, "notes");
    const snapshot = await getDocs(notesRef);

    for (const docSnap of snapshot.docs) {
      const note = { id: docSnap.id, ...docSnap.data() } as NoteItem;

      // Only process moodboards with images
      if (note.type !== "moodboard" || !note.images || note.images.length === 0) {
        continue;
      }

      let hasUpdates = false;
      const updatedImages: MoodboardImage[] = [];

      for (const image of note.images) {
        // If fileSize already exists and is valid, keep it
        if (image.fileSize && image.fileSize > 0) {
          updatedImages.push(image);
          continue;
        }

        // Try to get file size from Storage
        try {
          // Extract the storage path from the URL
          // URLs look like: https://firebasestorage.googleapis.com/v0/b/bucket/o/notes%2FmoodboardId%2Fmoodboard%2FimageId.ext?...
          const url = new URL(image.url);
          const pathMatch = url.pathname.match(/\/o\/(.+)$/);
          if (!pathMatch) {
            errors.push(`Could not parse path from URL for image ${image.id} in moodboard ${note.id}`);
            updatedImages.push(image);
            continue;
          }

          const encodedPath = pathMatch[1].split("?")[0];
          const storagePath = decodeURIComponent(encodedPath);

          const storageRef = ref(storage, storagePath);
          const metadata = await getMetadata(storageRef);

          updatedImages.push({
            ...image,
            fileSize: metadata.size,
          });
          hasUpdates = true;
          console.log(`Updated fileSize for image ${image.id}: ${metadata.size} bytes`);
        } catch (err) {
          errors.push(`Failed to get metadata for image ${image.id} in moodboard ${note.id}: ${err}`);
          updatedImages.push(image);
        }
      }

      // Save updates if any images were updated
      if (hasUpdates) {
        try {
          await updateDoc(doc(db, "notes", note.id!), { images: updatedImages });
          updated++;
          console.log(`Updated moodboard ${note.id} with ${updatedImages.length} images`);
        } catch (err) {
          errors.push(`Failed to save moodboard ${note.id}: ${err}`);
        }
      }
    }

    return { updated, errors };
  } catch (err) {
    errors.push(`Migration failed: ${err}`);
    return { updated, errors };
  }
}
