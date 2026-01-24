"use client";

import { useState, useMemo } from "react";
import { NoteItem, searchNotes } from "@/lib/notes";
import { getTagColor } from "./TagInput";
import PropertiesModal from "./PropertiesModal";

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
    const aTitle = a.title || "";
    const bTitle = b.title || "";
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
        return aTitle.localeCompare(bTitle);
      case "title-desc":
        return bTitle.localeCompare(aTitle);
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
  folderPath?: NoteItem[]; // Full path from root to current folder
  items: NoteItem[];
  searchQuery: string;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  onSelect: (item: NoteItem) => void;
  onBack: () => void;
  onNavigateToFolder?: (folderId: string | null) => void;
  onCreateNote: (parentId: string | null) => void;
  onCreateFolder?: (parentId: string | null) => void;
  onCreateMoodboard?: (parentId: string | null) => void;
  onCreateMusicLibrary?: (parentId: string | null) => void;
  onDelete?: (item: NoteItem) => void;
  onRename?: (item: NoteItem) => void;
  onExport?: (itemId: string) => void;
  onExportArchivable?: (itemId: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: NoteItem | null;
  isEmptyArea?: boolean;
}

export default function FolderView({
  folder,
  folderPath = [],
  items,
  searchQuery,
  sortOption,
  onSortChange,
  onSelect,
  onBack,
  onNavigateToFolder,
  onCreateNote,
  onCreateFolder,
  onCreateMoodboard,
  onCreateMusicLibrary,
  onDelete,
  onRename,
  onExport,
  onExportArchivable,
}: FolderViewProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [propertiesItem, setPropertiesItem] = useState<NoteItem | null>(null);

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
          {/* Breadcrumb navigation */}
          <nav className="breadcrumb-nav">
            <button
              type="button"
              onClick={() => onNavigateToFolder ? onNavigateToFolder(null) : onBack()}
              className="breadcrumb-item"
            >
              root
            </button>
            {folderPath.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onNavigateToFolder ? onNavigateToFolder(f.id!) : onBack()}
                className="breadcrumb-item"
              >
                {f.title}
              </button>
            ))}
            {folder && (
              <span className="breadcrumb-item breadcrumb-current">
                {folder.title}
              </span>
            )}
          </nav>
          {searchQuery && (
            <span className="text-xs text-[--muted] ml-2">
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
                      <svg className="w-3.5 h-3.5 text-[--muted]" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="2" y="2" width="9" height="6" rx="1" />
                        <rect x="13" y="2" width="9" height="9" rx="1" />
                        <rect x="2" y="10" width="9" height="12" rx="1" />
                        <rect x="13" y="13" width="9" height="9" rx="1" />
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
            {/* Item-specific actions (when clicking on an item) */}
            {contextMenu.item && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPropertiesItem(contextMenu.item!);
                    closeContextMenu();
                  }}
                  className="context-menu-item"
                >
                  Properties
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
                    Rename
                  </button>
                )}
                {onExport && (
                  <button
                    type="button"
                    onClick={() => {
                      onExport(contextMenu.item!.id!);
                      closeContextMenu();
                    }}
                    className="context-menu-item"
                  >
                    Export
                  </button>
                )}
                {onExportArchivable && contextMenu.item.type === "note" && (
                  <button
                    type="button"
                    onClick={() => {
                      onExportArchivable(contextMenu.item!.id!);
                      closeContextMenu();
                    }}
                    className="context-menu-item"
                  >
                    Export Archivable
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
                    Delete
                  </button>
                )}
              </>
            )}

            {/* Folder: show both item actions and "new" actions */}
            {contextMenu.item?.type === "folder" && (
              <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
            )}

            {/* "New" actions - show when clicking background OR on a folder */}
            {(!contextMenu.item || contextMenu.item.type === "folder") && (
              <>
                {onCreateFolder && (
                  <button
                    type="button"
                    onClick={() => {
                      onCreateFolder(contextMenu.item?.type === "folder" ? contextMenu.item.id! : folder?.id || null);
                      closeContextMenu();
                    }}
                    className="context-menu-item"
                  >
                    New Folder
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onCreateNote(contextMenu.item?.type === "folder" ? contextMenu.item.id! : folder?.id || null);
                    closeContextMenu();
                  }}
                  className="context-menu-item"
                >
                  New Note
                </button>
                {onCreateMoodboard && (
                  <button
                    type="button"
                    onClick={() => {
                      onCreateMoodboard(contextMenu.item?.type === "folder" ? contextMenu.item.id! : folder?.id || null);
                      closeContextMenu();
                    }}
                    className="context-menu-item"
                  >
                    New Album
                  </button>
                )}
                {onCreateMusicLibrary && (
                  <button
                    type="button"
                    onClick={() => {
                      onCreateMusicLibrary(contextMenu.item?.type === "folder" ? contextMenu.item.id! : folder?.id || null);
                      closeContextMenu();
                    }}
                    className="context-menu-item"
                  >
                    New Music Library
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Properties Modal */}
      {propertiesItem && (
        <PropertiesModal
          item={propertiesItem}
          onClose={() => setPropertiesItem(null)}
        />
      )}
    </div>
  );
}
