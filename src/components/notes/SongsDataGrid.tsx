"use client";

import { useMemo, useState } from "react";
import { DataGrid, GridColDef, GridRenderCellParams, GridSortModel, GridRowSelectionModel } from "@mui/x-data-grid";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Song, sortSongs, searchSongs, formatDuration, formatFileSize } from "@/lib/songs";

type SortColumn = "title" | "artist" | "album" | "year" | "trackNumber" | "duration" | "fileSize";

interface SongsDataGridProps {
  songs: Song[];
  searchQuery: string;
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  selectedIds: string[];
  onSortChange: (column: SortColumn, direction: "asc" | "desc") => void;
  onSelectionChange: (ids: string[]) => void;
  onDeleteSong: (song: Song) => void;
  onDeleteSelected?: () => void;
  onPlaySong?: (song: Song) => void;
  onQueueSong?: (song: Song) => void;
  onExportSelected?: () => void;
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
  onSortChange,
  onSelectionChange,
  onDeleteSong,
  onDeleteSelected,
  onPlaySong,
  onQueueSong,
  onExportSelected,
  onEditMetadata,
}: SongsDataGridProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    song: Song;
  } | null>(null);

  // Handle selection change
  const handleSelectionChange = (selectionModel: GridRowSelectionModel) => {
    // Extract ids from the selection model (Set<GridRowId>)
    const ids = Array.from(selectionModel.ids).map(String);
    onSelectionChange(ids);
  };

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

  // Column definitions - no album art, no genre, added size
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "trackNumber",
        headerName: "#",
        width: 32,
        type: "number",
      },
      {
        field: "title",
        headerName: "Title",
        flex: 1.5,
        minWidth: 120,
      },
      {
        field: "artist",
        headerName: "Artist",
        flex: 1,
        minWidth: 80,
      },
      {
        field: "album",
        headerName: "Album",
        flex: 1,
        minWidth: 80,
      },
      {
        field: "year",
        headerName: "Year",
        width: 44,
        type: "number",
      },
      {
        field: "duration",
        headerName: "Time",
        width: 48,
        type: "number",
        renderCell: (params: GridRenderCellParams) => formatDuration(params.value || 0),
      },
      {
        field: "fileSize",
        headerName: "Size",
        width: 50,
        type: "number",
        renderCell: (params: GridRenderCellParams) => formatFileSize(params.value || 0),
      },
    ],
    []
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

  // Handle context menu
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    const row = target.closest("[data-id]");
    if (row) {
      const songId = row.getAttribute("data-id");
      const song = songs.find((s) => s.id === songId);
      if (song) {
        setContextMenu({ x: event.clientX, y: event.clientY, song });
      }
    }
  };

  const closeContextMenu = () => setContextMenu(null);

  // Handle double-click to play
  const handleRowDoubleClick = (params: { row: Song }) => {
    onPlaySong?.(params.row);
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="h-full w-full" onContextMenu={handleContextMenu}>
        <DataGrid
          rows={displayedSongs}
          columns={columns}
          sortModel={[{ field: sortColumn, sort: sortDirection }]}
          onSortModelChange={handleSortModelChange}
          onRowDoubleClick={handleRowDoubleClick}
          rowSelectionModel={{ type: "include", ids: new Set(selectedIds) }}
          onRowSelectionModelChange={handleSelectionChange}
          disableColumnMenu
          hideFooter
          rowHeight={20}
          columnHeaderHeight={24}
          sx={dataGridSx}
        />

        {/* Context Menu */}
        {contextMenu && (() => {
          // If the right-clicked song is selected, operate on all selected songs
          const isSelectedSong = selectedIds.includes(contextMenu.song.id || "");
          const targetSongs = isSelectedSong
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
                      onPlaySong(contextMenu.song);
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
                {onExportSelected && count > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      // Select all target songs if not already selected
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
                <div className="h-px my-1" style={{ backgroundColor: "var(--border)" }} />
                <button
                  type="button"
                  onClick={() => {
                    if (count > 1 && onDeleteSelected) {
                      onDeleteSelected();
                    } else {
                      onDeleteSong(contextMenu.song);
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
      </div>
    </ThemeProvider>
  );
}
