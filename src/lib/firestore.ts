import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
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
  tags?: string[];
  status: "draft" | "published";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Extract first image URL from content (handles both markdown and HTML)
export function getFirstImageFromContent(content: string): string | null {
  // Try markdown format first: ![alt](url)
  const mdMatch = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (mdMatch) return mdMatch[1];

  // Try HTML format: <img src="url">
  const htmlMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
  return htmlMatch ? htmlMatch[1] : null;
}

// Extract blurb (first paragraph of text) from content (handles both markdown and HTML)
export function getBlurbFromContent(content: string, maxLength: number = 160): string {
  let text = content;

  // Check if content is HTML (contains HTML tags)
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (isHtml) {
    // Strip HTML tags and decode entities
    text = text
      .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '') // Remove figures (images with captions)
      .replace(/<img[^>]*>/gi, '') // Remove images
      .replace(/<br\s*\/?>/gi, ' ') // Replace <br> with space
      .replace(/<\/p>\s*<p>/gi, ' ') // Replace paragraph breaks with space
      .replace(/<[^>]+>/g, '') // Remove all remaining HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  } else {
    // Markdown processing
    text = text
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
      .replace(/^#{1,6}\s+.*$/gm, '') // Remove headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/[*_`]/g, '') // Remove emphasis markers
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, ''); // Remove numbered list markers
  }

  // Common cleanup
  text = text
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();

  if (text.length <= maxLength) return text;

  // Truncate at word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

const POSTS_COLLECTION = "posts";

// Get all published posts (for public site)
export async function getPublishedPosts(): Promise<Post[]> {
  const q = query(
    collection(db, POSTS_COLLECTION),
    where("status", "==", "published")
  );
  const snapshot = await getDocs(q);
  const posts = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Post))
    .filter((p) => !p.slug.startsWith("_")); // Exclude system docs
  // Sort by date descending in JavaScript to avoid needing a composite index
  return posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// Get all posts (for admin)
export async function getAllPosts(): Promise<Post[]> {
  const snapshot = await getDocs(collection(db, POSTS_COLLECTION));
  const posts = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Post))
    .filter((p) => !p.slug.startsWith("_")); // Exclude system docs
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
    .filter((p) => p.isProject === true && !p.slug.startsWith("_"));
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

// Get all unique tags from all posts
export async function getAllTags(): Promise<string[]> {
  const snapshot = await getDocs(collection(db, POSTS_COLLECTION));
  const tagSet = new Set<string>();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.tags && Array.isArray(data.tags)) {
      data.tags.forEach((tag: string) => tagSet.add(tag));
    }
  });
  return Array.from(tagSet).sort();
}

// Get adjacent posts (prev/next) for navigation
export async function getAdjacentPosts(currentSlug: string): Promise<{
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}> {
  const posts = await getPublishedPosts();
  // Filter out child posts (posts with parent)
  const topLevelPosts = posts.filter((p) => !p.parent);
  const currentIndex = topLevelPosts.findIndex((p) => p.slug === currentSlug);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  // Posts are sorted newest first, so "next" is older (higher index), "prev" is newer (lower index)
  const prev = currentIndex > 0
    ? { slug: topLevelPosts[currentIndex - 1].slug, title: topLevelPosts[currentIndex - 1].title }
    : null;
  const next = currentIndex < topLevelPosts.length - 1
    ? { slug: topLevelPosts[currentIndex + 1].slug, title: topLevelPosts[currentIndex + 1].title }
    : null;

  return { prev, next };
}

// ============ CAROUSEL ============

export interface CarouselImage {
  id: string;
  src: string;
  alt: string;
}

// Store carousel as a special post with slug "_carousel"
const CAROUSEL_SLUG = "_carousel";

// Default carousel images (used as fallback)
const DEFAULT_CAROUSEL: CarouselImage[] = [
  { id: "1", src: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=600&fit=crop", alt: "Circuit board closeup" },
  { id: "2", src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=600&fit=crop", alt: "3D printing in action" },
  { id: "3", src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=600&fit=crop", alt: "Technology abstract" },
  { id: "4", src: "https://images.unsplash.com/photo-1504610926078-a1611febcad3?w=1200&h=600&fit=crop", alt: "Space and stars" },
];

// Get carousel images
export async function getCarouselImages(): Promise<CarouselImage[]> {
  try {
    const q = query(
      collection(db, POSTS_COLLECTION),
      where("slug", "==", CAROUSEL_SLUG)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      return data.images || DEFAULT_CAROUSEL;
    }
    return DEFAULT_CAROUSEL;
  } catch (error) {
    console.error("Error loading carousel:", error);
    return DEFAULT_CAROUSEL;
  }
}

// Save carousel images - uses posts collection which has permissions
export async function saveCarouselImages(images: CarouselImage[]): Promise<void> {
  // Check if carousel doc exists
  const q = query(
    collection(db, POSTS_COLLECTION),
    where("slug", "==", CAROUSEL_SLUG)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // Create new
    await addDoc(collection(db, POSTS_COLLECTION), {
      slug: CAROUSEL_SLUG,
      title: "Carousel Config",
      date: "",
      content: "",
      status: "draft",
      images,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } else {
    // Update existing
    const docRef = doc(db, POSTS_COLLECTION, snapshot.docs[0].id);
    await updateDoc(docRef, {
      images,
      updatedAt: Timestamp.now(),
    });
  }
}
