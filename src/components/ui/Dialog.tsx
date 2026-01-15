"use client";

import { useEffect, useRef, useCallback } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Dialog({ open, onClose, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with visible overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Dialog box with classic styling */}
      <div
        ref={dialogRef}
        className="relative bg-white dark:bg-[#1a1a1a] rounded-lg max-w-md w-full animate-in fade-in zoom-in-95 duration-150"
        style={{
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onCancel}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-[--foreground] mb-2">{title}</h2>
        <p className="text-sm text-[--muted] mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="dialog-btn dialog-btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`dialog-btn ${variant === "danger" ? "dialog-btn-danger" : "dialog-btn-primary"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

interface AlertDialogProps {
  open: boolean;
  title: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
}

export function AlertDialog({
  open,
  title,
  message,
  buttonLabel = "OK",
  onClose,
}: AlertDialogProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-[--foreground] mb-2">{title}</h2>
        <p className="text-sm text-[--muted] mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end">
          <button
            ref={buttonRef}
            type="button"
            onClick={onClose}
            className="dialog-btn dialog-btn-primary"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

// Hook for easier confirm dialog usage
export function useConfirmDialog() {
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((
    title: string,
    message: string,
    options?: { confirmLabel?: string; cancelLabel?: string; variant?: "default" | "danger" }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      // This needs to be handled by state in the parent component
      // The hook returns the props needed for the dialog
    });
  }, []);

  return { confirm };
}

// Save/Discard dialog for unsaved changes
interface SaveDiscardDialogProps {
  open: boolean;
  title: string;
  message: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function SaveDiscardDialog({
  open,
  title,
  message,
  onSave,
  onDiscard,
  onCancel,
}: SaveDiscardDialogProps) {
  const saveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && saveRef.current) {
      saveRef.current.focus();
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onCancel}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-[--foreground] mb-2">{title}</h2>
        <p className="text-sm text-[--muted] mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="dialog-btn dialog-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="dialog-btn dialog-btn-danger"
          >
            Discard
          </button>
          <button
            ref={saveRef}
            type="button"
            onClick={onSave}
            className="dialog-btn dialog-btn-primary"
          >
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}

// Progress dialog for long-running operations
interface ProgressDialogProps {
  open: boolean;
  title: string;
  message: string;
  progress?: number; // 0-100, or undefined for indeterminate
  detail?: string; // Current item being processed
  onCancel?: () => void;
}

export function ProgressDialog({
  open,
  title,
  message,
  progress,
  detail,
  onCancel,
}: ProgressDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative bg-white dark:bg-[#1a1a1a] rounded-lg max-w-md w-full"
        style={{
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[--foreground] mb-2">{title}</h2>
          <p className="text-sm text-[--muted] mb-4">{message}</p>

          {/* Progress bar */}
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            {progress !== undefined ? (
              <div
                className="h-full bg-[#1a1a1a] dark:bg-[#e5e5e5] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            ) : (
              <div className="h-full bg-[#1a1a1a] dark:bg-[#e5e5e5] animate-pulse w-full" />
            )}
          </div>

          {progress !== undefined && (
            <p className="text-xs text-[--muted] text-right mb-2">{Math.round(progress)}%</p>
          )}

          {detail && (
            <p className="text-xs text-[--muted] truncate mb-4">{detail}</p>
          )}

          {onCancel && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="dialog-btn dialog-btn-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
