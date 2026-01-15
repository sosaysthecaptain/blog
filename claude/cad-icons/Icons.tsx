/**
 * CAD Icons - SVG icons for CAD application
 * All icons are 24x24, stroke-based, using currentColor
 */

// ============================================================================
// SKETCH TOOLS
// ============================================================================

// Line - diagonal line with white-filled circles on both ends
export const LineIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19L19 5" />
    <circle cx="5" cy="19" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="19" cy="5" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// Corner Rectangle - rectangle with white-filled circles at opposite corners
export const CornerRectangleIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="4" y="6" width="16" height="12" strokeWidth={1.5} />
    <circle cx="4" cy="6" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="20" cy="18" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// Center Point Rectangle - rectangle with white-filled circles at center and corner
export const CenterPointRectangleIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="4" y="6" width="16" height="12" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="20" cy="6" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// Center Point Circle - circle with white-filled center point
export const CenterPointCircleIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// Three Point Circle - circle with 3 white-filled circles on circumference
export const ThreePointCircleIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" strokeWidth={1.5} />
    <circle cx="12" cy="4" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="18.9" cy="16" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="5.1" cy="16" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// Ellipse - ellipse with dashed axes and white-filled center point
export const EllipseIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <ellipse cx="12" cy="12" rx="9" ry="5" strokeWidth={1.5} />
    <path strokeWidth={1} strokeDasharray="2 2" d="M12 7v10M3 12h18" />
    <circle cx="12" cy="12" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// Three Point Arc - arc with 3 white-filled circles at endpoints and on the arc
export const ThreePointArcIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeWidth={1.5} d="M4 18 A8 8 0 0 1 20 18" />
    <circle cx="4" cy="18" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="12" cy="10" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="20" cy="18" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// Tangent Arc - right half of circle with line extending from top
export const TangentArcIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeWidth={1.5} d="M12 19 A7 7 0 0 0 12 5" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M12 5H4" />
    <circle cx="12" cy="19" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="19" cy="12" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="12" cy="5" r="1.5" fill="white" strokeWidth={1.5} />
    <path strokeWidth={1} d="M11 12h2M12 11v2" />
  </svg>
);

// Center Point Arc - top half of circle with center point
export const CenterPointArcIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeWidth={1.5} d="M4 16 A8 8 0 0 1 20 16" />
    <circle cx="4" cy="16" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="12" cy="8" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="20" cy="16" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="12" cy="16" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// Circumscribed Polygon - circle with hexagon vertices marked
export const CircumscribedPolygonIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="7" strokeWidth={1.5} />
    <circle cx="12" cy="5" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="18.1" cy="8.5" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="18.1" cy="15.5" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="12" cy="19" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="5.9" cy="15.5" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="5.9" cy="8.5" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// Spline - smooth curve with white-filled control points
export const SplineIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeWidth={1.5} d="M4 18 Q8 4 12 12 T20 6" />
    <circle cx="4" cy="18" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="20" cy="6" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// Point - single dot
export const PointIcon = (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth={1.5} />
  </svg>
);

// Text - outlined letter T
export const TextIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinejoin="round" strokeWidth={1.5} d="M7 4h10v4h-3v12h-4V8H7V4z" />
  </svg>
);

// Use - overlapping rectangles
export const UseIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="12" height="12" strokeWidth={1.5} />
    <rect x="9" y="9" width="12" height="12" strokeWidth={1.5} />
  </svg>
);

// Intersection - two overlapping circles with white-filled point
export const IntersectionIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="9" cy="12" r="6" strokeWidth={1.5} />
    <circle cx="15" cy="12" r="6" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// Construction - dashed line with white-filled circles at ends
export const ConstructionIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeWidth={1.5} strokeDasharray="3 3" d="M5 19L19 5" />
    <circle cx="5" cy="19" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="19" cy="5" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// ============================================================================
// MODIFY TOOLS
// ============================================================================

// Fillet - two lines with rounded corner
export const FilletIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeWidth={1.5} d="M4 20V10" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M4 10 Q4 4 10 4" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M10 4h10" />
  </svg>
);

// Chamfer - two lines with diagonal cut corner
export const ChamferIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeWidth={1.5} d="M4 20V10" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M4 10L10 4" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M10 4h10" />
  </svg>
);

// Trim - scissors
export const TrimIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="6" cy="6" r="3" strokeWidth={1.5} />
    <circle cx="6" cy="18" r="3" strokeWidth={1.5} />
    <path strokeLinecap="round" strokeWidth={1.5} d="M8.5 8.5L20 20M8.5 15.5L20 4" />
  </svg>
);

// Extend - line with dashed extension and white-filled point
export const ExtendIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeWidth={1.5} d="M4 12h10" />
    <path strokeLinecap="round" strokeWidth={1.5} strokeDasharray="2 2" d="M14 12h6" />
    <circle cx="14" cy="12" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// Split - circle with white-filled break point
export const SplitIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeWidth={1.5} d="M12 4 A8 8 0 1 1 11.9 4" />
    <circle cx="12" cy="4" r="1.5" fill="white" strokeWidth={1.5} />
    <path strokeWidth={1.5} d="M12 4v4" />
  </svg>
);

// Offset - nested rectangles
export const OffsetIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="6" width="14" height="12" strokeWidth={1.5} />
    <rect x="7" y="10" width="14" height="12" strokeWidth={1.5} strokeDasharray="2 2" />
  </svg>
);

// Mirror - two L shapes with center line
export const MirrorIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeWidth={1.5} d="M4 8v10h4" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M20 8v10h-4" />
    <path strokeWidth={1.5} strokeDasharray="2 2" d="M12 4v16" />
  </svg>
);

// Linear Pattern - 2x2 grid of squares
export const LinearPatternIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="4" y="4" width="6" height="6" strokeWidth={1.5} />
    <rect x="14" y="4" width="6" height="6" strokeWidth={1.5} />
    <rect x="4" y="14" width="6" height="6" strokeWidth={1.5} />
    <rect x="14" y="14" width="6" height="6" strokeWidth={1.5} />
  </svg>
);

// Circular Pattern - circles arranged radially with white-filled center
export const CircularPatternIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="5" r="2.5" strokeWidth={1.5} />
    <circle cx="19" cy="12" r="2.5" strokeWidth={1.5} />
    <circle cx="12" cy="19" r="2.5" strokeWidth={1.5} />
    <circle cx="5" cy="12" r="2.5" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="1.5" fill="white" strokeWidth={1.5} />
  </svg>
);

// ============================================================================
// 3D FEATURES
// ============================================================================

// Extrude - 2D shape with upward arrow
export const ExtrudeIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="14" width="12" height="6" strokeWidth={1.5} />
    <path strokeLinecap="round" strokeWidth={1.5} d="M12 12V4" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 8l4-4 4 4" />
  </svg>
);

// Revolve - profile with circular rotation arrow
export const RevolveIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth={1.5} d="M12 6v12" />
    <path strokeWidth={1.5} d="M12 10h4v8h-4" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M19 8 A7 7 0 0 0 5 8" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5v3h3" />
  </svg>
);

// Sweep - circle profile along curved path
export const SweepIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="5" cy="12" r="3" strokeWidth={1.5} />
    <path strokeLinecap="round" strokeWidth={1.5} d="M8 12 Q12 6 16 10 T20 8" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M18 6l2 2-2 2" />
  </svg>
);

// Loft - two profiles connected by lines
export const LoftIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="4" y="16" width="16" height="4" strokeWidth={1.5} />
    <rect x="8" y="4" width="8" height="4" strokeWidth={1.5} />
    <path strokeWidth={1.5} d="M4 16L8 8M20 16L16 8" />
  </svg>
);

// Fillet 3D - box with rounded edge
export const Fillet3DIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinejoin="round" strokeWidth={1.5} d="M5 16l7 4 7-4V8l-7-4-7 4z" />
    <path strokeWidth={1.5} d="M5 8l7 4 7-4M12 12v8" />
    <path strokeWidth={2} stroke="currentColor" d="M16 10 Q17 11 17 12" />
  </svg>
);

// Chamfer 3D - box with cut corner
export const Chamfer3DIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinejoin="round" strokeWidth={1.5} d="M5 16l7 4 7-4V8l-7-4-7 4z" />
    <path strokeWidth={1.5} d="M5 8l7 4 7-4M12 12v8" />
    <path strokeWidth={2} d="M15 6l4 4" />
  </svg>
);

// Shell - hollow box
export const ShellIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinejoin="round" strokeWidth={1.5} d="M4 17l6 3 6-3V7l-6-3-6 3z" />
    <path strokeWidth={1.5} d="M4 7l6 3 6-3M10 10v10" />
    <path strokeLinejoin="round" strokeWidth={1.5} d="M10 10l8 0 0 7-2 1" />
    <path strokeWidth={1.5} d="M18 10l-4-2" />
  </svg>
);

// External Thread - cylinder with helical lines
export const ExternalThreadIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <ellipse cx="12" cy="4" rx="5" ry="2" strokeWidth={1.5} />
    <path strokeWidth={1.5} d="M7 4v14M17 4v14" />
    <ellipse cx="12" cy="18" rx="5" ry="2" strokeWidth={1.5} />
    <path strokeWidth={1} d="M7 7l10 2M7 11l10 2M7 15l10 2" />
  </svg>
);

// Internal Thread - hollow cylinder with threads
export const InternalThreadIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <ellipse cx="12" cy="4" rx="6" ry="2" strokeWidth={1.5} />
    <ellipse cx="12" cy="4" rx="3" ry="1" strokeWidth={1.5} />
    <path strokeWidth={1.5} d="M6 4v16M18 4v16M9 4v16M15 4v16" />
    <ellipse cx="12" cy="20" rx="6" ry="2" strokeWidth={1.5} />
    <path strokeWidth={1} d="M9 8l6 1M9 12l6 1M9 16l6 1" />
  </svg>
);

// Linear Pattern 3D - grid of isometric cubes
export const LinearPattern3DIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth={1.5} d="M3 9l4 2 4-2V5L7 3 3 5zM13 9l4 2 4-2V5l-4-2-4 2z" />
    <path strokeWidth={1.5} d="M3 17l4 2 4-2v-4l-4-2-4 2zM13 17l4 2 4-2v-4l-4-2-4 2z" />
  </svg>
);

// Circular Pattern 3D - cubes arranged radially with white-filled center
export const CircularPattern3DIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="10" y="2" width="4" height="4" strokeWidth={1.5} transform="rotate(0 12 4)" />
    <rect x="18" y="10" width="4" height="4" strokeWidth={1.5} />
    <rect x="10" y="18" width="4" height="4" strokeWidth={1.5} />
    <rect x="2" y="10" width="4" height="4" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="1.5" fill="white" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="4" strokeWidth={1} strokeDasharray="2 2" />
  </svg>
);

// Mirror 3D - two cubes with plane
export const Mirror3DIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinejoin="round" strokeWidth={1.5} d="M2 14l3 2 3-2v-4l-3-2-3 2z" />
    <path strokeWidth={1.5} d="M2 10l3 2 3-2M5 12v4" />
    <path strokeLinejoin="round" strokeWidth={1.5} d="M16 14l3 2 3-2v-4l-3-2-3 2z" />
    <path strokeWidth={1.5} d="M16 10l3 2 3-2M19 12v4" />
    <path strokeWidth={1.5} strokeDasharray="2 2" d="M12 4v16" />
  </svg>
);

// Boolean - overlapping shapes
export const BooleanIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="6" width="10" height="10" strokeWidth={1.5} />
    <rect x="11" y="8" width="10" height="10" strokeWidth={1.5} />
    <path strokeWidth={1.5} fill="currentColor" fillOpacity={0.2} d="M11 8h2v8h-2z" />
  </svg>
);

// Split 3D - shape cut by plane
export const Split3DIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinejoin="round" strokeWidth={1.5} d="M3 14l4 2 4-2V8L7 6 3 8z" />
    <path strokeWidth={1.5} d="M3 8l4 2 4-2M7 10v6" />
    <path strokeLinejoin="round" strokeWidth={1.5} d="M15 14l4 2 4-2V8l-4-2-4 2z" />
    <path strokeWidth={1.5} d="M15 8l4 2 4-2M19 10v6" />
    <path strokeWidth={1.5} strokeDasharray="2 2" d="M12 3v18" />
  </svg>
);

// ============================================================================
// EXPORT ALL ICONS AS OBJECT
// ============================================================================

export const CADIcons = {
  // Sketch tools
  line: LineIcon,
  cornerRectangle: CornerRectangleIcon,
  centerPointRectangle: CenterPointRectangleIcon,
  centerPointCircle: CenterPointCircleIcon,
  threePointCircle: ThreePointCircleIcon,
  ellipse: EllipseIcon,
  threePointArc: ThreePointArcIcon,
  tangentArc: TangentArcIcon,
  centerPointArc: CenterPointArcIcon,
  circumscribedPolygon: CircumscribedPolygonIcon,
  spline: SplineIcon,
  point: PointIcon,
  text: TextIcon,
  use: UseIcon,
  intersection: IntersectionIcon,
  construction: ConstructionIcon,

  // Modify tools
  fillet: FilletIcon,
  chamfer: ChamferIcon,
  trim: TrimIcon,
  extend: ExtendIcon,
  split: SplitIcon,
  offset: OffsetIcon,
  mirror: MirrorIcon,
  linearPattern: LinearPatternIcon,
  circularPattern: CircularPatternIcon,

  // 3D features
  extrude: ExtrudeIcon,
  revolve: RevolveIcon,
  sweep: SweepIcon,
  loft: LoftIcon,
  fillet3D: Fillet3DIcon,
  chamfer3D: Chamfer3DIcon,
  shell: ShellIcon,
  externalThread: ExternalThreadIcon,
  internalThread: InternalThreadIcon,
  linearPattern3D: LinearPattern3DIcon,
  circularPattern3D: CircularPattern3DIcon,
  mirror3D: Mirror3DIcon,
  boolean: BooleanIcon,
  split3D: Split3DIcon,
};

export default CADIcons;
