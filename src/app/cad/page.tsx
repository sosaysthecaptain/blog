'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  DimensionDirection,
  AngleConstraint,
  FixedConstraint,
  HorizontalConstraint,
  VerticalConstraint,
  CoincidentConstraint,
  PointOnLineConstraint,
  ORIGIN_POINT_ID,
} from '@/lib/cad/types';
import type { SnapInfo } from '@/components/cad/Canvas';
import {
  createEmptyEntities,
  addPoint,
  addLine,
  addCircle,
  addRectangle,
  movePoint,
  solveConstraints,
  calculateDOF,
  getConstraintStatus,
  calculateEntityConstraintStatus,
  getConstraintsForEntity,
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

  // Ref to always have latest constraints (for use in callbacks that need latest state)
  const constraintsRef = useRef(constraints);
  useEffect(() => {
    constraintsRef.current = constraints;
  }, [constraints]);

  // Undo/Redo history
  type HistoryState = { entities: SketchEntities; constraints: Map<string, Constraint> };
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const MAX_HISTORY = 50;

  // Save current state to undo stack
  const saveToHistory = useCallback(() => {
    setUndoStack(prev => {
      const newStack = [...prev, { entities, constraints }];
      if (newStack.length > MAX_HISTORY) {
        return newStack.slice(-MAX_HISTORY);
      }
      return newStack;
    });
    setRedoStack([]); // Clear redo stack when new action is taken
  }, [entities, constraints]);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(stack => stack.slice(0, -1));
    setRedoStack(stack => [...stack, { entities, constraints }]);
    setEntities(prev.entities);
    setConstraints(prev.constraints);
  }, [undoStack, entities, constraints]);

  // Redo handler
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(stack => stack.slice(0, -1));
    setUndoStack(stack => [...stack, { entities, constraints }]);
    setEntities(next.entities);
    setConstraints(next.constraints);
  }, [redoStack, entities, constraints]);

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

  // Per-entity constraint status (for coloring)
  const entityConstraintStatus = useMemo(() => {
    return calculateEntityConstraintStatus(entities, constraints);
  }, [entities, constraints]);

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

  // Helper to check if a point is at origin (generous threshold to match snap behavior)
  const isAtOrigin = (x: number, y: number) => Math.abs(x) < 0.1 && Math.abs(y) < 0.1;

  // Helper to check if a line is horizontal (within threshold - match origin threshold)
  const isHorizontal = (y1: number, y2: number) => Math.abs(y1 - y2) < 0.1;

  // Helper to check if a line is vertical (within threshold - match origin threshold)
  const isVertical = (x1: number, x2: number) => Math.abs(x1 - x2) < 0.1;

  // Drawing handlers with auto-constraint inference
  const handleAddPoint = useCallback((x: number, y: number, snapInfo?: SnapInfo) => {
    saveToHistory();

    // Create the point synchronously to get the ID before state updates
    const { entities: newEntities, point } = addPoint(entities, x, y, constructionMode);
    const newPointId = point.id;

    // Update entities state
    setEntities(newEntities);

    const newConstraints: Constraint[] = [];

    // Add constraint based on snap type
    if (snapInfo) {
      if (snapInfo.type === 'origin') {
        newConstraints.push({
          id: generateId('c'),
          type: 'coincident',
          point1Id: ORIGIN_POINT_ID,
          point2Id: newPointId,
        } as CoincidentConstraint);
      } else if (snapInfo.type === 'point' && snapInfo.entityId) {
        // Coincident with another point
        newConstraints.push({
          id: generateId('c'),
          type: 'coincident',
          point1Id: snapInfo.entityId,
          point2Id: newPointId,
        } as CoincidentConstraint);
      } else if (snapInfo.type === 'nearest-on-line' && snapInfo.entityId) {
        // Point on line constraint
        newConstraints.push({
          id: generateId('c'),
          type: 'pointOnLine',
          pointId: newPointId,
          lineId: snapInfo.entityId,
        } as PointOnLineConstraint);
      }
    } else if (isAtOrigin(x, y)) {
      // Fallback: check coordinates if no snap info
      newConstraints.push({
        id: generateId('c'),
        type: 'coincident',
        point1Id: ORIGIN_POINT_ID,
        point2Id: newPointId,
      } as CoincidentConstraint);
    }

    if (newConstraints.length > 0) {
      setConstraints(prev => {
        const updated = new Map(prev);
        newConstraints.forEach(c => updated.set(c.id, c));
        return updated;
      });
    }
  }, [entities, constructionMode, saveToHistory]);

  const handleAddLine = useCallback((x1: number, y1: number, x2: number, y2: number, startSnapInfo?: SnapInfo, endSnapInfo?: SnapInfo) => {
    saveToHistory();

    // Create the line synchronously to get the IDs before state updates
    const { entities: newEntities, line, startPoint, endPoint } = addLine(entities, x1, y1, x2, y2, constructionMode);
    const newLineId = line.id;
    const startPointId = startPoint.id;
    const endPointId = endPoint.id;

    // Update entities state
    setEntities(newEntities);

    // Auto-add constraints based on geometry and snap info
    const newConstraints: Constraint[] = [];

    // Constraints for start point based on snap info
    if (startSnapInfo) {
      if (startSnapInfo.type === 'origin') {
        newConstraints.push({
          id: generateId('c'),
          type: 'coincident',
          point1Id: ORIGIN_POINT_ID,
          point2Id: startPointId,
        } as CoincidentConstraint);
      } else if (startSnapInfo.type === 'point' && startSnapInfo.entityId) {
        newConstraints.push({
          id: generateId('c'),
          type: 'coincident',
          point1Id: startSnapInfo.entityId,
          point2Id: startPointId,
        } as CoincidentConstraint);
      } else if (startSnapInfo.type === 'nearest-on-line' && startSnapInfo.entityId) {
        newConstraints.push({
          id: generateId('c'),
          type: 'pointOnLine',
          pointId: startPointId,
          lineId: startSnapInfo.entityId,
        } as PointOnLineConstraint);
      }
    } else if (isAtOrigin(x1, y1)) {
      // Fallback: check coordinates if no snap info
      newConstraints.push({
        id: generateId('c'),
        type: 'coincident',
        point1Id: ORIGIN_POINT_ID,
        point2Id: startPointId,
      } as CoincidentConstraint);
    }

    // Constraints for end point based on snap info
    if (endSnapInfo) {
      if (endSnapInfo.type === 'origin') {
        newConstraints.push({
          id: generateId('c'),
          type: 'coincident',
          point1Id: ORIGIN_POINT_ID,
          point2Id: endPointId,
        } as CoincidentConstraint);
      } else if (endSnapInfo.type === 'point' && endSnapInfo.entityId) {
        newConstraints.push({
          id: generateId('c'),
          type: 'coincident',
          point1Id: endSnapInfo.entityId,
          point2Id: endPointId,
        } as CoincidentConstraint);
      } else if (endSnapInfo.type === 'nearest-on-line' && endSnapInfo.entityId) {
        newConstraints.push({
          id: generateId('c'),
          type: 'pointOnLine',
          pointId: endPointId,
          lineId: endSnapInfo.entityId,
        } as PointOnLineConstraint);
      }
    } else if (isAtOrigin(x2, y2)) {
      // Fallback: check coordinates if no snap info
      newConstraints.push({
        id: generateId('c'),
        type: 'coincident',
        point1Id: ORIGIN_POINT_ID,
        point2Id: endPointId,
      } as CoincidentConstraint);
    }

    // Horizontal constraint if line is horizontal
    if (isHorizontal(y1, y2)) {
      newConstraints.push({
        id: generateId('c'),
        type: 'horizontal',
        lineId: newLineId,
      } as HorizontalConstraint);
    }

    // Vertical constraint if line is vertical
    if (isVertical(x1, x2)) {
      newConstraints.push({
        id: generateId('c'),
        type: 'vertical',
        lineId: newLineId,
      } as VerticalConstraint);
    }

    if (newConstraints.length > 0) {
      setConstraints(prev => {
        const updated = new Map(prev);
        newConstraints.forEach(c => updated.set(c.id, c));
        return updated;
      });
    }
  }, [entities, constructionMode, saveToHistory]);

  const handleAddCircle = useCallback((cx: number, cy: number, radius: number, centerSnapInfo?: SnapInfo) => {
    saveToHistory();

    // Create the circle synchronously to get the IDs
    const { entities: newEntities, centerPoint } = addCircle(entities, cx, cy, radius, constructionMode);
    const centerPointId = centerPoint.id;

    setEntities(newEntities);

    // Coincident constraint for center at origin
    if (isAtOrigin(cx, cy)) {
      const constraint: CoincidentConstraint = {
        id: generateId('c'),
        type: 'coincident',
        point1Id: ORIGIN_POINT_ID,
        point2Id: centerPointId,
      };
      setConstraints(prev => {
        const newConstraints = new Map(prev);
        newConstraints.set(constraint.id, constraint);
        return newConstraints;
      });
    } else if (centerSnapInfo?.type === 'nearest-on-line' && centerSnapInfo.entityId) {
      // Center snapped to a line - create pointOnLine constraint
      if (entities.lines.has(centerSnapInfo.entityId) || newEntities.lines.has(centerSnapInfo.entityId)) {
        const constraint: PointOnLineConstraint = {
          id: generateId('c'),
          type: 'pointOnLine',
          pointId: centerPointId,
          lineId: centerSnapInfo.entityId,
        };
        setConstraints(prev => {
          const newConstraints = new Map(prev);
          newConstraints.set(constraint.id, constraint);
          return newConstraints;
        });
      }
    } else if (centerSnapInfo?.type === 'point' && centerSnapInfo.entityId) {
      // Center snapped to another point - create coincident constraint
      const constraint: CoincidentConstraint = {
        id: generateId('c'),
        type: 'coincident',
        point1Id: centerSnapInfo.entityId,
        point2Id: centerPointId,
      };
      setConstraints(prev => {
        const newConstraints = new Map(prev);
        newConstraints.set(constraint.id, constraint);
        return newConstraints;
      });
    }
  }, [entities, constructionMode, saveToHistory]);

  const handleAddRectangle = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    saveToHistory();

    // Create the rectangle synchronously to get the IDs
    const result = addRectangle(entities, x1, y1, x2, y2, constructionMode);
    const lineIds = {
      top: result.lines.top.id,
      right: result.lines.right.id,
      bottom: result.lines.bottom.id,
      left: result.lines.left.id,
    };

    setEntities(result.entities);

    // Add horizontal and vertical constraints to maintain rectangular shape
    setConstraints(prev => {
      const updated = new Map(prev);
      // Top and bottom are horizontal
      const hTop: HorizontalConstraint = { id: generateId('c'), type: 'horizontal', lineId: lineIds.top };
      const hBottom: HorizontalConstraint = { id: generateId('c'), type: 'horizontal', lineId: lineIds.bottom };
      // Left and right are vertical
      const vRight: VerticalConstraint = { id: generateId('c'), type: 'vertical', lineId: lineIds.right };
      const vLeft: VerticalConstraint = { id: generateId('c'), type: 'vertical', lineId: lineIds.left };
      updated.set(hTop.id, hTop);
      updated.set(hBottom.id, hBottom);
      updated.set(vRight.id, vRight);
      updated.set(vLeft.id, vLeft);
      return updated;
    });
  }, [entities, constructionMode, saveToHistory]);

  // Selection state
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Move point handler - applies constraint solver after moving
  // Note: Don't save to history here - it's called many times during drag
  // History is saved when drag starts in the Canvas component
  // Use constraintsRef to always have latest constraints (avoids stale closure issue)
  const handleMovePoint = useCallback((pointId: string, x: number, y: number) => {
    setEntities(prev => {
      // First move the point
      const moved = movePoint(prev, pointId, x, y);
      // Then solve constraints to maintain geometric relationships
      return solveConstraints(moved, constraintsRef.current, pointId);
    });
  }, []);

  // Add dimension handler - returns the constraint ID
  const handleAddDimension = useCallback((entityId: string, entityType: 'line' | 'circle', offset: number): string | null => {
    saveToHistory();
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
  }, [entities, saveToHistory]);

  // Add distance dimension between two points
  const handleAddDistanceDimension = useCallback((point1Id: string, point2Id: string, offset: number, direction: DimensionDirection): string | null => {
    saveToHistory();

    // Get point coordinates, handling origin specially
    const getPointCoords = (id: string): { x: number; y: number } | null => {
      if (id === ORIGIN_POINT_ID) {
        return { x: 0, y: 0 };
      }
      const point = entities.points.get(id);
      return point ? { x: point.x, y: point.y } : null;
    };

    const p1 = getPointCoords(point1Id);
    const p2 = getPointCoords(point2Id);
    if (!p1 || !p2) return null;

    // Calculate distance based on direction
    let distance: number;
    if (direction === 'x') {
      // Horizontal distance (delta X)
      distance = Math.abs(p2.x - p1.x);
    } else if (direction === 'y') {
      // Vertical distance (delta Y)
      distance = Math.abs(p2.y - p1.y);
    } else {
      // Direct (Euclidean) distance
      distance = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      );
    }

    const constraint: DistanceConstraint = {
      id: generateId('dim'),
      type: 'distance',
      point1Id,
      point2Id,
      value: Math.round(distance * 10) / 10,
      direction,
      offset,
    };

    setConstraints(prev => {
      const newConstraints = new Map(prev);
      newConstraints.set(constraint.id, constraint);
      return newConstraints;
    });

    return constraint.id;
  }, [entities, saveToHistory]);

  // Add angle dimension between two lines
  const handleAddAngleDimension = useCallback((line1Id: string, line2Id: string, offset: number): string | null => {
    saveToHistory();
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
  }, [entities, saveToHistory]);

  // Update constraint value handler - also updates geometry to match
  const handleUpdateConstraint = useCallback((constraintId: string, value: number) => {
    saveToHistory();
    const constraint = constraints.get(constraintId);
    if (!constraint) return;

    // Update the constraint value
    setConstraints(prev => {
      const newConstraints = new Map(prev);
      if (constraint.type === 'length') {
        newConstraints.set(constraintId, { ...constraint, value } as LengthConstraint);
      } else if (constraint.type === 'radius') {
        newConstraints.set(constraintId, { ...constraint, value } as RadiusConstraint);
      } else if (constraint.type === 'distance') {
        newConstraints.set(constraintId, { ...constraint, value } as DistanceConstraint);
      } else if (constraint.type === 'angle') {
        newConstraints.set(constraintId, { ...constraint, value } as AngleConstraint);
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
        const movedPointId = moveEnd ? line.endId : line.startId;
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
        // Run constraint solver to propagate changes
        const updated = { ...prev, points: newPoints };
        return solveConstraints(updated, constraintsRef.current, movedPointId);
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
    } else if (constraint.type === 'distance') {
      // Update distance between two points
      const distanceConstraint = constraint as DistanceConstraint;
      const direction = distanceConstraint.direction ?? 'direct';

      // Handle origin point specially
      const isP1Origin = distanceConstraint.point1Id === ORIGIN_POINT_ID;
      const isP2Origin = distanceConstraint.point2Id === ORIGIN_POINT_ID;
      const p1Coords = isP1Origin ? { x: 0, y: 0 } : entities.points.get(distanceConstraint.point1Id);
      const p2Coords = isP2Origin ? { x: 0, y: 0 } : entities.points.get(distanceConstraint.point2Id);
      if (!p1Coords || !p2Coords) return;

      // For directional dimensions (x/y), we move points along that axis
      if (direction === 'x' || direction === 'y') {
        // Determine which point to move - can't move origin
        let moveP2 = !isP2Origin; // Default to moving P2 unless it's the origin
        if (isP1Origin) moveP2 = true; // If P1 is origin, must move P2
        if (isP2Origin) moveP2 = false; // If P2 is origin, must move P1

        const movablePointId = moveP2 ? distanceConstraint.point2Id : distanceConstraint.point1Id;
        const fixedCoords = moveP2 ? p1Coords : p2Coords;
        const movableCoords = moveP2 ? p2Coords : p1Coords;
        const movablePoint = entities.points.get(movablePointId);
        if (!movablePoint) return;

        setEntities(prev => {
          let newPoints = new Map(prev.points);
          if (direction === 'x') {
            // Horizontal distance - adjust X coordinate
            // Keep sign: if movable is to the right of fixed, stay right
            const sign = movableCoords.x >= fixedCoords.x ? 1 : -1;
            const newX = fixedCoords.x + sign * value;
            newPoints.set(movablePointId, { ...movablePoint, x: newX });
          } else {
            // Vertical distance - adjust Y coordinate
            const sign = movableCoords.y >= fixedCoords.y ? 1 : -1;
            const newY = fixedCoords.y + sign * value;
            newPoints.set(movablePointId, { ...movablePoint, y: newY });
          }
          // Run constraint solver to propagate changes (e.g., keep rectangle edges aligned)
          const updated = { ...prev, points: newPoints };
          return solveConstraints(updated, constraintsRef.current, movablePointId);
        });
        return;
      }

      // Direct distance handling
      const dx = p2Coords.x - p1Coords.x;
      const dy = p2Coords.y - p1Coords.y;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      if (currentDistance < 0.001) return;

      // Check if these points are part of a rectangle
      let rectangleId: string | null = null;
      for (const rect of entities.rectangles.values()) {
        if (rect.pointIds.includes(distanceConstraint.point1Id) &&
            rect.pointIds.includes(distanceConstraint.point2Id)) {
          rectangleId = rect.id;
          break;
        }
      }

      if (rectangleId) {
        // Rectangle dimension - move all four corners to maintain shape
        const rect = entities.rectangles.get(rectangleId)!;
        const [tlId, trId, brId, blId] = rect.pointIds;

        // Determine if this is a width or height dimension
        const isVertical = Math.abs(dx) < 0.1; // Points are vertically aligned
        const isHorizontal = Math.abs(dy) < 0.1; // Points are horizontally aligned

        // Helper to check if a point has distance constraints (to origin or other points)
        const hasDistanceConstraint = (pointId: string): boolean => {
          for (const c of constraints.values()) {
            if (c.type === 'distance') {
              const dc = c as DistanceConstraint;
              if (dc.point1Id === pointId || dc.point2Id === pointId) {
                // Check if this is a constraint TO origin (not between rect corners)
                const otherPointId = dc.point1Id === pointId ? dc.point2Id : dc.point1Id;
                if (otherPointId === ORIGIN_POINT_ID || !rect.pointIds.includes(otherPointId)) {
                  return true;
                }
              }
            }
          }
          return false;
        };

        setEntities(prev => {
          const newPoints = new Map(prev.points);
          const tl = newPoints.get(tlId);
          const tr = newPoints.get(trId);
          const br = newPoints.get(brId);
          const bl = newPoints.get(blId);
          if (!tl || !tr || !br || !bl) return prev;

          if (isVertical) {
            // Height change - points are on left or right edge
            const currentHeight = Math.abs(tl.y - bl.y);
            const delta = value - currentHeight;

            // Check which side has distance constraints
            const topHasConstraint = hasDistanceConstraint(tlId) || hasDistanceConstraint(trId);
            const bottomHasConstraint = hasDistanceConstraint(blId) || hasDistanceConstraint(brId);

            // Prefer to move the unconstrained side
            let moveTop: boolean;
            if (topHasConstraint && !bottomHasConstraint) {
              moveTop = false; // Top is constrained, move bottom
            } else if (bottomHasConstraint && !topHasConstraint) {
              moveTop = true; // Bottom is constrained, move top
            } else {
              // Neither or both constrained - use Y position heuristic
              moveTop = tl.y > bl.y;
            }

            if (moveTop) {
              // Move top - adjust Y toward/away from bottom
              const newTopY = bl.y + (tl.y > bl.y ? value : -value);
              newPoints.set(tlId, { ...tl, y: newTopY });
              newPoints.set(trId, { ...tr, y: newTopY });
            } else {
              // Move bottom - adjust Y toward/away from top
              const newBottomY = tl.y + (bl.y > tl.y ? value : -value);
              newPoints.set(blId, { ...bl, y: newBottomY });
              newPoints.set(brId, { ...br, y: newBottomY });
            }
          } else if (isHorizontal) {
            // Width change - points are on top or bottom edge
            const currentWidth = Math.abs(tr.x - tl.x);
            const delta = value - currentWidth;

            // Check which side has distance constraints
            const leftHasConstraint = hasDistanceConstraint(tlId) || hasDistanceConstraint(blId);
            const rightHasConstraint = hasDistanceConstraint(trId) || hasDistanceConstraint(brId);

            // Prefer to move the unconstrained side
            let moveRight: boolean;
            if (rightHasConstraint && !leftHasConstraint) {
              moveRight = false; // Right is constrained, move left
            } else if (leftHasConstraint && !rightHasConstraint) {
              moveRight = true; // Left is constrained, move right
            } else {
              // Neither or both constrained - use X position heuristic
              moveRight = tr.x > tl.x;
            }

            if (moveRight) {
              // Move right side
              const newRightX = tl.x + (tr.x > tl.x ? value : -value);
              newPoints.set(trId, { ...tr, x: newRightX });
              newPoints.set(brId, { ...br, x: newRightX });
            } else {
              // Move left side
              const newLeftX = tr.x + (tl.x > tr.x ? value : -value);
              newPoints.set(tlId, { ...tl, x: newLeftX });
              newPoints.set(blId, { ...bl, x: newLeftX });
            }
          }

          // Run constraint solver to ensure rectangle stays valid
          const updated = { ...prev, points: newPoints };
          return solveConstraints(updated, constraintsRef.current, tlId);
        });
      } else {
        // Regular distance constraint - move one point
        const dirX = dx / currentDistance;
        const dirY = dy / currentDistance;

        // Can't move origin, so if one point is origin, move the other
        // Otherwise prefer to keep point closer to origin fixed
        let moveP2 = true;
        if (isP2Origin) moveP2 = false;
        else if (isP1Origin) moveP2 = true;
        else {
          // Neither is origin - prefer to move the one further from origin
          const dist1 = Math.sqrt(p1Coords.x * p1Coords.x + p1Coords.y * p1Coords.y);
          const dist2 = Math.sqrt(p2Coords.x * p2Coords.x + p2Coords.y * p2Coords.y);
          moveP2 = dist2 >= dist1;
        }

        // Get the actual point object to move
        const movablePointId = moveP2 ? distanceConstraint.point2Id : distanceConstraint.point1Id;
        const movablePoint = entities.points.get(movablePointId);
        if (!movablePoint) return;

        const fixedCoords = moveP2 ? p1Coords : p2Coords;

        setEntities(prev => {
          const newPoints = new Map(prev.points);
          if (moveP2) {
            const newX = fixedCoords.x + dirX * value;
            const newY = fixedCoords.y + dirY * value;
            newPoints.set(movablePointId, { ...movablePoint, x: newX, y: newY });
          } else {
            const newX = fixedCoords.x - dirX * value;
            const newY = fixedCoords.y - dirY * value;
            newPoints.set(movablePointId, { ...movablePoint, x: newX, y: newY });
          }
          // Run constraint solver to propagate changes
          const updated = { ...prev, points: newPoints };
          return solveConstraints(updated, constraintsRef.current, movablePointId);
        });
      }
    } else if (constraint.type === 'angle') {
      // Update angle between two lines by rotating line2 around the intersection point
      const angleConstraint = constraint as AngleConstraint;
      const line1 = entities.lines.get(angleConstraint.line1Id);
      const line2 = entities.lines.get(angleConstraint.line2Id);
      if (!line1 || !line2) return;

      const p1Start = entities.points.get(line1.startId);
      const p1End = entities.points.get(line1.endId);
      const p2Start = entities.points.get(line2.startId);
      const p2End = entities.points.get(line2.endId);
      if (!p1Start || !p1End || !p2Start || !p2End) return;

      // Calculate line1's angle
      const dx1 = p1End.x - p1Start.x;
      const dy1 = p1End.y - p1Start.y;
      const angle1 = Math.atan2(dy1, dx1);

      // Calculate line2's current length
      const dx2 = p2End.x - p2Start.x;
      const dy2 = p2End.y - p2Start.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

      // New angle for line2 (line1's angle + desired angle)
      const newAngle2 = angle1 + (value * Math.PI / 180);

      // Find which end of line2 is closer to line1 (pivot point)
      const distStartToLine1 = Math.min(
        Math.sqrt(Math.pow(p2Start.x - p1Start.x, 2) + Math.pow(p2Start.y - p1Start.y, 2)),
        Math.sqrt(Math.pow(p2Start.x - p1End.x, 2) + Math.pow(p2Start.y - p1End.y, 2))
      );
      const distEndToLine1 = Math.min(
        Math.sqrt(Math.pow(p2End.x - p1Start.x, 2) + Math.pow(p2End.y - p1Start.y, 2)),
        Math.sqrt(Math.pow(p2End.x - p1End.x, 2) + Math.pow(p2End.y - p1End.y, 2))
      );

      setEntities(prev => {
        const newPoints = new Map(prev.points);
        if (distStartToLine1 < distEndToLine1) {
          // Keep start fixed, rotate end
          const newEndX = p2Start.x + len2 * Math.cos(newAngle2);
          const newEndY = p2Start.y + len2 * Math.sin(newAngle2);
          newPoints.set(line2.endId, { ...p2End, x: newEndX, y: newEndY });
        } else {
          // Keep end fixed, rotate start
          const newStartX = p2End.x - len2 * Math.cos(newAngle2);
          const newStartY = p2End.y - len2 * Math.sin(newAngle2);
          newPoints.set(line2.startId, { ...p2Start, x: newStartX, y: newStartY });
        }
        return { ...prev, points: newPoints };
      });
    }
  }, [constraints, entities, saveToHistory]);

  // Update dimension offset (for visual repositioning only)
  const handleUpdateDimensionOffset = useCallback((constraintId: string, offset: number) => {
    setConstraints(prev => {
      const newConstraints = new Map(prev);
      const constraint = newConstraints.get(constraintId);
      if (constraint && ('offset' in constraint || constraint.type === 'length' || constraint.type === 'distance' || constraint.type === 'radius' || constraint.type === 'angle')) {
        newConstraints.set(constraintId, { ...constraint, offset });
      }
      return newConstraints;
    });
  }, []);

  // Delete selected entity handler
  const handleDeleteSelected = useCallback(() => {
    if (!selectedEntityId) return;
    saveToHistory();

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

    // Check if it's a rectangle (selected via group selection)
    if (entities.rectangles.has(selectedEntityId)) {
      const rect = entities.rectangles.get(selectedEntityId)!;

      // Delete constraints that reference rectangle parts
      setConstraints(prev => {
        const newConstraints = new Map(prev);
        for (const [constraintId, constraint] of prev) {
          if (constraint.type === 'length' && rect.lineIds.includes((constraint as LengthConstraint).lineId)) {
            newConstraints.delete(constraintId);
          }
          if (constraint.type === 'horizontal' && rect.lineIds.includes((constraint as HorizontalConstraint).lineId)) {
            newConstraints.delete(constraintId);
          }
          if (constraint.type === 'vertical' && rect.lineIds.includes((constraint as VerticalConstraint).lineId)) {
            newConstraints.delete(constraintId);
          }
          if (constraint.type === 'distance') {
            const dc = constraint as DistanceConstraint;
            if (rect.pointIds.includes(dc.point1Id) || rect.pointIds.includes(dc.point2Id)) {
              newConstraints.delete(constraintId);
            }
          }
        }
        return newConstraints;
      });

      // Delete rectangle, its lines, and its points
      setEntities(prev => {
        const newRectangles = new Map(prev.rectangles);
        const newLines = new Map(prev.lines);
        const newPoints = new Map(prev.points);

        newRectangles.delete(selectedEntityId);
        rect.lineIds.forEach(id => newLines.delete(id));
        rect.pointIds.forEach(id => newPoints.delete(id));

        return { ...prev, rectangles: newRectangles, lines: newLines, points: newPoints };
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
  }, [selectedEntityId, entities, constraints, saveToHistory]);

  // Toggle construction mode on selected entity
  const handleToggleConstruction = useCallback(() => {
    if (!selectedEntityId) {
      // No selection - toggle global construction mode
      setConstructionMode(prev => !prev);
      return;
    }

    saveToHistory();

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
  }, [selectedEntityId, entities, saveToHistory]);

  // Add horizontal constraint to selected line
  const handleAddHorizontal = useCallback(() => {
    if (!selectedEntityId || !entities.lines.has(selectedEntityId)) return;
    saveToHistory();

    // Check if line already has horizontal constraint
    for (const c of constraints.values()) {
      if (c.type === 'horizontal' && (c as HorizontalConstraint).lineId === selectedEntityId) {
        return; // Already constrained
      }
    }

    const constraint: HorizontalConstraint = {
      id: generateId('c'),
      type: 'horizontal',
      lineId: selectedEntityId,
    };

    // Also update the geometry to be horizontal
    const line = entities.lines.get(selectedEntityId)!;
    const startPoint = entities.points.get(line.startId);
    const endPoint = entities.points.get(line.endId);
    if (startPoint && endPoint) {
      const avgY = (startPoint.y + endPoint.y) / 2;
      setEntities(prev => {
        const newPoints = new Map(prev.points);
        newPoints.set(line.startId, { ...startPoint, y: avgY });
        newPoints.set(line.endId, { ...endPoint, y: avgY });
        return { ...prev, points: newPoints };
      });
    }

    setConstraints(prev => {
      const newConstraints = new Map(prev);
      newConstraints.set(constraint.id, constraint);
      return newConstraints;
    });
  }, [selectedEntityId, entities, constraints, saveToHistory]);

  // Add vertical constraint to selected line
  const handleAddVertical = useCallback(() => {
    if (!selectedEntityId || !entities.lines.has(selectedEntityId)) return;
    saveToHistory();

    // Check if line already has vertical constraint
    for (const c of constraints.values()) {
      if (c.type === 'vertical' && (c as VerticalConstraint).lineId === selectedEntityId) {
        return; // Already constrained
      }
    }

    const constraint: VerticalConstraint = {
      id: generateId('c'),
      type: 'vertical',
      lineId: selectedEntityId,
    };

    // Also update the geometry to be vertical
    const line = entities.lines.get(selectedEntityId)!;
    const startPoint = entities.points.get(line.startId);
    const endPoint = entities.points.get(line.endId);
    if (startPoint && endPoint) {
      const avgX = (startPoint.x + endPoint.x) / 2;
      setEntities(prev => {
        const newPoints = new Map(prev.points);
        newPoints.set(line.startId, { ...startPoint, x: avgX });
        newPoints.set(line.endId, { ...endPoint, x: avgX });
        return { ...prev, points: newPoints };
      });
    }

    setConstraints(prev => {
      const newConstraints = new Map(prev);
      newConstraints.set(constraint.id, constraint);
      return newConstraints;
    });
  }, [selectedEntityId, entities, constraints, saveToHistory]);

  // Add coincident constraint (for future multi-selection support)
  const handleAddCoincident = useCallback(() => {
    // This would require selecting two points
    // For now, just a placeholder
    console.log('Coincident constraint requires selecting two points');
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

      // Handle delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // Handle undo/redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
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
        case 'h':
          handleAddHorizontal();
          break;
        case 'v':
          handleAddVertical();
          break;
        case 'i':
          handleAddCoincident();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mounted, handleDeleteSelected, handleToggleConstruction, handleAddHorizontal, handleAddVertical, handleAddCoincident, handleUndo, handleRedo]);

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
        onAddHorizontal={handleAddHorizontal}
        onAddVertical={handleAddVertical}
        onAddCoincident={handleAddCoincident}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
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
            onDragStart={saveToHistory}
            onAddDimension={handleAddDimension}
            onAddDistanceDimension={handleAddDistanceDimension}
            onAddAngleDimension={handleAddAngleDimension}
            onUpdateConstraint={handleUpdateConstraint}
            onUpdateDimensionOffset={handleUpdateDimensionOffset}
            selectedEntityId={selectedEntityId}
            onSelectEntity={setSelectedEntityId}
            overConstrainedEntities={overConstrainedEntities}
            entityConstraintStatus={entityConstraintStatus}
            getConstraintsForEntity={(entityId: string) => getConstraintsForEntity(entityId, entities, constraints)}
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
