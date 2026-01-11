"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getPublishedRecipeBySlug, NoteItem } from "@/lib/notes";
import Footer from "@/components/Footer";
import ImageLightbox, { extractImagesFromHtml } from "@/components/ImageLightbox";

export default function RecipeClient() {
  const params = useParams();
  const slug = params.slug as string;
  const [recipe, setRecipe] = useState<NoteItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Extract images for lightbox
  const allImages = useMemo(
    () => (recipe ? extractImagesFromHtml(recipe.content || "") : []),
    [recipe]
  );

  const openLightbox = useCallback(
    (src: string) => {
      const index = allImages.indexOf(src);
      setLightboxIndex(index >= 0 ? index : 0);
      setLightboxOpen(true);
    },
    [allImages]
  );

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const nextImage = useCallback(
    () => setLightboxIndex((i) => (i + 1) % allImages.length),
    [allImages.length]
  );
  const prevImage = useCallback(
    () => setLightboxIndex((i) => (i - 1 + allImages.length) % allImages.length),
    [allImages.length]
  );

  // Handle image clicks via event delegation
  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        const src = target.getAttribute("src");
        if (src) {
          openLightbox(src);
        }
      }
    };

    const container = document.querySelector(".recipe-content");
    container?.addEventListener("click", handleClick);
    return () => container?.removeEventListener("click", handleClick);
  }, [openLightbox]);

  useEffect(() => {
    async function loadRecipe() {
      try {
        const data = await getPublishedRecipeBySlug(slug);
        if (data) {
          setRecipe(data);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error("Error loading recipe:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadRecipe();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[--background] flex items-center justify-center">
        <p className="text-[--muted]">Loading...</p>
      </div>
    );
  }

  if (notFound || !recipe) {
    return (
      <div className="min-h-screen bg-[--background] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-[--foreground] mb-4">Not Found</h1>
        <Link href="/recipes" className="text-[--accent] hover:underline">
          &larr; back to recipes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--background]">
      <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-12">
        <Link
          href="/recipes"
          className="flex items-center gap-2 text-sm text-[--muted] hover:text-[--foreground]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to recipes
        </Link>

        {/* Title - styled like editor */}
        <h1 className="mt-6 text-2xl md:text-4xl font-bold text-[--foreground] mb-2 font-serif">
          {recipe.title}
        </h1>

        {/* Date */}
        {recipe.date && (
          <div className="text-sm text-[--muted] italic mb-6">
            {recipe.date}
          </div>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded bg-[--hover] text-[--muted]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[--border] mb-8" />

        {/* Content - styled like TiptapEditor */}
        <div
          className="recipe-content recipe-prose font-serif"
          dangerouslySetInnerHTML={{ __html: recipe.content || "" }}
        />

        <Footer />
      </main>

      {/* Image Lightbox */}
      {lightboxOpen && allImages.length > 0 && (
        <ImageLightbox
          images={allImages}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}

      <style jsx global>{`
        .recipe-prose {
          font-family: var(--font-serif), Georgia, serif;
          font-size: 1.125rem;
          line-height: 1.75;
          color: var(--foreground);
        }
        .recipe-prose h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          line-height: 1.2;
        }
        .recipe-prose h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }
        .recipe-prose h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        .recipe-prose p {
          margin: 1rem 0;
        }
        .recipe-prose ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .recipe-prose ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .recipe-prose li {
          margin: 0.25rem 0;
        }
        .recipe-prose li p {
          margin: 0;
        }
        .recipe-prose blockquote {
          border-left: 3px solid var(--border);
          padding-left: 1rem;
          margin: 1.5rem 0;
          color: var(--muted);
          font-style: italic;
        }
        .recipe-prose pre {
          background: #2d2d2d;
          color: #f8f8f2;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: 0.875rem;
          margin: 1.5rem 0;
        }
        .recipe-prose code {
          background: rgba(0, 0, 0, 0.08);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: 0.9em;
        }
        .recipe-prose pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
        }
        .recipe-prose a {
          color: var(--accent);
          text-decoration: underline;
        }
        .recipe-prose hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 2rem 0;
        }
        .recipe-prose strong {
          font-weight: 700;
        }
        .recipe-prose em {
          font-style: italic;
        }
        .recipe-prose figure {
          margin: 1.5rem 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .recipe-prose figure img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .recipe-prose figure img:hover {
          opacity: 0.9;
        }
        .recipe-prose figcaption {
          margin-top: 8px;
          font-size: 14px;
          color: var(--muted);
        }
        .recipe-prose img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          cursor: pointer;
        }

        /* Dark mode adjustments */
        :root.dark .recipe-prose code {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
