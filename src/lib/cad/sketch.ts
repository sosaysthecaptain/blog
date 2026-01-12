// Sketch state management
import { Point, Line, Circle, SketchEntities, Constraint, ConstraintStatus } from './types';

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
): { entities: SketchEntities } {
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

  return {
    entities: { ...currentEntities, lines: newLines },
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
