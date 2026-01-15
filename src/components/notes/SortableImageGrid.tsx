"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragMoveEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { MoodboardImage } from "@/lib/notes";

interface SortableImageProps {
  image: MoodboardImage;
  onDelete: (image: MoodboardImage) => void;
  onClick: () => void;
  isDragging?: boolean;
  isOver?: boolean;
}

function SortableImage({ image, onDelete, onClick, isDragging, isOver }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
  } = useSortable({ id: image.id });

  return (
    <div
      ref={setNodeRef}
      className={`break-inside-avoid mb-4 group relative transition-all duration-200 ${
        isDragging ? "opacity-30 scale-95" : ""
      } ${
        isOver ? "ring-2 ring-[--accent] ring-offset-2 ring-offset-[--background] rounded-lg" : ""
      }`}
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
    <div className="shadow-2xl rounded-lg overflow-hidden rotate-3">
      <img
        src={image.thumbnailUrl || image.url}
        alt={image.caption || ""}
        className="rounded-lg"
        style={{
          aspectRatio: `${image.width}/${image.height}`,
          width: "180px",
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

  const handleDragOver = (event: DragMoveEvent) => {
    const over = event.over;
    setOverId(over ? (over.id as string) : null);
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
      <SortableContext items={images.map((img) => img.id)}>
        <div className={`${columnClass} gap-4`}>
          {images.map((image, index) => (
            <SortableImage
              key={image.id}
              image={image}
              onDelete={onDelete}
              onClick={() => onImageClick(index)}
              isDragging={activeId === image.id}
              isOver={overId === image.id && activeId !== image.id}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeImage ? <DragOverlayImage image={activeImage} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
