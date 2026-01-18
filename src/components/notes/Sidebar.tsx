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
  onImportBlogPosts: () => void;
  onToggleDarkMode: () => void;
  onToggleFullWidth: () => void;
  onSignOut: () => void;
  onSortChange: (sort: SortOption) => void;
  onCloseMobile?: () => void;
  onToggleStar?: (item: NoteItem) => void;
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
  onImportBlogPosts,
  onToggleDarkMode,
  onToggleFullWidth,
  onSignOut,
  onSortChange,
  onCloseMobile,
  onToggleStar,
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
    return sortItems(result, sortOption);
  }, [items, searchQuery, sortOption]);

  // Get starred items
  const starredItems = useMemo(() => {
    return items.filter(item => item.starred);
  }, [items]);

  // Expanded state for starred section
  const [starredExpanded, setStarredExpanded] = useState(true);

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

  // Collapsed new menu state
  const [collapsedNewMenu, setCollapsedNewMenu] = useState(false);
  const [collapsedMoreMenu, setCollapsedMoreMenu] = useState(false);

  if (collapsed) {
    return (
      <div className="w-12 bg-[--sidebar-bg] border-r border-[--border] flex flex-col h-full">
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
            onClick={() => { setCollapsedNewMenu(!collapsedNewMenu); setCollapsedMoreMenu(false); }}
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

        {/* More menu at bottom */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setCollapsedMoreMenu(!collapsedMoreMenu); setCollapsedNewMenu(false); }}
            className="p-3 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] w-full"
            title="More options"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>
          {collapsedMoreMenu && (
            <div
              className="absolute left-full bottom-0 ml-1 rounded shadow-lg py-1 z-50 min-w-[160px]"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
            >
              <button
                type="button"
                onClick={() => { onToggleDarkMode(); setCollapsedMoreMenu(false); }}
                className="context-menu-item flex items-center gap-2"
              >
                {isDark ? "Light mode" : "Dark mode"}
              </button>
              <button
                type="button"
                onClick={() => { onToggleFullWidth(); setCollapsedMoreMenu(false); }}
                className="context-menu-item flex items-center gap-2"
              >
                {isFullWidth ? "Constrain width" : "Full width"}
              </button>
              <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
              <button
                type="button"
                onClick={() => { window.location.href = '/admin'; }}
                className="context-menu-item"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="context-menu-item"
              >
                Home
              </button>
              <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
              <button
                type="button"
                onClick={() => { onSignOut(); setCollapsedMoreMenu(false); }}
                className="context-menu-item danger"
              >
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
      className="w-64 bg-[--sidebar-bg] border-r border-[--border] flex flex-col h-full"
      onClick={() => { closeContextMenu(); setShowMoreMenu(false); setShowNewMenu(false); }}
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
            {/* Dirigible logo - from user's outline2 */}
            <svg className="h-3" viewBox="0 0 728 387" fill="none" stroke="currentColor" strokeWidth="14" style={{ width: 'auto' }}>
              <path d="M148.677 123.244C173.807 115.461 198.003 109.086 216.472 105.725C271.902 95.6382 308.571 92.5347 405.787 90.2071C503.003 87.8794 593.823 109.604 607.893 115.811C621.964 122.018 659.486 145.295 669.719 157.709C673.841 164.175 682.852 178.968 685.922 186.417C688.992 193.865 689.191 195.727 688.907 195.727C687.485 200.124 683.875 210.314 680.805 215.9C677.735 221.487 670.146 233.746 666.735 239.177C657.78 249.263 632.963 269.71 591.264 281.85C548.626 294.264 503.856 298.144 393.422 298.92C282.988 299.696 206.665 284.954 140.576 267.884C104.189 258.487 67.87 239.975 42.3196 224.54M148.677 123.244C147.967 119.732 145.01 110.846 138.87 103.397C131.195 94.0865 123.094 88.6553 121.389 87.8794C119.683 87.1035 112.861 85.5518 110.303 85.5518C108.256 85.5518 72.2122 84.5173 54.4462 84C53.0249 84 50.0117 85.2414 49.3295 90.2071C48.6473 95.1727 44.7814 138.312 42.9338 159.261L42.3196 163.916M148.677 123.244C109.402 135.408 67.8479 151.011 42.3196 163.916M42.3196 163.916C35.1597 167.536 29.2604 170.943 25.0256 174.003C1.83031 190.762 8.82298 202.71 15.2188 206.59C21.3785 211.186 30.7439 217.547 42.3196 224.54M42.3196 224.54C44.0878 244.678 47.7092 285.575 48.0504 288.057C48.3915 290.54 62.9739 295.816 70.2224 298.144C82.1612 300.73 107.83 305.437 114.993 303.575C123.947 301.247 133.754 295.04 137.165 290.385C140.576 285.73 145.692 277.195 147.824 270.988M44.2129 195.727C46.9133 193.917 54.105 189.986 61.2683 188.744C70.2224 187.193 93.2471 184.089 111.582 184.865C129.916 185.641 135.459 187.193 136.312 187.193C137.165 187.193 143.987 189.52 145.266 191.848C146.289 193.71 146.261 196.245 146.119 197.279C143.703 198.831 137.847 202.089 133.754 202.71C128.637 203.486 112.434 205.038 104.333 205.038C96.2318 205.038 83.8667 205.038 67.2377 205.038C53.9345 205.038 46.3448 198.831 44.2129 195.727Z" />
            </svg>
            <span className="font-medium text-sm text-[--foreground]">Dirigible</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {/* New menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowNewMenu(!showNewMenu); setShowMoreMenu(false); }}
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

      {/* Starred section */}
      {starredItems.length > 0 && (
        <div className="border-b border-[--border]">
          <button
            type="button"
            onClick={() => setStarredExpanded(!starredExpanded)}
            className="w-full flex items-center gap-1 px-3 py-1 text-[11px] text-[--muted] hover:text-[--foreground]"
          >
            <svg className={`w-3 h-3 transition-transform ${starredExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>Starred</span>
            <span className="ml-auto text-[10px] text-[--muted]">{starredItems.length}</span>
          </button>
          {starredExpanded && (
            <div className="pb-1">
              {starredItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  onContextMenu={(e) => handleContextMenu(e, item, item.parentId)}
                  className={`w-full flex items-center gap-1.5 px-3 py-0.5 text-[11px] text-left hover:bg-[--hover] ${
                    selectedId === item.id ? 'bg-[--hover] text-[--foreground]' : 'text-[--muted]'
                  }`}
                >
                  {/* Item type icon */}
                  {item.type === 'folder' && (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                  )}
                  {item.type === 'note' && (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  )}
                  {item.type === 'moodboard' && (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="2" y="2" width="16" height="12" rx="2" />
                      <rect x="6" y="10" width="16" height="12" rx="2" fill="var(--sidebar-bg)" />
                      <rect x="6" y="10" width="16" height="12" rx="2" />
                    </svg>
                  )}
                  {item.type === 'music' && (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5l-10.5 3v8.553m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    </svg>
                  )}
                  <span className="truncate">{item.title || 'Untitled'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Footer with more menu */}
      <div className="px-3 py-1 border-t border-[--border] relative">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 text-xs text-[--muted] hover:text-[--foreground]"
            title="Export all notes"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }}
            className="p-1 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
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
            className="absolute bottom-full left-2 right-2 mb-1 rounded shadow-lg py-1 z-50"
            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => { onToggleDarkMode(); setShowMoreMenu(false); }}
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
              onClick={() => { onToggleFullWidth(); setShowMoreMenu(false); }}
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
              onClick={() => { onImportBlogPosts(); setShowMoreMenu(false); }}
              className="context-menu-item flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Import blog posts
            </button>
            <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
            <button
              type="button"
              onClick={() => { window.location.href = '/admin'; }}
              className="context-menu-item flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="context-menu-item flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Home
            </button>
            <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
            <button
              type="button"
              onClick={() => { onSignOut(); setShowMoreMenu(false); }}
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
              {onToggleStar && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleStar(contextMenu.item!);
                    closeContextMenu();
                  }}
                  className="context-menu-item flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill={contextMenu.item.starred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  {contextMenu.item.starred ? 'Unstar' : 'Star'}
                </button>
              )}
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
