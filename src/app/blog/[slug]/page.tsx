"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { getPostBySlug, Post } from "@/lib/firestore";
import { posts as fallbackPosts } from "@/lib/posts";

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

// Parse markdown images ![alt](url) into JSX
function parseImages(text: string): (string | JSX.Element)[] {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = imageRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const [, alt, url] = match;
    parts.push(
      <figure key={keyIndex++} className="my-8">
        <div className="relative w-full border border-[--border]">
          <Image
            src={url}
            alt={alt}
            width={800}
            height={500}
            className="w-full h-auto"
            unoptimized={url.startsWith("http")}
          />
        </div>
        {alt && (
          <figcaption className="text-sm text-[--muted] mt-2 text-center">
            {alt}
          </figcaption>
        )}
      </figure>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export default function BlogPost() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadPost() {
      try {
        // Try Firestore first
        const firestorePost = await getPostBySlug(slug);
        if (firestorePost) {
          setPost(firestorePost);
        } else {
          // Fall back to hardcoded posts
          const fallback = fallbackPosts[slug];
          if (fallback) {
            // Convert hardcoded format to Firestore format
            let content = fallback.content;
            if (fallback.images) {
              fallback.images.forEach((img, i) => {
                content = content.replace(
                  `[IMAGE:${i}]`,
                  `![${img.alt}](${img.src})`
                );
              });
            }
            setPost({
              slug: fallback.slug,
              title: fallback.title,
              date: fallback.date,
              content,
              isProject: fallback.isProject,
              parent: fallback.parent,
              status: "published",
            } as Post);
          } else {
            setNotFound(true);
          }
        }
      } catch (error) {
        console.error("Error loading post:", error);
        // Try fallback on error
        const fallback = fallbackPosts[slug];
        if (fallback) {
          let content = fallback.content;
          if (fallback.images) {
            fallback.images.forEach((img, i) => {
              content = content.replace(
                `[IMAGE:${i}]`,
                `![${img.alt}](${img.src})`
              );
            });
          }
          setPost({
            slug: fallback.slug,
            title: fallback.title,
            date: fallback.date,
            content,
            isProject: fallback.isProject,
            parent: fallback.parent,
            status: "published",
          } as Post);
        } else {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    }

    loadPost();
  }, [slug]);

  const renderContent = () => {
    if (!post) return null;

    // First parse images, then for text parts parse links
    const parts = parseImages(post.content);

    return parts.map((part, i) => {
      if (typeof part !== "string") {
        return part; // Already a JSX element (image)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[--background] flex items-center justify-center">
        <p className="text-[--muted]">Loading...</p>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-[--background] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-[--foreground] mb-4">Not Found</h1>
        <Link href="/" className="text-[--accent] hover:underline">
          ← back to home
        </Link>
      </div>
    );
  }

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
