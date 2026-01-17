"use client";

import { useState, useMemo } from "react";
import { NoteItem, searchNotes } from "@/lib/notes";
import { getTagColor } from "./TagInput";

export type SortOption = "manual" | "date-desc" | "date-asc" | "title-asc" | "title-desc" | "updated-desc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "manual", label: "Manual order" },
  { value: "date-desc", label: "Date (newest)" },
  { value: "date-asc", label: "Date (oldest)" },
  { value: "title-asc", label: "Title (A-Z)" },
  { value: "title-desc", label: "Title (Z-A)" },
  { value: "updated-desc", label: "Recently updated" },
];

export function sortItems(items: NoteItem[], sortOption: SortOption): NoteItem[] {
  return [...items].sort((a, b) => {
    switch (sortOption) {
      case "manual":
        // Sort by sortOrder (lower = earlier), then by createdAt for items without sortOrder
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder;
        }
        if (a.sortOrder !== undefined) return -1;
        if (b.sortOrder !== undefined) return 1;
        const aCreated = a.createdAt?.toMillis?.() || 0;
        const bCreated = b.createdAt?.toMillis?.() || 0;
        return aCreated - bCreated;
      case "date-desc":
        return (b.date || "").localeCompare(a.date || "");
      case "date-asc":
        return (a.date || "").localeCompare(b.date || "");
      case "title-asc":
        return a.title.localeCompare(b.title);
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "updated-desc":
        const aTime = a.updatedAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
      default:
        return 0;
    }
  });
}

interface FolderViewProps {
  folder: NoteItem | null;
  items: NoteItem[];
  searchQuery: string;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  onSelect: (item: NoteItem) => void;
  onBack: () => void;
  onCreateNote: (parentId: string | null) => void;
  onCreateFolder?: (parentId: string | null) => void;
  onCreateMoodboard?: (parentId: string | null) => void;
  onCreateMusicLibrary?: (parentId: string | null) => void;
  onDelete?: (item: NoteItem) => void;
  onRename?: (item: NoteItem) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: NoteItem | null;
  isEmptyArea?: boolean;
}

export default function FolderView({
  folder,
  items,
  searchQuery,
  sortOption,
  onSortChange,
  onSelect,
  onBack,
  onCreateNote,
  onCreateFolder,
  onCreateMoodboard,
  onCreateMusicLibrary,
  onDelete,
  onRename,
}: FolderViewProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleContextMenu = (e: React.MouseEvent, item: NoteItem | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item, isEmptyArea: item === null });
  };

  const closeContextMenu = () => setContextMenu(null);

  const contents = useMemo(() => {
    let result: NoteItem[];

    if (searchQuery) {
      result = searchNotes(items, searchQuery, folder?.id || null);
    } else {
      result = items.filter(
        (i) => i.parentId === (folder?.id || null)
      );
    }

    return sortItems(result, sortOption);
  }, [items, folder, searchQuery, sortOption]);

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortOption)?.label || "Sort";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header - hidden on mobile since parent has mobile header */}
      <div className="hidden md:flex items-center justify-between px-4 py-2 border-b border-[--border] bg-[--sidebar-bg]">
        <div className="flex items-center gap-2">
          {folder && (
            <button
              type="button"
              onClick={onBack}
              className="p-1 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <h1 className="text-base font-semibold text-[--foreground]">
              {folder?.title || "All Notes"}
            </h1>
          </div>
          {searchQuery && (
            <span className="text-xs text-[--muted]">
              &quot;{searchQuery}&quot;
            </span>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
            </svg>
            {currentSortLabel}
          </button>

          {showSortMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSortMenu(false)}
              />
              <div
                className="absolute right-0 mt-1 py-1 rounded shadow-lg border border-[--border] z-50 min-w-[150px]"
                style={{ backgroundColor: 'var(--background)' }}
              >
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onSortChange(option.value);
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1 text-xs hover:bg-[--hover] flex items-center justify-between ${
                      sortOption === option.value ? "text-[--accent]" : "text-[--foreground]"
                    }`}
                  >
                    {option.label}
                    {sortOption === option.value && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        className="flex-1 overflow-y-auto"
        onContextMenu={(e) => {
          // Only trigger if clicking directly on the container, not on items
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('table') && !(e.target as HTMLElement).closest('tr[data-item]')) {
            handleContextMenu(e, null);
          }
        }}
      >
        <table className="w-full" onContextMenu={(e) => {
          // Prevent table-level context menu if clicking on empty area
          const target = e.target as HTMLElement;
          if (!target.closest('tr[data-item]')) {
            handleContextMenu(e, null);
          }
        }}>
          <thead className="sticky top-0 bg-[--sidebar-bg] border-b border-[--border]">
            <tr>
              <th className="text-left px-4 py-1.5">
                <span className="text-xs font-medium text-[--muted]">Title</span>
              </th>
              <th className="text-left px-4 py-1.5 w-28 hidden md:table-cell">
                <span className="text-xs font-medium text-[--muted]">Date</span>
              </th>
              <th className="text-left px-4 py-1.5 hidden md:table-cell">
                <span className="text-xs font-medium text-[--muted]">Tags</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {contents.map((item) => (
              <tr
                key={item.id}
                data-item="true"
                onClick={() => onSelect(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                className="hover:bg-[--hover] cursor-pointer"
              >
                <td className="px-4 py-1.5">
                  <div className="flex items-center gap-1.5">
                    {item.type === "folder" ? (
                      <svg className="w-3.5 h-3.5 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                      </svg>
                    ) : item.type === "moodboard" ? (
                      <svg className="w-3.5 h-3.5 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <rect x="6" y="3" width="14" height="10" rx="1" />
                        <rect x="4" y="6" width="14" height="10" rx="1" />
                        <rect x="2" y="9" width="14" height="10" rx="1" />
                      </svg>
                    ) : item.type === "music" ? (
                      <svg className="w-3.5 h-3.5 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5l-10.5 3v8.553m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    <span className="text-sm text-[--foreground]">
                      {item.title || "Untitled"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-1.5 text-xs text-[--muted] tabular-nums hidden md:table-cell">
                  {item.date || "—"}
                </td>
                <td className="px-4 py-1.5 hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {item.tags?.map((tag) => {
                      const color = getTagColor(tag);
                      return (
                        <span
                          key={tag}
                          className={`px-1.5 py-0.5 rounded text-xs ${color.bg} ${color.text} ${color.darkBg} ${color.darkText}`}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
            {contents.length === 0 && searchQuery && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center">
                  <span className="text-sm text-[--muted]">No matching notes found</span>
                </td>
              </tr>
            )}
            {contents.length === 0 && !searchQuery && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center">
                  <span className="text-sm text-[--muted]">Right-click to create</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
          <div
            className="fixed z-50 py-1 rounded shadow-lg border border-[--border] min-w-[160px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: 'var(--background)',
            }}
          >
            {/* Create options - always shown */}
            <button
              type="button"
              onClick={() => {
                onCreateNote(folder?.id || null);
                closeContextMenu();
              }}
              className="context-menu-item"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              New Note
            </button>
            {onCreateFolder && (
              <button
                type="button"
                onClick={() => {
                  onCreateFolder(folder?.id || null);
                  closeContextMenu();
                }}
                className="context-menu-item"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                New Folder
              </button>
            )}
            {onCreateMoodboard && (
              <button
                type="button"
                onClick={() => {
                  onCreateMoodboard(folder?.id || null);
                  closeContextMenu();
                }}
                className="context-menu-item"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <rect x="6" y="3" width="14" height="10" rx="1" />
                  <rect x="4" y="6" width="14" height="10" rx="1" />
                  <rect x="2" y="9" width="14" height="10" rx="1" />
                </svg>
                New Album
              </button>
            )}
            {onCreateMusicLibrary && (
              <button
                type="button"
                onClick={() => {
                  onCreateMusicLibrary(folder?.id || null);
                  closeContextMenu();
                }}
                className="context-menu-item"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5l-10.5 3v8.553m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
                New Music Library
              </button>
            )}
            {/* Item-specific options */}
            {contextMenu.item && (
              <>
                <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
                <button
                  type="button"
                  onClick={() => {
                    onSelect(contextMenu.item!);
                    closeContextMenu();
                  }}
                  className="context-menu-item"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Open
                </button>
                {onRename && (
                  <button
                    type="button"
                    onClick={() => {
                      onRename(contextMenu.item!);
                      closeContextMenu();
                    }}
                    className="context-menu-item"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Rename
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(contextMenu.item!);
                      closeContextMenu();
                    }}
                    className="context-menu-item danger"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
