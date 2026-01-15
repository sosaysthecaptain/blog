# CAD Icon Specifications

All icons should be 24x24px SVG, stroke-based (not filled), with strokeWidth of 1.5, using `currentColor` for theming. Icons should be simple, recognizable, and match the Onshape aesthetic.

---

## Sketch Tools

### line
**Current**: Already exists
**Description**: Diagonal line from bottom-left to top-right with a small dot at the end point

### corner_rectangle
**Current**: Already exists
**Description**: Rectangle outline with a small filled circle at the top-left corner indicating the starting point

### center_point_rectangle
**Current**: Already exists
**Description**: Rectangle outline with a small filled circle at the center, and small dashed crosshairs through center

### center_point_circle
**Current**: Already exists (as "circle")
**Description**: Circle outline with a small filled dot at the center

### three_point_circle
**Prompt**: Create a 24x24 SVG icon showing a circle outline with three small dots evenly spaced on the circumference (at roughly 12 o'clock, 4 o'clock, and 8 o'clock positions). Add a small plus sign near one of the dots to indicate "adding points". Use stroke only, no fill, strokeWidth 1.5.
**Visual**: Circle with 3 dots on perimeter, small + near the top

### ellipse
**Prompt**: Create a 24x24 SVG icon showing an ellipse (horizontally oriented, wider than tall) with dashed perpendicular axis lines through the center. Use stroke only, strokeWidth 1.5, with the axis lines using strokeDasharray.
**Visual**: Horizontal ellipse with dashed crosshair axes

### three_point_arc
**Prompt**: Create a 24x24 SVG icon showing a curved arc (roughly 120-150 degrees) with three small dots: one at each endpoint and one at the apex of the arc. Include a small plus sign near the middle dot. Use stroke only, strokeWidth 1.5.
**Visual**: Arc with dots at start, middle, end, plus sign indicator

### tangent_arc
**Prompt**: Create a 24x24 SVG icon showing a curved arc that smoothly continues from a short straight line segment, indicating tangent continuity. Add a small dot or plus at the arc endpoint. The line and arc should meet seamlessly. Use stroke only, strokeWidth 1.5.
**Visual**: Short line transitioning into arc, showing tangent connection

### center_point_arc
**Prompt**: Create a 24x24 SVG icon showing a curved arc (roughly 90-120 degrees) with a small filled dot at its geometric center (not on the arc itself). Optionally show faint radial lines from center to endpoints. Use stroke only, strokeWidth 1.5.
**Visual**: Arc with center point marked, optional radius lines

### circumscribed_polygon
**Prompt**: Create a 24x24 SVG icon showing a circle with a hexagon drawn around it (hexagon's edges are tangent to the circle). The circle should be clearly inside, touching all six edges. Use stroke only, strokeWidth 1.5.
**Visual**: Hexagon surrounding/circumscribing a circle

### spline
**Prompt**: Create a 24x24 SVG icon showing a smooth S-curve or wavy line with 2-3 small dots along its length indicating control points. The curve should look organic and flowing. Use stroke only, strokeWidth 1.5.
**Visual**: Smooth wavy curve with control point dots

### point
**Current**: Already exists
**Description**: Single small filled circle (or circle outline for consistency)

### text
**Prompt**: Create a 24x24 SVG icon showing a capital letter "A" with a small pencil or edit indicator beside it. The A should be prominent, and the pencil can be small and at an angle. Use stroke only where possible, strokeWidth 1.5.
**Visual**: Letter "A" with small pencil icon

### use
**Prompt**: Create a 24x24 SVG icon showing two overlapping rectangles - a larger one in back and a smaller one in front/offset, indicating "use/reference existing geometry". Use stroke only, strokeWidth 1.5.
**Visual**: Two offset/overlapping squares suggesting copying/referencing

### intersection
**Prompt**: Create a 24x24 SVG icon showing two circles or shapes partially overlapping, with the intersection area highlighted or emphasized (perhaps with a small dot or different treatment). Use stroke only, strokeWidth 1.5.
**Visual**: Two overlapping circles with intersection point marked

### construction
**Current**: Already exists
**Description**: Dashed diagonal line indicating construction geometry mode

---

## Modify Tools

### fillet
**Prompt**: Create a 24x24 SVG icon showing two perpendicular lines meeting at a corner, with the corner replaced by a smooth curved arc (quarter circle). The arc should clearly show rounding the sharp corner. Use stroke only, strokeWidth 1.5.
**Visual**: Right angle with rounded corner arc

### chamfer
**Prompt**: Create a 24x24 SVG icon showing two perpendicular lines meeting at a corner, with the corner cut off at a 45-degree angle (straight diagonal line replacing the corner). Use stroke only, strokeWidth 1.5.
**Visual**: Right angle with diagonal cut corner

### trim
**Prompt**: Create a 24x24 SVG icon showing scissors cutting a line, or two intersecting lines where one segment appears to be removed/trimmed. Classic scissors shape works well. Use stroke only, strokeWidth 1.5.
**Visual**: Scissors icon or crossed lines with segment removed

### extend
**Prompt**: Create a 24x24 SVG icon showing a solid line segment with a dashed extension continuing from one end, indicating the line will be extended. Use stroke only, strokeWidth 1.5, with strokeDasharray for the extension portion.
**Visual**: Solid line with dashed continuation

### split
**Prompt**: Create a 24x24 SVG icon showing a line or circle with a break point indicated - perhaps a line with a gap or a circle with a small break and a dot marking the split location. Use stroke only, strokeWidth 1.5.
**Visual**: Line or curve with visible break/split point

### offset
**Prompt**: Create a 24x24 SVG icon showing two parallel curves or nested rectangles with a small gap between them, indicating offset/parallel copy. Use stroke only, strokeWidth 1.5.
**Visual**: Two nested rectangles or parallel curves with gap

### mirror
**Prompt**: Create a 24x24 SVG icon showing two mirrored L-shapes (or simple shapes) on either side of a vertical dashed center line. The shapes should be clear reflections of each other. Use stroke only, strokeWidth 1.5.
**Visual**: Two mirrored shapes with vertical mirror line

### linear_pattern
**Prompt**: Create a 24x24 SVG icon showing a 2x2 grid of small squares or rectangles arranged in rows and columns, indicating linear/rectangular pattern repetition. Use stroke only, strokeWidth 1.5.
**Visual**: Grid of 4 small squares (2x2 arrangement)

### circular_pattern
**Prompt**: Create a 24x24 SVG icon showing 3-4 small circles or shapes arranged in a circular pattern around a center point, indicating radial/circular repetition. Use stroke only, strokeWidth 1.5.
**Visual**: 4 small circles arranged in circular pattern

---

## 3D Features

### extrude
**Prompt**: Create a 24x24 SVG icon showing a 3D isometric box/cube with an upward arrow indicating extrusion direction. The box should have visible top, front, and side faces with an arrow pointing up from the top. Use stroke only, strokeWidth 1.5.
**Visual**: Isometric cube with upward arrow

### revolve
**Prompt**: Create a 24x24 SVG icon showing a curved arrow rotating around a vertical axis line, indicating revolution/rotation. Could also show a 2D profile and a circular arrow. Use stroke only, strokeWidth 1.5.
**Visual**: Circular rotation arrow around vertical axis

### sweep
**Prompt**: Create a 24x24 SVG icon showing a shape (like a circle profile) following along a curved path, creating a swept form. Show the path as a wavy line with a circular cross-section indicator. Use stroke only, strokeWidth 1.5.
**Visual**: Wavy path with circle profile indicating sweep

### loft
**Prompt**: Create a 24x24 SVG icon showing a tapered 3D form - like a cooling tower or frustum shape that transitions between two different sized profiles (large at bottom, small at top). Use stroke only, strokeWidth 1.5.
**Visual**: Tapered cone/tower shape showing profile transition

### fillet_3d
**Prompt**: Create a 24x24 SVG icon showing a 3D isometric cube/box with one edge visibly rounded/filleted. The rounded edge should be clear against the sharp edges. Use stroke only, strokeWidth 1.5.
**Visual**: Isometric box with one rounded edge

### chamfer_3d
**Prompt**: Create a 24x24 SVG icon showing a 3D isometric cube/box with one corner/edge cut off at an angle (chamfered). The angled cut should be clearly visible. Use stroke only, strokeWidth 1.5.
**Visual**: Isometric box with chamfered corner

### shell
**Prompt**: Create a 24x24 SVG icon showing a 3D box that appears hollow - like a container with walls but open on one face, showing the interior cavity. Use stroke only, strokeWidth 1.5.
**Visual**: Hollow box/container showing wall thickness

### external_thread
**Prompt**: Create a 24x24 SVG icon showing a cylindrical bolt/screw shape with visible thread lines wrapping around the outside. The threads can be represented as angled parallel lines around the cylinder. Use stroke only, strokeWidth 1.5.
**Visual**: Cylinder with helical thread lines on outside

### internal_thread
**Prompt**: Create a 24x24 SVG icon showing a cylindrical hole or tube shape with thread lines visible on the inside surface. Could show a cutaway view of a threaded hole. Use stroke only, strokeWidth 1.5.
**Visual**: Hollow cylinder/hole with internal thread indication

### linear_pattern_3d
**Prompt**: Create a 24x24 SVG icon showing a 2x2 grid of small 3D isometric cubes arranged in rows and columns, indicating 3D linear pattern repetition. Use stroke only, strokeWidth 1.5.
**Visual**: Grid of 4 small isometric cubes

### circular_pattern_3d
**Prompt**: Create a 24x24 SVG icon showing 3-4 small 3D shapes (cubes or similar) arranged in a circular pattern around a center axis, indicating 3D radial repetition. Use stroke only, strokeWidth 1.5.
**Visual**: Small 3D shapes arranged radially

### mirror_3d
**Prompt**: Create a 24x24 SVG icon showing two 3D isometric cubes/shapes on either side of a vertical plane (shown as a line or thin rectangle), indicating 3D mirror operation. Use stroke only, strokeWidth 1.5.
**Visual**: Two mirrored 3D shapes with mirror plane

### boolean
**Prompt**: Create a 24x24 SVG icon showing two overlapping 3D shapes (cubes or cylinders) indicating boolean operations (union, subtract, intersect). The overlap area could be highlighted. Use stroke only, strokeWidth 1.5.
**Visual**: Two overlapping 3D shapes

### split_3d
**Prompt**: Create a 24x24 SVG icon showing a 3D shape being divided by a cutting plane, with the two halves slightly separated. Use stroke only, strokeWidth 1.5.
**Visual**: 3D shape cut by plane, halves separated

---

## Summary Table

| Icon Name | Category | Status |
|-----------|----------|--------|
| line | sketch | exists |
| corner_rectangle | sketch | exists |
| center_point_rectangle | sketch | exists |
| center_point_circle | sketch | exists |
| three_point_circle | sketch | **NEW** |
| ellipse | sketch | **NEW** |
| three_point_arc | sketch | **NEW** |
| tangent_arc | sketch | **NEW** |
| center_point_arc | sketch | **NEW** |
| circumscribed_polygon | sketch | **NEW** |
| spline | sketch | **NEW** |
| point | sketch | exists |
| text | sketch | **NEW** |
| use | sketch | **NEW** |
| intersection | sketch | **NEW** |
| construction | sketch | exists |
| fillet | modify | **NEW** |
| chamfer | modify | **NEW** |
| trim | modify | **NEW** |
| extend | modify | **NEW** |
| split | modify | **NEW** |
| offset | modify | **NEW** |
| mirror | modify | **NEW** |
| linear_pattern | modify | **NEW** |
| circular_pattern | modify | **NEW** |
| extrude | 3d | **NEW** |
| revolve | 3d | **NEW** |
| sweep | 3d | **NEW** |
| loft | 3d | **NEW** |
| fillet_3d | 3d | **NEW** |
| chamfer_3d | 3d | **NEW** |
| shell | 3d | **NEW** |
| external_thread | 3d | **NEW** |
| internal_thread | 3d | **NEW** |
| linear_pattern_3d | 3d | **NEW** |
| circular_pattern_3d | 3d | **NEW** |
| mirror_3d | 3d | **NEW** |
| boolean | 3d | **NEW** |
| split_3d | 3d | **NEW** |

**Total new icons needed: 30**
