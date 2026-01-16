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

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";

// Static styles - defined outside component to prevent re-renders
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

  // Create MUI theme - memoized with empty deps since it doesn't change
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light",
        },
        typography: {
          fontFamily: FONT_FAMILY,
          fontSize: 12,
        },
      }),
    []
  );

  // Filter and sort songs - this is our source of truth for display order
  const displayedSongs = useMemo(() => {
    let result = songs;

    // Apply search filter
    if (searchQuery) {
      result = searchSongs(songs, searchQuery);
    }

    // Apply sorting - we handle this ourselves, not DataGrid
    result = sortSongs(result, sortColumn, sortDirection);

    return result;
  }, [songs, searchQuery, sortColumn, sortDirection]);

  // Column definitions - memoized to prevent re-renders
  const columns: GridColDef[] = useMemo(() => {
    const allCols: GridColDef[] = [
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
      },
      {
        field: "trackNumber",
        headerName: "#",
        width: 32,
        sortable: true,
        renderCell: (params: GridRenderCellParams) => params.value || "",
      },
      {
        field: "title",
        headerName: "Title",
        flex: 1.5,
        minWidth: 120,
        sortable: true,
      },
      {
        field: "artist",
        headerName: "Artist",
        flex: 1,
        minWidth: 80,
        sortable: true,
      },
      {
        field: "album",
        headerName: "Album",
        flex: 1,
        minWidth: 80,
        sortable: true,
      },
      {
        field: "year",
        headerName: "Year",
        width: 44,
        sortable: true,
        renderCell: (params: GridRenderCellParams) => params.value || "",
      },
      {
        field: "duration",
        headerName: "Time",
        width: 48,
        sortable: true,
        renderCell: (params: GridRenderCellParams) => formatDuration(params.value || 0),
      },
      {
        field: "fileSize",
        headerName: "Size",
        width: 50,
        sortable: true,
        renderCell: (params: GridRenderCellParams) => formatFileSize(params.value || 0),
      },
    ];

    return allCols.filter((col) => visibleColumns[col.field as keyof typeof visibleColumns] !== false);
  }, [currentPlayingSongId, visibleColumns]);

  // Handle sort model change - user clicked a column header
  const handleSortModelChange = useCallback((model: GridSortModel) => {
    if (model.length > 0) {
      const { field, sort } = model[0];
      const column = fieldToColumn[field];
      if (column) {
        onSortChange(column, sort || "asc");
      }
    }
  }, [onSortChange]);

  // Get range of row IDs between anchor and target
  const getRowRange = useCallback((startId: string, endId: string): string[] => {
    // Use displayedSongs directly - it matches display order since we use sortingMode="server"
    const startIdx = displayedSongs.findIndex((r) => r.id === startId);
    const endIdx = displayedSongs.findIndex((r) => r.id === endId);

    if (startIdx === -1 || endIdx === -1) return [endId];

    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);

    return displayedSongs
      .slice(minIdx, maxIdx + 1)
      .map((r) => r.id || "")
      .filter(Boolean);
  }, [displayedSongs]);

  // Handle row click
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
  }, [onSelectionChange, getRowRange]);

  // Handle keyboard navigation with shift+arrow for range selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();

        const currentId = selectedIds[selectedIds.length - 1];
        if (!currentId) {
          if (displayedSongs.length > 0) {
            const firstId = displayedSongs[0].id || "";
            anchorRowRef.current = firstId;
            onSelectionChange([firstId]);
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
          const rangeIds = getRowRange(anchorRowRef.current, nextId);
          onSelectionChange(rangeIds);
        } else {
          anchorRowRef.current = nextId;
          onSelectionChange([nextId]);
        }

        // Scroll row into view
        try {
          apiRef.current?.scrollToIndexes({ rowIndex: nextIdx });
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, displayedSongs, onSelectionChange, getRowRange, apiRef]);

  // Handle context menu
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const target = event.target as HTMLElement;

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
        if (!selectedIds.includes(songId || "")) {
          onSelectionChange([songId || ""]);
        }
        setContextMenu({ x: event.clientX, y: event.clientY, song });
      }
    }
  }, [songs, selectedIds, onSelectionChange]);

  const closeContextMenu = () => setContextMenu(null);
  const closeHeaderContextMenu = () => setHeaderContextMenu(null);

  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const handleRowDoubleClick = useCallback((params: { row: Song }) => {
    onPlaySong?.(params.row);
  }, [onPlaySong]);

  // Generate dynamic CSS for selection - this avoids re-rendering DataGrid
  const selectionStyles = useMemo(() => {
    if (selectedIds.length === 0) return "";

    const selectors = selectedIds
      .map((id) => `.MuiDataGrid-row[data-id="${id}"]`)
      .join(",\n");

    return `
      ${selectors} {
        background-color: #1e6bbd !important;
        color: #fff !important;
      }
      ${selectors}:hover {
        background-color: #2277cc !important;
      }
      ${selectors} .MuiDataGrid-cell {
        color: #fff !important;
      }
    `;
  }, [selectedIds]);

  // Sort model for display only (we handle actual sorting ourselves)
  const sortModel = useMemo(() => [{ field: sortColumn, sort: sortDirection }], [sortColumn, sortDirection]);

  return (
    <ThemeProvider theme={theme}>
      {/* Dynamic selection styles - injected as CSS to avoid DataGrid re-renders */}
      <style>{selectionStyles}</style>

      <div ref={containerRef} className="h-full w-full relative" onContextMenu={handleContextMenu} tabIndex={0}>
        {/* Selection count indicator */}
        {selectedIds.length > 1 && (
          <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-blue-500 text-white text-[10px] rounded shadow">
            {selectedIds.length} selected
          </div>
        )}

        <DataGrid
          apiRef={apiRef}
          rows={displayedSongs}
          columns={columns}
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={handleSortModelChange}
          onRowDoubleClick={handleRowDoubleClick}
          onRowClick={handleRowClick}
          disableRowSelectionOnClick
          disableColumnMenu
          hideFooter
          rowHeight={20}
          columnHeaderHeight={24}
          sx={dataGridSx}
        />

        {/* Context Menu */}
        {contextMenu && (() => {
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
                  fontFamily: FONT_FAMILY,
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

        {/* Header Context Menu */}
        {headerContextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeHeaderContextMenu} />
            <div
              className="fixed z-50 py-1 rounded shadow-lg border border-[--border] min-w-[140px]"
              style={{
                left: headerContextMenu.x,
                top: headerContextMenu.y,
                backgroundColor: "var(--background)",
                fontFamily: FONT_FAMILY,
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
