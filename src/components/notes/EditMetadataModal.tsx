"use client";

import { useState, useRef } from "react";
import { Song, updateSong } from "@/lib/songs";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface EditMetadataModalProps {
  songs: Song[];
  onClose: () => void;
  onSaved: () => void;
}

const FONT_FAMILY = "'Lucida Grande', 'Lucida Sans Unicode', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const ALBUM_ART_THUMB_SIZE = 200;

/**
 * Generate a thumbnail from album art
 */
async function generateAlbumArtThumbnail(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = ALBUM_ART_THUMB_SIZE;
      canvas.height = ALBUM_ART_THUMB_SIZE;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Draw image centered and cropped to square
      const size = Math.min(img.width, img.height);
      const x = (img.width - size) / 2;
      const y = (img.height - size) / 2;

      ctx.drawImage(img, x, y, size, size, 0, 0, ALBUM_ART_THUMB_SIZE, ALBUM_ART_THUMB_SIZE);

      canvas.toBlob(
        (thumbBlob) => {
          if (thumbBlob) {
            resolve(thumbBlob);
          } else {
            reject(new Error("Failed to generate thumbnail"));
          }
        },
        "image/webp",
        0.8
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Upload album art and generate thumbnail
 */
async function uploadAlbumArt(
  file: File,
  libraryId: string,
  songId: string
): Promise<{ albumArtUrl: string; albumArtThumbUrl: string }> {
  // Convert to webp
  let artBlob: Blob = file;
  try {
    const canvas = document.createElement("canvas");
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      const webpBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.9)
      );
      if (webpBlob) artBlob = webpBlob;
    }
  } catch {
    // Keep original if conversion fails
  }

  // Upload original album art
  const artPath = `notes/${libraryId}/music/${songId}_art.webp`;
  const artRef = ref(storage, artPath);
  await uploadBytes(artRef, artBlob);
  const albumArtUrl = await getDownloadURL(artRef);

  // Generate and upload thumbnail
  const thumbBlob = await generateAlbumArtThumbnail(file);
  const thumbPath = `notes/${libraryId}/music/${songId}_art_thumb.webp`;
  const thumbRef = ref(storage, thumbPath);
  await uploadBytes(thumbRef, thumbBlob);
  const albumArtThumbUrl = await getDownloadURL(thumbRef);

  return { albumArtUrl, albumArtThumbUrl };
}

/**
 * Extract song ID from a storage path
 */
function getSongIdFromPath(storagePath: string): string | null {
  // Path format: notes/{libraryId}/music/{songId}.{ext}
  const match = storagePath.match(/\/music\/([^.]+)\./);
  return match ? match[1] : null;
}

export default function EditMetadataModal({ songs, onClose, onSaved }: EditMetadataModalProps) {
  const isMultiple = songs.length > 1;

  // For single song, use its values. For multiple, leave blank (only filled fields will update)
  const [title, setTitle] = useState(isMultiple ? "" : songs[0]?.title || "");
  const [artist, setArtist] = useState(isMultiple ? "" : songs[0]?.artist || "");
  const [album, setAlbum] = useState(isMultiple ? "" : songs[0]?.album || "");
  const [year, setYear] = useState(isMultiple ? "" : songs[0]?.year?.toString() || "");
  const [trackNumber, setTrackNumber] = useState(isMultiple ? "" : songs[0]?.trackNumber?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);

  // Album art state
  const [albumArtFile, setAlbumArtFile] = useState<File | null>(null);
  const [albumArtPreview, setAlbumArtPreview] = useState<string | null>(
    isMultiple ? null : songs[0]?.albumArtThumbUrl || songs[0]?.albumArtUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAlbumArtSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAlbumArtFile(file);
      // Clean up previous preview URL if it was created by us
      if (albumArtPreview && !albumArtPreview.startsWith("https://")) {
        URL.revokeObjectURL(albumArtPreview);
      }
      setAlbumArtPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const song of songs) {
        if (!song.id) continue;

        const updates: Partial<Song> = {};

        // For single song, update all fields
        // For multiple songs, only update non-empty fields
        if (!isMultiple || title.trim()) {
          updates.title = title.trim() || song.title;
        }
        if (!isMultiple || artist.trim()) {
          updates.artist = artist.trim();
        }
        if (!isMultiple || album.trim()) {
          updates.album = album.trim();
        }
        if (!isMultiple || year.trim()) {
          const yearNum = parseInt(year, 10);
          updates.year = isNaN(yearNum) ? null : yearNum;
        }
        if (!isMultiple || trackNumber.trim()) {
          const trackNum = parseInt(trackNumber, 10);
          updates.trackNumber = isNaN(trackNum) ? null : trackNum;
        }

        // Upload album art if selected
        if (albumArtFile) {
          const songId = getSongIdFromPath(song.storagePath);
          if (songId) {
            try {
              const artUrls = await uploadAlbumArt(albumArtFile, song.libraryId, songId);
              updates.albumArtUrl = artUrls.albumArtUrl;
              updates.albumArtThumbUrl = artUrls.albumArtThumbUrl;
            } catch (error) {
              console.error("Failed to upload album art:", error);
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          await updateSong(song.id, updates);
        }
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save metadata:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] border border-[--border] rounded-lg shadow-xl"
        style={{ fontFamily: FONT_FAMILY, backgroundColor: "var(--background)" }}
      >
        <div className="px-5 py-4 border-b border-[--border]">
          <h2 className="text-sm font-semibold text-[--foreground]">
            {isMultiple ? `Edit ${songs.length} Songs` : "Edit Metadata"}
          </h2>
          {isMultiple && (
            <p className="text-xs text-[--muted] mt-1">
              Only filled fields will be updated
            </p>
          )}
        </div>

        <div className="px-5 py-4">
          <div className="flex gap-4">
            {/* Album Art */}
            <div className="flex-shrink-0">
              <label className="block text-xs text-[--muted] mb-1">Album Art</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAlbumArtSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded border border-[--border] bg-[--sidebar-bg] flex items-center justify-center overflow-hidden hover:border-blue-500 transition-colors"
              >
                {albumArtPreview ? (
                  <img
                    src={albumArtPreview}
                    alt="Album art"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <svg className="w-8 h-8 text-[--muted] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] text-[--muted] mt-1 block">Click to add</span>
                  </div>
                )}
              </button>
            </div>

            {/* Fields */}
            <div className="flex-1 space-y-3">
              {!isMultiple && (
                <div>
                  <label className="block text-xs text-[--muted] mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm bg-[--sidebar-bg] border border-[--border] rounded focus:outline-none focus:border-blue-500 text-[--foreground]"
                    style={{ fontFamily: FONT_FAMILY }}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-[--muted] mb-1">Artist</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder={isMultiple ? "Leave blank to keep existing" : ""}
                  className="w-full px-2 py-1.5 text-sm bg-[--sidebar-bg] border border-[--border] rounded focus:outline-none focus:border-blue-500 text-[--foreground] placeholder:text-[--muted]/50"
                  style={{ fontFamily: FONT_FAMILY }}
                />
              </div>

              <div>
                <label className="block text-xs text-[--muted] mb-1">Album</label>
                <input
                  type="text"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  placeholder={isMultiple ? "Leave blank to keep existing" : ""}
                  className="w-full px-2 py-1.5 text-sm bg-[--sidebar-bg] border border-[--border] rounded focus:outline-none focus:border-blue-500 text-[--foreground] placeholder:text-[--muted]/50"
                  style={{ fontFamily: FONT_FAMILY }}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[--muted] mb-1">Year</label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder={isMultiple ? "—" : ""}
                    className="w-full px-2 py-1.5 text-sm bg-[--sidebar-bg] border border-[--border] rounded focus:outline-none focus:border-blue-500 text-[--foreground] placeholder:text-[--muted]/50"
                    style={{ fontFamily: FONT_FAMILY }}
                  />
                </div>
                {!isMultiple && (
                  <div className="flex-1">
                    <label className="block text-xs text-[--muted] mb-1">Track #</label>
                    <input
                      type="text"
                      value={trackNumber}
                      onChange={(e) => setTrackNumber(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-[--sidebar-bg] border border-[--border] rounded focus:outline-none focus:border-blue-500 text-[--foreground]"
                      style={{ fontFamily: FONT_FAMILY }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[--border] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs text-[--muted] hover:text-[--foreground] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}
