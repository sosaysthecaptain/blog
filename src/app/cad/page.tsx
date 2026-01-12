'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Toolbar from '@/components/cad/Toolbar';
import StatusBar from '@/components/cad/StatusBar';
import CodePanel from '@/components/cad/CodePanel';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
  ToolType,
  ViewState,
  ConstraintStatus,
  SketchEntities,
  Constraint,
} from '@/lib/cad/types';
import {
  createEmptyEntities,
  addPoint,
  addLine,
  addCircle,
  addRectangle,
  movePoint,
  calculateDOF,
  getConstraintStatus,
  generateCode,
} from '@/lib/cad/sketch';

// Dynamic import for Canvas to avoid SSR issues with Three.js
const Canvas = dynamic(() => import('@/components/cad/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[--background]">
      <span className="text-[--muted]">Loading CAD...</span>
    </div>
  ),
});

export default function CADPage() {
  const { isDark, toggle: toggleDarkMode, mounted } = useDarkMode();

  // View state
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  // Tool state
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [constructionMode, setConstructionMode] = useState(false);

  // Sketch state
  const [entities, setEntities] = useState<SketchEntities>(createEmptyEntities);
  const [constraints, setConstraints] = useState<Map<string, Constraint>>(new Map());

  // Computed sketch status
  const degreesOfFreedom = calculateDOF(entities, constraints);
  const constraintStatus = getConstraintStatus(degreesOfFreedom);

  // Cursor position
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  // Code representation
  const [code, setCode] = useState('');

  // Update code when entities or constraints change
  useEffect(() => {
    setCode(generateCode(entities, constraints));
  }, [entities, constraints]);

  // Handle view changes from canvas
  const handleViewChange = useCallback((newView: ViewState) => {
    setViewState(newView);
  }, []);

  // Handle tool changes
  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
  }, []);

  // Drawing handlers
  const handleAddPoint = useCallback((x: number, y: number) => {
    setEntities(prev => {
      const { entities: newEntities } = addPoint(prev, x, y, constructionMode);
      return newEntities;
    });
  }, [constructionMode]);

  const handleAddLine = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    setEntities(prev => {
      const { entities: newEntities } = addLine(prev, x1, y1, x2, y2, constructionMode);
      return newEntities;
    });
  }, [constructionMode]);

  const handleAddCircle = useCallback((cx: number, cy: number, radius: number) => {
    setEntities(prev => {
      const { entities: newEntities } = addCircle(prev, cx, cy, radius, constructionMode);
      return newEntities;
    });
  }, [constructionMode]);

  const handleAddRectangle = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    setEntities(prev => {
      const { entities: newEntities } = addRectangle(prev, x1, y1, x2, y2, constructionMode);
      return newEntities;
    });
  }, [constructionMode]);

  // Selection state
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Move point handler
  const handleMovePoint = useCallback((pointId: string, x: number, y: number) => {
    setEntities(prev => movePoint(prev, pointId, x, y));
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'escape':
          setActiveTool('select');
          break;
        case 'p':
          setActiveTool('point');
          break;
        case 'l':
          setActiveTool('line');
          break;
        case 'c':
          setActiveTool('circle');
          break;
        case 'g':
          setActiveTool('rectangle-corner');
          break;
        case 'r':
          setActiveTool('rectangle-center');
          break;
        case 'd':
          setActiveTool('dimension');
          break;
        case 'q':
          setConstructionMode((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mounted]);

  // Track mouse position for status bar
  useEffect(() => {
    if (!mounted) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = document.querySelector('.cad-canvas-container')?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left - rect.width / 2;
      const screenY = -(e.clientY - rect.top - rect.height / 2);

      const worldX = (screenX - viewState.panX) / viewState.zoom;
      const worldY = (screenY - viewState.panY) / viewState.zoom;

      setCursorPosition({ x: worldX, y: worldY });
    };

    const handleMouseLeave = () => {
      setCursorPosition(null);
    };

    const container = document.querySelector('.cad-canvas-container');
    if (container) {
      container.addEventListener('mousemove', handleMouseMove as EventListener);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove as EventListener);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [viewState, mounted]);

  // Don't render main content until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-[--background]">
        <span className="text-[--muted]">Loading CAD...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[--background] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[--border]">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-[--muted] hover:text-[--foreground] transition-colors"
            title="Back to Home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <h1 className="text-sm font-medium text-[--foreground]">CAD Sketch</h1>
        </div>
        <button
          onClick={toggleDarkMode}
          className="p-2 hover:bg-[--hover] rounded transition-colors"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <svg className="w-4 h-4 text-[--foreground]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[--foreground]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      {/* Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        constructionMode={constructionMode}
        onConstructionModeChange={setConstructionMode}
      />

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Container */}
        <div className="cad-canvas-container flex-1 relative">
          <Canvas
            isDarkMode={isDark}
            viewState={viewState}
            onViewChange={handleViewChange}
            entities={entities}
            activeTool={activeTool}
            constructionMode={constructionMode}
            onAddPoint={handleAddPoint}
            onAddLine={handleAddLine}
            onAddCircle={handleAddCircle}
            onAddRectangle={handleAddRectangle}
            onMovePoint={handleMovePoint}
            selectedEntityId={selectedEntityId}
            onSelectEntity={setSelectedEntityId}
          />
        </div>

        {/* Code Panel */}
        <CodePanel code={code} onCodeChange={setCode} />
      </div>

      {/* Status Bar */}
      <StatusBar
        degreesOfFreedom={degreesOfFreedom}
        constraintStatus={constraintStatus}
        viewState={viewState}
        cursorPosition={cursorPosition}
      />
    </div>
  );
}
