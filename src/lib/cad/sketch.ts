// Sketch state management
import {
  Point,
  Line,
  Circle,
  Rectangle,
  SketchEntities,
  Constraint,
  ConstraintStatus,
  FixedConstraint,
  HorizontalConstraint,
  VerticalConstraint,
  LengthConstraint,
  RadiusConstraint,
  DistanceConstraint,
  CoincidentConstraint,
  PointOnLineConstraint,
  ORIGIN_POINT_ID,
} from './types';

// Generate unique IDs
let idCounter = 0;
export function generateId(prefix: string = 'e'): string {
  return `${prefix}_${++idCounter}`;
}

// Create empty sketch entities
export function createEmptyEntities(): SketchEntities {
  return {
    points: new Map(),
    lines: new Map(),
    circles: new Map(),
    arcs: new Map(),
    rectangles: new Map(),
  };
}

// Sketch operations
export function addPoint(
  entities: SketchEntities,
  x: number,
  y: number,
  construction: boolean = false
): { entities: SketchEntities; point: Point } {
  const point: Point = {
    id: generateId('p'),
    x,
    y,
    construction,
  };

  const newPoints = new Map(entities.points);
  newPoints.set(point.id, point);

  return {
    entities: { ...entities, points: newPoints },
    point,
  };
}

export function addLine(
  entities: SketchEntities,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  construction: boolean = false
): { entities: SketchEntities; line: Line; startPoint: Point; endPoint: Point } {
  // Create start point
  const { entities: entities1, point: startPoint } = addPoint(entities, startX, startY, construction);
  // Create end point
  const { entities: entities2, point: endPoint } = addPoint(entities1, endX, endY, construction);

  const line: Line = {
    id: generateId('l'),
    startId: startPoint.id,
    endId: endPoint.id,
    construction,
  };

  const newLines = new Map(entities2.lines);
  newLines.set(line.id, line);

  return {
    entities: { ...entities2, lines: newLines },
    line,
    startPoint,
    endPoint,
  };
}

export function addCircle(
  entities: SketchEntities,
  centerX: number,
  centerY: number,
  radius: number,
  construction: boolean = false
): { entities: SketchEntities; circle: Circle; centerPoint: Point } {
  // Create center point
  const { entities: entities1, point: centerPoint } = addPoint(entities, centerX, centerY, construction);

  const circle: Circle = {
    id: generateId('c'),
    centerId: centerPoint.id,
    radius,
    construction,
  };

  const newCircles = new Map(entities1.circles);
  newCircles.set(circle.id, circle);

  return {
    entities: { ...entities1, circles: newCircles },
    circle,
    centerPoint,
  };
}

export function addRectangle(
  entities: SketchEntities,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  construction: boolean = false
): {
  entities: SketchEntities;
  rectangle: Rectangle;
  points: { tl: Point; tr: Point; br: Point; bl: Point };
  lines: { top: Line; right: Line; bottom: Line; left: Line };
} {
  // Rectangle is 4 points and 4 lines
  // Points: TL, TR, BR, BL
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  let currentEntities = entities;

  // Add corners
  const { entities: e1, point: tl } = addPoint(currentEntities, minX, maxY, construction);
  const { entities: e2, point: tr } = addPoint(e1, maxX, maxY, construction);
  const { entities: e3, point: br } = addPoint(e2, maxX, minY, construction);
  const { entities: e4, point: bl } = addPoint(e3, minX, minY, construction);
  currentEntities = e4;

  // Add lines (top, right, bottom, left)
  const topLine: Line = { id: generateId('l'), startId: tl.id, endId: tr.id, construction };
  const rightLine: Line = { id: generateId('l'), startId: tr.id, endId: br.id, construction };
  const bottomLine: Line = { id: generateId('l'), startId: br.id, endId: bl.id, construction };
  const leftLine: Line = { id: generateId('l'), startId: bl.id, endId: tl.id, construction };

  const newLines = new Map(currentEntities.lines);
  newLines.set(topLine.id, topLine);
  newLines.set(rightLine.id, rightLine);
  newLines.set(bottomLine.id, bottomLine);
  newLines.set(leftLine.id, leftLine);

  // Create the rectangle entity that groups the points and lines
  const rectangle: Rectangle = {
    id: generateId('r'),
    pointIds: [tl.id, tr.id, br.id, bl.id],
    lineIds: [topLine.id, rightLine.id, bottomLine.id, leftLine.id],
    construction,
  };

  const newRectangles = new Map(currentEntities.rectangles);
  newRectangles.set(rectangle.id, rectangle);

  return {
    entities: { ...currentEntities, lines: newLines, rectangles: newRectangles },
    rectangle,
    points: { tl, tr, br, bl },
    lines: { top: topLine, right: rightLine, bottom: bottomLine, left: leftLine },
  };
}

// Move a point to a new position
export function movePoint(
  entities: SketchEntities,
  pointId: string,
  x: number,
  y: number
): SketchEntities {
  const point = entities.points.get(pointId);
  if (!point) return entities;

  const newPoints = new Map(entities.points);
  newPoints.set(pointId, { ...point, x, y });

  return { ...entities, points: newPoints };
}

// Solve constraints after a point has been moved
// This enforces geometric constraints like horizontal, vertical, fixed, etc.
export function solveConstraints(
  entities: SketchEntities,
  constraints: Map<string, Constraint>,
  movedPointId: string
): SketchEntities {
  const newPoints = new Map(entities.points);

  // First, identify all fixed points (coincident with origin or have fixed constraints)
  const fixedPoints = new Set<string>();
  for (const constraint of constraints.values()) {
    if (constraint.type === 'fixed') {
      fixedPoints.add((constraint as FixedConstraint).pointId);
    } else if (constraint.type === 'coincident') {
      const cc = constraint as CoincidentConstraint;
      if (cc.point1Id === ORIGIN_POINT_ID) {
        fixedPoints.add(cc.point2Id);
      } else if (cc.point2Id === ORIGIN_POINT_ID) {
        fixedPoints.add(cc.point1Id);
      }
    }
  }

  // If the moved point is fixed, snap it back immediately
  if (fixedPoints.has(movedPointId)) {
    for (const constraint of constraints.values()) {
      if (constraint.type === 'fixed') {
        const fc = constraint as FixedConstraint;
        if (fc.pointId === movedPointId) {
          const point = newPoints.get(movedPointId);
          if (point) {
            newPoints.set(movedPointId, { ...point, x: fc.x, y: fc.y });
          }
        }
      } else if (constraint.type === 'coincident') {
        const cc = constraint as CoincidentConstraint;
        if (cc.point1Id === ORIGIN_POINT_ID && cc.point2Id === movedPointId) {
          const point = newPoints.get(movedPointId);
          if (point) {
            newPoints.set(movedPointId, { ...point, x: 0, y: 0 });
          }
        } else if (cc.point2Id === ORIGIN_POINT_ID && cc.point1Id === movedPointId) {
          const point = newPoints.get(movedPointId);
          if (point) {
            newPoints.set(movedPointId, { ...point, x: 0, y: 0 });
          }
        }
      }
    }
    // Return early - fixed point can't be moved
    return { ...entities, points: newPoints };
  }

  // Track which points have been modified (to propagate constraints)
  // Use the user-moved point as the source of truth
  const userMovedPoint = movedPointId;
  const modifiedPoints = new Set<string>([movedPointId]);

  // Iterate to propagate constraints through connected geometry
  const MAX_ITERATIONS = 10;
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let anyChange = false;

    for (const constraint of constraints.values()) {
      switch (constraint.type) {
        case 'horizontal': {
          const hc = constraint as HorizontalConstraint;
          const line = entities.lines.get(hc.lineId);
          if (!line) break;

          const startPoint = newPoints.get(line.startId);
          const endPoint = newPoints.get(line.endId);
          if (!startPoint || !endPoint) break;

          // Check if Y values differ (constraint violated)
          if (Math.abs(startPoint.y - endPoint.y) < 0.0001) break;

          const startIsFixed = fixedPoints.has(line.startId);
          const endIsFixed = fixedPoints.has(line.endId);
          const startIsUser = line.startId === userMovedPoint;
          const endIsUser = line.endId === userMovedPoint;

          if (startIsFixed && !endIsFixed) {
            newPoints.set(line.endId, { ...endPoint, y: startPoint.y });
            modifiedPoints.add(line.endId);
            anyChange = true;
          } else if (endIsFixed && !startIsFixed) {
            newPoints.set(line.startId, { ...startPoint, y: endPoint.y });
            modifiedPoints.add(line.startId);
            anyChange = true;
          } else if (startIsUser) {
            // User moved start - propagate to end
            newPoints.set(line.endId, { ...endPoint, y: startPoint.y });
            modifiedPoints.add(line.endId);
            anyChange = true;
          } else if (endIsUser) {
            // User moved end - propagate to start
            newPoints.set(line.startId, { ...startPoint, y: endPoint.y });
            modifiedPoints.add(line.startId);
            anyChange = true;
          } else if (modifiedPoints.has(line.startId) && !modifiedPoints.has(line.endId)) {
            newPoints.set(line.endId, { ...endPoint, y: startPoint.y });
            modifiedPoints.add(line.endId);
            anyChange = true;
          } else if (modifiedPoints.has(line.endId) && !modifiedPoints.has(line.startId)) {
            newPoints.set(line.startId, { ...startPoint, y: endPoint.y });
            modifiedPoints.add(line.startId);
            anyChange = true;
          }
          break;
        }

        case 'vertical': {
          const vc = constraint as VerticalConstraint;
          const line = entities.lines.get(vc.lineId);
          if (!line) break;

          const startPoint = newPoints.get(line.startId);
          const endPoint = newPoints.get(line.endId);
          if (!startPoint || !endPoint) break;

          // Check if X values differ (constraint violated)
          if (Math.abs(startPoint.x - endPoint.x) < 0.0001) break;

          const startIsFixed = fixedPoints.has(line.startId);
          const endIsFixed = fixedPoints.has(line.endId);
          const startIsUser = line.startId === userMovedPoint;
          const endIsUser = line.endId === userMovedPoint;

          if (startIsFixed && !endIsFixed) {
            newPoints.set(line.endId, { ...endPoint, x: startPoint.x });
            modifiedPoints.add(line.endId);
            anyChange = true;
          } else if (endIsFixed && !startIsFixed) {
            newPoints.set(line.startId, { ...startPoint, x: endPoint.x });
            modifiedPoints.add(line.startId);
            anyChange = true;
          } else if (startIsUser) {
            newPoints.set(line.endId, { ...endPoint, x: startPoint.x });
            modifiedPoints.add(line.endId);
            anyChange = true;
          } else if (endIsUser) {
            newPoints.set(line.startId, { ...startPoint, x: endPoint.x });
            modifiedPoints.add(line.startId);
            anyChange = true;
          } else if (modifiedPoints.has(line.startId) && !modifiedPoints.has(line.endId)) {
            newPoints.set(line.endId, { ...endPoint, x: startPoint.x });
            modifiedPoints.add(line.endId);
            anyChange = true;
          } else if (modifiedPoints.has(line.endId) && !modifiedPoints.has(line.startId)) {
            newPoints.set(line.startId, { ...startPoint, x: endPoint.x });
            modifiedPoints.add(line.startId);
            anyChange = true;
          }
          break;
        }

        case 'pointOnLine': {
          // Constrain a point to lie on a line
          const polc = constraint as PointOnLineConstraint;
          const constrainedPoint = newPoints.get(polc.pointId);
          const line = entities.lines.get(polc.lineId);
          if (!constrainedPoint || !line) break;

          const lineStart = newPoints.get(line.startId);
          const lineEnd = newPoints.get(line.endId);
          if (!lineStart || !lineEnd) break;

          // Calculate the nearest point on the line segment to the constrained point
          const dx = lineEnd.x - lineStart.x;
          const dy = lineEnd.y - lineStart.y;
          const lenSq = dx * dx + dy * dy;

          if (lenSq < 0.0001) break; // Degenerate line

          // Project point onto line (not clamped to segment - allow extension)
          const t = ((constrainedPoint.x - lineStart.x) * dx + (constrainedPoint.y - lineStart.y) * dy) / lenSq;
          const projX = lineStart.x + t * dx;
          const projY = lineStart.y + t * dy;

          // Check if point is already on the line
          const distSq = Math.pow(constrainedPoint.x - projX, 2) + Math.pow(constrainedPoint.y - projY, 2);
          if (distSq < 0.0001) break; // Already on line

          // Only move the constrained point if it was the one being dragged or modified
          if (polc.pointId === userMovedPoint || modifiedPoints.has(polc.pointId)) {
            newPoints.set(polc.pointId, { ...constrainedPoint, x: projX, y: projY });
            anyChange = true;
          }
          break;
        }
      }
    }

    // Stop iterating if nothing changed
    if (!anyChange) break;
  }

  return { ...entities, points: newPoints };
}

// Delete an entity
export function deleteEntity(
  entities: SketchEntities,
  entityId: string
): SketchEntities {
  const newEntities = { ...entities };

  // Try to delete from each map
  if (entities.points.has(entityId)) {
    const newPoints = new Map(entities.points);
    newPoints.delete(entityId);
    newEntities.points = newPoints;

    // Also delete any lines/circles that reference this point
    const newLines = new Map(entities.lines);
    for (const [lineId, line] of entities.lines) {
      if (line.startId === entityId || line.endId === entityId) {
        newLines.delete(lineId);
      }
    }
    newEntities.lines = newLines;

    const newCircles = new Map(entities.circles);
    for (const [circleId, circle] of entities.circles) {
      if (circle.centerId === entityId) {
        newCircles.delete(circleId);
      }
    }
    newEntities.circles = newCircles;
  }

  if (entities.lines.has(entityId)) {
    const newLines = new Map(entities.lines);
    newLines.delete(entityId);
    newEntities.lines = newLines;
  }

  if (entities.circles.has(entityId)) {
    const newCircles = new Map(entities.circles);
    newCircles.delete(entityId);
    newEntities.circles = newCircles;
  }

  return newEntities;
}

// Calculate degrees of freedom (simplified for now)
export function calculateDOF(entities: SketchEntities, constraints: Map<string, Constraint>): number {
  // Each point has 2 DOF (x, y)
  // Each circle adds 1 DOF (radius) - center is a point
  let dof = entities.points.size * 2;
  dof += entities.circles.size; // radius DOF

  // Subtract constraint equations
  for (const constraint of constraints.values()) {
    switch (constraint.type) {
      case 'fixed':
        dof -= 2; // fixes x and y
        break;
      case 'horizontal':
      case 'vertical':
        dof -= 1; // one equation
        break;
      case 'coincident':
        dof -= 2; // two equations (x and y match)
        break;
      case 'length':
      case 'radius':
        dof -= 1;
        break;
      case 'parallel':
      case 'perpendicular':
        dof -= 1;
        break;
      case 'tangent':
        dof -= 1;
        break;
      case 'equal':
        dof -= 1;
        break;
      case 'angle':
        dof -= 1;
        break;
      case 'pointOnLine':
        dof -= 1;
        break;
      case 'pointOnCircle':
        dof -= 1;
        break;
      case 'midpoint':
        dof -= 2;
        break;
      case 'concentric':
        dof -= 2;
        break;
    }
  }

  return Math.max(0, dof);
}

// Determine constraint status
export function getConstraintStatus(dof: number, hasConflicts: boolean = false): ConstraintStatus {
  if (hasConflicts) return 'over-constrained';
  if (dof === 0) return 'fully-constrained';
  return 'under-constrained';
}

// Entity constraint status - per-entity DOF calculation
// Returns a map of entityId -> isFullyConstrained
// A point is fully constrained if both X and Y are fixed
// A line is fully constrained if both endpoints are fully constrained
export function calculateEntityConstraintStatus(
  entities: SketchEntities,
  constraints: Map<string, Constraint>
): Map<string, boolean> {
  const result = new Map<string, boolean>();

  // Track DOF for each point (starts at 2 for x and y)
  const pointDOF = new Map<string, { x: boolean; y: boolean }>();

  // Initialize all points as unconstrained
  for (const pointId of entities.points.keys()) {
    pointDOF.set(pointId, { x: false, y: false });
  }

  // Origin is always fully constrained
  pointDOF.set(ORIGIN_POINT_ID, { x: true, y: true });

  // First pass: apply direct point constraints (fixed, coincident with origin)
  for (const constraint of constraints.values()) {
    switch (constraint.type) {
      case 'fixed': {
        const fc = constraint as FixedConstraint;
        pointDOF.set(fc.pointId, { x: true, y: true });
        break;
      }
      case 'coincident': {
        const cc = constraint as CoincidentConstraint;
        // If coincident with origin, point is fully constrained
        if (cc.point1Id === ORIGIN_POINT_ID || cc.point2Id === ORIGIN_POINT_ID) {
          const otherId = cc.point1Id === ORIGIN_POINT_ID ? cc.point2Id : cc.point1Id;
          pointDOF.set(otherId, { x: true, y: true });
        }
        // If coincident with another point that's constrained, propagate
        // This will be handled in the iteration loop below
        break;
      }
    }
  }

  // Iterate to propagate constraints through linked geometry
  // This handles cases where constraints chain together
  const MAX_ITERATIONS = 10;
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let anyChange = false;

    for (const constraint of constraints.values()) {
      switch (constraint.type) {
        case 'coincident': {
          const cc = constraint as CoincidentConstraint;
          // Skip origin-based coincident (handled above)
          if (cc.point1Id === ORIGIN_POINT_ID || cc.point2Id === ORIGIN_POINT_ID) break;

          const dof1 = pointDOF.get(cc.point1Id);
          const dof2 = pointDOF.get(cc.point2Id);
          if (!dof1 || !dof2) break;

          // If one point is more constrained, propagate to the other
          if (dof1.x && !dof2.x) { pointDOF.set(cc.point2Id, { ...dof2, x: true }); anyChange = true; }
          if (dof1.y && !dof2.y) { pointDOF.set(cc.point2Id, { ...dof2, y: true }); anyChange = true; }
          if (dof2.x && !dof1.x) { pointDOF.set(cc.point1Id, { ...dof1, x: true }); anyChange = true; }
          if (dof2.y && !dof1.y) { pointDOF.set(cc.point1Id, { ...dof1, y: true }); anyChange = true; }
          break;
        }
        case 'horizontal': {
          const hc = constraint as HorizontalConstraint;
          const line = entities.lines.get(hc.lineId);
          if (!line) break;

          const startDOF = pointDOF.get(line.startId);
          const endDOF = pointDOF.get(line.endId);
          if (startDOF && endDOF) {
            // Horizontal constraint links Y values - if one is constrained, so is the other
            if (startDOF.y && !endDOF.y) {
              pointDOF.set(line.endId, { ...endDOF, y: true });
              anyChange = true;
            }
            if (endDOF.y && !startDOF.y) {
              pointDOF.set(line.startId, { ...startDOF, y: true });
              anyChange = true;
            }
          }
          break;
        }
        case 'vertical': {
          const vc = constraint as VerticalConstraint;
          const line = entities.lines.get(vc.lineId);
          if (!line) break;

          const startDOF = pointDOF.get(line.startId);
          const endDOF = pointDOF.get(line.endId);
          if (startDOF && endDOF) {
            // Vertical constraint links X values - if one is constrained, so is the other
            if (startDOF.x && !endDOF.x) {
              pointDOF.set(line.endId, { ...endDOF, x: true });
              anyChange = true;
            }
            if (endDOF.x && !startDOF.x) {
              pointDOF.set(line.startId, { ...startDOF, x: true });
              anyChange = true;
            }
          }
          break;
        }
        case 'length': {
          const lc = constraint as LengthConstraint;
          const line = entities.lines.get(lc.lineId);
          if (!line) break;

          const startDOF = pointDOF.get(line.startId);
          const endDOF = pointDOF.get(line.endId);
          if (startDOF && endDOF) {
            // If start is fully constrained and we have length + direction, end is constrained
            // Check for horizontal/vertical constraint on this line
            let hasHorizontal = false;
            let hasVertical = false;
            for (const c of constraints.values()) {
              if (c.type === 'horizontal' && (c as HorizontalConstraint).lineId === lc.lineId) {
                hasHorizontal = true;
              }
              if (c.type === 'vertical' && (c as VerticalConstraint).lineId === lc.lineId) {
                hasVertical = true;
              }
            }

            // If start is fully constrained and direction is known
            if (startDOF.x && startDOF.y) {
              const endDOFCurrent = pointDOF.get(line.endId)!;
              if ((hasHorizontal || hasVertical) && (!endDOFCurrent.x || !endDOFCurrent.y)) {
                pointDOF.set(line.endId, { x: true, y: true });
                anyChange = true;
              }
            }
            // If end is fully constrained and direction is known
            if (endDOF.x && endDOF.y) {
              const startDOFCurrent = pointDOF.get(line.startId)!;
              if ((hasHorizontal || hasVertical) && (!startDOFCurrent.x || !startDOFCurrent.y)) {
                pointDOF.set(line.startId, { x: true, y: true });
                anyChange = true;
              }
            }
          }
          break;
        }
        case 'distance': {
          // Distance alone doesn't fully constrain without direction
          break;
        }
      }
    }

    // Stop iterating if nothing changed
    if (!anyChange) break;
  }

  // Set point results
  for (const [pointId, dof] of pointDOF) {
    if (pointId !== ORIGIN_POINT_ID && entities.points.has(pointId)) {
      result.set(pointId, dof.x && dof.y);
    }
  }

  // Set line results - a line is fully constrained if:
  // 1. Both endpoints are fully constrained, OR
  // 2. It has a direction constraint (H/V) and at least one endpoint is fully constrained
  //    (the line's position is defined even if its length can vary)
  for (const [lineId, line] of entities.lines) {
    const startConstrained = pointDOF.get(line.startId);
    const endConstrained = pointDOF.get(line.endId);

    const startFullyConstrained = !!(startConstrained?.x && startConstrained?.y);
    const endFullyConstrained = !!(endConstrained?.x && endConstrained?.y);

    // Check if line has direction constraint
    let hasDirectionConstraint = false;
    for (const c of constraints.values()) {
      if ((c.type === 'horizontal' || c.type === 'vertical') &&
          ((c as HorizontalConstraint).lineId === lineId || (c as VerticalConstraint).lineId === lineId)) {
        hasDirectionConstraint = true;
        break;
      }
    }

    // Line is constrained if both ends are fixed, OR if direction is fixed and one end is fixed
    const lineConstrained = (startFullyConstrained && endFullyConstrained) ||
                           (hasDirectionConstraint && (startFullyConstrained || endFullyConstrained));

    result.set(lineId, lineConstrained);
  }

  // Set circle results - center constrained + has radius constraint
  for (const [circleId, circle] of entities.circles) {
    const centerConstrained = pointDOF.get(circle.centerId);
    let hasRadiusConstraint = false;
    for (const c of constraints.values()) {
      if (c.type === 'radius' && (c as RadiusConstraint).circleId === circleId) {
        hasRadiusConstraint = true;
        break;
      }
    }
    result.set(
      circleId,
      !!(centerConstrained?.x && centerConstrained?.y && hasRadiusConstraint)
    );
  }

  return result;
}

// Get all constraints that apply to a given entity
export function getConstraintsForEntity(
  entityId: string,
  entities: SketchEntities,
  constraints: Map<string, Constraint>
): Constraint[] {
  const result: Constraint[] = [];

  for (const constraint of constraints.values()) {
    switch (constraint.type) {
      case 'fixed':
        if ((constraint as FixedConstraint).pointId === entityId) result.push(constraint);
        break;
      case 'coincident': {
        const cc = constraint as CoincidentConstraint;
        if (cc.point1Id === entityId || cc.point2Id === entityId) result.push(constraint);
        break;
      }
      case 'horizontal':
        if ((constraint as HorizontalConstraint).lineId === entityId) result.push(constraint);
        break;
      case 'vertical':
        if ((constraint as VerticalConstraint).lineId === entityId) result.push(constraint);
        break;
      case 'length':
        if ((constraint as LengthConstraint).lineId === entityId) result.push(constraint);
        break;
      case 'radius':
        if ((constraint as RadiusConstraint).circleId === entityId) result.push(constraint);
        break;
      case 'distance': {
        const dc = constraint as DistanceConstraint;
        if (dc.point1Id === entityId || dc.point2Id === entityId) result.push(constraint);
        break;
      }
    }

    // Also check if this is a line and constraints reference its points
    const line = entities.lines.get(entityId);
    if (line) {
      switch (constraint.type) {
        case 'coincident': {
          const cc = constraint as CoincidentConstraint;
          if (cc.point1Id === line.startId || cc.point2Id === line.startId ||
              cc.point1Id === line.endId || cc.point2Id === line.endId) {
            if (!result.includes(constraint)) result.push(constraint);
          }
          break;
        }
        case 'fixed':
          if ((constraint as FixedConstraint).pointId === line.startId ||
              (constraint as FixedConstraint).pointId === line.endId) {
            if (!result.includes(constraint)) result.push(constraint);
          }
          break;
      }
    }
  }

  return result;
}

// Serialize sketch to JSON
export function serializeSketch(entities: SketchEntities, constraints: Map<string, Constraint>): string {
  return JSON.stringify({
    version: 1,
    entities: {
      points: Array.from(entities.points.values()),
      lines: Array.from(entities.lines.values()),
      circles: Array.from(entities.circles.values()),
      arcs: Array.from(entities.arcs.values()),
      rectangles: Array.from(entities.rectangles.values()),
    },
    constraints: Array.from(constraints.values()),
  }, null, 2);
}

// Generate code representation
export function generateCode(entities: SketchEntities, constraints: Map<string, Constraint>): string {
  const lines: string[] = [
    '// Sketch API',
    'const sketch = new Sketch();',
    '',
    '// Origin is fixed at (0, 0)',
    'const origin = sketch.origin;',
    '',
  ];

  // Add points
  if (entities.points.size > 0) {
    lines.push('// Points');
    for (const point of entities.points.values()) {
      lines.push(`const ${point.id} = sketch.addPoint(${point.x.toFixed(2)}, ${point.y.toFixed(2)});`);
    }
    lines.push('');
  }

  // Add lines
  if (entities.lines.size > 0) {
    lines.push('// Lines');
    for (const line of entities.lines.values()) {
      lines.push(`const ${line.id} = sketch.addLine(${line.startId}, ${line.endId});`);
    }
    lines.push('');
  }

  // Add circles
  if (entities.circles.size > 0) {
    lines.push('// Circles');
    for (const circle of entities.circles.values()) {
      lines.push(`const ${circle.id} = sketch.addCircle(${circle.centerId}, ${circle.radius.toFixed(2)});`);
    }
    lines.push('');
  }

  // Add constraints
  if (constraints.size > 0) {
    lines.push('// Constraints');
    for (const constraint of constraints.values()) {
      switch (constraint.type) {
        case 'horizontal':
          lines.push(`sketch.constrain.horizontal(${constraint.lineId});`);
          break;
        case 'vertical':
          lines.push(`sketch.constrain.vertical(${constraint.lineId});`);
          break;
        case 'length':
          lines.push(`sketch.constrain.length(${constraint.lineId}, ${constraint.value});`);
          break;
        case 'radius':
          lines.push(`sketch.constrain.radius(${constraint.circleId}, ${constraint.value});`);
          break;
        // Add more constraint types as needed
      }
    }
    lines.push('');
  }

  lines.push('sketch.solve();');

  return lines.join('\n');
}
