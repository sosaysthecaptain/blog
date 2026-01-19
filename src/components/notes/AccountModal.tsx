"use client";

import { useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { NoteItem } from "@/lib/notes";

interface AccountModalProps {
  userEmail?: string;
  items: NoteItem[];
  onExport: () => void;
  onClose: () => void;
}

export default function AccountModal({ userEmail, items, onExport, onClose }: AccountModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Calculate stats
  const stats = useMemo(() => {
    let totalBytes = 0;

    items.forEach(item => {
      // Moodboard images
      if (item.type === "moodboard" && item.images) {
        totalBytes += item.images.reduce((sum, img) => sum + (img.fileSize || 0), 0);
      }
      // Note content and embedded media
      if (item.type === "note") {
        if (item.content) {
          totalBytes += new Blob([item.content]).size;
        }
        if (item.embeddedMedia) {
          totalBytes += item.embeddedMedia.reduce((sum, m) => sum + (m.fileSize || 0), 0);
        }
      }
    });

    return {
      totalItems: items.length,
      storage: formatSize(totalBytes),
    };
  }, [items]);

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm border border-[--border]"
        style={{ backgroundColor: 'var(--background)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[--border]">
          <span className="text-sm font-medium text-[--foreground]">Account</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[--muted] hover:text-[--foreground]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          <div className="space-y-2">
            <div className="flex text-sm">
              <span className="w-16 flex-shrink-0 text-[--muted]">Email</span>
              <span className="text-[--foreground] break-words min-w-0">{userEmail || "—"}</span>
            </div>
            <div className="flex text-sm">
              <span className="w-16 flex-shrink-0 text-[--muted]">Plan</span>
              <span className="text-[--foreground]">Free</span>
            </div>
            <div className="flex text-sm">
              <span className="w-16 flex-shrink-0 text-[--muted]">Items</span>
              <span className="text-[--foreground]">{stats.totalItems}</span>
            </div>
            <div className="flex text-sm">
              <span className="w-16 flex-shrink-0 text-[--muted]">Usage</span>
              <span className="text-[--foreground]">{stats.storage}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { onExport(); onClose(); }}
            className="flex items-center gap-2 text-sm text-[--muted] hover:text-[--foreground]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export all data
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level
  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
