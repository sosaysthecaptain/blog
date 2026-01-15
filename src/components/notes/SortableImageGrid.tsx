"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoodboardImage } from "@/lib/notes";

interface SortableImageProps {
  image: MoodboardImage;
  onDelete: (image: MoodboardImage) => void;
  onClick: () => void;
  isDragging?: boolean;
}

function SortableImage({ image, onDelete, onClick, isDragging }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
        onClick={(e) => {
          // Only trigger click if not dragging
          if (!transform) {
            onClick();
          }
        }}
      >
        <img
          src={image.thumbnailUrl || image.url}
          alt={image.caption || ""}
          className="w-full rounded-lg"
          style={{ aspectRatio: `${image.width}/${image.height}` }}
          draggable={false}
        />
      </div>
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
      {image.caption && (
        <p className="mt-1 text-xs text-[--muted] truncate">
          {image.caption}
        </p>
      )}
    </div>
  );
}

interface DragOverlayImageProps {
  image: MoodboardImage;
}

function DragOverlayImage({ image }: DragOverlayImageProps) {
  return (
    <div className="shadow-2xl rounded-lg overflow-hidden">
      <img
        src={image.thumbnailUrl || image.url}
        alt={image.caption || ""}
        className="w-full rounded-lg"
        style={{
          aspectRatio: `${image.width}/${image.height}`,
          maxWidth: "200px",
        }}
        draggable={false}
      />
    </div>
  );
}

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

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

  const activeImage = activeId ? images.find((img) => img.id === activeId) : null;

  const gridColumnClass = {
    small: "grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
    medium: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    large: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  }[gridSize];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
        <div className={`grid ${gridColumnClass} gap-4`}>
          {images.map((image, index) => (
            <SortableImage
              key={image.id}
              image={image}
              onDelete={onDelete}
              onClick={() => onImageClick(index)}
              isDragging={activeId === image.id}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeImage ? <DragOverlayImage image={activeImage} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
