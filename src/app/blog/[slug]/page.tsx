import BlogPostClient from "./BlogPostClient";

// For static export, we pre-render at least one slug
// Other slugs are handled via Firebase rewrites to this page
export function generateStaticParams() {
  return [
    { slug: "fdm-startup" },
  ];
}

export default function BlogPostPage() {
  return <BlogPostClient />;
}
