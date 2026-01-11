import BlogPostClient from "./BlogPostClient";
import { getPublishedBlogPosts } from "@/lib/notes";
import { getPublishedPosts } from "@/lib/firestore";

// Generate static params for all published blog posts
export async function generateStaticParams() {
  const slugs: { slug: string }[] = [];

  try {
    const [blogPosts, oldPosts] = await Promise.all([
      getPublishedBlogPosts(),
      getPublishedPosts(),
    ]);

    // Add note slugs
    for (const post of blogPosts) {
      if (post.slug) {
        slugs.push({ slug: post.slug });
      }
    }

    // Add old post slugs
    for (const post of oldPosts) {
      if (!post.parent) {
        slugs.push({ slug: post.slug });
      }
    }
  } catch (error) {
    console.error("Error fetching posts for static params:", error);
  }

  // Dedupe
  const unique = Array.from(new Map(slugs.map(s => [s.slug, s])).values());
  return unique.length > 0 ? unique : [{ slug: "placeholder" }];
}

export default function BlogPostPage() {
  return <BlogPostClient />;
}
