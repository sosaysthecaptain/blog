"use client";

import { useState } from "react";
import { NoteItem } from "@/lib/notes";
import FolderTree from "./FolderTree";
import SearchBar from "./SearchBar";
import Link from "next/link";

interface SidebarProps {
  items: NoteItem[];
  selectedId: string | null;
  collapsed: boolean;
  currentFolderId: string | null;
  isDark: boolean;
  onSelect: (item: NoteItem) => void;
  onToggleCollapse: () => void;
  onCreateNote: (parentId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onDelete: (item: NoteItem) => void;
  onRename: (item: NoteItem) => void;
  onSearch: (query: string) => void;
  onExport: () => void;
  onToggleDarkMode: () => void;
  onSignOut: () => void;
}

export default function Sidebar({
  items,
  selectedId,
  collapsed,
  currentFolderId,
  isDark,
  onSelect,
  onToggleCollapse,
  onCreateNote,
  onCreateFolder,
  onDelete,
  onRename,
  onSearch,
  onExport,
  onToggleDarkMode,
  onSignOut,
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: NoteItem | null;
    parentId: string | null;
  } | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const toggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    item: NoteItem | null,
    parentId: string | null
  ) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item, parentId });
  };

  const closeContextMenu = () => setContextMenu(null);

  if (collapsed) {
    return (
      <div className="w-12 bg-[--sidebar-bg] border-r border-[--border] flex flex-col h-full">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-3 text-[--muted] hover:text-[--foreground] hover:bg-[--hover]"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onCreateNote(currentFolderId)}
          className="p-3 text-[--muted] hover:text-[--foreground] hover:bg-[--hover]"
          title="New note"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-64 bg-[--sidebar-bg] border-r border-[--border] flex flex-col h-full"
      onClick={() => { closeContextMenu(); setShowMoreMenu(false); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[--border]">
        <span className="font-medium text-sm text-[--foreground]">Notes</span>
        <div className="flex items-center gap-1">
          {/* New Note */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCreateNote(currentFolderId); }}
            className="p-1.5 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
            title="New note"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          {/* New Folder */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCreateFolder(currentFolderId); }}
            className="p-1.5 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
            title="New folder"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </button>
          {/* Collapse */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[--border]">
        <SearchBar onSearch={onSearch} />
      </div>

      {/* Tree */}
      <div
        className="flex-1 overflow-y-auto py-2"
        onContextMenu={(e) => handleContextMenu(e, null, null)}
      >
        <FolderTree
          items={items}
          parentId={null}
          level={0}
          selectedId={selectedId}
          expandedFolders={expandedFolders}
          onSelect={onSelect}
          onToggleExpand={toggleExpand}
          onContextMenu={handleContextMenu}
        />
        {items.length === 0 && (
          <p className="text-center text-xs text-[--muted] py-8">
            No notes yet
          </p>
        )}
      </div>

      {/* Footer with more menu */}
      <div className="p-2 border-t border-[--border] relative">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
            title="Export all notes"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }}
            className="p-1.5 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
            title="More options"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>
        </div>

        {/* More menu dropdown */}
        {showMoreMenu && (
          <div
            className="absolute bottom-full left-2 right-2 mb-1 bg-[--background] border border-[--border] rounded shadow-lg py-1 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => { onToggleDarkMode(); setShowMoreMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[--foreground] hover:bg-[--hover]"
            >
              {isDark ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
              {isDark ? "Light mode" : "Dark mode"}
            </button>
            <Link
              href="/admin"
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[--foreground] hover:bg-[--hover]"
              onClick={() => setShowMoreMenu(false)}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </Link>
            <Link
              href="/"
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[--foreground] hover:bg-[--hover]"
              onClick={() => setShowMoreMenu(false)}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>
            <div className="h-px bg-[--border] my-1" />
            <button
              type="button"
              onClick={() => { onSignOut(); setShowMoreMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-[--hover]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-[--background] border border-[--border] rounded shadow-lg py-1 z-50 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            onClick={() => {
              onCreateNote(contextMenu.item?.type === "folder" ? contextMenu.item.id! : contextMenu.parentId);
              closeContextMenu();
            }}
            className="w-full text-left px-3 py-1 text-xs text-[--foreground] hover:bg-[--hover]"
          >
            New Note
          </button>
          <button
            type="button"
            onClick={() => {
              onCreateFolder(contextMenu.item?.type === "folder" ? contextMenu.item.id! : contextMenu.parentId);
              closeContextMenu();
            }}
            className="w-full text-left px-3 py-1 text-xs text-[--foreground] hover:bg-[--hover]"
          >
            New Folder
          </button>
          {contextMenu.item && (
            <>
              <div className="h-px bg-[--border] my-1" />
              <button
                type="button"
                onClick={() => {
                  onRename(contextMenu.item!);
                  closeContextMenu();
                }}
                className="w-full text-left px-3 py-1 text-xs text-[--foreground] hover:bg-[--hover]"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(contextMenu.item!);
                  closeContextMenu();
                }}
                className="w-full text-left px-3 py-1 text-xs text-red-500 hover:bg-[--hover]"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
