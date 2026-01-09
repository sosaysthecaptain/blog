"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getPostBySlug, Post } from "@/lib/firestore";
import { posts as fallbackPosts } from "@/lib/posts";

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
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-[--foreground] mt-8 mb-4">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold text-[--foreground] mt-8 mb-4">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-bold text-[--foreground] mt-6 mb-3">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-[--foreground] my-4 leading-relaxed">{children}</p>
                ),
                a: ({ href, children }) => {
                  const isInternal = href?.startsWith("/");
                  if (isInternal) {
                    return (
                      <Link href={href || "/"} className="text-[--accent] hover:underline">
                        {children}
                      </Link>
                    );
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[--accent] hover:underline">
                      {children}
                    </a>
                  );
                },
                strong: ({ children }) => (
                  <strong className="font-bold">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic">{children}</em>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-100 p-4 rounded overflow-x-auto my-4 text-sm">{children}</pre>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside my-4 space-y-1 text-[--foreground]">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside my-4 space-y-1 text-[--foreground]">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-[--foreground]">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-[--accent] pl-4 my-4 italic text-[--muted]">{children}</blockquote>
                ),
                img: ({ src, alt }) => (
                  <figure className="my-6">
                    <img
                      src={src}
                      alt={alt || ""}
                      className="max-w-full h-auto border border-[--border] rounded"
                      style={{ width: 'auto', maxWidth: '100%' }}
                    />
                    {alt && (
                      <figcaption className="text-sm text-[--muted] mt-2 text-center">
                        {alt}
                      </figcaption>
                    )}
                  </figure>
                ),
                hr: () => (
                  <hr className="my-8 border-[--border]" />
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
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
