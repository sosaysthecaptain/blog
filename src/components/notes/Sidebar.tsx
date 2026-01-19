"use client";

import { useState, useEffect, useMemo } from "react";
import { NoteItem } from "@/lib/notes";
import FolderTree from "./FolderTree";
import { SortOption, sortItems } from "./FolderView";
import PropertiesModal from "./PropertiesModal";

interface SidebarProps {
  items: NoteItem[];
  selectedId: string | null;
  searchQuery: string;
  collapsed: boolean;
  currentFolderId: string | null;
  isDark: boolean;
  isFullWidth: boolean;
  renamingId: string | null;
  sortOption: SortOption;
  userEmail?: string;
  onSelect: (item: NoteItem) => void;
  onToggleCollapse: () => void;
  onCreateNote: (parentId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateMoodboard: (parentId: string | null) => void;
  onCreateMusicLibrary: (parentId: string | null) => void;
  onDelete: (item: NoteItem) => void;
  onRename: (item: NoteItem) => void;
  onRenameSubmit: (itemId: string, newName: string) => void;
  onRenameCancel: () => void;
  onMove: (itemId: string, newParentId: string | null) => void;
  onReorder: (itemId: string, targetId: string, position: "before" | "after") => void;
  onSearch: (query: string) => void;
  onExport: () => void;
  onExportFolder: (folderId: string) => void;
  onExportArchivable: (folderId: string) => void;
  onToggleDarkMode: () => void;
  onToggleFullWidth: () => void;
  onSignOut: () => void;
  onSortChange: (sort: SortOption) => void;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  items,
  selectedId,
  searchQuery,
  collapsed,
  currentFolderId,
  isDark,
  isFullWidth,
  renamingId,
  sortOption,
  userEmail,
  onSelect,
  onToggleCollapse,
  onCreateNote,
  onCreateFolder,
  onCreateMoodboard,
  onCreateMusicLibrary,
  onDelete,
  onRename,
  onRenameSubmit,
  onRenameCancel,
  onMove,
  onReorder,
  onSearch,
  onExport,
  onExportFolder,
  onExportArchivable,
  onToggleDarkMode,
  onToggleFullWidth,
  onSignOut,
  onSortChange,
  onCloseMobile,
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [localSearchInput, setLocalSearchInput] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [propertiesItem, setPropertiesItem] = useState<NoteItem | null>(null);

  // Sync local input with prop (for when search is cleared externally)
  useEffect(() => {
    if (searchQuery !== localSearchInput) {
      setLocalSearchInput(searchQuery);
    }
  }, [searchQuery]);

  // Auto-expand all folders when searching
  useEffect(() => {
    if (searchQuery) {
      const allFolderIds = items
        .filter((i) => i.type === "folder" && i.id)
        .map((i) => i.id!);
      setExpandedFolders(new Set(allFolderIds));
    }
  }, [searchQuery, items]);

  // Filter and sort items based on search query for the tree
  const filteredItems = useMemo(() => {
    let result = searchQuery
      ? items.filter((item) => {
          const q = searchQuery.toLowerCase();
          // Include item if it matches or has matching descendants
          if (item.title?.toLowerCase().includes(q)) return true;
          if (item.tags?.some((t) => t.toLowerCase().includes(q))) return true;
          if (item.content?.toLowerCase().includes(q)) return true;
          // Include folders that contain matching items
          if (item.type === "folder") {
            const hasMatchingDescendant = (parentId: string): boolean => {
              const children = items.filter((i) => i.parentId === parentId);
              return children.some((child) => {
                if (child.title?.toLowerCase().includes(q)) return true;
                if (child.tags?.some((t) => t.toLowerCase().includes(q))) return true;
                if (child.content?.toLowerCase().includes(q)) return true;
                if (child.type === "folder" && child.id) {
                  return hasMatchingDescendant(child.id);
                }
                return false;
              });
            };
            return item.id ? hasMatchingDescendant(item.id) : false;
          }
          return false;
        })
      : items;
    // Sidebar tree always uses manual order - sortOption only affects FolderView
    return sortItems(result, "manual");
  }, [items, searchQuery]);

  // Auto-expand parent folders when an item is selected
  useEffect(() => {
    if (!selectedId) return;
    const selected = items.find((i) => i.id === selectedId);
    if (!selected || !selected.parentId) return;

    // Expand all parent folders up to root
    const parentsToExpand: string[] = [];
    let current = selected;
    while (current.parentId) {
      parentsToExpand.push(current.parentId);
      const parent = items.find((i) => i.id === current.parentId);
      if (!parent) break;
      current = parent;
    }

    if (parentsToExpand.length > 0) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        parentsToExpand.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [selectedId, items]);

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

  const handleSearch = (value: string) => {
    setLocalSearchInput(value);
    onSearch(value);
  };

  // Collapsed menu states
  const [collapsedNewMenu, setCollapsedNewMenu] = useState(false);
  const [collapsedUserMenu, setCollapsedUserMenu] = useState(false);

  // User icon component
  const UserIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );

  if (collapsed) {
    return (
      <div className="w-14 bg-[--sidebar-bg] border-r border-[--border] flex flex-col h-full">
        {/* Expand button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-3 text-[--muted] hover:text-[--foreground] hover:bg-[--hover]"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        {/* New menu button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setCollapsedNewMenu(!collapsedNewMenu); setCollapsedUserMenu(false); }}
            className="p-3 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] w-full"
            title="Create new..."
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {collapsedNewMenu && (
            <div
              className="absolute left-full top-0 ml-1 rounded shadow-lg py-1 z-50 min-w-[160px]"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
            >
              <button
                type="button"
                onClick={() => { onCreateFolder(currentFolderId); setCollapsedNewMenu(false); }}
                className="context-menu-item"
              >
                New Folder
              </button>
              <button
                type="button"
                onClick={() => { onCreateNote(currentFolderId); setCollapsedNewMenu(false); }}
                className="context-menu-item"
              >
                New Note
              </button>
              <button
                type="button"
                onClick={() => { onCreateMoodboard(currentFolderId); setCollapsedNewMenu(false); }}
                className="context-menu-item"
              >
                New Album
              </button>
              <button
                type="button"
                onClick={() => { onCreateMusicLibrary(currentFolderId); setCollapsedNewMenu(false); }}
                className="context-menu-item"
              >
                New Music Library
              </button>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User menu at bottom */}
        <div className="relative p-2">
          <button
            type="button"
            onClick={() => { setCollapsedUserMenu(!collapsedUserMenu); setCollapsedNewMenu(false); }}
            className="w-8 h-8 rounded-full bg-[--hover] flex items-center justify-center hover:bg-[--border] transition-colors"
            title={userEmail || "Account"}
          >
            <UserIcon className="w-5 h-5 text-[--foreground]" />
          </button>
          {collapsedUserMenu && (
            <div
              className="absolute left-full bottom-0 ml-1 rounded shadow-lg py-1 z-50 min-w-[200px]"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
            >
              {/* User email header */}
              <div className="px-3 py-2 border-b border-[--border]">
                <p className="text-xs text-[--muted] truncate">{userEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => { onToggleDarkMode(); setCollapsedUserMenu(false); }}
                className="context-menu-item flex items-center gap-2"
              >
                {isDark ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
                {isDark ? "Light mode" : "Dark mode"}
              </button>
              <button
                type="button"
                onClick={() => { onToggleFullWidth(); setCollapsedUserMenu(false); }}
                className="context-menu-item flex items-center gap-2"
              >
                {isFullWidth ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                )}
                {isFullWidth ? "Constrain width" : "Full width"}
              </button>
              <button
                type="button"
                onClick={() => { onExport(); setCollapsedUserMenu(false); }}
                className="context-menu-item flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export all notes
              </button>
              <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
              <button
                type="button"
                onClick={() => { onSignOut(); setCollapsedUserMenu(false); }}
                className="context-menu-item danger flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-72 bg-[--sidebar-bg] border-r border-[--border] flex flex-col h-full"
      onClick={() => { closeContextMenu(); setShowUserMenu(false); setShowNewMenu(false); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[--border]">
        <div className="flex items-center gap-2">
          {/* Mobile close button */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-1.5">
            {/* Dirigible logo - from user's outline2, filled */}
            <svg className="h-3.5" viewBox="0 0 728 387" style={{ width: 'auto' }}>
              {/* Main hull and tail - filled */}
              <path fill="currentColor" d="M148.677 123.244C173.807 115.461 198.003 109.086 216.472 105.725C271.902 95.6382 308.571 92.5347 405.787 90.2071C503.003 87.8794 593.823 109.604 607.893 115.811C621.964 122.018 659.486 145.295 669.719 157.709C673.841 164.175 682.852 178.968 685.922 186.417C688.992 193.865 689.191 195.727 688.907 195.727C687.485 200.124 683.875 210.314 680.805 215.9C677.735 221.487 670.146 233.746 666.735 239.177C657.78 249.263 632.963 269.71 591.264 281.85C548.626 294.264 503.856 298.144 393.422 298.92C282.988 299.696 206.665 284.954 140.576 267.884C104.189 258.487 67.87 239.975 42.3196 224.54C30.7439 217.547 21.3785 211.186 15.2188 206.59C8.82298 202.71 1.83031 190.762 25.0256 174.003C29.2604 170.943 35.1597 167.536 42.3196 163.916L42.9338 159.261C44.7814 138.312 48.6473 95.1727 49.3295 90.2071C50.0117 85.2414 53.0249 84 54.4462 84C72.2122 84.5173 108.256 85.5518 110.303 85.5518C112.861 85.5518 119.683 87.1035 121.389 87.8794C123.094 88.6553 131.195 94.0865 138.87 103.397C145.01 110.846 147.967 119.732 148.677 123.244ZM42.3196 224.54C44.0878 244.678 47.7092 285.575 48.0504 288.057C48.3915 290.54 62.9739 295.816 70.2224 298.144C82.1612 300.73 107.83 305.437 114.993 303.575C123.947 301.247 133.754 295.04 137.165 290.385C140.576 285.73 145.692 277.195 147.824 270.988L140.576 267.884C67.87 239.975 42.3196 224.54 42.3196 224.54Z"/>
              {/* Gondola - cutout in background color */}
              <path fill="var(--sidebar-bg)" d="M44.2129 195.727C46.9133 193.917 54.105 189.986 61.2683 188.744C70.2224 187.193 93.2471 184.089 111.582 184.865C129.916 185.641 135.459 187.193 136.312 187.193C137.165 187.193 143.987 189.52 145.266 191.848C146.289 193.71 146.261 196.245 146.119 197.279C143.703 198.831 137.847 202.089 133.754 202.71C128.637 203.486 112.434 205.038 104.333 205.038C96.2318 205.038 83.8667 205.038 67.2377 205.038C53.9345 205.038 46.3448 198.831 44.2129 195.727Z"/>
            </svg>
            <span className="font-medium text-sm text-[--foreground]">Dirigible</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {/* New menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowNewMenu(!showNewMenu); setShowUserMenu(false); }}
              className="p-1.5 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
              title="Create new..."
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
            {showNewMenu && (
              <div
                className="absolute right-0 top-full mt-1 rounded shadow-lg py-1 z-50 min-w-[160px]"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => { onCreateNote(currentFolderId); setShowNewMenu(false); }}
                  className="context-menu-item flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  + Note
                </button>
                <button
                  type="button"
                  onClick={() => { onCreateFolder(currentFolderId); setShowNewMenu(false); }}
                  className="context-menu-item flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                  + Folder
                </button>
                <button
                  type="button"
                  onClick={() => { onCreateMoodboard(currentFolderId); setShowNewMenu(false); }}
                  className="context-menu-item flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="2" y="2" width="16" height="12" rx="2" />
                    <rect x="6" y="10" width="16" height="12" rx="2" fill="var(--background)" />
                    <rect x="6" y="10" width="16" height="12" rx="2" />
                    <path d="M8 19l4-4 3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  + Album
                </button>
                <button
                  type="button"
                  onClick={() => { onCreateMusicLibrary(currentFolderId); setShowNewMenu(false); }}
                  className="context-menu-item flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5l-10.5 3v8.553m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                  </svg>
                  + Music Library
                </button>
              </div>
            )}
          </div>
          {/* Collapse */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-1 border-b border-[--border]">
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--muted]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={localSearchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-7 pr-2 py-1 text-xs bg-[--background] border border-[--border] rounded focus:outline-none focus:border-[--accent] text-[--foreground] placeholder:text-[--muted]"
          />
        </div>
      </div>

      {/* Tree */}
      <div
        className="flex-1 overflow-y-auto py-1"
        onContextMenu={(e) => handleContextMenu(e, null, null)}
        onDragOver={(e) => {
          if (draggedId) {
            e.preventDefault();
          }
        }}
        onDrop={(e) => {
          if (draggedId) {
            e.preventDefault();
            onMove(draggedId, null);
            setDraggedId(null);
          }
        }}
      >
        <FolderTree
          items={filteredItems}
          parentId={null}
          level={0}
          selectedId={selectedId}
          expandedFolders={expandedFolders}
          renamingId={renamingId}
          onSelect={onSelect}
          onToggleExpand={toggleExpand}
          onContextMenu={handleContextMenu}
          onMove={onMove}
          onReorder={onReorder}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
          draggedId={draggedId}
          onDragStart={setDraggedId}
          onDragEnd={() => setDraggedId(null)}
        />
        {filteredItems.length === 0 && (
          <p className="text-center text-xs text-[--muted] py-8">
            {searchQuery ? "No matches found" : "No notes yet"}
          </p>
        )}
      </div>

      {/* User menu at bottom */}
      <div className="px-3 py-2 border-t border-[--border] relative">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
          className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-[--hover] transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[--hover] flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-4 h-4 text-[--foreground]" />
          </div>
          <span className="text-xs text-[--foreground] truncate flex-1 text-left">
            {userEmail || "Account"}
          </span>
          <svg className="w-3 h-3 text-[--muted] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </button>

        {/* User menu dropdown */}
        {showUserMenu && (
          <div
            className="absolute bottom-full left-2 right-2 mb-1 rounded shadow-lg py-1 z-50"
            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => { onToggleDarkMode(); setShowUserMenu(false); }}
              className="context-menu-item flex items-center gap-2"
            >
              {isDark ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
              {isDark ? "Light mode" : "Dark mode"}
            </button>
            <button
              type="button"
              onClick={() => { onToggleFullWidth(); setShowUserMenu(false); }}
              className="context-menu-item flex items-center gap-2"
            >
              {isFullWidth ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
              {isFullWidth ? "Constrain width" : "Full width"}
            </button>
            <button
              type="button"
              onClick={() => { onExport(); setShowUserMenu(false); }}
              className="context-menu-item flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export all notes
            </button>
            <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
            <button
              type="button"
              onClick={() => { onSignOut(); setShowUserMenu(false); }}
              className="context-menu-item danger flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed rounded shadow-lg py-1 z-50 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)'
          }}
          onClick={(e) => e.stopPropagation()}
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
              <button
                type="button"
                onClick={() => {
                  onExportFolder(contextMenu.item!.id!);
                  closeContextMenu();
                }}
                className="context-menu-item"
              >
                Export
              </button>
              {contextMenu.item.type === "note" && (
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
            </>
          )}

          {/* Folder: show both item actions and "new" actions */}
          {contextMenu.item?.type === "folder" && (
            <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
          )}

          {/* "New" actions - show when clicking background OR on a folder */}
          {(!contextMenu.item || contextMenu.item.type === "folder") && (
            <>
              <button
                type="button"
                onClick={() => {
                  onCreateFolder(contextMenu.item?.type === "folder" ? contextMenu.item.id! : contextMenu.parentId);
                  closeContextMenu();
                }}
                className="context-menu-item"
              >
                New Folder
              </button>
              <button
                type="button"
                onClick={() => {
                  onCreateNote(contextMenu.item?.type === "folder" ? contextMenu.item.id! : contextMenu.parentId);
                  closeContextMenu();
                }}
                className="context-menu-item"
              >
                New Note
              </button>
              <button
                type="button"
                onClick={() => {
                  onCreateMoodboard(contextMenu.item?.type === "folder" ? contextMenu.item.id! : contextMenu.parentId);
                  closeContextMenu();
                }}
                className="context-menu-item"
              >
                New Album
              </button>
              <button
                type="button"
                onClick={() => {
                  onCreateMusicLibrary(contextMenu.item?.type === "folder" ? contextMenu.item.id! : contextMenu.parentId);
                  closeContextMenu();
                }}
                className="context-menu-item"
              >
                New Music Library
              </button>
            </>
          )}
        </div>
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
