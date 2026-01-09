import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPost, getAllSlugs } from "@/lib/posts";

type Params = Promise<{ slug: string }>;

// Parse markdown links [text](url) into JSX
function parseLinks(text: string): (string | JSX.Element)[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const [, linkText, url] = match;
    const isInternal = url.startsWith("/");
    if (isInternal) {
      parts.push(
        <Link key={keyIndex++} href={url} className="text-[--accent] hover:underline">
          {linkText}
        </Link>
      );
    } else {
      parts.push(
        <a
          key={keyIndex++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[--accent] hover:underline"
        >
          {linkText}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

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
          // Handle tree-style lists with links
          const lines = paragraph.split("\n");
          return (
            <pre key={`${i}-${j}`} className="text-[--foreground] my-1 whitespace-pre-wrap">
              {lines.map((line, k) => (
                <span key={k}>
                  {parseLinks(line)}
                  {k < lines.length - 1 && "\n"}
                </span>
              ))}
            </pre>
          );
        }
        if (paragraph.match(/^\d+\./)) {
          return (
            <p key={`${i}-${j}`} className="text-[--foreground] my-2 pl-4">
              {parseLinks(paragraph)}
            </p>
          );
        }
        return (
          <p key={`${i}-${j}`} className="text-[--foreground] my-4 leading-relaxed">
            {parseLinks(paragraph)}
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
