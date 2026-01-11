"use client";

import { useState } from "react";
import { NoteItem } from "@/lib/notes";

interface FolderTreeProps {
  items: NoteItem[];
  parentId: string | null;
  level: number;
  selectedId: string | null;
  expandedFolders: Set<string>;
  onSelect: (item: NoteItem) => void;
  onToggleExpand: (folderId: string) => void;
  onContextMenu: (e: React.MouseEvent, item: NoteItem | null, parentId: string | null) => void;
  onMove?: (itemId: string, newParentId: string | null) => void;
  draggedId?: string | null;
  onDragStart?: (itemId: string) => void;
  onDragEnd?: () => void;
}

export default function FolderTree({
  items,
  parentId,
  level,
  selectedId,
  expandedFolders,
  onSelect,
  onToggleExpand,
  onContextMenu,
  onMove,
  draggedId,
  onDragStart,
  onDragEnd,
}: FolderTreeProps) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const children = items.filter((i) => i.parentId === parentId);
  const folders = children.filter((i) => i.type === "folder");
  const notes = children.filter((i) => i.type === "note");

  // Sort alphabetically
  folders.sort((a, b) => a.title.localeCompare(b.title));
  notes.sort((a, b) => a.title.localeCompare(b.title));

  const handleDragOver = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== targetId) {
      setDropTarget(targetId);
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    if (draggedId && onMove && draggedId !== targetId) {
      // Don't allow dropping into self or descendants
      const isDescendant = (parentId: string | null, itemId: string): boolean => {
        if (parentId === itemId) return true;
        const parent = items.find(i => i.id === parentId);
        if (!parent || !parent.parentId) return false;
        return isDescendant(parent.parentId, itemId);
      };
      if (targetId && isDescendant(targetId, draggedId)) return;
      onMove(draggedId, targetId);
    }
    onDragEnd?.();
  };

  return (
    <div>
      {folders.map((folder) => {
        const isExpanded = expandedFolders.has(folder.id!);
        const isSelected = selectedId === folder.id;
        const isDropTarget = dropTarget === folder.id;
        const isDragging = draggedId === folder.id;

        return (
          <div key={folder.id}>
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                onDragStart?.(folder.id!);
              }}
              onDragEnd={() => {
                setDropTarget(null);
                onDragEnd?.();
              }}
              onDragOver={(e) => handleDragOver(e, folder.id!)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder.id!)}
              onClick={() => onSelect(folder)}
              onContextMenu={(e) => onContextMenu(e, folder, parentId)}
              className={`w-full flex items-center gap-1 px-2 py-1.5 text-sm text-left transition-colors ${
                isSelected
                  ? "bg-[--accent] text-white"
                  : isDropTarget
                  ? "bg-blue-500 text-white"
                  : "text-[--foreground] hover:bg-[--hover]"
              } ${isDragging ? "opacity-50" : ""}`}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(folder.id!);
                }}
                className="p-0.5 hover:bg-black/10 rounded"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <FolderIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{folder.title || "Untitled"}</span>
            </button>
            {isExpanded && (
              <FolderTree
                items={items}
                parentId={folder.id!}
                level={level + 1}
                selectedId={selectedId}
                expandedFolders={expandedFolders}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
                onContextMenu={onContextMenu}
                onMove={onMove}
                draggedId={draggedId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            )}
          </div>
        );
      })}

      {notes.map((note) => {
        const isSelected = selectedId === note.id;
        const isDragging = draggedId === note.id;

        return (
          <button
            key={note.id}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              onDragStart?.(note.id!);
            }}
            onDragEnd={() => {
              setDropTarget(null);
              onDragEnd?.();
            }}
            onClick={() => onSelect(note)}
            onContextMenu={(e) => onContextMenu(e, note, parentId)}
            className={`w-full flex items-center gap-1 px-2 py-1.5 text-sm text-left transition-colors ${
              isSelected
                ? "bg-[--accent] text-white"
                : "text-[--foreground] hover:bg-[--hover]"
            } ${isDragging ? "opacity-50" : ""}`}
            style={{ paddingLeft: `${level * 16 + 24}px` }}
          >
            <NoteIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{note.title || "Untitled"}</span>
          </button>
        );
      })}
    </div>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  );
}

function NoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
