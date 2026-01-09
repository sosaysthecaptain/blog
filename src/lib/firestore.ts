import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface PostImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface Post {
  id?: string;
  slug: string;
  title: string;
  date: string;
  content: string;
  images?: PostImage[];
  parent?: string;
  isProject?: boolean;
  status: "draft" | "published";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const POSTS_COLLECTION = "posts";

// Get all published posts (for public site)
export async function getPublishedPosts(): Promise<Post[]> {
  const q = query(
    collection(db, POSTS_COLLECTION),
    where("status", "==", "published")
  );
  const snapshot = await getDocs(q);
  const posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Post));
  // Sort by date descending in JavaScript to avoid needing a composite index
  return posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// Get all posts (for admin)
export async function getAllPosts(): Promise<Post[]> {
  const snapshot = await getDocs(collection(db, POSTS_COLLECTION));
  const posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Post));
  // Sort by date descending (chronological, newest first)
  return posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// Get single post by slug (for public site)
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const q = query(
    collection(db, POSTS_COLLECTION),
    where("slug", "==", slug),
    where("status", "==", "published")
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Post;
}

// Get single post by ID (for admin editing)
export async function getPostById(id: string): Promise<Post | null> {
  const docRef = doc(db, POSTS_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Post;
}

// Create new post
export async function createPost(
  post: Omit<Post, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, POSTS_COLLECTION), {
    ...post,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// Update post
export async function updatePost(
  id: string,
  post: Partial<Omit<Post, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, POSTS_COLLECTION, id);
  await updateDoc(docRef, {
    ...post,
    updatedAt: Timestamp.now(),
  });
}

// Delete post
export async function deletePost(id: string): Promise<void> {
  const docRef = doc(db, POSTS_COLLECTION, id);
  await deleteDoc(docRef);
}

// Get projects only
export async function getProjects(): Promise<Post[]> {
  // Fetch published posts and filter by isProject in JavaScript to avoid composite index
  const q = query(
    collection(db, POSTS_COLLECTION),
    where("status", "==", "published")
  );
  const snapshot = await getDocs(q);
  const posts = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Post))
    .filter((p) => p.isProject === true);
  return posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// Check if slug exists
export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const q = query(collection(db, POSTS_COLLECTION), where("slug", "==", slug));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return false;
  if (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId) {
    return false;
  }
  return true;
}
