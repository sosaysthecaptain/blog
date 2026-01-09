import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPost, getAllSlugs } from "@/lib/posts";

type Params = Promise<{ slug: string }>;

export default async function BlogPost({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  const renderContent = () => {
    const parts = post.content.split(/(\[IMAGE:\d+\])/);

    return parts.map((part, i) => {
      const imageMatch = part.match(/\[IMAGE:(\d+)\]/);

      if (imageMatch && post.images) {
        const imageIndex = parseInt(imageMatch[1], 10);
        const image = post.images[imageIndex];

        if (image) {
          return (
            <figure key={i} className="my-8">
              <div className="relative w-full border border-[--border]">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={800}
                  height={500}
                  className="w-full h-auto"
                />
              </div>
              {image.caption && (
                <figcaption className="text-sm text-[--muted] mt-2 text-center">
                  {image.caption}
                </figcaption>
              )}
            </figure>
          );
        }
      }

      return part.split("\n\n").map((paragraph, j) => {
        if (!paragraph.trim()) return null;

        if (paragraph.startsWith("## ")) {
          return (
            <h2 key={`${i}-${j}`} className="text-[--foreground] font-bold mt-8 mb-4 text-lg">
              {paragraph.replace("## ", "")}
            </h2>
          );
        }
        if (paragraph.startsWith("├─") || paragraph.startsWith("└─") || paragraph.startsWith("│")) {
          return (
            <pre key={`${i}-${j}`} className="text-[--foreground] my-1 whitespace-pre-wrap">
              {paragraph}
            </pre>
          );
        }
        if (paragraph.match(/^\d+\./)) {
          return (
            <p key={`${i}-${j}`} className="text-[--foreground] my-2 pl-4">
              {paragraph}
            </p>
          );
        }
        return (
          <p key={`${i}-${j}`} className="text-[--foreground] my-4 leading-relaxed">
            {paragraph}
          </p>
        );
      });
    });
  };

  return (
    <div className="min-h-screen bg-[--background]">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="text-[--muted] hover:text-[--accent] text-sm"
        >
          ← back
        </Link>

        <article className="mt-8">
          <header className="mb-8 pb-4 border-b border-[--border]">
            <h1 className="text-2xl font-bold text-[--foreground] mb-2">{post.title}</h1>
            {post.date && <time className="text-sm text-[--muted]">{post.date}</time>}
            {post.parent && (
              <div className="mt-2">
                <Link href={`/blog/${post.parent}`} className="text-sm text-[--accent]">
                  ← Part of: {post.parent.replace(/-/g, " ")}
                </Link>
              </div>
            )}
          </header>

          <div className="prose-terminal">
            {renderContent()}
          </div>
        </article>

        <footer className="mt-16 pt-8 border-t border-[--border]">
          <Link href="/" className="text-[--muted] hover:text-[--accent] text-sm">
            ← back to home
          </Link>
        </footer>
      </main>
    </div>
  );
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}
