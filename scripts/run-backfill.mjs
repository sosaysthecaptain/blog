// Run the backfill migration
// Usage: node scripts/run-backfill.mjs

import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getStorage, ref, getMetadata } from 'firebase/storage';

// Firebase config - matches src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyBueCOsB9el4gw0kF1TCp-maa2mfeunHxU",
  authDomain: "marcs-blog-6b4e4.firebaseapp.com",
  projectId: "marcs-blog-6b4e4",
  storageBucket: "marcs-blog-6b4e4.firebasestorage.app",
  messagingSenderId: "341793197828",
  appId: "1:341793197828:web:8b49351c34e3f5e5194a51",
};

const app = initializeApp(firebaseConfig);
// Use long polling for Node.js compatibility (avoids gRPC issues)
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
const storage = getStorage(app);

async function backfillImageSizes() {
  const errors = [];
  let updated = 0;

  try {
    console.log('Fetching notes...');
    const notesRef = collection(db, 'notes');
    const snapshot = await getDocs(notesRef);
    console.log(`Found ${snapshot.docs.length} notes`);

    for (const docSnap of snapshot.docs) {
      const note = { id: docSnap.id, ...docSnap.data() };

      if (note.type !== 'moodboard' || !note.images || note.images.length === 0) {
        continue;
      }

      console.log(`Processing moodboard: ${note.title} (${note.images.length} images)`);

      let hasUpdates = false;
      const updatedImages = [];

      for (const image of note.images) {
        if (image.fileSize && image.fileSize > 0) {
          updatedImages.push(image);
          continue;
        }

        try {
          const url = new URL(image.url);
          const pathMatch = url.pathname.match(/\/o\/(.+)$/);
          if (!pathMatch) {
            errors.push(`Could not parse path from URL for image ${image.id}`);
            updatedImages.push(image);
            continue;
          }

          const encodedPath = pathMatch[1].split('?')[0];
          const storagePath = decodeURIComponent(encodedPath);

          const storageRef = ref(storage, storagePath);
          const metadata = await getMetadata(storageRef);

          updatedImages.push({
            ...image,
            fileSize: metadata.size,
          });
          hasUpdates = true;
          console.log(`  Updated ${image.id}: ${metadata.size} bytes`);
        } catch (err) {
          errors.push(`Failed for image ${image.id}: ${err.message}`);
          updatedImages.push(image);
        }
      }

      if (hasUpdates) {
        await updateDoc(doc(db, 'notes', note.id), { images: updatedImages });
        updated++;
        console.log(`  Saved moodboard ${note.id}`);
      }
    }

    console.log(`\nDone! Updated ${updated} moodboards.`);
    if (errors.length > 0) {
      console.log(`Errors: ${errors.length}`);
      errors.forEach(e => console.log(`  - ${e}`));
    }
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

backfillImageSizes();
