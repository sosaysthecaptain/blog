"use client";

import { useState, useMemo } from "react";
import { NoteItem, searchNotes } from "@/lib/notes";
import { getTagColor } from "./TagInput";

export type SortOption = "date-desc" | "date-asc" | "title-asc" | "title-desc" | "updated-desc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Date (newest)" },
  { value: "date-asc", label: "Date (oldest)" },
  { value: "title-asc", label: "Title (A-Z)" },
  { value: "title-desc", label: "Title (Z-A)" },
  { value: "updated-desc", label: "Recently updated" },
];

export function sortItems(items: NoteItem[], sortOption: SortOption): NoteItem[] {
  return [...items].sort((a, b) => {
    switch (sortOption) {
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
}: FolderViewProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);

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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[--border] bg-[--sidebar-bg]">
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
            <svg className="w-4 h-4 text-[--muted]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
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
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[--sidebar-bg] border-b border-[--border]">
            <tr>
              <th className="text-left px-4 py-1.5">
                <span className="text-xs font-medium text-[--muted]">Title</span>
              </th>
              <th className="text-left px-4 py-1.5 w-28">
                <span className="text-xs font-medium text-[--muted]">Date</span>
              </th>
              <th className="text-left px-4 py-1.5">
                <span className="text-xs font-medium text-[--muted]">Tags</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {contents.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelect(item)}
                className="hover:bg-[--hover] cursor-pointer"
              >
                <td className="px-4 py-1.5">
                  <div className="flex items-center gap-1.5">
                    {item.type === "folder" ? (
                      <svg className="w-3.5 h-3.5 text-[--muted]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
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
                <td className="px-4 py-1.5 text-xs text-[--muted] tabular-nums">
                  {item.date || "—"}
                </td>
                <td className="px-4 py-1.5">
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
            {/* New note row */}
            {!searchQuery && (
              <tr
                onClick={() => onCreateNote(folder?.id || null)}
                className="hover:bg-[--hover] cursor-pointer text-[--muted] hover:text-[--foreground]"
              >
                <td className="px-4 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span className="text-sm">New note</span>
                  </div>
                </td>
                <td className="px-4 py-1.5"></td>
                <td className="px-4 py-1.5"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
