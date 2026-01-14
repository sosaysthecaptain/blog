// Core CAD Types
// These types define the parametric sketch model that can be serialized to JSON
// and manipulated via the TypeScript API for AI-driven design.

// ============================================================================
// Constants
// ============================================================================

// The origin point ID - this is a special implicit point at (0,0)
export const ORIGIN_POINT_ID = 'origin';

// ============================================================================
// Entity Types
// ============================================================================

export interface Point {
  id: string;
  x: number;
  y: number;
  construction: boolean;
}

export interface Line {
  id: string;
  startId: string;  // Reference to Point
  endId: string;    // Reference to Point
  construction: boolean;
}

export interface Circle {
  id: string;
  centerId: string;  // Reference to Point
  radius: number;
  construction: boolean;
}

export interface Arc {
  id: string;
  centerId: string;   // Reference to Point
  startId: string;    // Reference to Point (on arc)
  endId: string;      // Reference to Point (on arc)
  construction: boolean;
}

export interface Rectangle {
  id: string;
  // A rectangle is composed of 4 lines and 4 points
  // We store the corner point IDs and line IDs
  pointIds: [string, string, string, string];  // TL, TR, BR, BL
  lineIds: [string, string, string, string];   // Top, Right, Bottom, Left
  construction: boolean;
}

export type Entity = Point | Line | Circle | Arc | Rectangle;
export type EntityType = 'point' | 'line' | 'circle' | 'arc' | 'rectangle';

// ============================================================================
// Constraint Types
// ============================================================================

export interface ConstraintBase {
  id: string;
  type: string;
}

export interface FixedConstraint extends ConstraintBase {
  type: 'fixed';
  pointId: string;
  x: number;
  y: number;
}

export interface HorizontalConstraint extends ConstraintBase {
  type: 'horizontal';
  lineId: string;
}

export interface VerticalConstraint extends ConstraintBase {
  type: 'vertical';
  lineId: string;
}

export interface CoincidentConstraint extends ConstraintBase {
  type: 'coincident';
  point1Id: string;
  point2Id: string;
}

export interface PointOnLineConstraint extends ConstraintBase {
  type: 'pointOnLine';
  pointId: string;
  lineId: string;
}

export interface PointOnCircleConstraint extends ConstraintBase {
  type: 'pointOnCircle';
  pointId: string;
  circleId: string;
}

export interface LengthConstraint extends ConstraintBase {
  type: 'length';
  lineId: string;
  value: number;
  offset?: number;   // Perpendicular offset for dimension display
  driven?: boolean;  // If true, this is a reference dimension, not a driving one
}

export interface RadiusConstraint extends ConstraintBase {
  type: 'radius';
  circleId: string;
  value: number;
  offset?: number;   // Display offset
  driven?: boolean;
}

export interface ParallelConstraint extends ConstraintBase {
  type: 'parallel';
  line1Id: string;
  line2Id: string;
}

export interface PerpendicularConstraint extends ConstraintBase {
  type: 'perpendicular';
  line1Id: string;
  line2Id: string;
}

export interface TangentConstraint extends ConstraintBase {
  type: 'tangent';
  entity1Id: string;  // Line or Circle
  entity2Id: string;  // Line or Circle
}

export interface EqualConstraint extends ConstraintBase {
  type: 'equal';
  entity1Id: string;  // Line (length) or Circle (radius)
  entity2Id: string;
}

export interface AngleConstraint extends ConstraintBase {
  type: 'angle';
  line1Id: string;
  line2Id: string;
  value: number;  // In degrees
  offset?: number;  // Display offset for dimension arc
  driven?: boolean;
}

export type DimensionDirection = 'x' | 'y' | 'direct';

export interface DistanceConstraint extends ConstraintBase {
  type: 'distance';
  point1Id: string;
  point2Id: string;
  value: number;
  direction?: DimensionDirection;  // 'x' for horizontal, 'y' for vertical, 'direct' for diagonal
  offset?: number;  // Perpendicular offset for dimension display
  driven?: boolean;
}

export interface MidpointConstraint extends ConstraintBase {
  type: 'midpoint';
  pointId: string;
  lineId: string;
}

export interface ConcentricConstraint extends ConstraintBase {
  type: 'concentric';
  circle1Id: string;
  circle2Id: string;
}

export type Constraint =
  | FixedConstraint
  | HorizontalConstraint
  | VerticalConstraint
  | CoincidentConstraint
  | PointOnLineConstraint
  | PointOnCircleConstraint
  | LengthConstraint
  | RadiusConstraint
  | ParallelConstraint
  | PerpendicularConstraint
  | TangentConstraint
  | EqualConstraint
  | AngleConstraint
  | DistanceConstraint
  | MidpointConstraint
  | ConcentricConstraint;

export type ConstraintType = Constraint['type'];

// ============================================================================
// Sketch Model
// ============================================================================

export interface SketchEntities {
  points: Map<string, Point>;
  lines: Map<string, Line>;
  circles: Map<string, Circle>;
  arcs: Map<string, Arc>;
  rectangles: Map<string, Rectangle>;
}

export type ConstraintStatus = 'under-constrained' | 'fully-constrained' | 'over-constrained';

export interface SketchState {
  entities: SketchEntities;
  constraints: Map<string, Constraint>;

  // Computed by solver
  degreesOfFreedom: number;
  constraintStatus: ConstraintStatus;

  // For solver - flattened parameter vector
  // [p1.x, p1.y, p2.x, p2.y, ..., c1.radius, c2.radius, ...]
  parameters: number[];

  // Maps entity IDs to their parameter indices
  parameterMap: Map<string, number[]>;
}

// ============================================================================
// Serialization Format (JSON)
// ============================================================================

export interface SerializedSketch {
  version: 1;
  entities: {
    points: Array<Point>;
    lines: Array<Line>;
    circles: Array<Circle>;
    arcs: Array<Arc>;
    rectangles: Array<Rectangle>;
  };
  constraints: Array<Constraint>;
}

// ============================================================================
// UI State
// ============================================================================

export type ToolType =
  | 'select'
  | 'point'
  | 'line'
  | 'circle'
  | 'rectangle-corner'
  | 'rectangle-center'
  | 'arc'
  | 'dimension'
  | 'constraint';

export type ConstraintToolType =
  | 'horizontal'
  | 'vertical'
  | 'coincident'
  | 'parallel'
  | 'perpendicular'
  | 'tangent'
  | 'equal'
  | 'midpoint'
  | 'concentric';

export interface SnapPoint {
  x: number;
  y: number;
  type: 'endpoint' | 'midpoint' | 'center' | 'intersection' | 'nearest' | 'origin';
  entityId?: string;
}

export interface SelectionState {
  selectedIds: Set<string>;
  hoveredId: string | null;
  snapPoint: SnapPoint | null;
}

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface ToolState {
  activeTool: ToolType;
  activeConstraintTool: ConstraintToolType | null;
  // For multi-click tools (line, rectangle, etc.)
  pendingPoints: Array<{ x: number; y: number }>;
  // For construction mode
  constructionMode: boolean;
}

export interface CADState {
  sketch: SketchState;
  selection: SelectionState;
  view: ViewState;
  tool: ToolState;
}

// ============================================================================
// Commands (for undo/redo)
// ============================================================================

export interface Command {
  type: string;
  execute: () => void;
  undo: () => void;
  // For serialization/code generation
  toCode: () => string;
}

export interface CommandHistory {
  past: Command[];
  future: Command[];
}

// ============================================================================
// Colors
// ============================================================================

export interface CADColors {
  underConstrained: string;
  fullyConstrained: string;
  overConstrained: string;
  hover: string;
  selected: string;
  construction: string;
  grid: string;
  gridMajor: string;
  originX: string;
  originY: string;
  background: string;
  snap: string;
}

export const LIGHT_COLORS: CADColors = {
  underConstrained: '#3b82f6',  // Blue
  fullyConstrained: '#1a1a1a',  // Black
  overConstrained: '#dc2626',   // Red
  hover: '#f97316',             // Orange
  selected: '#2563eb',          // Bright blue (distinct from fully constrained)
  construction: '#6b7280',      // Gray
  grid: '#e5e5e5',              // Light gray
  gridMajor: '#d1d5db',         // Slightly darker
  originX: '#dc2626',           // Red
  originY: '#22c55e',           // Green
  background: '#ffffff',        // White
  snap: '#f97316',              // Orange
};

export const DARK_COLORS: CADColors = {
  underConstrained: '#60a5fa',  // Lighter blue
  fullyConstrained: '#d4d4d4',  // Light gray
  overConstrained: '#ef4444',   // Lighter red
  hover: '#fb923c',             // Lighter orange
  selected: '#3b82f6',          // Bright blue (distinct from fully constrained)
  construction: '#9ca3af',      // Lighter gray
  grid: '#2a2a2a',              // Dark gray
  gridMajor: '#3f3f3f',         // Slightly lighter
  originX: '#ef4444',           // Lighter red
  originY: '#4ade80',           // Lighter green
  background: '#1a1a1a',        // Dark
  snap: '#fb923c',              // Lighter orange
};
