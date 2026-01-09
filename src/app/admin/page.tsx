"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { User } from "firebase/auth";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
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

// Carousel image interface
interface CarouselImage {
  id: string;
  src: string;
  alt: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Tab state: "cms" or "carousel"
  const [activeTab, setActiveTab] = useState<"cms" | "carousel">("cms");

  // Carousel state
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([
    { id: "1", src: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=600&fit=crop", alt: "Circuit board closeup" },
    { id: "2", src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=600&fit=crop", alt: "3D printing in action" },
    { id: "3", src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=600&fit=crop", alt: "Technology abstract" },
    { id: "4", src: "https://images.unsplash.com/photo-1504610926078-a1611febcad3?w=1200&h=600&fit=crop", alt: "Space and stars" },
  ]);
  const [draggedImage, setDraggedImage] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [isProject, setIsProject] = useState(false);
  const [parent, setParent] = useState("");

  // Original values for dirty checking
  const [originalValues, setOriginalValues] = useState({
    title: "",
    slug: "",
    content: "",
    date: "",
    isProject: false,
    parent: "",
  });

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check if form has unsaved changes
  const isDirty = useMemo(() => {
    if (isNew) return true;
    return (
      title !== originalValues.title ||
      slug !== originalValues.slug ||
      content !== originalValues.content ||
      date !== originalValues.date ||
      isProject !== originalValues.isProject ||
      parent !== originalValues.parent
    );
  }, [title, slug, content, date, isProject, parent, originalValues, isNew]);

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

  // Generate slug from title (preserve existing hyphens, convert spaces/special chars to hyphens)
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
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
    setOriginalValues({
      title: "",
      slug: "",
      content: "",
      date: new Date().toISOString().split("T")[0],
      isProject: false,
      parent: "",
    });
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
    setOriginalValues({
      title: post.title,
      slug: post.slug,
      content: post.content,
      date: post.date,
      isProject: post.isProject || false,
      parent: post.parent || "",
    });
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

      const postData: Record<string, unknown> = {
        title,
        slug,
        content,
        date,
        isProject,
        status: "draft" as const,
      };
      if (parent) postData.parent = parent;

      if (isNew) {
        const id = await createPost(postData as Parameters<typeof createPost>[0]);
        setSelectedPost({ ...postData, id, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        setIsNew(false);
      } else if (selectedPost?.id) {
        await updatePost(selectedPost.id, postData);
      }

      await loadPosts();
      setOriginalValues({ title, slug, content, date, isProject, parent });
      setStatus("Draft saved!");
      setTimeout(() => setStatus(""), 2000);
    } catch (error: unknown) {
      console.error("Save error:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setStatus(`Failed to save: ${errorMsg}`);
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

      const postData: Record<string, unknown> = {
        title,
        slug,
        content,
        date,
        isProject,
        status: "published" as const,
      };
      if (parent) postData.parent = parent;

      if (isNew) {
        const id = await createPost(postData as Parameters<typeof createPost>[0]);
        setSelectedPost({ ...postData, id, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        setIsNew(false);
      } else if (selectedPost?.id) {
        await updatePost(selectedPost.id, postData);
      }

      await loadPosts();
      setOriginalValues({ title, slug, content, date, isProject, parent });
      setStatus(selectedPost?.status === "published" ? "Updated!" : "Published!");
      setTimeout(() => setStatus(""), 2000);
    } catch (error: unknown) {
      console.error("Publish error:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setStatus(`Failed to publish: ${errorMsg}`);
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

  // Carousel handlers
  const handleDragStart = (id: string) => {
    setDraggedImage(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedImage || draggedImage === targetId) return;

    const newImages = [...carouselImages];
    const draggedIdx = newImages.findIndex((img) => img.id === draggedImage);
    const targetIdx = newImages.findIndex((img) => img.id === targetId);

    const [removed] = newImages.splice(draggedIdx, 1);
    newImages.splice(targetIdx, 0, removed);
    setCarouselImages(newImages);
  };

  const handleDragEnd = () => {
    setDraggedImage(null);
  };

  const handleDeleteCarouselImage = (id: string) => {
    setCarouselImages(carouselImages.filter((img) => img.id !== id));
  };

  const handleAddCarouselImage = () => {
    const newId = Date.now().toString();
    setCarouselImages([
      ...carouselImages,
      { id: newId, src: "", alt: "" },
    ]);
  };

  const handleUpdateCarouselImage = (id: string, field: "src" | "alt", value: string) => {
    setCarouselImages(
      carouselImages.map((img) =>
        img.id === id ? { ...img, [field]: value } : img
      )
    );
  };

  return (
    <div className="min-h-screen bg-[--background] flex">
      {/* Vertical Tab Bar */}
      <div className="w-14 bg-gray-50 border-r border-[--border] flex flex-col h-screen">
        <button
          onClick={() => setActiveTab("cms")}
          className={`p-4 transition-colors ${
            activeTab === "cms"
              ? "bg-white text-blue-600 border-r-2 border-blue-600"
              : "text-[--muted] hover:bg-gray-100"
          }`}
          title="Posts"
        >
          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        <button
          onClick={() => setActiveTab("carousel")}
          className={`p-4 transition-colors ${
            activeTab === "carousel"
              ? "bg-white text-blue-600 border-r-2 border-blue-600"
              : "text-[--muted] hover:bg-gray-100"
          }`}
          title="Carousel"
        >
          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <div className="flex-1" />
        <Link
          href="/"
          className="p-4 text-[--muted] hover:text-[--accent] transition-colors"
          title="Back to site"
        >
          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Link>
        <button
          onClick={handleSignOut}
          className="p-4 text-[--muted] hover:text-red-500 transition-colors"
          title="Sign out"
        >
          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="w-64 border-r border-[--border] flex flex-col h-screen bg-white">
        {activeTab === "cms" ? (
          <>
            <div className="p-4 border-b border-[--border]">
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
                  className={`w-full text-left px-4 py-3 border-b border-[--border] hover:bg-blue-50 transition-colors ${
                    selectedPost?.id === post.id
                      ? "bg-blue-50 border-l-4 border-l-blue-600 pl-3"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        post.status === "published" ? "bg-green-500" : "bg-yellow-500"
                      }`}
                    />
                    <span className={`text-sm font-medium truncate ${
                      selectedPost?.id === post.id ? "text-blue-700" : "text-[--foreground]"
                    }`}>
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
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-[--border]">
              <h2 className="font-medium text-[--foreground]">Carousel</h2>
              <p className="text-xs text-[--muted] mt-1">Drag to reorder</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {carouselImages.map((img, index) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(img.id)}
                  onDragOver={(e) => handleDragOver(e, img.id)}
                  onDragEnd={handleDragEnd}
                  className={`border-b border-[--border] transition-all ${
                    draggedImage === img.id ? "opacity-50 bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 p-3 cursor-move">
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                    {img.src ? (
                      <img src={img.src} alt={img.alt} className="w-12 h-8 object-cover rounded flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-8 bg-gray-200 rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={img.alt}
                        onChange={(e) => handleUpdateCarouselImage(img.id, "alt", e.target.value)}
                        placeholder={`Image ${index + 1}`}
                        className="w-full text-sm bg-transparent border-none focus:outline-none text-[--foreground] truncate"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteCarouselImage(img.id)}
                      className="text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="px-3 pb-3">
                    <input
                      type="text"
                      value={img.src}
                      onChange={(e) => handleUpdateCarouselImage(img.id, "src", e.target.value)}
                      placeholder="Image URL"
                      className="w-full text-xs p-2 border border-[--border] rounded bg-gray-50"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[--border]">
              <button
                onClick={handleAddCarouselImage}
                className="w-full px-4 py-2 border border-dashed border-[--border] rounded text-sm text-[--muted] hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                + Add Image
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main editor */}
      <div className="flex-1 flex flex-col h-screen">
        {(selectedPost || isNew) ? (
          <>
            {/* Toolbar */}
            <div className="p-4 border-b border-[--border] flex items-center gap-4">
              <button
                onClick={handleSaveDraft}
                disabled={saving || !isDirty}
                className="px-4 py-2 border border-[--border] rounded text-sm text-[--foreground] hover:bg-[--border]/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Draft
              </button>
              <button
                onClick={handlePublish}
                disabled={saving || (selectedPost?.status === "published" && !isDirty)}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedPost?.status === "published" ? "Update" : "Publish"}
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
              {isDirty && !isNew && (
                <span className="text-xs text-orange-500">Unsaved changes</span>
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
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-[--muted]">
                      Content <span className="text-xs">(paste images directly)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {showPreview ? "Edit" : "Preview"}
                    </button>
                  </div>
                  {showPreview ? (
                    <div className="w-full min-h-96 px-4 py-3 border border-[--border] rounded bg-white overflow-y-auto">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-bold mt-6 mb-3">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>,
                          p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
                          a: ({ href, children }) => <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                          pre: ({ children }) => <pre className="bg-gray-100 p-4 rounded overflow-x-auto my-4 text-sm">{children}</pre>,
                          ul: ({ children }) => <ul className="list-disc list-inside my-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside my-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-600">{children}</blockquote>,
                          img: ({ src, alt }) => (
                            <figure className="my-4">
                              <img src={src} alt={alt || ""} className="max-w-full h-auto border border-gray-200 rounded" style={{ width: 'auto' }} />
                              {alt && <figcaption className="text-sm text-gray-500 mt-1 text-center">{alt}</figcaption>}
                            </figure>
                          ),
                        }}
                      >
                        {content || "*No content to preview*"}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onPaste={handlePaste}
                      className="w-full h-96 px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground] font-mono text-sm resize-y"
                      placeholder="Write your post content here. Use markdown syntax. Paste images directly."
                    />
                  )}
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
