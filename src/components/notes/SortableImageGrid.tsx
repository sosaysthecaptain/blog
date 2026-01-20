"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MoodboardImage } from "@/lib/notes";
import { normalizeB2Url } from "@/lib/b2-client";

interface SortableImageProps {
  image: MoodboardImage;
  onDelete: (image: MoodboardImage) => void;
  onClick: () => void;
  isDragging?: boolean;
  showDropIndicator?: "before" | "after" | null;
}

function SortableImage({ image, onDelete, onClick, isDragging, showDropIndicator }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
  } = useSortable({ id: image.id });

  return (
    <div
      ref={setNodeRef}
      className="relative break-inside-avoid mb-4"
      style={{ opacity: isDragging ? 0.3 : 1 }}
    >
      {/* Drop indicator before */}
      {showDropIndicator === "before" && (
        <div className="absolute -top-2 left-0 right-0 h-1 bg-blue-500 rounded-full z-20" />
      )}

      <div
        {...attributes}
        {...listeners}
        className="group relative cursor-grab active:cursor-grabbing"
        onClick={(e) => {
          if (!isDragging) {
            onClick();
          }
        }}
      >
        <img
          src={normalizeB2Url(image.thumbnailUrl || image.url)}
          alt={image.caption || ""}
          className="w-full rounded-lg"
          style={{ aspectRatio: `${image.width}/${image.height}` }}
          draggable={false}
        />

        {/* Delete button */}
        {!isDragging && (
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
        )}
      </div>

      {image.caption && (
        <p className="mt-1 text-xs text-[--muted] truncate">
          {image.caption}
        </p>
      )}

      {/* Drop indicator after */}
      {showDropIndicator === "after" && (
        <div className="absolute -bottom-2 left-0 right-0 h-1 bg-blue-500 rounded-full z-20" />
      )}
    </div>
  );
}

// Simple drag overlay - just the image, nothing else
function DragOverlayImage({ image }: { image: MoodboardImage }) {
  return (
    <img
      src={normalizeB2Url(image.thumbnailUrl || image.url)}
      alt={image.caption || ""}
      className="rounded-lg shadow-2xl"
      style={{
        width: "150px",
        aspectRatio: `${image.width}/${image.height}`,
        transform: "rotate(3deg)",
      }}
      draggable={false}
    />
  );
}

// Modifier to center the drag overlay on the cursor
const centerOnCursor: Modifier = ({ transform, draggingNodeRect }) => {
  if (!draggingNodeRect) return transform;

  // Offset to center a 150px wide overlay on cursor
  const overlayWidth = 150;
  const overlayHeight = draggingNodeRect.height * (overlayWidth / draggingNodeRect.width);

  return {
    ...transform,
    x: transform.x - draggingNodeRect.width / 2 + overlayWidth / 2,
    y: transform.y - draggingNodeRect.height / 2 + overlayHeight / 2,
  };
};

interface SortableImageGridProps {
  images: MoodboardImage[];
  gridSize: "small" | "medium" | "large";
  onReorder: (images: MoodboardImage[]) => void;
  onDelete: (image: MoodboardImage) => void;
  onImageClick: (index: number) => void;
}

export default function SortableImageGrid({
  images,
  gridSize,
  onReorder,
  onDelete,
  onImageClick,
}: SortableImageGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);

      const reordered = arrayMove(images, oldIndex, newIndex).map((img, idx) => ({
        ...img,
        order: idx,
      }));

      onReorder(reordered);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const activeImage = activeId ? images.find((img) => img.id === activeId) : null;

  // Determine drop indicator position
  const getDropIndicator = (imageId: string): "before" | "after" | null => {
    if (!activeId || !overId || activeId === imageId) return null;
    if (overId !== imageId) return null;

    const activeIndex = images.findIndex((img) => img.id === activeId);
    const overIndex = images.findIndex((img) => img.id === overId);

    // Show indicator based on whether we're moving up or down
    return activeIndex > overIndex ? "before" : "after";
  };

  // CSS columns for masonry layout
  const columnClass = {
    small: "columns-4 md:columns-5 lg:columns-6",
    medium: "columns-2 md:columns-3 lg:columns-4",
    large: "columns-1 md:columns-2 lg:columns-3",
  }[gridSize];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={images.map((img) => img.id)} strategy={verticalListSortingStrategy}>
        <div className={`${columnClass} gap-4`}>
          {images.map((image, index) => (
            <SortableImage
              key={image.id}
              image={image}
              onDelete={onDelete}
              onClick={() => onImageClick(index)}
              isDragging={activeId === image.id}
              showDropIndicator={getDropIndicator(image.id)}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay modifiers={[centerOnCursor]}>
        {activeImage ? <DragOverlayImage image={activeImage} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
