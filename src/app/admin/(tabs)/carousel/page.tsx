"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CarouselImage,
  getCarouselImages,
  saveCarouselImages,
} from "@/lib/firestore";
import { uploadImageFromBlob } from "@/lib/storage";

export default function CarouselPage() {
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [draggedImage, setDraggedImage] = useState<string | null>(null);

  // Load carousel images
  const loadCarousel = useCallback(async () => {
    try {
      setLoading(true);
      const images = await getCarouselImages();
      setCarouselImages(images);
    } catch (error) {
      console.error("Error loading carousel:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCarousel();
  }, [loadCarousel]);

  // Save carousel
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCarouselImages(carouselImages);
      setStatus("Saved!");
      setTimeout(() => setStatus(""), 2000);
    } catch (error: unknown) {
      console.error("Error saving carousel:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setStatus(`Failed: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // Drag handlers
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

  // Delete image
  const handleDelete = (id: string) => {
    setCarouselImages(carouselImages.filter((img) => img.id !== id));
  };

  // Add empty image
  const handleAdd = () => {
    const newId = Date.now().toString();
    setCarouselImages([...carouselImages, { id: newId, src: "", alt: "" }]);
  };

  // Update image field
  const handleUpdate = (id: string, field: "src" | "alt", value: string) => {
    setCarouselImages(
      carouselImages.map((img) =>
        img.id === id ? { ...img, [field]: value } : img
      )
    );
  };

  // Handle file drop
  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    console.log("Files to upload:", files.length);
    if (files.length === 0) return;

    setUploading(true);
    setStatus("Uploading...");

    for (const file of files) {
      try {
        console.log("Uploading file:", file.name, file.type);
        const url = await uploadImageFromBlob(file, `carousel-${Date.now()}`);
        console.log("Got URL:", url);
        const newId = Date.now().toString();
        const newImage = { id: newId, src: url, alt: file.name.replace(/\.[^/.]+$/, "") };
        console.log("Adding image to state:", newImage);
        setCarouselImages((prev) => {
          console.log("Previous images:", prev.length);
          const updated = [...prev, newImage];
          console.log("Updated images:", updated.length);
          return updated;
        });
      } catch (error) {
        console.error("Upload error:", error);
        setStatus("Upload failed");
      }
    }

    setUploading(false);
    setStatus("Uploaded!");
    setTimeout(() => setStatus(""), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[--muted]">Loading carousel...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen bg-white overflow-y-auto">
      <div className="p-6 border-b border-[--border] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[--foreground]">Carousel Images</h1>
          <p className="text-sm text-[--muted] mt-1">
            Drag to reorder. These images appear on the homepage carousel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status && <span className="text-sm text-[--muted]">{status}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Carousel"}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {carouselImages.map((img, index) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => handleDragStart(img.id)}
              onDragOver={(e) => handleDragOver(e, img.id)}
              onDragEnd={handleDragEnd}
              className={`border border-[--border] rounded-lg overflow-hidden bg-white transition-all ${
                draggedImage === img.id
                  ? "opacity-50 ring-2 ring-blue-400"
                  : "hover:shadow-md"
              }`}
            >
              <div className="aspect-video bg-gray-100 relative cursor-move">
                {img.src ? (
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg
                      className="w-12 h-12"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
                <button
                  onClick={() => handleDelete(img.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded hover:bg-red-600"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={img.alt}
                  onChange={(e) => handleUpdate(img.id, "alt", e.target.value)}
                  placeholder="Image title / alt text"
                  className="w-full text-sm p-2 border border-[--border] rounded"
                />
                <input
                  type="text"
                  value={img.src}
                  onChange={(e) => handleUpdate(img.id, "src", e.target.value)}
                  placeholder="Image URL"
                  className="w-full text-xs p-2 border border-[--border] rounded bg-gray-50"
                />
              </div>
            </div>
          ))}

          {/* Add new image card - drop zone */}
          <div
            onClick={handleAdd}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("border-blue-400", "text-blue-600");
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("border-blue-400", "text-blue-600");
            }}
            onDrop={(e) => {
              e.currentTarget.classList.remove("border-blue-400", "text-blue-600");
              handleFileDrop(e);
            }}
            className="border-2 border-dashed border-[--border] rounded-lg aspect-video flex flex-col items-center justify-center text-[--muted] hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
          >
            {uploading ? (
              <span className="text-sm">Uploading...</span>
            ) : (
              <>
                <svg
                  className="w-8 h-8 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-sm">Drop image or click to add</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
