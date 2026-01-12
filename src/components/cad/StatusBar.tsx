'use client';

import { ConstraintStatus, ViewState } from '@/lib/cad/types';

interface StatusBarProps {
  degreesOfFreedom: number;
  constraintStatus: ConstraintStatus;
  viewState: ViewState;
  cursorPosition: { x: number; y: number } | null;
}

export default function StatusBar({
  degreesOfFreedom,
  constraintStatus,
  viewState,
  cursorPosition,
}: StatusBarProps) {
  const statusColors: Record<ConstraintStatus, string> = {
    'under-constrained': 'text-blue-500',
    'fully-constrained': 'text-green-500',
    'over-constrained': 'text-red-500',
  };

  const statusLabels: Record<ConstraintStatus, string> = {
    'under-constrained': 'Under-constrained',
    'fully-constrained': 'Fully constrained',
    'over-constrained': 'Over-constrained',
  };

  const formatCoord = (n: number) => {
    if (Math.abs(n) < 0.01) return '0.00';
    return n.toFixed(2);
  };

  const formatZoom = (zoom: number) => {
    return `${Math.round(zoom * 100)}%`;
  };

  return (
    <div className="flex items-center gap-4 px-3 py-1.5 bg-[--sidebar-bg] border-t border-[--border] text-xs text-[--muted]">
      {/* Constraint Status */}
      <div className="flex items-center gap-2">
        <span className={statusColors[constraintStatus]}>
          {constraintStatus === 'fully-constrained' ? (
            <svg className="w-3.5 h-3.5 inline" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </span>
        <span>
          {statusLabels[constraintStatus]}
          {constraintStatus !== 'fully-constrained' && (
            <span className="ml-1">({degreesOfFreedom} DOF)</span>
          )}
        </span>
      </div>

      <div className="w-px h-4 bg-[--border]" />

      {/* Cursor Position */}
      <div className="flex items-center gap-1 font-mono">
        {cursorPosition ? (
          <>
            <span className="text-[--foreground]">X:</span>
            <span className="w-16">{formatCoord(cursorPosition.x)}</span>
            <span className="text-[--foreground]">Y:</span>
            <span className="w-16">{formatCoord(cursorPosition.y)}</span>
          </>
        ) : (
          <span>--</span>
        )}
      </div>

      <div className="flex-1" />

      {/* Zoom Level */}
      <div className="flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="font-mono">{formatZoom(viewState.zoom)}</span>
      </div>
    </div>
  );
}
