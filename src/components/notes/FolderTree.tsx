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
}: FolderTreeProps) {
  const children = items.filter((i) => i.parentId === parentId);
  const folders = children.filter((i) => i.type === "folder");
  const notes = children.filter((i) => i.type === "note");

  // Sort alphabetically
  folders.sort((a, b) => a.title.localeCompare(b.title));
  notes.sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      {folders.map((folder) => {
        const isExpanded = expandedFolders.has(folder.id!);
        const isSelected = selectedId === folder.id;

        return (
          <div key={folder.id}>
            <button
              type="button"
              onClick={() => onSelect(folder)}
              onContextMenu={(e) => onContextMenu(e, folder, parentId)}
              className={`w-full flex items-center gap-1 px-2 py-1.5 text-sm text-left transition-colors ${
                isSelected
                  ? "bg-[--accent] text-white"
                  : "text-[--foreground] hover:bg-[--hover]"
              }`}
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
              />
            )}
          </div>
        );
      })}

      {notes.map((note) => {
        const isSelected = selectedId === note.id;

        return (
          <button
            key={note.id}
            type="button"
            onClick={() => onSelect(note)}
            onContextMenu={(e) => onContextMenu(e, note, parentId)}
            className={`w-full flex items-center gap-1 px-2 py-1.5 text-sm text-left transition-colors ${
              isSelected
                ? "bg-[--accent] text-white"
                : "text-[--foreground] hover:bg-[--hover]"
            }`}
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
