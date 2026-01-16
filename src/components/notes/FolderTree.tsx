"use client";

import { useState, useRef, useEffect } from "react";
import { NoteItem } from "@/lib/notes";

interface FolderTreeProps {
  items: NoteItem[];
  parentId: string | null;
  level: number;
  selectedId: string | null;
  expandedFolders: Set<string>;
  renamingId?: string | null;
  onSelect: (item: NoteItem) => void;
  onToggleExpand: (folderId: string) => void;
  onContextMenu: (e: React.MouseEvent, item: NoteItem | null, parentId: string | null) => void;
  onMove?: (itemId: string, newParentId: string | null) => void;
  onReorder?: (itemId: string, targetId: string, position: "before" | "after") => void;
  onRenameSubmit?: (itemId: string, newName: string) => void;
  onRenameCancel?: () => void;
  draggedId?: string | null;
  onDragStart?: (itemId: string) => void;
  onDragEnd?: () => void;
}

function RenameInput({
  initialValue,
  onSubmit,
  onCancel,
}: {
  initialValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSubmit(value)}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 min-w-0 px-1 py-0 text-sm border border-[--accent] rounded outline-none"
      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
    />
  );
}

export default function FolderTree({
  items,
  parentId,
  level,
  selectedId,
  expandedFolders,
  renamingId,
  onSelect,
  onToggleExpand,
  onContextMenu,
  onMove,
  onReorder,
  onRenameSubmit,
  onRenameCancel,
  draggedId,
  onDragStart,
  onDragEnd,
}: FolderTreeProps) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "inside" | null>(null);
  // Items are already sorted by parent - just filter by parentId and maintain order
  const children = items.filter((i) => i.parentId === parentId);

  const handleDragOver = (e: React.DragEvent, targetId: string | null, targetItem?: NoteItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || draggedId === targetId) return;

    setDropTarget(targetId);

    // Determine position based on mouse location
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    // For folders, middle zone = drop inside
    if (targetItem?.type === "folder") {
      if (y < height * 0.25) {
        setDropPosition("before");
      } else if (y > height * 0.75) {
        setDropPosition("after");
      } else {
        setDropPosition("inside");
      }
    } else {
      // For notes, just before/after
      setDropPosition(y < height / 2 ? "before" : "after");
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string | null, targetItem?: NoteItem) => {
    e.preventDefault();
    e.stopPropagation();

    const currentDropPosition = dropPosition;
    setDropTarget(null);
    setDropPosition(null);

    if (!draggedId || draggedId === targetId) {
      onDragEnd?.();
      return;
    }

    const draggedItem = items.find(i => i.id === draggedId);
    if (!draggedItem) {
      onDragEnd?.();
      return;
    }

    // Don't allow dropping into self or descendants
    const isDescendant = (checkParentId: string | null, itemId: string): boolean => {
      if (checkParentId === itemId) return true;
      const parent = items.find(i => i.id === checkParentId);
      if (!parent || !parent.parentId) return false;
      return isDescendant(parent.parentId, itemId);
    };

    // If dropping "inside" a folder, move into that folder
    if (currentDropPosition === "inside" && targetId && targetItem?.type === "folder") {
      if (isDescendant(targetId, draggedId)) {
        onDragEnd?.();
        return;
      }
      onMove?.(draggedId, targetId);
      onDragEnd?.();
      return;
    }

    // If same parent, this is a reorder operation
    if (targetId && draggedItem.parentId === targetItem?.parentId && onReorder && currentDropPosition) {
      onReorder(draggedId, targetId, currentDropPosition as "before" | "after");
      onDragEnd?.();
      return;
    }

    // Different parent - move to that parent
    if (targetId && onMove) {
      const newParentId = targetItem?.parentId ?? null;
      if (newParentId && isDescendant(newParentId, draggedId)) {
        onDragEnd?.();
        return;
      }
      onMove(draggedId, newParentId);
    }

    onDragEnd?.();
  };

  return (
    <div>
      {children.map((item) => {
        const isExpanded = item.type === "folder" && expandedFolders.has(item.id!);
        const isSelected = selectedId === item.id;
        const isCurrentDropTarget = dropTarget === item.id;
        const isDropInside = isCurrentDropTarget && dropPosition === "inside" && item.type === "folder";
        const isDropBefore = isCurrentDropTarget && dropPosition === "before";
        const isDropAfter = isCurrentDropTarget && dropPosition === "after";
        const isDragging = draggedId === item.id;
        const isRenaming = renamingId === item.id;

        if (item.type === "folder") {
          return (
            <div key={item.id} className="relative">
              {/* Drop indicator - before */}
              {isDropBefore && (
                <div className="absolute left-0 right-0 top-0 h-0.5 bg-blue-500 z-10" style={{ marginLeft: `${level * 12 + 8}px` }} />
              )}
              <button
                type="button"
                draggable={!isRenaming}
                onDragStart={(e) => {
                  if (isRenaming) return;
                  e.dataTransfer.effectAllowed = "move";
                  onDragStart?.(item.id!);
                }}
                onDragEnd={() => {
                  setDropTarget(null);
                  setDropPosition(null);
                  onDragEnd?.();
                }}
                onDragOver={(e) => handleDragOver(e, item.id!, item)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id!, item)}
                onClick={() => !isRenaming && onSelect(item)}
                onContextMenu={(e) => { e.stopPropagation(); onContextMenu(e, item, parentId); }}
                className={`w-full flex items-center gap-1 px-2 py-1 text-sm text-left transition-colors ${
                  !isSelected && !isDropInside ? "hover:bg-[--hover]" : ""
                } ${isDragging ? "opacity-50" : ""}`}
                style={{
                  paddingLeft: `${level * 12 + 8}px`,
                  backgroundColor: isSelected ? 'var(--accent-muted)' : isDropInside ? 'var(--accent-muted)' : undefined,
                  color: isSelected || isDropInside ? 'white' : 'var(--foreground)',
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(item.id!);
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
                <FolderIcon className="w-3.5 h-3.5 flex-shrink-0" />
                {isRenaming ? (
                  <RenameInput
                    initialValue={item.title}
                    onSubmit={(newName) => onRenameSubmit?.(item.id!, newName)}
                    onCancel={() => onRenameCancel?.()}
                  />
                ) : (
                  <span className="truncate text-sm">{item.title || "Untitled"}</span>
                )}
              </button>
              {/* Drop indicator - after */}
              {isDropAfter && (
                <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-500 z-10" style={{ marginLeft: `${level * 12 + 8}px` }} />
              )}
              {isExpanded && (
                <FolderTree
                  items={items}
                  parentId={item.id!}
                  level={level + 1}
                  selectedId={selectedId}
                  expandedFolders={expandedFolders}
                  renamingId={renamingId}
                  onSelect={onSelect}
                  onToggleExpand={onToggleExpand}
                  onContextMenu={onContextMenu}
                  onMove={onMove}
                  onReorder={onReorder}
                  onRenameSubmit={onRenameSubmit}
                  onRenameCancel={onRenameCancel}
                  draggedId={draggedId}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              )}
            </div>
          );
        }

        // Note, Moodboard, or Music Library item
        return (
          <div key={item.id} className="relative">
            {/* Drop indicator - before */}
            {isDropBefore && (
              <div className="absolute left-0 right-0 top-0 h-0.5 bg-blue-500 z-10" style={{ marginLeft: `${level * 12 + 8}px` }} />
            )}
            <button
              type="button"
              draggable={!isRenaming}
              onDragStart={(e) => {
                if (isRenaming) return;
                e.dataTransfer.effectAllowed = "move";
                onDragStart?.(item.id!);
              }}
              onDragEnd={() => {
                setDropTarget(null);
                setDropPosition(null);
                onDragEnd?.();
              }}
              onDragOver={(e) => handleDragOver(e, item.id!, item)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.id!, item)}
              onClick={() => !isRenaming && onSelect(item)}
              onContextMenu={(e) => { e.stopPropagation(); onContextMenu(e, item, parentId); }}
              className={`w-full flex items-center gap-1 px-2 py-1 text-sm text-left transition-colors ${
                !isSelected ? "hover:bg-[--hover]" : ""
              } ${isDragging ? "opacity-50" : ""}`}
              style={{
                paddingLeft: `${level * 12 + 8}px`,
                backgroundColor: isSelected ? 'var(--accent-muted)' : undefined,
                color: isSelected ? 'white' : 'var(--foreground)',
              }}
            >
              {/* Spacer to align with folder expand arrows */}
              <span className="w-4 h-3 flex-shrink-0" />
              {item.type === "moodboard" ? (
                <MoodboardIcon className="w-3.5 h-3.5 flex-shrink-0" />
              ) : item.type === "music" ? (
                <MusicIcon className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <NoteIcon className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              {isRenaming ? (
                <RenameInput
                  initialValue={item.title}
                  onSubmit={(newName) => onRenameSubmit?.(item.id!, newName)}
                  onCancel={() => onRenameCancel?.()}
                />
              ) : (
                <>
                  <span className="truncate text-sm flex-1">{item.title || "Untitled"}</span>
                  {item.published && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#22c55e' }}
                      title="Published"
                    />
                  )}
                </>
              )}
            </button>
            {/* Drop indicator - after */}
            {isDropAfter && (
              <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-500 z-10" style={{ marginLeft: `${level * 12 + 8}px` }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
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

function MoodboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5l-10.5 3v8.553m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
    </svg>
  );
}
