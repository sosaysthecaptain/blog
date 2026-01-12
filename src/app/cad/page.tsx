'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
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
  LengthConstraint,
  RadiusConstraint,
  DistanceConstraint,
  AngleConstraint,
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
  generateId,
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

  // Detect over-constrained entities (duplicate constraints on same entity)
  const overConstrainedEntities = useMemo(() => {
    const overConstrained = new Set<string>();
    const lineConstraints = new Map<string, string[]>(); // lineId -> constraintIds
    const circleConstraints = new Map<string, string[]>(); // circleId -> constraintIds

    for (const [constraintId, constraint] of constraints) {
      if (constraint.type === 'length') {
        const lc = constraint as LengthConstraint;
        const existing = lineConstraints.get(lc.lineId) || [];
        existing.push(constraintId);
        lineConstraints.set(lc.lineId, existing);

        // If there are multiple length constraints on same line, it's over-constrained
        if (existing.length > 1) {
          overConstrained.add(lc.lineId);
          existing.forEach(id => overConstrained.add(id));
        }
      } else if (constraint.type === 'radius') {
        const rc = constraint as RadiusConstraint;
        const existing = circleConstraints.get(rc.circleId) || [];
        existing.push(constraintId);
        circleConstraints.set(rc.circleId, existing);

        // If there are multiple radius constraints on same circle, it's over-constrained
        if (existing.length > 1) {
          overConstrained.add(rc.circleId);
          existing.forEach(id => overConstrained.add(id));
        }
      }
    }

    return overConstrained;
  }, [constraints]);

  // Computed sketch status
  const degreesOfFreedom = calculateDOF(entities, constraints);
  const hasConflicts = overConstrainedEntities.size > 0;
  const constraintStatus = getConstraintStatus(degreesOfFreedom, hasConflicts);

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

  // Add dimension handler - returns the constraint ID
  const handleAddDimension = useCallback((entityId: string, entityType: 'line' | 'circle', offset: number): string | null => {
    if (entityType === 'line') {
      const line = entities.lines.get(entityId);
      if (!line) return null;

      const startPoint = entities.points.get(line.startId);
      const endPoint = entities.points.get(line.endId);
      if (!startPoint || !endPoint) return null;

      // Calculate length
      const length = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) +
        Math.pow(endPoint.y - startPoint.y, 2)
      );

      const constraint: LengthConstraint = {
        id: generateId('dim'),
        type: 'length',
        lineId: entityId,
        value: Math.round(length * 10) / 10, // Round to 1 decimal
        offset,
      };

      setConstraints(prev => {
        const newConstraints = new Map(prev);
        newConstraints.set(constraint.id, constraint);
        return newConstraints;
      });

      return constraint.id;
    } else if (entityType === 'circle') {
      const circle = entities.circles.get(entityId);
      if (!circle) return null;

      const constraint: RadiusConstraint = {
        id: generateId('dim'),
        type: 'radius',
        circleId: entityId,
        value: Math.round(circle.radius * 10) / 10, // Round to 1 decimal
        offset,
      };

      setConstraints(prev => {
        const newConstraints = new Map(prev);
        newConstraints.set(constraint.id, constraint);
        return newConstraints;
      });

      return constraint.id;
    }
    return null;
  }, [entities]);

  // Add distance dimension between two points
  const handleAddDistanceDimension = useCallback((point1Id: string, point2Id: string, offset: number): string | null => {
    const point1 = entities.points.get(point1Id);
    const point2 = entities.points.get(point2Id);
    if (!point1 || !point2) return null;

    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
    );

    const constraint: DistanceConstraint = {
      id: generateId('dim'),
      type: 'distance',
      point1Id,
      point2Id,
      value: Math.round(distance * 10) / 10,
      offset,
    };

    setConstraints(prev => {
      const newConstraints = new Map(prev);
      newConstraints.set(constraint.id, constraint);
      return newConstraints;
    });

    return constraint.id;
  }, [entities]);

  // Add angle dimension between two lines
  const handleAddAngleDimension = useCallback((line1Id: string, line2Id: string, offset: number): string | null => {
    const line1 = entities.lines.get(line1Id);
    const line2 = entities.lines.get(line2Id);
    if (!line1 || !line2) return null;

    // Calculate angle between lines
    const p1Start = entities.points.get(line1.startId);
    const p1End = entities.points.get(line1.endId);
    const p2Start = entities.points.get(line2.startId);
    const p2End = entities.points.get(line2.endId);
    if (!p1Start || !p1End || !p2Start || !p2End) return null;

    const dx1 = p1End.x - p1Start.x;
    const dy1 = p1End.y - p1Start.y;
    const dx2 = p2End.x - p2Start.x;
    const dy2 = p2End.y - p2Start.y;

    const angle1 = Math.atan2(dy1, dx1);
    const angle2 = Math.atan2(dy2, dx2);
    let angleDiff = Math.abs(angle2 - angle1) * 180 / Math.PI;
    if (angleDiff > 180) angleDiff = 360 - angleDiff;

    const constraint: AngleConstraint = {
      id: generateId('dim'),
      type: 'angle',
      line1Id,
      line2Id,
      value: Math.round(angleDiff * 10) / 10,
      offset,
    };

    setConstraints(prev => {
      const newConstraints = new Map(prev);
      newConstraints.set(constraint.id, constraint);
      return newConstraints;
    });

    return constraint.id;
  }, [entities]);

  // Update constraint value handler - also updates geometry to match
  const handleUpdateConstraint = useCallback((constraintId: string, value: number) => {
    const constraint = constraints.get(constraintId);
    if (!constraint) return;

    // Update the constraint value
    setConstraints(prev => {
      const newConstraints = new Map(prev);
      if (constraint.type === 'length') {
        newConstraints.set(constraintId, { ...constraint, value } as LengthConstraint);
      } else if (constraint.type === 'radius') {
        newConstraints.set(constraintId, { ...constraint, value } as RadiusConstraint);
      }
      return newConstraints;
    });

    // Update geometry to match the new constraint value
    if (constraint.type === 'length') {
      const lengthConstraint = constraint as LengthConstraint;
      const line = entities.lines.get(lengthConstraint.lineId);
      if (!line) return;

      const startPoint = entities.points.get(line.startId);
      const endPoint = entities.points.get(line.endId);
      if (!startPoint || !endPoint) return;

      // Calculate current length and direction
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const currentLength = Math.sqrt(dx * dx + dy * dy);
      if (currentLength < 0.001) return;

      // Normalize direction
      const dirX = dx / currentLength;
      const dirY = dy / currentLength;

      // Determine which point to keep fixed (smart point movement)
      // Priority: origin > fixed constraint > shared with other lines > start point
      const isStartAtOrigin = Math.abs(startPoint.x) < 0.001 && Math.abs(startPoint.y) < 0.001;
      const isEndAtOrigin = Math.abs(endPoint.x) < 0.001 && Math.abs(endPoint.y) < 0.001;

      // Check if points have fixed constraints
      let startIsFixed = isStartAtOrigin;
      let endIsFixed = isEndAtOrigin;
      for (const c of constraints.values()) {
        if (c.type === 'fixed') {
          const fc = c as { pointId: string };
          if (fc.pointId === line.startId) startIsFixed = true;
          if (fc.pointId === line.endId) endIsFixed = true;
        }
      }

      // Check if points are shared with other lines (more constrained)
      let startSharedCount = 0;
      let endSharedCount = 0;
      for (const otherLine of entities.lines.values()) {
        if (otherLine.id === line.id) continue;
        if (otherLine.startId === line.startId || otherLine.endId === line.startId) startSharedCount++;
        if (otherLine.startId === line.endId || otherLine.endId === line.endId) endSharedCount++;
      }

      // Decide which point to move
      let moveEnd = true; // Default: keep start fixed, move end
      if (endIsFixed && !startIsFixed) {
        moveEnd = false; // Keep end fixed, move start
      } else if (startIsFixed && !endIsFixed) {
        moveEnd = true; // Keep start fixed, move end
      } else if (endSharedCount > startSharedCount) {
        moveEnd = false; // End is more connected, move start
      }

      setEntities(prev => {
        const newPoints = new Map(prev.points);
        if (moveEnd) {
          // Keep start fixed, move end
          const newEndX = startPoint.x + dirX * value;
          const newEndY = startPoint.y + dirY * value;
          newPoints.set(line.endId, { ...endPoint, x: newEndX, y: newEndY });
        } else {
          // Keep end fixed, move start
          const newStartX = endPoint.x - dirX * value;
          const newStartY = endPoint.y - dirY * value;
          newPoints.set(line.startId, { ...startPoint, x: newStartX, y: newStartY });
        }
        return { ...prev, points: newPoints };
      });
    } else if (constraint.type === 'radius') {
      const radiusConstraint = constraint as RadiusConstraint;
      const circle = entities.circles.get(radiusConstraint.circleId);
      if (!circle) return;

      // Update circle radius
      setEntities(prev => {
        const newCircles = new Map(prev.circles);
        newCircles.set(radiusConstraint.circleId, { ...circle, radius: value });
        return { ...prev, circles: newCircles };
      });
    }
  }, [constraints, entities]);

  // Delete selected entity handler
  const handleDeleteSelected = useCallback(() => {
    if (!selectedEntityId) return;

    // Check if it's a constraint (dimension)
    if (constraints.has(selectedEntityId)) {
      setConstraints(prev => {
        const newConstraints = new Map(prev);
        newConstraints.delete(selectedEntityId);
        return newConstraints;
      });
      setSelectedEntityId(null);
      return;
    }

    // Check if it's a point
    if (entities.points.has(selectedEntityId)) {
      // Find and delete any lines/circles that use this point
      const linesToDelete: string[] = [];
      const circlesToDelete: string[] = [];

      for (const [lineId, line] of entities.lines) {
        if (line.startId === selectedEntityId || line.endId === selectedEntityId) {
          linesToDelete.push(lineId);
        }
      }

      for (const [circleId, circle] of entities.circles) {
        if (circle.centerId === selectedEntityId) {
          circlesToDelete.push(circleId);
        }
      }

      // Delete constraints that reference deleted entities
      setConstraints(prev => {
        const newConstraints = new Map(prev);
        for (const [constraintId, constraint] of prev) {
          if (constraint.type === 'length' && linesToDelete.includes((constraint as LengthConstraint).lineId)) {
            newConstraints.delete(constraintId);
          }
          if (constraint.type === 'radius' && circlesToDelete.includes((constraint as RadiusConstraint).circleId)) {
            newConstraints.delete(constraintId);
          }
        }
        return newConstraints;
      });

      setEntities(prev => {
        const newPoints = new Map(prev.points);
        const newLines = new Map(prev.lines);
        const newCircles = new Map(prev.circles);

        newPoints.delete(selectedEntityId);
        linesToDelete.forEach(id => newLines.delete(id));
        circlesToDelete.forEach(id => newCircles.delete(id));

        return { ...prev, points: newPoints, lines: newLines, circles: newCircles };
      });

      setSelectedEntityId(null);
      return;
    }

    // Check if it's a line
    if (entities.lines.has(selectedEntityId)) {
      const line = entities.lines.get(selectedEntityId)!;

      // Delete constraints that reference this line
      setConstraints(prev => {
        const newConstraints = new Map(prev);
        for (const [constraintId, constraint] of prev) {
          if (constraint.type === 'length' && (constraint as LengthConstraint).lineId === selectedEntityId) {
            newConstraints.delete(constraintId);
          }
        }
        return newConstraints;
      });

      // Delete the line and its endpoints (if not shared)
      setEntities(prev => {
        const newLines = new Map(prev.lines);
        const newPoints = new Map(prev.points);

        newLines.delete(selectedEntityId);

        // Check if endpoints are used by other lines
        let startUsed = false;
        let endUsed = false;
        for (const [lineId, otherLine] of newLines) {
          if (otherLine.startId === line.startId || otherLine.endId === line.startId) startUsed = true;
          if (otherLine.startId === line.endId || otherLine.endId === line.endId) endUsed = true;
        }
        // Also check circles
        for (const circle of prev.circles.values()) {
          if (circle.centerId === line.startId) startUsed = true;
          if (circle.centerId === line.endId) endUsed = true;
        }

        if (!startUsed) newPoints.delete(line.startId);
        if (!endUsed) newPoints.delete(line.endId);

        return { ...prev, lines: newLines, points: newPoints };
      });

      setSelectedEntityId(null);
      return;
    }

    // Check if it's a circle
    if (entities.circles.has(selectedEntityId)) {
      const circle = entities.circles.get(selectedEntityId)!;

      // Delete constraints that reference this circle
      setConstraints(prev => {
        const newConstraints = new Map(prev);
        for (const [constraintId, constraint] of prev) {
          if (constraint.type === 'radius' && (constraint as RadiusConstraint).circleId === selectedEntityId) {
            newConstraints.delete(constraintId);
          }
        }
        return newConstraints;
      });

      // Delete the circle and its center (if not shared)
      setEntities(prev => {
        const newCircles = new Map(prev.circles);
        const newPoints = new Map(prev.points);

        newCircles.delete(selectedEntityId);

        // Check if center is used by other entities
        let centerUsed = false;
        for (const line of prev.lines.values()) {
          if (line.startId === circle.centerId || line.endId === circle.centerId) centerUsed = true;
        }
        for (const [circleId, otherCircle] of newCircles) {
          if (otherCircle.centerId === circle.centerId) centerUsed = true;
        }

        if (!centerUsed) newPoints.delete(circle.centerId);

        return { ...prev, circles: newCircles, points: newPoints };
      });

      setSelectedEntityId(null);
      return;
    }
  }, [selectedEntityId, entities, constraints]);

  // Toggle construction mode on selected entity
  const handleToggleConstruction = useCallback(() => {
    if (!selectedEntityId) {
      // No selection - toggle global construction mode
      setConstructionMode(prev => !prev);
      return;
    }

    // Check if it's a line
    if (entities.lines.has(selectedEntityId)) {
      setEntities(prev => {
        const line = prev.lines.get(selectedEntityId);
        if (!line) return prev;
        const newLines = new Map(prev.lines);
        newLines.set(selectedEntityId, { ...line, construction: !line.construction });
        return { ...prev, lines: newLines };
      });
      return;
    }

    // Check if it's a circle
    if (entities.circles.has(selectedEntityId)) {
      setEntities(prev => {
        const circle = prev.circles.get(selectedEntityId);
        if (!circle) return prev;
        const newCircles = new Map(prev.circles);
        newCircles.set(selectedEntityId, { ...circle, construction: !circle.construction });
        return { ...prev, circles: newCircles };
      });
      return;
    }

    // Check if it's a point
    if (entities.points.has(selectedEntityId)) {
      setEntities(prev => {
        const point = prev.points.get(selectedEntityId);
        if (!point) return prev;
        const newPoints = new Map(prev.points);
        newPoints.set(selectedEntityId, { ...point, construction: !point.construction });
        return { ...prev, points: newPoints };
      });
      return;
    }

    // If nothing matched, toggle global mode
    setConstructionMode(prev => !prev);
  }, [selectedEntityId, entities]);

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

      // Handle delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
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
          handleToggleConstruction();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mounted, handleDeleteSelected, handleToggleConstruction]);

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
            constraints={constraints}
            activeTool={activeTool}
            constructionMode={constructionMode}
            onAddPoint={handleAddPoint}
            onAddLine={handleAddLine}
            onAddCircle={handleAddCircle}
            onAddRectangle={handleAddRectangle}
            onMovePoint={handleMovePoint}
            onAddDimension={handleAddDimension}
            onAddDistanceDimension={handleAddDistanceDimension}
            onAddAngleDimension={handleAddAngleDimension}
            onUpdateConstraint={handleUpdateConstraint}
            selectedEntityId={selectedEntityId}
            onSelectEntity={setSelectedEntityId}
            overConstrainedEntities={overConstrainedEntities}
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
