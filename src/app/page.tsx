"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { getPublishedPosts, getProjects, Post } from "@/lib/firestore";
import { getAllPosts as getFallbackPosts, getProjects as getFallbackProjects } from "@/lib/posts";

const POSTS_PER_PAGE = 10;

const carouselImages = [
  {
    src: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=600&fit=crop",
    alt: "Circuit board closeup",
  },
  {
    src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=600&fit=crop",
    alt: "3D printing in action",
  },
  {
    src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=600&fit=crop",
    alt: "Technology abstract",
  },
  {
    src: "https://images.unsplash.com/photo-1504610926078-a1611febcad3?w=1200&h=600&fit=crop",
    alt: "Space and stars",
  },
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  useEffect(() => {
    async function loadData() {
      try {
        const [firestorePosts, firestoreProjects] = await Promise.all([
          getPublishedPosts(),
          getProjects(),
        ]);

        if (firestorePosts.length > 0) {
          // Filter to only top-level posts (no parent)
          const topLevelPosts = firestorePosts.filter((p) => !p.parent);
          setPosts(topLevelPosts);
          setProjects(firestoreProjects);
        } else {
          // Fall back to hardcoded
          const fallbackList = getFallbackPosts();
          const fallbackProj = getFallbackProjects();
          setPosts(fallbackList.map((p) => ({ ...p, status: "published" as const } as Post)));
          setProjects(fallbackProj.map((p) => ({ ...p, status: "published" as const } as Post)));
        }
      } catch (error) {
        console.error("Error loading posts:", error);
        // Fall back to hardcoded on error
        const fallbackList = getFallbackPosts();
        const fallbackProj = getFallbackProjects();
        setPosts(fallbackList.map((p) => ({ ...p, status: "published" as const } as Post)));
        setProjects(fallbackProj.map((p) => ({ ...p, status: "published" as const } as Post)));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[--background]">
      <main className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-[--foreground] text-3xl font-bold">MARC AUGER</h1>
        </header>

        {/* Image Carousel */}
        <section className="mb-12">
          <div className="relative w-full h-72 border border-[--border] overflow-hidden bg-[--border]">
            {carouselImages.map((img, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  i === currentSlide ? "opacity-100" : "opacity-0"
                }`}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}

            {/* Navigation arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white border border-[--border] flex items-center justify-center text-[--foreground] text-xl"
              aria-label="Previous slide"
            >
              ←
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white border border-[--border] flex items-center justify-center text-[--foreground] text-xl"
              aria-label="Next slide"
            >
              →
            </button>

            {/* Slide counter */}
            <div className="absolute bottom-3 right-3 bg-white/80 border border-[--border] px-3 py-1 text-sm text-[--foreground]">
              {currentSlide + 1} / {carouselImages.length}
            </div>

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {carouselImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-colors border border-[--border] ${
                    i === currentSlide ? "bg-[--accent]" : "bg-white/80"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Projects */}
        <section className="mb-10">
          <h2 className="text-[--muted] text-sm mb-4 uppercase tracking-wide">Projects</h2>
          {loading ? (
            <p className="text-[--muted]">Loading...</p>
          ) : (
            <div className="space-y-1">
              {projects.map((project, i) => (
                <div key={project.slug} className="flex flex-wrap">
                  <span className="text-[--muted] mr-2">
                    {i === projects.length - 1 ? "└─" : "├─"}
                  </span>
                  <Link href={`/blog/${project.slug}`} className="hover:underline">
                    {project.title}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Links */}
        <section className="mb-10">
          <h2 className="text-[--muted] text-sm mb-4 uppercase tracking-wide">Links</h2>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://github.com/sosaysthecaptain"
              target="_blank"
              rel="noopener noreferrer"
            >
              github
            </a>
            <span className="text-[--muted]">·</span>
            <Link href="/blog/about">about</Link>
            <span className="text-[--muted]">·</span>
            <a href="mailto:contact@marcauger.com">contact</a>
          </div>
        </section>

        {/* All Posts */}
        <section className="mb-10">
          <h2 className="text-[--muted] text-sm mb-4 uppercase tracking-wide">Posts</h2>
          {loading ? (
            <p className="text-[--muted]">Loading...</p>
          ) : posts.length === 0 ? (
            <p className="text-[--muted]">No posts yet.</p>
          ) : (
            <>
              <div className="space-y-2">
                {posts
                  .slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE)
                  .map((post) => (
                    <div key={post.slug} className="flex items-baseline">
                      <span className="text-[--muted] w-28 shrink-0 text-sm">{post.date}</span>
                      <Link href={`/blog/${post.slug}`} className="hover:underline">
                        {post.title}
                      </Link>
                      {post.isProject && (
                        <span className="text-[--muted] text-xs ml-2">[project]</span>
                      )}
                    </div>
                  ))}
              </div>

              {/* Pagination */}
              {posts.length > POSTS_PER_PAGE && (
                <div className="flex items-center gap-4 mt-6 pt-4 border-t border-[--border]">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="text-sm text-[--muted] hover:text-[--foreground] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← Newer
                  </button>
                  <span className="text-sm text-[--muted]">
                    Page {currentPage} of {Math.ceil(posts.length / POSTS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(Math.ceil(posts.length / POSTS_PER_PAGE), p + 1))}
                    disabled={currentPage >= Math.ceil(posts.length / POSTS_PER_PAGE)}
                    className="text-sm text-[--muted] hover:text-[--foreground] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Older →
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-[--border]">
          <p className="text-[--muted] text-sm">
            © {new Date().getFullYear()} Marc Auger
          </p>
        </footer>
      </main>
    </div>
  );
}
