"use client";

import { useMemo, useState } from "react";
import { DataGrid, GridColDef, GridRenderCellParams, GridSortModel } from "@mui/x-data-grid";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Song, sortSongs, searchSongs, formatDuration, formatFileSize, updateSong } from "@/lib/songs";

type SortColumn = "title" | "artist" | "album" | "year" | "trackNumber" | "duration" | "fileSize";

interface SongsDataGridProps {
  songs: Song[];
  searchQuery: string;
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSortChange: (column: SortColumn, direction: "asc" | "desc") => void;
  onDeleteSong: (song: Song) => void;
  onPlaySong?: (song: Song) => void;
  onQueueSong?: (song: Song) => void;
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
  onSortChange,
  onDeleteSong,
  onPlaySong,
  onQueueSong,
}: SongsDataGridProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    song: Song;
  } | null>(null);

  // Create MUI theme based on CSS variables
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: document.documentElement.classList.contains("dark") ? "dark" : "light",
        },
        typography: {
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: 13,
        },
      }),
    []
  );

  // DataGrid sx styles - narrow rows, alternating colors, no hard borders
  const dataGridSx = {
    border: "none",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    fontFamily: "var(--font-serif), Georgia, serif",
    "& .MuiDataGrid-cell": {
      border: "none",
      fontSize: "0.8125rem",
      padding: "0 8px",
    },
    "& .MuiDataGrid-columnHeaders": {
      border: "none",
      borderBottom: "1px solid var(--border)",
      backgroundColor: "var(--background)",
      minHeight: "32px !important",
      maxHeight: "32px !important",
    },
    "& .MuiDataGrid-columnHeader": {
      backgroundColor: "var(--background)",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      fontSize: "0.75rem",
      fontWeight: 500,
      color: "var(--muted)",
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
        width: 40,
        type: "number",
        editable: true,
        renderCell: (params: GridRenderCellParams) => (
          <span className="text-[--muted] text-xs">{params.value || "—"}</span>
        ),
      },
      {
        field: "title",
        headerName: "Title",
        flex: 1.5,
        minWidth: 150,
        editable: true,
      },
      {
        field: "artist",
        headerName: "Artist",
        flex: 1,
        minWidth: 100,
        editable: true,
      },
      {
        field: "album",
        headerName: "Album",
        flex: 1,
        minWidth: 100,
        editable: true,
      },
      {
        field: "year",
        headerName: "Year",
        width: 50,
        type: "number",
        editable: true,
        renderCell: (params: GridRenderCellParams) => (
          <span className="text-[--muted] text-xs">{params.value || "—"}</span>
        ),
      },
      {
        field: "duration",
        headerName: "Time",
        width: 55,
        type: "number",
        renderCell: (params: GridRenderCellParams) => (
          <span className="tabular-nums text-[--muted] text-xs">
            {formatDuration(params.value || 0)}
          </span>
        ),
      },
      {
        field: "fileSize",
        headerName: "Size",
        width: 60,
        type: "number",
        renderCell: (params: GridRenderCellParams) => (
          <span className="tabular-nums text-[--muted] text-xs">
            {formatFileSize(params.value || 0)}
          </span>
        ),
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

  // Handle cell edit
  const processRowUpdate = async (newRow: Song, oldRow: Song) => {
    if (!newRow.id) return oldRow;

    const updates: Partial<Song> = {};

    if (newRow.title !== oldRow.title) updates.title = newRow.title;
    if (newRow.artist !== oldRow.artist) updates.artist = newRow.artist;
    if (newRow.album !== oldRow.album) updates.album = newRow.album;
    if (newRow.year !== oldRow.year) updates.year = newRow.year;
    if (newRow.trackNumber !== oldRow.trackNumber) updates.trackNumber = newRow.trackNumber;

    if (Object.keys(updates).length > 0) {
      await updateSong(newRow.id, updates);
    }

    return newRow;
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
          processRowUpdate={processRowUpdate}
          onRowDoubleClick={handleRowDoubleClick}
          disableRowSelectionOnClick
          disableColumnMenu
          hideFooter
          rowHeight={28}
          columnHeaderHeight={32}
          sx={dataGridSx}
        />

        {/* Context Menu */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
            <div
              className="fixed z-50 py-1 rounded shadow-lg border border-[--border] min-w-[140px]"
              style={{
                left: contextMenu.x,
                top: contextMenu.y,
                backgroundColor: "var(--background)",
              }}
            >
              {onPlaySong && (
                <button
                  type="button"
                  onClick={() => {
                    onPlaySong(contextMenu.song);
                    closeContextMenu();
                  }}
                  className="context-menu-item"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Play
                </button>
              )}
              {onQueueSong && (
                <button
                  type="button"
                  onClick={() => {
                    onQueueSong(contextMenu.song);
                    closeContextMenu();
                  }}
                  className="context-menu-item"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add to Queue
                </button>
              )}
              <div className="h-px my-1" style={{ backgroundColor: "var(--border)" }} />
              <button
                type="button"
                onClick={() => {
                  onDeleteSong(contextMenu.song);
                  closeContextMenu();
                }}
                className="context-menu-item danger"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </ThemeProvider>
  );
}
