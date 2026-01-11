import BlogPostClient from "./BlogPostClient";
import { getPublishedBlogPosts } from "@/lib/notes";

// Generate static params for all published blog posts
export async function generateStaticParams() {
  try {
    const blogPosts = await getPublishedBlogPosts();
    const slugs = blogPosts
      .filter(post => post.slug)
      .map(post => ({ slug: post.slug! }));

    return slugs.length > 0 ? slugs : [{ slug: "placeholder" }];
  } catch (error) {
    console.error("Error fetching notes for static params:", error);
    return [{ slug: "placeholder" }];
  }
}

export default function BlogPostPage() {
  return <BlogPostClient />;
}
