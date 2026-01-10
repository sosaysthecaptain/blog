"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getPostBySlug, Post, getAdjacentPosts } from "@/lib/firestore";
import { posts as fallbackPosts } from "@/lib/posts";
import Footer from "@/components/Footer";

// Extract all image URLs from markdown content
function extractImages(content: string): string[] {
  const regex = /!\[[^\]]*\]\(([^)]+)\)/g;
  const images: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    images.push(match[1]);
  }
  return images;
}

// Lightbox Modal Component
function ImageModal({
  images,
  currentIndex,
  onClose,
  onNext,
  onPrev,
}: {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, onNext, onPrev]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10"
        aria-label="Close"
      >
        ×
      </button>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl z-10 p-4"
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl z-10 p-4"
            aria-label="Next image"
          >
            ›
          </button>
        </>
      )}

      {/* Image */}
      <img
        src={images[currentIndex]}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

export default function BlogPost() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [adjacentPosts, setAdjacentPosts] = useState<{
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
  }>({ prev: null, next: null });

  // Get all images from current post
  const allImages = post ? extractImages(post.content) : [];

  const openModal = useCallback((imageSrc: string) => {
    const idx = allImages.indexOf(imageSrc);
    setModalIndex(idx >= 0 ? idx : 0);
    setModalOpen(true);
  }, [allImages]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const nextImage = useCallback(() => {
    setModalIndex((i) => (i + 1) % allImages.length);
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    setModalIndex((i) => (i - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  useEffect(() => {
    async function loadPost() {
      try {
        // Try Firestore first
        const firestorePost = await getPostBySlug(slug);
        if (firestorePost) {
          setPost(firestorePost);
          // Load adjacent posts for navigation
          const adjacent = await getAdjacentPosts(slug);
          setAdjacentPosts(adjacent);
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

          <div className="prose-terminal font-serif">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-[--foreground] mt-8 mb-4 font-sans">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold text-[--foreground] mt-8 mb-4 font-sans">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-bold text-[--foreground] mt-6 mb-3 font-sans">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-[--foreground] text-base my-4 leading-relaxed">{children}</p>
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
                  <figure className="my-6 flex flex-col items-center">
                    <img
                      src={typeof src === 'string' ? src : undefined}
                      alt={alt || ""}
                      className="max-w-full h-auto border border-[--border] rounded cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ width: 'auto', maxWidth: '100%' }}
                      onClick={() => typeof src === 'string' && openModal(src)}
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

        {/* Post Navigation */}
        {(adjacentPosts.prev || adjacentPosts.next) && (
          <nav className="mt-12 pt-8 border-t border-[--border]">
            <div className="flex justify-between items-start gap-4">
              {adjacentPosts.prev ? (
                <Link
                  href={`/blog/${adjacentPosts.prev.slug}`}
                  className="group flex-1 max-w-[45%]"
                >
                  <span className="text-xs text-[--muted] uppercase tracking-wide">← Newer</span>
                  <p className="text-sm text-[--foreground] group-hover:text-[--accent] transition-colors mt-1 line-clamp-2">
                    {adjacentPosts.prev.title}
                  </p>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {adjacentPosts.next && (
                <Link
                  href={`/blog/${adjacentPosts.next.slug}`}
                  className="group flex-1 max-w-[45%] text-right"
                >
                  <span className="text-xs text-[--muted] uppercase tracking-wide">Older →</span>
                  <p className="text-sm text-[--foreground] group-hover:text-[--accent] transition-colors mt-1 line-clamp-2">
                    {adjacentPosts.next.title}
                  </p>
                </Link>
              )}
            </div>
          </nav>
        )}

        <Footer />
      </main>

      {/* Image Lightbox Modal */}
      {modalOpen && allImages.length > 0 && (
        <ImageModal
          images={allImages}
          currentIndex={modalIndex}
          onClose={closeModal}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}
    </div>
  );
}
