import BlogPostClient from "./BlogPostClient";
import { getPublishedBlogPosts } from "@/lib/notes";

// Generate static params for published blog posts
export async function generateStaticParams() {
  try {
    const posts = await getPublishedBlogPosts();
    const slugs = posts
      .filter(p => p.slug)
      .map(p => ({ slug: p.slug! }));
    return slugs.length > 0 ? slugs : [{ slug: "placeholder" }];
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [{ slug: "placeholder" }];
  }
}

export default function BlogPostPage() {
  return <BlogPostClient />;
}
