"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { User } from "firebase/auth";
import Link from "next/link";
import {
  signInWithGoogle,
  signOut,
  onAuthChange,
  isAdminEmail,
} from "@/lib/auth";
import {
  Post,
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
  slugExists,
} from "@/lib/firestore";
import { uploadImageFromBlob, deletePostImages } from "@/lib/storage";
import { Timestamp } from "firebase/firestore";
import JSZip from "jszip";

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [isProject, setIsProject] = useState(false);
  const [parent, setParent] = useState("");

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      if (u && isAdminEmail(u.email)) {
        setUser(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Load posts
  const loadPosts = useCallback(async () => {
    try {
      const allPosts = await getAllPosts();
      setPosts(allPosts);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadPosts();
    }
  }, [user, loadPosts]);

  // Generate slug from title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // New post
  const handleNewPost = () => {
    setSelectedPost(null);
    setIsNew(true);
    setTitle("");
    setSlug("");
    setContent("");
    setDate(new Date().toISOString().split("T")[0]);
    setIsProject(false);
    setParent("");
    setStatus("");
  };

  // Select post for editing
  const handleSelectPost = (post: Post) => {
    setSelectedPost(post);
    setIsNew(false);
    setTitle(post.title);
    setSlug(post.slug);
    setContent(post.content);
    setDate(post.date);
    setIsProject(post.isProject || false);
    setParent(post.parent || "");
    setStatus("");
  };

  // Handle image paste
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;

        const currentSlug = slug || "temp-" + Date.now();
        setStatus("Uploading image...");

        try {
          const url = await uploadImageFromBlob(blob, currentSlug);
          // Insert image markdown at cursor
          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent =
              content.slice(0, start) +
              `\n![Image](${url})\n` +
              content.slice(end);
            setContent(newContent);
          } else {
            setContent(content + `\n![Image](${url})\n`);
          }
          setStatus("Image uploaded!");
          setTimeout(() => setStatus(""), 2000);
        } catch (error) {
          console.error("Upload error:", error);
          setStatus("Failed to upload image");
        }
      }
    }
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!title || !slug) {
      setStatus("Title and slug are required");
      return;
    }

    setSaving(true);
    setStatus("Saving draft...");

    try {
      // Check slug uniqueness
      const exists = await slugExists(slug, selectedPost?.id);
      if (exists) {
        setStatus("Slug already exists");
        setSaving(false);
        return;
      }

      const postData = {
        title,
        slug,
        content,
        date,
        isProject,
        parent: parent || undefined,
        status: "draft" as const,
      };

      if (isNew) {
        const id = await createPost(postData);
        setSelectedPost({ ...postData, id, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        setIsNew(false);
      } else if (selectedPost?.id) {
        await updatePost(selectedPost.id, postData);
      }

      await loadPosts();
      setStatus("Draft saved!");
      setTimeout(() => setStatus(""), 2000);
    } catch (error) {
      console.error("Save error:", error);
      setStatus("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Publish
  const handlePublish = async () => {
    if (!title || !slug) {
      setStatus("Title and slug are required");
      return;
    }

    setSaving(true);
    setStatus("Publishing...");

    try {
      const exists = await slugExists(slug, selectedPost?.id);
      if (exists) {
        setStatus("Slug already exists");
        setSaving(false);
        return;
      }

      const postData = {
        title,
        slug,
        content,
        date,
        isProject,
        parent: parent || undefined,
        status: "published" as const,
      };

      if (isNew) {
        const id = await createPost(postData);
        setSelectedPost({ ...postData, id, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        setIsNew(false);
      } else if (selectedPost?.id) {
        await updatePost(selectedPost.id, postData);
      }

      await loadPosts();
      setStatus("Published!");
      setTimeout(() => setStatus(""), 2000);
    } catch (error) {
      console.error("Publish error:", error);
      setStatus("Failed to publish");
    } finally {
      setSaving(false);
    }
  };

  // Delete post
  const handleDelete = async () => {
    if (!selectedPost?.id) return;
    if (!confirm("Are you sure you want to delete this post?")) return;

    setSaving(true);
    setStatus("Deleting...");

    try {
      await deletePostImages(selectedPost.slug);
      await deletePost(selectedPost.id);
      await loadPosts();
      handleNewPost();
      setStatus("Deleted!");
      setTimeout(() => setStatus(""), 2000);
    } catch (error) {
      console.error("Delete error:", error);
      setStatus("Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  // Export all posts as zip
  const handleExportAll = async () => {
    setStatus("Preparing export...");

    try {
      const zip = new JSZip();
      const publishedPosts = posts.filter((p) => p.status === "published");

      for (const post of publishedPosts) {
        // Create markdown content
        let markdown = `---
title: "${post.title}"
slug: "${post.slug}"
date: "${post.date}"
${post.isProject ? "isProject: true" : ""}
${post.parent ? `parent: "${post.parent}"` : ""}
---

${post.content}`;

        zip.file(`${post.slug}.md`, markdown);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blog-export-${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus("Export complete!");
      setTimeout(() => setStatus(""), 2000);
    } catch (error) {
      console.error("Export error:", error);
      setStatus("Export failed");
    }
  };

  // Auth handlers
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in error:", error);
      setStatus("Sign in failed - unauthorized email");
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[--background] flex items-center justify-center">
        <p className="text-[--muted]">Loading...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-[--background] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-[--foreground] mb-8">Admin</h1>
        <button
          onClick={handleSignIn}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sign in with Google
        </button>
        <Link href="/" className="mt-8 text-[--muted] hover:text-[--accent] text-sm">
          ← back to site
        </Link>
      </div>
    );
  }

  // Projects for parent dropdown
  const projectPosts = posts.filter((p) => p.isProject);

  return (
    <div className="min-h-screen bg-[--background] flex">
      {/* Sidebar */}
      <div className="w-72 border-r border-[--border] flex flex-col h-screen">
        <div className="p-4 border-b border-[--border]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-bold text-[--foreground]">Admin</h1>
            <button
              onClick={handleSignOut}
              className="text-xs text-[--muted] hover:text-[--accent]"
            >
              Sign out
            </button>
          </div>
          <button
            onClick={handleNewPost}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            + New Post
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => handleSelectPost(post)}
              className={`w-full text-left px-4 py-3 border-b border-[--border] hover:bg-[--border]/50 ${
                selectedPost?.id === post.id ? "bg-[--border]/50" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    post.status === "published" ? "bg-green-500" : "bg-yellow-500"
                  }`}
                />
                <span className="text-sm font-medium text-[--foreground] truncate">
                  {post.title || "Untitled"}
                </span>
              </div>
              <div className="text-xs text-[--muted] mt-1">
                {post.date} {post.isProject && "• Project"}
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[--border]">
          <button
            onClick={handleExportAll}
            className="w-full px-4 py-2 border border-[--border] rounded text-sm text-[--foreground] hover:bg-[--border]/50"
          >
            Export All
          </button>
          <Link
            href="/"
            className="block text-center mt-2 text-xs text-[--muted] hover:text-[--accent]"
          >
            ← back to site
          </Link>
        </div>
      </div>

      {/* Main editor */}
      <div className="flex-1 flex flex-col h-screen">
        {(selectedPost || isNew) ? (
          <>
            {/* Toolbar */}
            <div className="p-4 border-b border-[--border] flex items-center gap-4">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-4 py-2 border border-[--border] rounded text-sm text-[--foreground] hover:bg-[--border]/50 disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                onClick={handlePublish}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Publish
              </button>
              {selectedPost && !isNew && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2 text-red-500 text-sm hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              )}
              {status && (
                <span className="text-sm text-[--muted]">{status}</span>
              )}
              <div className="flex-1" />
              {selectedPost?.status === "published" && (
                <Link
                  href={`/blog/${selectedPost.slug}`}
                  target="_blank"
                  className="text-sm text-[--accent] hover:underline"
                >
                  View post →
                </Link>
              )}
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl space-y-4">
                <div>
                  <label className="block text-sm text-[--muted] mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (isNew && !slug) {
                        setSlug(generateSlug(e.target.value));
                      }
                    }}
                    className="w-full px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground]"
                    placeholder="Post title"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-[--muted] mb-1">Slug</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(generateSlug(e.target.value))}
                      className="w-full px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground]"
                      placeholder="post-slug"
                    />
                  </div>
                  <div className="w-40">
                    <label className="block text-sm text-[--muted] mb-1">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <label className="flex items-center gap-2 text-sm text-[--foreground]">
                    <input
                      type="checkbox"
                      checked={isProject}
                      onChange={(e) => setIsProject(e.target.checked)}
                      className="rounded"
                    />
                    Is Project
                  </label>
                  {!isProject && (
                    <div className="flex-1">
                      <label className="block text-sm text-[--muted] mb-1">Parent Project</label>
                      <select
                        value={parent}
                        onChange={(e) => setParent(e.target.value)}
                        className="w-full px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground]"
                      >
                        <option value="">None</option>
                        {projectPosts.map((p) => (
                          <option key={p.id} value={p.slug}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-[--muted] mb-1">
                    Content <span className="text-xs">(paste images directly)</span>
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onPaste={handlePaste}
                    className="w-full h-96 px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground] font-mono text-sm resize-y"
                    placeholder="Write your post content here. Use markdown syntax. Paste images directly."
                  />
                </div>

                <div className="text-xs text-[--muted] space-y-1">
                  <p>Markdown supported: ## Headings, **bold**, *italic*, [links](url), ![images](url)</p>
                  <p>Tree lists: ├─ item, └─ last item</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[--muted]">
            Select a post or create a new one
          </div>
        )}
      </div>
    </div>
  );
}
