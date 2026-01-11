"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import { getPublishedRecipes, NoteItem } from "@/lib/notes";
import ImageLightbox, { extractImagesFromHtml } from "@/components/ImageLightbox";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<NoteItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Extract images for lightbox
  const allImages = useMemo(
    () => (selectedRecipe ? extractImagesFromHtml(selectedRecipe.content || "") : []),
    [selectedRecipe]
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
  }, [openLightbox, selectedRecipe]);

  useEffect(() => {
    async function loadRecipes() {
      try {
        const published = await getPublishedRecipes();
        setRecipes(published);
        // Auto-select first recipe if available
        if (published.length > 0) {
          setSelectedRecipe(published[0]);
        }
      } catch (error) {
        console.error("Error loading recipes:", error);
      } finally {
        setLoading(false);
      }
    }
    loadRecipes();
  }, []);

  // Filter recipes by search query
  const filteredRecipes = useMemo(() => {
    if (!searchQuery) return recipes;
    const q = searchQuery.toLowerCase();
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.tags?.some((t) => t.toLowerCase().includes(q)) ||
        r.content?.toLowerCase().includes(q)
    );
  }, [recipes, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[--background] flex items-center justify-center">
        <p className="text-[--muted]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[--background] flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[--sidebar-bg] border-r border-[--border] flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[--border]">
          <Link href="/" className="font-medium text-sm text-[--foreground] hover:text-[--accent]">
            &larr; home
          </Link>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-[--border]">
          <div className="relative">
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--muted]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 pr-2 py-1 text-xs bg-[--background] border border-[--border] rounded focus:outline-none focus:border-[--accent] text-[--foreground] placeholder:text-[--muted]"
            />
          </div>
        </div>

        {/* Recipe List */}
        <div className="flex-1 overflow-y-auto py-1">
          {filteredRecipes.map((recipe) => (
            <button
              key={recipe.id}
              type="button"
              onClick={() => setSelectedRecipe(recipe)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                selectedRecipe?.id === recipe.id ? "" : "hover:bg-[--hover]"
              }`}
              style={{
                backgroundColor: selectedRecipe?.id === recipe.id ? 'var(--accent-muted)' : undefined,
                color: selectedRecipe?.id === recipe.id ? 'white' : 'var(--foreground)',
              }}
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="truncate">{recipe.title}</span>
            </button>
          ))}
          {filteredRecipes.length === 0 && (
            <p className="text-center text-xs text-[--muted] py-8">
              {searchQuery ? "No matches found" : "No recipes yet"}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full overflow-y-auto bg-[--background]">
        {selectedRecipe ? (
          <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-12">
            {/* Title */}
            <h1 className="text-2xl md:text-4xl font-bold text-[--foreground] mb-2 font-serif">
              {selectedRecipe.title}
            </h1>

            {/* Date */}
            {selectedRecipe.date && (
              <div className="text-sm text-[--muted] italic mb-6">
                {selectedRecipe.date}
              </div>
            )}

            {/* Tags */}
            {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {selectedRecipe.tags.map((tag) => (
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

            {/* Content */}
            <div
              className="recipe-content recipe-prose font-serif"
              dangerouslySetInnerHTML={{ __html: selectedRecipe.content || "" }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[--muted]">Select a recipe to view</p>
          </div>
        )}
      </div>

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
