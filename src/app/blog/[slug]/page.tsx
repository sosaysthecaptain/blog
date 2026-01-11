import BlogPostClient from "./BlogPostClient";
import { getPublishedBlogPosts } from "@/lib/notes";
import { getPublishedPosts } from "@/lib/firestore";
import { posts as fallbackPosts } from "@/lib/posts";

// Generate static params for all published blog posts
export async function generateStaticParams() {
  const allSlugs: { slug: string }[] = [];

  // Always include fallback posts
  Object.keys(fallbackPosts).forEach(slug => {
    allSlugs.push({ slug });
  });

  try {
    // Try to get notes-based blog posts
    const blogPosts = await getPublishedBlogPosts();
    blogPosts.filter(post => post.slug).forEach(post => {
      allSlugs.push({ slug: post.slug! });
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
  }

  try {
    // Also get old posts collection
    const oldPosts = await getPublishedPosts();
    oldPosts.forEach(post => {
      allSlugs.push({ slug: post.slug });
    });
  } catch (error) {
    console.error("Error fetching old posts:", error);
  }

  // Dedupe
  const uniqueSlugs = Array.from(new Map(allSlugs.map(s => [s.slug, s])).values());

  return uniqueSlugs.length > 0 ? uniqueSlugs : [{ slug: "placeholder" }];
}

export default function BlogPostPage() {
  return <BlogPostClient />;
}
