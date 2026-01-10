"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Post,
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
  slugExists,
  getAllTags,
} from "@/lib/firestore";
import { uploadImageFromBlob, deletePostImages } from "@/lib/storage";
import { Timestamp } from "firebase/firestore";
import JSZip from "jszip";

export default function CMSPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [isProject, setIsProject] = useState(false);
  const [parent, setParent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagDropdownIndex, setTagDropdownIndex] = useState(0);

  // Original values for dirty checking
  const [originalValues, setOriginalValues] = useState({
    title: "",
    slug: "",
    content: "",
    date: "",
    isProject: false,
    parent: "",
    tags: [] as string[],
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
      parent !== originalValues.parent ||
      JSON.stringify(tags) !== JSON.stringify(originalValues.tags)
    );
  }, [title, slug, content, date, isProject, parent, tags, originalValues, isNew]);

  // Load posts and tags
  const loadPosts = useCallback(async () => {
    try {
      const [allPosts, allTags] = await Promise.all([
        getAllPosts(),
        getAllTags(),
      ]);
      setPosts(allPosts);
      setAvailableTags(allTags);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Generate slug from title
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
    setTags([]);
    setTagInput("");
    setStatus("");
    setOriginalValues({
      title: "",
      slug: "",
      content: "",
      date: new Date().toISOString().split("T")[0],
      isProject: false,
      parent: "",
      tags: [],
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
    setTags(post.tags || []);
    setTagInput("");
    setStatus("");
    setOriginalValues({
      title: post.title,
      slug: post.slug,
      content: post.content,
      date: post.date,
      isProject: post.isProject || false,
      parent: post.parent || "",
      tags: post.tags || [],
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
        tags,
        status: "draft" as const,
      };
      if (parent) postData.parent = parent;

      if (isNew) {
        const id = await createPost(postData as Parameters<typeof createPost>[0]);
        setSelectedPost({
          slug,
          title,
          date,
          content,
          isProject,
          tags,
          parent: parent || undefined,
          status: "draft",
          id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        } as Post);
        setIsNew(false);
      } else if (selectedPost?.id) {
        await updatePost(selectedPost.id, postData);
      }

      await loadPosts();
      setOriginalValues({ title, slug, content, date, isProject, parent, tags });
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
        tags,
        status: "published" as const,
      };
      if (parent) postData.parent = parent;

      if (isNew) {
        const id = await createPost(postData as Parameters<typeof createPost>[0]);
        setSelectedPost({
          slug,
          title,
          date,
          content,
          isProject,
          tags,
          parent: parent || undefined,
          status: "published",
          id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        } as Post);
        setIsNew(false);
      } else if (selectedPost?.id) {
        await updatePost(selectedPost.id, postData);
      }

      await loadPosts();
      setOriginalValues({ title, slug, content, date, isProject, parent, tags });
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

  // Unpublish (convert to draft)
  const handleUnpublish = async () => {
    if (!selectedPost?.id) return;
    if (!confirm("Unpublish this post? It will become a draft.")) return;

    setSaving(true);
    setStatus("Unpublishing...");

    try {
      await updatePost(selectedPost.id, { status: "draft" });
      await loadPosts();
      setSelectedPost({ ...selectedPost, status: "draft" });
      setOriginalValues({ ...originalValues });
      setStatus("Unpublished!");
      setTimeout(() => setStatus(""), 2000);
    } catch (error: unknown) {
      console.error("Unpublish error:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setStatus(`Failed to unpublish: ${errorMsg}`);
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

  // Export all posts as zip with images
  const handleExportAll = async () => {
    setStatus("Preparing export...");

    try {
      const zip = new JSZip();
      const imagesFolder = zip.folder("images");
      const publishedPosts = posts.filter((p) => p.status === "published");
      const imageMap: Record<string, string> = {};

      const allImageUrls = new Set<string>();
      for (const post of publishedPosts) {
        const imageMatches = post.content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
        for (const match of imageMatches) {
          const url = match[2];
          if (url.startsWith("http")) {
            allImageUrls.add(url);
          }
        }
      }

      setStatus(`Downloading ${allImageUrls.size} images...`);
      let imageCount = 0;
      for (const url of allImageUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const blob = await response.blob();
            const urlPath = new URL(url).pathname;
            const ext = urlPath.split(".").pop()?.split("?")[0] || "jpg";
            const filename = `image-${imageCount}.${ext}`;
            imageMap[url] = filename;
            imagesFolder?.file(filename, blob);
            imageCount++;
          }
        } catch (e) {
          console.warn(`Failed to download: ${url}`, e);
        }
      }

      for (const post of publishedPosts) {
        let postContent = post.content;

        for (const [url, filename] of Object.entries(imageMap)) {
          postContent = postContent.replace(
            new RegExp(`!\\[([^\\]]*)\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`, "g"),
            `![$1](./images/${filename})`
          );
        }

        let markdown = `---
title: "${post.title}"
slug: "${post.slug}"
date: "${post.date}"
${post.isProject ? "isProject: true" : ""}
${post.parent ? `parent: "${post.parent}"` : ""}
---

${postContent}`;

        zip.file(`${post.slug}.md`, markdown);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blog-export-${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus(`Export complete! ${imageCount} images included.`);
      setTimeout(() => setStatus(""), 3000);
    } catch (error) {
      console.error("Export error:", error);
      setStatus("Export failed");
    }
  };

  const projectPosts = posts.filter((p) => p.isProject);

  return (
    <>
      {/* Sidebar */}
      <div className="w-64 border-r border-[--border] flex flex-col h-screen bg-white">
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
              {selectedPost?.status === "published" && !isNew && (
                <button
                  onClick={handleUnpublish}
                  disabled={saving}
                  className="px-4 py-2 text-orange-500 text-sm hover:underline disabled:opacity-50"
                >
                  Unpublish
                </button>
              )}
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
                  <label className="block text-sm text-[--muted] mb-1">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setTags(tags.filter((t) => t !== tag))}
                          className="hover:text-gray-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    {(() => {
                      const filteredTags = availableTags.filter(
                        (t) => !tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase())
                      );
                      const showCreate = tagInput.trim() && !availableTags.some((t) => t.toLowerCase() === tagInput.toLowerCase());
                      const totalItems = filteredTags.length + (showCreate ? 1 : 0);

                      return (
                        <>
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => {
                              setTagInput(e.target.value);
                              setTagDropdownIndex(0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setTagDropdownIndex((i) => Math.min(i + 1, totalItems - 1));
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setTagDropdownIndex((i) => Math.max(i - 1, 0));
                              } else if (e.key === "Enter" && tagInput.trim()) {
                                e.preventDefault();
                                if (tagDropdownIndex < filteredTags.length) {
                                  const selectedTag = filteredTags[tagDropdownIndex];
                                  if (!tags.includes(selectedTag)) {
                                    setTags([...tags, selectedTag]);
                                  }
                                } else {
                                  const newTag = tagInput.trim().toLowerCase();
                                  if (!tags.includes(newTag)) {
                                    setTags([...tags, newTag]);
                                  }
                                }
                                setTagInput("");
                                setTagDropdownIndex(0);
                              } else if (e.key === "Escape") {
                                setTagInput("");
                                setTagDropdownIndex(0);
                              }
                            }}
                            className="w-full px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground]"
                            placeholder="Type to add or search tags..."
                          />
                          {/* Autocomplete dropdown */}
                          {tagInput.trim() && (
                            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[--border] rounded shadow-lg max-h-48 overflow-y-auto">
                              {filteredTags.map((tag, idx) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => {
                                    setTags([...tags, tag]);
                                    setTagInput("");
                                    setTagDropdownIndex(0);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                    idx === tagDropdownIndex ? "bg-gray-100" : "hover:bg-gray-50"
                                  }`}
                                >
                                  {tag}
                                </button>
                              ))}
                              {showCreate && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTag = tagInput.trim().toLowerCase();
                                    if (!tags.includes(newTag)) {
                                      setTags([...tags, newTag]);
                                    }
                                    setTagInput("");
                                    setTagDropdownIndex(0);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm text-[--muted] transition-colors border-t border-[--border] ${
                                    tagDropdownIndex === filteredTags.length ? "bg-gray-100" : "hover:bg-gray-50"
                                  }`}
                                >
                                  Create "{tagInput.trim().toLowerCase()}"
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
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
    </>
  );
}
