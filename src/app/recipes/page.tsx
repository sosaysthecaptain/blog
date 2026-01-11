"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getPublishedRecipes, NoteItem } from "@/lib/notes";
import Footer from "@/components/Footer";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecipes() {
      try {
        const published = await getPublishedRecipes();
        setRecipes(published);
      } catch (error) {
        console.error("Error loading recipes:", error);
      } finally {
        setLoading(false);
      }
    }
    loadRecipes();
  }, []);

  return (
    <div className="min-h-screen bg-[--background]">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="text-[--muted] hover:text-[--accent] text-sm"
        >
          &larr; back
        </Link>

        <header className="mt-8 mb-8">
          <h1 className="text-2xl font-bold text-[--foreground]">Recipes</h1>
        </header>

        {loading ? (
          <p className="text-[--muted]">Loading...</p>
        ) : recipes.length === 0 ? (
          <p className="text-[--muted]">No recipes yet.</p>
        ) : (
          <div className="space-y-4">
            {recipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.slug}`}
                className="block p-4 border border-[--border] rounded hover:border-[--accent] transition-colors"
              >
                <h2 className="font-medium text-[--foreground] hover:text-[--accent]">
                  {recipe.title}
                </h2>
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
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
              </Link>
            ))}
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
}
