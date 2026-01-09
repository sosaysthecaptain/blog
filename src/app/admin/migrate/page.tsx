"use client";

import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { posts as hardcodedPosts } from "@/lib/posts";
import { createPost, getAllPosts } from "@/lib/firestore";
import { onAuthChange, isAdminEmail, signInWithGoogle } from "@/lib/auth";
import Link from "next/link";

export default function MigratePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [migrating, setMigrating] = useState(false);
  const [done, setDone] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      if (u && isAdminEmail(u.email)) {
        setUser(u);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleMigrate = async () => {
    setMigrating(true);
    setStatus("Checking existing posts...");

    try {
      const existingPosts = await getAllPosts();
      const existingSlugs = new Set(existingPosts.map((p) => p.slug));

      const postsToMigrate = Object.values(hardcodedPosts).filter(
        (p) => !existingSlugs.has(p.slug)
      );

      if (postsToMigrate.length === 0) {
        setStatus("All posts already migrated!");
        setDone(true);
        return;
      }

      setStatus(`Migrating ${postsToMigrate.length} posts...`);

      for (const post of postsToMigrate) {
        setStatus(`Migrating: ${post.title}`);

        // Convert image markers [IMAGE:n] to markdown images
        let content = post.content;
        if (post.images) {
          post.images.forEach((img, i) => {
            content = content.replace(
              `[IMAGE:${i}]`,
              `![${img.alt}](${img.src})`
            );
          });
        }

        // Build post data, excluding undefined fields
        const postData: Record<string, unknown> = {
          slug: post.slug,
          title: post.title,
          date: post.date || new Date().toISOString().split("T")[0],
          content,
          status: post.date ? "published" : "draft",
        };
        if (post.isProject) postData.isProject = true;
        if (post.parent) postData.parent = post.parent;

        await createPost(postData as Parameters<typeof createPost>[0]);
      }

      setStatus(`Successfully migrated ${postsToMigrate.length} posts!`);
      setDone(true);
    } catch (error) {
      console.error("Migration error:", error);
      setStatus(`Error: ${error}`);
    } finally {
      setMigrating(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[--background] flex items-center justify-center">
        <p className="text-[--muted]">Loading...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-[--background] flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-[--foreground] mb-4">
          Migrate Posts to Firestore
        </h1>
        <p className="text-[--muted] mb-8">Sign in to continue</p>
        <button
          onClick={() => signInWithGoogle()}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sign in with Google
        </button>
        <Link
          href="/admin"
          className="mt-8 text-[--muted] hover:text-[--accent] text-sm"
        >
          ← back to admin
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--background] flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold text-[--foreground] mb-4">
        Migrate Posts to Firestore
      </h1>

      <p className="text-[--muted] mb-8 text-center max-w-md">
        This will copy all hardcoded posts from src/lib/posts.ts to your Firestore database.
        Existing posts with the same slug will be skipped.
      </p>

      <div className="space-y-4 text-center">
        {!done && (
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {migrating ? "Migrating..." : "Start Migration"}
          </button>
        )}

        {status && (
          <p className="text-[--foreground]">{status}</p>
        )}

        {done && (
          <Link
            href="/admin"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Admin →
          </Link>
        )}
      </div>

      <Link
        href="/admin"
        className="mt-8 text-[--muted] hover:text-[--accent] text-sm"
      >
        ← back to admin
      </Link>
    </div>
  );
}
