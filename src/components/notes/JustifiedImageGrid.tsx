"use client";

import { useMemo } from "react";
import { MoodboardImage } from "@/lib/notes";
import { normalizeB2Url } from "@/lib/b2-client";

interface JustifiedImageGridProps {
  images: MoodboardImage[];
  targetRowHeight: number;
  gap: number;
  onDelete: (image: MoodboardImage) => void;
  onImageClick: (index: number) => void;
}

interface LayoutRow {
  images: MoodboardImage[];
  height: number;
}

function calculateJustifiedLayout(
  images: MoodboardImage[],
  containerWidth: number,
  targetRowHeight: number,
  gap: number
): LayoutRow[] {
  if (images.length === 0 || containerWidth <= 0) return [];

  const rows: LayoutRow[] = [];
  let currentRow: MoodboardImage[] = [];
  let currentRowWidth = 0;

  for (const image of images) {
    const aspectRatio = image.width / image.height;
    const scaledWidth = targetRowHeight * aspectRatio;

    // Check if adding this image would exceed container width
    const totalWidth = currentRowWidth + scaledWidth + (currentRow.length > 0 ? gap : 0);

    if (totalWidth > containerWidth && currentRow.length > 0) {
      // Finalize current row - calculate actual height to fill width
      const totalAspectRatio = currentRow.reduce((sum, img) => sum + img.width / img.height, 0);
      const availableWidth = containerWidth - gap * (currentRow.length - 1);
      const rowHeight = availableWidth / totalAspectRatio;

      rows.push({ images: currentRow, height: rowHeight });
      currentRow = [image];
      currentRowWidth = scaledWidth;
    } else {
      currentRow.push(image);
      currentRowWidth = totalWidth;
    }
  }

  // Handle last row - don't stretch if it's too sparse
  if (currentRow.length > 0) {
    const totalAspectRatio = currentRow.reduce((sum, img) => sum + img.width / img.height, 0);
    const naturalWidth = targetRowHeight * totalAspectRatio + gap * (currentRow.length - 1);

    // Only justify if row is at least 60% full, otherwise use target height
    if (naturalWidth >= containerWidth * 0.6) {
      const availableWidth = containerWidth - gap * (currentRow.length - 1);
      const rowHeight = availableWidth / totalAspectRatio;
      rows.push({ images: currentRow, height: rowHeight });
    } else {
      rows.push({ images: currentRow, height: targetRowHeight });
    }
  }

  return rows;
}

export default function JustifiedImageGrid({
  images,
  targetRowHeight,
  gap,
  onDelete,
  onImageClick,
}: JustifiedImageGridProps) {
  // Sort images chronologically by createdAt
  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return aTime - bTime;
    });
  }, [images]);

  // We need to measure container width - use a reasonable default for SSR
  // and update on client. For simplicity, we'll use CSS and let the browser handle it.
  // The justified effect comes from CSS flexbox with calculated flex-basis.

  return (
    <div className="w-full">
      {/* Use flexbox rows with calculated widths */}
      <div className="flex flex-wrap" style={{ gap: `${gap}px` }}>
        {sortedImages.map((image, index) => {
          const aspectRatio = image.width / image.height;
          // flex-grow allows images to expand to fill row
          // flex-basis sets the ideal width based on target height
          const idealWidth = targetRowHeight * aspectRatio;

          return (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-lg cursor-pointer"
              style={{
                flexGrow: aspectRatio,
                flexBasis: `${idealWidth}px`,
                height: `${targetRowHeight}px`,
              }}
              onClick={() => onImageClick(images.findIndex(img => img.id === image.id))}
            >
              <img
                src={normalizeB2Url(image.thumbnailUrl || image.url)}
                alt={image.caption || ""}
                className="w-full h-full object-cover"
                draggable={false}
              />
              {/* Delete button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(image);
                }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Delete image"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* Date overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white/90">
                  {image.createdAt?.toDate?.().toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
