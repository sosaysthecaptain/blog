"use client";

import { useState, useEffect } from "react";
import { NoteItem } from "@/lib/notes";

interface AccountModalProps {
  userEmail?: string;
  items: NoteItem[];
  onExport: () => void;
  onClose: () => void;
}

export default function AccountModal({ userEmail, items, onExport, onClose }: AccountModalProps) {
  const [stats, setStats] = useState({
    notes: 0,
    folders: 0,
    albums: 0,
    musicLibraries: 0,
  });

  useEffect(() => {
    // Calculate stats
    const notes = items.filter(i => i.type === "note").length;
    const folders = items.filter(i => i.type === "folder").length;
    const albums = items.filter(i => i.type === "moodboard").length;
    const musicLibraries = items.filter(i => i.type === "music").length;

    setStats({ notes, folders, albums, musicLibraries });
  }, [items]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[--background] rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--border]">
          <h2 className="text-lg font-semibold text-[--foreground]">Account</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[--hover] flex items-center justify-center">
              <svg className="w-6 h-6 text-[--foreground]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[--foreground]">{userEmail || "User"}</p>
              <p className="text-xs text-[--muted]">Free plan</p>
            </div>
          </div>

          {/* Usage stats */}
          <div>
            <h3 className="text-sm font-medium text-[--foreground] mb-3">Usage</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[--sidebar-bg] rounded-lg">
                <p className="text-2xl font-semibold text-[--foreground]">{stats.notes}</p>
                <p className="text-xs text-[--muted]">Notes</p>
              </div>
              <div className="p-3 bg-[--sidebar-bg] rounded-lg">
                <p className="text-2xl font-semibold text-[--foreground]">{stats.folders}</p>
                <p className="text-xs text-[--muted]">Folders</p>
              </div>
              <div className="p-3 bg-[--sidebar-bg] rounded-lg">
                <p className="text-2xl font-semibold text-[--foreground]">{stats.albums}</p>
                <p className="text-xs text-[--muted]">Albums</p>
              </div>
              <div className="p-3 bg-[--sidebar-bg] rounded-lg">
                <p className="text-2xl font-semibold text-[--foreground]">{stats.musicLibraries}</p>
                <p className="text-xs text-[--muted]">Music Libraries</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => { onExport(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[--sidebar-bg] hover:bg-[--hover] rounded-lg text-sm text-[--foreground] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export all data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
