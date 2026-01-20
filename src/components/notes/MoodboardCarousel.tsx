"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MoodboardImage } from "@/lib/notes";
import { normalizeB2Url } from "@/lib/b2-client";

interface MoodboardCarouselProps {
  images: MoodboardImage[];
  initialIndex: number;
  onClose: () => void;
  onUpdateCaption?: (imageId: string, caption: string) => void;
}

export default function MoodboardCarousel({
  images,
  initialIndex,
  onClose,
  onUpdateCaption,
}: MoodboardCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionValue, setCaptionValue] = useState("");
  const captionInputRef = useRef<HTMLInputElement>(null);

  const currentImage = images[currentIndex];

  // Navigate to previous image
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setIsEditingCaption(false);
  }, [images.length]);

  // Navigate to next image
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setIsEditingCaption(false);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingCaption) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditingCaption, onClose, goToPrevious, goToNext]);

  // Start editing caption
  const startEditingCaption = useCallback(() => {
    if (!onUpdateCaption) return;
    setCaptionValue(currentImage.caption || "");
    setIsEditingCaption(true);
    setTimeout(() => captionInputRef.current?.focus(), 0);
  }, [currentImage.caption, onUpdateCaption]);

  // Save caption
  const saveCaption = useCallback(() => {
    if (onUpdateCaption && captionValue !== currentImage.caption) {
      onUpdateCaption(currentImage.id, captionValue);
    }
    setIsEditingCaption(false);
  }, [onUpdateCaption, captionValue, currentImage.id, currentImage.caption]);

  // Handle touch swipe
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }

    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image counter */}
      <div className="absolute top-4 left-4 text-white/70 text-sm font-medium z-10">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-4 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={normalizeB2Url(currentImage.url)}
          alt={currentImage.caption || ""}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />

        {/* Caption */}
        <div className="mt-4 w-full text-center">
          {isEditingCaption ? (
            <input
              ref={captionInputRef}
              type="text"
              value={captionValue}
              onChange={(e) => setCaptionValue(e.target.value)}
              onBlur={saveCaption}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveCaption();
                if (e.key === "Escape") {
                  setIsEditingCaption(false);
                  e.stopPropagation();
                }
              }}
              placeholder="Add a caption..."
              className="bg-transparent text-white text-center text-sm outline-none border-b border-white/30 focus:border-white/60 w-full max-w-md px-2 py-1"
            />
          ) : (
            <p
              onClick={(e) => {
                e.stopPropagation();
                startEditingCaption();
              }}
              className={`text-sm px-2 py-1 rounded cursor-pointer transition-colors ${
                currentImage.caption
                  ? "text-white/80 hover:text-white"
                  : "text-white/40 hover:text-white/60 italic"
              }`}
            >
              {currentImage.caption || (onUpdateCaption ? "Click to add caption" : "")}
            </p>
          )}

          {/* Size and date info */}
          <p className="mt-2 text-xs text-white/40">
            {currentImage.width} × {currentImage.height}
            {currentImage.fileSize && (
              <span> · {(currentImage.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
            )}
            {currentImage.createdAt && (
              <span> · {currentImage.createdAt.toDate?.().toLocaleDateString()}</span>
            )}
          </p>
        </div>
      </div>

      {/* Thumbnail strip at bottom */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto py-2 px-4">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
                setIsEditingCaption(false);
              }}
              className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden transition-all ${
                index === currentIndex
                  ? "ring-2 ring-white ring-offset-2 ring-offset-black"
                  : "opacity-50 hover:opacity-75"
              }`}
            >
              <img
                src={normalizeB2Url(image.thumbnailUrl || image.url)}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
