"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { getPublishedPosts, getProjects, Post, getCarouselImages, CarouselImage, getFirstImageFromContent, getBlurbFromContent } from "@/lib/firestore";
import Footer from "@/components/Footer";

// Format date as "14 March 2018"
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

const POSTS_PER_PAGE = 10;

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [autoPlay, setAutoPlay] = useState(true);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % (carouselImages.length || 1));
  }, [carouselImages.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % (carouselImages.length || 1));
  }, [carouselImages.length]);

  const manualNext = useCallback(() => {
    setAutoPlay(false);
    nextSlide();
  }, [nextSlide]);

  const manualPrev = useCallback(() => {
    setAutoPlay(false);
    prevSlide();
  }, [prevSlide]);

  // Auto-advance timer (only if autoPlay is true)
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, autoPlay]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") manualNext();
      if (e.key === "ArrowLeft") manualPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [manualNext, manualPrev]);

  useEffect(() => {
    async function loadData() {
      try {
        const [firestorePosts, firestoreProjects, carousel] = await Promise.all([
          getPublishedPosts(),
          getProjects(),
          getCarouselImages(),
        ]);

        // Filter to only top-level posts (no parent)
        const topLevelPosts = firestorePosts.filter((p) => !p.parent);
        setPosts(topLevelPosts);
        setProjects(firestoreProjects);
        setCarouselImages(carousel);
      } catch (error) {
        console.error("Error loading data:", error);
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
        <header className="mb-6">
          <h1 className="text-[--foreground] text-3xl font-bold">MARC AUGER</h1>
          <p className="text-[--muted] mt-1">hardware & software</p>
        </header>

        {/* Links */}
        <section className="mb-6 flex items-center gap-2 text-xs text-[--muted]">
          <a
            href="https://tickerbot.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[--foreground]"
          >
            tickerbot.io
          </a>
          <span>·</span>
          <a
            href="https://github.com/sosaysthecaptain"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[--foreground]"
          >
            github
          </a>
          <span>·</span>
          <Link href="/about" className="hover:text-[--foreground]">about</Link>
        </section>

        {/* Image Carousel */}
        <section className="mb-12">
          <div className="relative w-full h-[500px] border border-[--border] overflow-hidden bg-black">
            {carouselImages.map((img, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  i === currentSlide ? "opacity-100" : "opacity-0"
                }`}
              >
                {/* Blurred background */}
                <Image
                  src={img.src}
                  alt=""
                  fill
                  className="object-cover blur-2xl scale-110 opacity-60"
                  unoptimized
                />
                {/* Sharp foreground image */}
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ))}

            {/* Navigation arrows */}
            <button
              onClick={manualPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white border border-[--border] flex items-center justify-center text-[--foreground] text-xl"
              aria-label="Previous slide"
            >
              ←
            </button>
            <button
              onClick={manualNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white border border-[--border] flex items-center justify-center text-[--foreground] text-xl"
              aria-label="Next slide"
            >
              →
            </button>

            {/* Slide counter */}
            <div className="absolute bottom-3 right-3 bg-white/80 border border-[--border] px-3 py-1 text-sm text-[--foreground]">
              {currentSlide + 1} / {carouselImages.length}
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

        {/* All Posts - Substack Style */}
        <section className="mb-10">
          <h2 className="text-[--muted] text-sm mb-6 uppercase tracking-wide">Posts</h2>
          {loading ? (
            <p className="text-[--muted]">Loading...</p>
          ) : posts.length === 0 ? (
            <p className="text-[--muted]">No posts yet.</p>
          ) : (
            <>
              <div className="divide-y divide-[--border]">
                {posts
                  .slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE)
                  .map((post) => {
                    const thumbnail = getFirstImageFromContent(post.content);
                    const blurb = getBlurbFromContent(post.content);
                    return (
                      <article key={post.slug} className="py-6 first:pt-0">
                        <div className="flex gap-4">
                          {/* Thumbnail */}
                          {thumbnail && (
                            <div className="shrink-0">
                              <img
                                src={thumbnail}
                                alt=""
                                className="w-40 sm:w-52 max-h-40 object-contain rounded"
                              />
                            </div>
                          )}
                          {/* Text content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="leading-snug">
                              <Link href={`/blog/${post.slug}`} className="font-medium text-[--accent] hover:underline">
                                {post.title}
                              </Link>
                            </h3>
                            <p className="text-[--foreground] text-sm leading-relaxed mt-1 line-clamp-2 font-serif">
                              {blurb}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-xs text-[--muted]">{formatDate(post.date)}</span>
                              {post.tags && post.tags.length > 0 && (
                                <>
                                  {post.tags.slice(0, 2).map((tag, i) => {
                                    const colors = [
                                      "bg-amber-50 text-amber-700 border-amber-200",
                                      "bg-emerald-50 text-emerald-700 border-emerald-200",
                                      "bg-sky-50 text-sky-700 border-sky-200",
                                      "bg-violet-50 text-violet-700 border-violet-200",
                                      "bg-rose-50 text-rose-700 border-rose-200",
                                    ];
                                    const colorClass = colors[tag.charCodeAt(0) % colors.length];
                                    return (
                                      <span
                                        key={tag}
                                        className={`text-xs px-2 py-0.5 rounded-full border ${colorClass}`}
                                      >
                                        {tag}
                                      </span>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
              </div>

              {/* Pagination */}
              {posts.length > POSTS_PER_PAGE && (
                <div className="flex items-center justify-center gap-4 mt-10 pt-6 border-t border-[--border]">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm text-[--muted] hover:text-[--foreground] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← Newer
                  </button>
                  <span className="text-sm text-[--muted]">
                    {currentPage} / {Math.ceil(posts.length / POSTS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(Math.ceil(posts.length / POSTS_PER_PAGE), p + 1))}
                    disabled={currentPage >= Math.ceil(posts.length / POSTS_PER_PAGE)}
                    className="px-4 py-2 text-sm text-[--muted] hover:text-[--foreground] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Older →
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <Footer />
      </main>
    </div>
  );
}
