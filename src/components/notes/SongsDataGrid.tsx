"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { DataGrid, GridColDef, GridRenderCellParams, GridSortModel, GridRowParams, useGridApiRef } from "@mui/x-data-grid";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Song, sortSongs, searchSongs, formatDuration, formatFileSize } from "@/lib/songs";

type SortColumn = "title" | "artist" | "album" | "year" | "trackNumber" | "duration" | "fileSize";

interface SongsDataGridProps {
  songs: Song[];
  searchQuery: string;
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  selectedIds: string[];
  currentPlayingSongId?: string | null;
  onSortChange: (column: SortColumn, direction: "asc" | "desc") => void;
  onSelectionChange: (ids: string[]) => void;
  onDeleteSong: (song: Song) => void;
  onDeleteSelected?: () => void;
  onPlaySong?: (song: Song) => void;
  onQueueSong?: (song: Song) => void;
  onExportSelected?: () => void;
  onExportLibrary?: () => void;
  onEditMetadata?: (songs: Song[]) => void;
}

// Map column field names to our sort column types
const fieldToColumn: Record<string, SortColumn> = {
  title: "title",
  artist: "artist",
  album: "album",
  year: "year",
  trackNumber: "trackNumber",
  duration: "duration",
  fileSize: "fileSize",
};

export default function SongsDataGrid({
  songs,
  searchQuery,
  sortColumn,
  sortDirection,
  selectedIds,
  currentPlayingSongId,
  onSortChange,
  onSelectionChange,
  onDeleteSong,
  onDeleteSelected,
  onPlaySong,
  onQueueSong,
  onExportSelected,
  onExportLibrary,
  onEditMetadata,
}: SongsDataGridProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    song: Song;
  } | null>(null);
  const [headerContextMenu, setHeaderContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState({
    playing: true,
    trackNumber: true,
    title: true,
    artist: true,
    album: true,
    year: true,
    duration: true,
    fileSize: true,
  });

  // Selection anchor for shift+click range selection
  const anchorRowRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useGridApiRef();

  // Track focused row for keyboard navigation
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

  // Clear selection on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.length > 0) {
        onSelectionChange([]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds.length, onSelectionChange]);

  // Create MUI theme based on CSS variables - using Lucida Grande (iTunes 2006 style)
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: document.documentElement.classList.contains("dark") ? "dark" : "light",
        },
        typography: {
          fontFamily: "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: 12,
        },
      }),
    []
  );

  const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";

  // DataGrid sx styles - narrow rows, alternating colors, no hard borders
  const dataGridSx = {
    border: "none",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    fontFamily: FONT_FAMILY,
    "& .MuiDataGrid-cell": {
      border: "none",
      fontSize: "11px",
      padding: "0 6px",
      fontFamily: FONT_FAMILY,
      userSelect: "none",
    },
    "& .MuiDataGrid-columnHeaders": {
      border: "none",
      borderBottom: "1px solid var(--border)",
      backgroundColor: "var(--background)",
      minHeight: "24px !important",
      maxHeight: "24px !important",
    },
    "& .MuiDataGrid-columnHeader": {
      backgroundColor: "var(--background)",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      fontSize: "10px",
      fontWeight: 500,
      color: "var(--muted)",
      fontFamily: FONT_FAMILY,
    },
    "& .MuiDataGrid-footerContainer": {
      display: "none",
    },
    // Alternating row colors
    "& .MuiDataGrid-row:nth-of-type(odd)": {
      backgroundColor: "var(--background)",
    },
    "& .MuiDataGrid-row:nth-of-type(even)": {
      backgroundColor: "var(--sidebar-bg)",
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: "var(--hover)",
    },
    // Dark blue selection like Finder/left sidebar
    "& .MuiDataGrid-row.Mui-selected": {
      backgroundColor: "#1e6bbd",
      color: "#fff",
    },
    "& .MuiDataGrid-row.Mui-selected:hover": {
      backgroundColor: "#2277cc",
      color: "#fff",
    },
    "& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell": {
      color: "#fff",
    },
    "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
      outline: "none",
    },
    "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within": {
      outline: "none",
    },
    "& .MuiDataGrid-sortIcon": {
      color: "var(--muted)",
    },
    "& .MuiDataGrid-menuIcon": {
      color: "var(--muted)",
    },
    "& .MuiDataGrid-columnSeparator": {
      display: "none",
    },
    "& .MuiDataGrid-row": {
      userSelect: "none",
    },
  };

  // Filter and sort songs
  const displayedSongs = useMemo(() => {
    let result = songs;

    // Apply search filter
    if (searchQuery) {
      result = searchSongs(songs, searchQuery);
    }

    // Apply sorting
    result = sortSongs(result, sortColumn, sortDirection);

    return result;
  }, [songs, searchQuery, sortColumn, sortDirection]);

  // Column definitions
  const allColumns: GridColDef[] = useMemo(
    () => [
      {
        field: "playing",
        headerName: "",
        width: 16,
        minWidth: 16,
        maxWidth: 16,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams) => {
          const isPlaying = params.row.id === currentPlayingSongId;
          return isPlaying ? (
            <svg className="w-2.5 h-2.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : null;
        },
      } as GridColDef,
      {
        field: "trackNumber",
        headerName: "#",
        width: 32,
        renderCell: (params: GridRenderCellParams) => params.value || "",
      } as GridColDef,
      {
        field: "title",
        headerName: "Title",
        flex: 1.5,
        minWidth: 120,
      } as GridColDef,
      {
        field: "artist",
        headerName: "Artist",
        flex: 1,
        minWidth: 80,
      } as GridColDef,
      {
        field: "album",
        headerName: "Album",
        flex: 1,
        minWidth: 80,
      } as GridColDef,
      {
        field: "year",
        headerName: "Year",
        width: 44,
        renderCell: (params: GridRenderCellParams) => params.value || "",
      } as GridColDef,
      {
        field: "duration",
        headerName: "Time",
        width: 48,
        renderCell: (params: GridRenderCellParams) => formatDuration(params.value || 0),
      } as GridColDef,
      {
        field: "fileSize",
        headerName: "Size",
        width: 50,
        renderCell: (params: GridRenderCellParams) => formatFileSize(params.value || 0),
      } as GridColDef,
    ],
    [currentPlayingSongId]
  );

  const columns = useMemo(
    () => allColumns.filter((col) => visibleColumns[col.field as keyof typeof visibleColumns] !== false),
    [allColumns, visibleColumns]
  );

  // Handle sort model change
  const handleSortModelChange = (model: GridSortModel) => {
    if (model.length > 0) {
      const { field, sort } = model[0];
      const column = fieldToColumn[field];
      if (column) {
        onSortChange(column, sort || "asc");
      }
    }
  };

  // Get range of row IDs between two indices
  const getRowRange = useCallback((startId: string, endId: string): string[] => {
    const startIdx = displayedSongs.findIndex((r) => r.id === startId);
    const endIdx = displayedSongs.findIndex((r) => r.id === endId);
    if (startIdx === -1 || endIdx === -1) return [endId];
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    return displayedSongs.slice(minIdx, maxIdx + 1).map((r) => r.id || "").filter(Boolean);
  }, [displayedSongs]);

  // Handle row click - simple model: click = single select, shift+click = range select
  const handleRowClick = useCallback((params: GridRowParams, event: React.MouseEvent) => {
    const rowId = String(params.id);
    const isShift = event.shiftKey;

    if (isShift && anchorRowRef.current) {
      // Shift+click: range selection from anchor to clicked row
      const rangeIds = getRowRange(anchorRowRef.current, rowId);
      onSelectionChange(rangeIds);
    } else {
      // Regular click: single selection, set new anchor
      anchorRowRef.current = rowId;
      onSelectionChange([rowId]);
    }
    setFocusedRowId(rowId);
  }, [onSelectionChange, getRowRange]);

  // Handle keyboard navigation with shift+arrow for range selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if container is focused or has focus within
      if (!containerRef.current?.contains(document.activeElement)) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentId = focusedRowId || selectedIds[selectedIds.length - 1];
        if (!currentId) {
          // No selection, select first row
          if (displayedSongs.length > 0) {
            const firstId = displayedSongs[0].id || "";
            anchorRowRef.current = firstId;
            onSelectionChange([firstId]);
            setFocusedRowId(firstId);
          }
          return;
        }

        const currentIdx = displayedSongs.findIndex((s) => s.id === currentId);
        if (currentIdx === -1) return;

        const nextIdx = e.key === "ArrowDown"
          ? Math.min(currentIdx + 1, displayedSongs.length - 1)
          : Math.max(currentIdx - 1, 0);

        const nextId = displayedSongs[nextIdx].id || "";
        if (!nextId) return;

        if (e.shiftKey && anchorRowRef.current) {
          // Shift+Arrow: extend selection from anchor to new position
          const rangeIds = getRowRange(anchorRowRef.current, nextId);
          onSelectionChange(rangeIds);
        } else {
          // Arrow without shift: move to next row, set as new anchor
          anchorRowRef.current = nextId;
          onSelectionChange([nextId]);
        }
        setFocusedRowId(nextId);

        // Scroll the row into view using apiRef
        try {
          apiRef.current?.scrollToIndexes({ rowIndex: nextIdx });
        } catch {
          // Ignore scroll errors
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedRowId, selectedIds, displayedSongs, onSelectionChange, getRowRange, apiRef]);

  // Handle context menu
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    const target = event.target as HTMLElement;

    // Check if right-clicking on header
    const header = target.closest(".MuiDataGrid-columnHeaders");
    if (header) {
      setHeaderContextMenu({ x: event.clientX, y: event.clientY });
      return;
    }

    const row = target.closest("[data-id]");
    if (row) {
      const songId = row.getAttribute("data-id");
      const song = songs.find((s) => s.id === songId);
      if (song) {
        // If right-clicked song is not selected, select it
        if (!selectedIds.includes(songId || "")) {
          onSelectionChange([songId || ""]);
        }
        setContextMenu({ x: event.clientX, y: event.clientY, song });
      }
    }
  };

  const closeContextMenu = () => setContextMenu(null);
  const closeHeaderContextMenu = () => setHeaderContextMenu(null);

  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  // Handle double-click to play
  const handleRowDoubleClick = (params: { row: Song }) => {
    onPlaySong?.(params.row);
  };

  // Build selection model - supports multiple selection
  const rowSelectionModel = useMemo(() => {
    if (selectedIds.length === 0) return undefined;
    return { type: "include" as const, ids: new Set(selectedIds) };
  }, [selectedIds]);

  return (
    <ThemeProvider theme={theme}>
      <div ref={containerRef} className="h-full w-full relative" onContextMenu={handleContextMenu} tabIndex={0}>
        {/* Selection count indicator when multiple selected */}
        {selectedIds.length > 1 && (
          <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-blue-500 text-white text-[10px] rounded shadow">
            {selectedIds.length} selected
          </div>
        )}
        <DataGrid
          apiRef={apiRef}
          rows={displayedSongs}
          columns={columns}
          sortModel={[{ field: sortColumn, sort: sortDirection }]}
          onSortModelChange={handleSortModelChange}
          onRowDoubleClick={handleRowDoubleClick}
          onRowClick={handleRowClick}
          rowSelectionModel={rowSelectionModel}
          disableRowSelectionOnClick
          disableColumnMenu
          hideFooter
          rowHeight={20}
          columnHeaderHeight={24}
          sx={dataGridSx}
        />

        {/* Context Menu */}
        {contextMenu && (() => {
          // If clicked song is part of a multi-selection, operate on all selected
          const isSelectedSong = selectedIds.includes(contextMenu.song.id || "");
          const targetSongs = (isSelectedSong && selectedIds.length > 1)
            ? songs.filter((s) => s.id && selectedIds.includes(s.id))
            : [contextMenu.song];
          const count = targetSongs.length;

          return (
            <>
              <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
              <div
                className="fixed z-50 py-1 rounded shadow-lg border border-[--border] min-w-[160px]"
                style={{
                  left: contextMenu.x,
                  top: contextMenu.y,
                  backgroundColor: "var(--background)",
                  fontFamily: "'Lucida Grande', 'Lucida Sans Unicode', sans-serif",
                }}
              >
                {onPlaySong && count === 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      onPlaySong(targetSongs[0]);
                      closeContextMenu();
                    }}
                    className="context-menu-item"
                  >
                    Play
                  </button>
                )}
                {onQueueSong && (
                  <button
                    type="button"
                    onClick={() => {
                      targetSongs.forEach((s) => onQueueSong(s));
                      closeContextMenu();
                    }}
                    className="context-menu-item"
                  >
                    Add to Queue{count > 1 ? ` (${count})` : ""}
                  </button>
                )}
                <div className="h-px my-1" style={{ backgroundColor: "var(--border)" }} />
                {onEditMetadata && (
                  <button
                    type="button"
                    onClick={() => {
                      onEditMetadata(targetSongs);
                      closeContextMenu();
                    }}
                    className="context-menu-item"
                  >
                    Edit Metadata{count > 1 ? ` (${count})` : ""}
                  </button>
                )}
                {onExportSelected && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSelectedSong) {
                        onSelectionChange([contextMenu.song.id || ""]);
                      }
                      onExportSelected();
                      closeContextMenu();
                    }}
                    className="context-menu-item"
                  >
                    Export{count > 1 ? ` (${count})` : ""}
                  </button>
                )}
                {onExportLibrary && (
                  <button
                    type="button"
                    onClick={() => {
                      onExportLibrary();
                      closeContextMenu();
                    }}
                    className="context-menu-item"
                  >
                    Export Entire Library
                  </button>
                )}
                <div className="h-px my-1" style={{ backgroundColor: "var(--border)" }} />
                <button
                  type="button"
                  onClick={() => {
                    if (count > 1 && onDeleteSelected) {
                      onDeleteSelected();
                    } else {
                      onDeleteSong(targetSongs[0]);
                    }
                    closeContextMenu();
                  }}
                  className="context-menu-item danger"
                >
                  Delete{count > 1 ? ` (${count})` : ""}
                </button>
              </div>
            </>
          );
        })()}

        {/* Header Context Menu for Column Visibility */}
        {headerContextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeHeaderContextMenu} />
            <div
              className="fixed z-50 py-1 rounded shadow-lg border border-[--border] min-w-[140px]"
              style={{
                left: headerContextMenu.x,
                top: headerContextMenu.y,
                backgroundColor: "var(--background)",
                fontFamily: "'Lucida Grande', 'Lucida Sans Unicode', sans-serif",
              }}
            >
              <div className="px-3 py-1 text-[10px] text-[--muted] font-medium">Show Columns</div>
              {[
                { key: "trackNumber", label: "#" },
                { key: "title", label: "Title" },
                { key: "artist", label: "Artist" },
                { key: "album", label: "Album" },
                { key: "year", label: "Year" },
                { key: "duration", label: "Time" },
                { key: "fileSize", label: "Size" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleColumn(key as keyof typeof visibleColumns)}
                  className="context-menu-item flex items-center gap-2"
                >
                  <span className="w-3">
                    {visibleColumns[key as keyof typeof visibleColumns] && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </ThemeProvider>
  );
}
