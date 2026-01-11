"use client";

import { useState, useMemo } from "react";
import { NoteItem, searchNotes } from "@/lib/notes";
import { getTagColor } from "./TagInput";

interface FolderViewProps {
  folder: NoteItem | null;
  items: NoteItem[];
  searchQuery: string;
  onSelect: (item: NoteItem) => void;
  onBack: () => void;
}

export default function FolderView({
  folder,
  items,
  searchQuery,
  onSelect,
  onBack,
}: FolderViewProps) {
  const [sortBy, setSortBy] = useState<"title" | "date">("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const contents = useMemo(() => {
    let result: NoteItem[];

    if (searchQuery) {
      result = searchNotes(items, searchQuery, folder?.id || null);
    } else {
      result = items.filter(
        (i) => i.parentId === (folder?.id || null)
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "title") {
        cmp = a.title.localeCompare(b.title);
      } else if (sortBy === "date") {
        cmp = (a.date || "").localeCompare(b.date || "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    // Folders first
    const folders = result.filter((i) => i.type === "folder");
    const notes = result.filter((i) => i.type === "note");
    return [...folders, ...notes];
  }, [items, folder, searchQuery, sortBy, sortDir]);

  const toggleSort = (col: "title" | "date") => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--sidebar-bg]">
        {folder && (
          <button
            type="button"
            onClick={onBack}
            className="p-1 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[--muted]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <h1 className="text-xl font-bold text-[--foreground]">
            {folder?.title || "All Notes"}
          </h1>
        </div>
        {searchQuery && (
          <span className="text-sm text-[--muted]">
            Searching: &quot;{searchQuery}&quot;
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[--sidebar-bg] border-b border-[--border]">
            <tr>
              <th className="text-left px-6 py-2">
                <button
                  type="button"
                  onClick={() => toggleSort("title")}
                  className="flex items-center gap-1 text-xs font-medium text-[--muted] hover:text-[--foreground]"
                >
                  Title
                  {sortBy === "title" && (
                    <SortIcon dir={sortDir} />
                  )}
                </button>
              </th>
              <th className="text-left px-6 py-2 w-32">
                <button
                  type="button"
                  onClick={() => toggleSort("date")}
                  className="flex items-center gap-1 text-xs font-medium text-[--muted] hover:text-[--foreground]"
                >
                  Date
                  {sortBy === "date" && (
                    <SortIcon dir={sortDir} />
                  )}
                </button>
              </th>
              <th className="text-left px-6 py-2">
                <span className="text-xs font-medium text-[--muted]">Tags</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {contents.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelect(item)}
                className="border-b border-[--border] hover:bg-[--hover] cursor-pointer"
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    {item.type === "folder" ? (
                      <svg className="w-4 h-4 text-[--muted]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    <span className="font-medium text-[--foreground]">
                      {item.title || "Untitled"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-[--muted]">
                  {item.date || "—"}
                </td>
                <td className="px-6 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.tags?.map((tag) => {
                      const color = getTagColor(tag);
                      return (
                        <span
                          key={tag}
                          className={`px-2 py-0.5 rounded text-xs ${color.bg} ${color.text} ${color.darkBg} ${color.darkText}`}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
            {contents.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-[--muted]">
                  {searchQuery
                    ? "No matching notes found"
                    : "This folder is empty"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortIcon({ dir }: { dir: "asc" | "desc" }) {
  return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      {dir === "asc" ? (
        <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
      ) : (
        <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
      )}
    </svg>
  );
}
