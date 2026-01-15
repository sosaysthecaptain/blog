'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import {
  LIGHT_COLORS,
  DARK_COLORS,
  CADColors,
  ViewState,
  SketchEntities,
  ToolType,
  Point,
  Constraint,
  LengthConstraint,
  RadiusConstraint,
  DistanceConstraint,
  AngleConstraint,
  DimensionDirection,
  ORIGIN_POINT_ID,
} from '@/lib/cad/types';

// Snap info passed to parent when creating entities
export interface SnapInfo {
  type: 'origin' | 'point' | 'midpoint' | 'nearest-on-line' | 'center' | 'rectangle-center';
  entityId?: string; // The entity that was snapped to (for point-on-line constraints)
  lineId?: string; // For midpoint snaps, the line the midpoint belongs to
}

interface CanvasProps {
  isDarkMode: boolean;
  viewState: ViewState;
  onViewChange: (view: ViewState) => void;
  entities: SketchEntities;
  constraints: Map<string, Constraint>;
  activeTool: ToolType;
  constructionMode: boolean;
  onAddPoint: (x: number, y: number, snapInfo?: SnapInfo) => void;
  onAddLine: (x1: number, y1: number, x2: number, y2: number, startSnapInfo?: SnapInfo, endSnapInfo?: SnapInfo) => void;
  onAddCircle: (cx: number, cy: number, radius: number, centerSnapInfo?: SnapInfo) => void;
  onAddRectangle: (x1: number, y1: number, x2: number, y2: number) => void;
  onMovePoint: (pointId: string, x: number, y: number) => void;
  onDragStart?: () => void; // Called when point drag begins for undo history
  onAddDimension: (entityId: string, entityType: 'line' | 'circle', offset: number) => string | null; // Returns constraint ID
  onAddDistanceDimension: (point1Id: string, point2Id: string, offset: number, direction: 'x' | 'y' | 'direct') => string | null;
  onAddAngleDimension: (line1Id: string, line2Id: string, offset: number) => string | null;
  onUpdateConstraint: (constraintId: string, value: number) => void;
  onUpdateDimensionOffset?: (constraintId: string, offset: number) => void;
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string | null) => void;
  overConstrainedEntities: Set<string>;
  entityConstraintStatus: Map<string, boolean>; // entityId -> isFullyConstrained
  getConstraintsForEntity: (entityId: string) => Constraint[];
}

// Render entities to Three.js scene
function renderEntities(
  scene: THREE.Scene,
  entities: SketchEntities,
  colors: CADColors,
  entityGroupRef: React.MutableRefObject<THREE.Group | null>,
  containerWidth: number,
  containerHeight: number,
  selectedEntityId: string | null,
  hoveredEntityId: string | null,
  zoom: number,
  overConstrainedEntities: Set<string>,
  entityConstraintStatus: Map<string, boolean>
) {
  // Remove old entity group
  if (entityGroupRef.current) {
    scene.remove(entityGroupRef.current);
    entityGroupRef.current.traverse((obj) => {
      if (obj instanceof THREE.Line || obj instanceof THREE.Mesh || obj instanceof Line2) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          (obj.material as THREE.Material).dispose();
        }
      }
    });
  }

  const group = new THREE.Group();
  const resolution = new THREE.Vector2(containerWidth, containerHeight);

  // Materials for Line2 (thick lines)
  const underConstrainedLineMaterial = new LineMaterial({
    color: new THREE.Color(colors.underConstrained).getHex(),
    linewidth: 3,
    resolution: resolution,
  });

  const fullyConstrainedLineMaterial = new LineMaterial({
    color: new THREE.Color(colors.fullyConstrained).getHex(),
    linewidth: 3,
    resolution: resolution,
  });

  const constructionLineMaterial = new LineMaterial({
    color: new THREE.Color(colors.construction).getHex(),
    linewidth: 3,
    resolution: resolution,
    dashed: true,
    dashSize: 6,
    gapSize: 4,
  });

  const overConstrainedLineMaterial = new LineMaterial({
    color: new THREE.Color(colors.overConstrained).getHex(),
    linewidth: 3,
    resolution: resolution,
  });

  const underConstrainedPointMaterial = new THREE.MeshBasicMaterial({ color: colors.underConstrained });
  const fullyConstrainedPointMaterial = new THREE.MeshBasicMaterial({ color: colors.fullyConstrained });
  const selectedPointMaterial = new THREE.MeshBasicMaterial({ color: colors.selected });
  const hoveredPointMaterial = new THREE.MeshBasicMaterial({ color: colors.hover });
  const overConstrainedPointMaterial = new THREE.MeshBasicMaterial({ color: colors.overConstrained });

  const selectedLineMaterial = new LineMaterial({
    color: new THREE.Color(colors.selected).getHex(),
    linewidth: 4, // slightly thicker when selected
    resolution: resolution,
  });

  const hoveredLineMaterial = new LineMaterial({
    color: new THREE.Color(colors.hover).getHex(),
    linewidth: 4,
    resolution: resolution,
  });

  // Render points - use screen-relative size (pixels / zoom = world units)
  const pointRadius = 5 / zoom; // 5 screen pixels
  const selectedPointRadius = 7 / zoom; // 7 screen pixels when selected/hovered

  for (const point of entities.points.values()) {
    const isSelected = selectedEntityId === point.id || isPartOfSelectedRectangle(point.id, selectedEntityId, entities);
    const isHovered = hoveredEntityId === point.id;
    const isFullyConstrained = entityConstraintStatus.get(point.id) === true;
    const isHighlighted = isSelected || isHovered;
    const geometry = new THREE.CircleGeometry(isHighlighted ? selectedPointRadius : pointRadius, 16);
    let material;
    if (isSelected) {
      material = selectedPointMaterial;
    } else if (isHovered) {
      material = hoveredPointMaterial;
    } else if (point.construction) {
      material = new THREE.MeshBasicMaterial({ color: colors.construction });
    } else if (isFullyConstrained) {
      material = fullyConstrainedPointMaterial;
    } else {
      material = underConstrainedPointMaterial;
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(point.x, point.y, isHighlighted ? 0.6 : 0.5);
    group.add(mesh);
  }

  // Render lines using Line2 for thickness
  for (const line of entities.lines.values()) {
    const startPoint = entities.points.get(line.startId);
    const endPoint = entities.points.get(line.endId);
    if (!startPoint || !endPoint) continue;

    const isSelected = selectedEntityId === line.id || isPartOfSelectedRectangle(line.id, selectedEntityId, entities);
    const isHovered = hoveredEntityId === line.id;
    const isOverConstrained = overConstrainedEntities.has(line.id);
    const isFullyConstrained = entityConstraintStatus.get(line.id) === true;
    const isHighlighted = isSelected || isHovered;
    const geometry = new LineGeometry();
    geometry.setPositions([
      startPoint.x, startPoint.y, isHighlighted ? 0.35 : 0.3,
      endPoint.x, endPoint.y, isHighlighted ? 0.35 : 0.3,
    ]);

    let material;
    if (isSelected) {
      material = selectedLineMaterial.clone();
    } else if (isHovered) {
      material = hoveredLineMaterial.clone();
    } else if (isOverConstrained) {
      material = overConstrainedLineMaterial.clone();
    } else if (line.construction) {
      material = constructionLineMaterial.clone();
    } else if (isFullyConstrained) {
      material = fullyConstrainedLineMaterial.clone();
    } else {
      material = underConstrainedLineMaterial.clone();
    }
    const lineObj = new Line2(geometry, material);
    lineObj.computeLineDistances();
    group.add(lineObj);
  }

  // Render circles using Line2 for thickness
  for (const circle of entities.circles.values()) {
    const centerPoint = entities.points.get(circle.centerId);
    if (!centerPoint) continue;

    const isSelected = selectedEntityId === circle.id;
    const isHovered = hoveredEntityId === circle.id;
    const isOverConstrained = overConstrainedEntities.has(circle.id);
    const isFullyConstrained = entityConstraintStatus.get(circle.id) === true;
    const isHighlighted = isSelected || isHovered;
    const segments = 64;
    const positions: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions.push(
        centerPoint.x + Math.cos(theta) * circle.radius,
        centerPoint.y + Math.sin(theta) * circle.radius,
        isHighlighted ? 0.35 : 0.3
      );
    }

    const geometry = new LineGeometry();
    geometry.setPositions(positions);

    let material;
    if (isSelected) {
      material = selectedLineMaterial.clone();
    } else if (isHovered) {
      material = hoveredLineMaterial.clone();
    } else if (isOverConstrained) {
      material = overConstrainedLineMaterial.clone();
    } else if (circle.construction) {
      material = constructionLineMaterial.clone();
    } else if (isFullyConstrained) {
      material = fullyConstrainedLineMaterial.clone();
    } else {
      material = underConstrainedLineMaterial.clone();
    }
    const circleObj = new Line2(geometry, material);
    circleObj.computeLineDistances();
    group.add(circleObj);
  }

  scene.add(group);
  entityGroupRef.current = group;
}

// Dimension label data for HTML overlay
interface DimensionLabel {
  id: string;
  x: number;
  y: number;
  value: string;
  type: 'length' | 'radius' | 'distance' | 'angle';
}

// Constraint icon data for HTML overlay (shown on hover)
interface ConstraintIcon {
  constraintId: string;
  constraintType: string;
  x: number;
  y: number;
  label: string;
}

// Render dimension annotations - returns label data for HTML overlay
function renderDimensions(
  scene: THREE.Scene,
  entities: SketchEntities,
  constraints: Map<string, Constraint>,
  colors: CADColors,
  dimensionGroupRef: React.MutableRefObject<THREE.Group | null>,
  zoom: number,
  containerWidth: number,
  containerHeight: number
): DimensionLabel[] {
  const labels: DimensionLabel[] = [];

  // Remove old dimension group
  if (dimensionGroupRef.current) {
    scene.remove(dimensionGroupRef.current);
    dimensionGroupRef.current.traverse((obj) => {
      if (obj instanceof THREE.Line || obj instanceof THREE.Mesh || obj instanceof Line2) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          (obj.material as THREE.Material).dispose();
        }
      }
    });
  }

  const group = new THREE.Group();
  const resolution = new THREE.Vector2(containerWidth, containerHeight);

  // Use Line2 for thick dimension lines
  const dimMaterial = new LineMaterial({
    color: new THREE.Color(colors.fullyConstrained).getHex(),
    linewidth: 1.5,
    resolution: resolution,
  });

  for (const constraint of constraints.values()) {
    if (constraint.type === 'length') {
      const lengthConstraint = constraint as LengthConstraint;
      const line = entities.lines.get(lengthConstraint.lineId);
      if (!line) continue;

      const startPoint = entities.points.get(line.startId);
      const endPoint = entities.points.get(line.endId);
      if (!startPoint || !endPoint) continue;

      // Calculate line midpoint and perpendicular offset
      const midX = (startPoint.x + endPoint.x) / 2;
      const midY = (startPoint.y + endPoint.y) / 2;
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      // Perpendicular direction (normalized)
      const perpX = -dy / len;
      const perpY = dx / len;

      // Use stored offset or default
      const offset = lengthConstraint.offset ?? (30 / zoom);

      // Dimension line endpoints
      const dim1X = startPoint.x + perpX * offset;
      const dim1Y = startPoint.y + perpY * offset;
      const dim2X = endPoint.x + perpX * offset;
      const dim2Y = endPoint.y + perpY * offset;

      // Draw dimension line using Line2
      const dimLineGeom = new LineGeometry();
      dimLineGeom.setPositions([dim1X, dim1Y, 0.7, dim2X, dim2Y, 0.7]);
      const dimLine = new Line2(dimLineGeom, dimMaterial.clone());
      dimLine.computeLineDistances();
      group.add(dimLine);

      // Draw extension lines
      const ext1Geom = new LineGeometry();
      ext1Geom.setPositions([startPoint.x, startPoint.y, 0.7, dim1X, dim1Y, 0.7]);
      const ext1Line = new Line2(ext1Geom, dimMaterial.clone());
      ext1Line.computeLineDistances();
      group.add(ext1Line);

      const ext2Geom = new LineGeometry();
      ext2Geom.setPositions([endPoint.x, endPoint.y, 0.7, dim2X, dim2Y, 0.7]);
      const ext2Line = new Line2(ext2Geom, dimMaterial.clone());
      ext2Line.computeLineDistances();
      group.add(ext2Line);

      // Draw arrows (filled triangles)
      const arrowSize = 10 / zoom;
      const arrowAngle = Math.PI / 6;
      const angle1 = Math.atan2(dim2Y - dim1Y, dim2X - dim1X);

      // Arrow at start - filled triangle
      const arrow1Shape = new THREE.Shape();
      arrow1Shape.moveTo(dim1X, dim1Y);
      arrow1Shape.lineTo(
        dim1X + arrowSize * Math.cos(angle1 + Math.PI - arrowAngle),
        dim1Y + arrowSize * Math.sin(angle1 + Math.PI - arrowAngle)
      );
      arrow1Shape.lineTo(
        dim1X + arrowSize * Math.cos(angle1 + Math.PI + arrowAngle),
        dim1Y + arrowSize * Math.sin(angle1 + Math.PI + arrowAngle)
      );
      arrow1Shape.closePath();
      const arrow1Geom = new THREE.ShapeGeometry(arrow1Shape);
      const arrow1Mat = new THREE.MeshBasicMaterial({ color: colors.fullyConstrained });
      const arrow1Mesh = new THREE.Mesh(arrow1Geom, arrow1Mat);
      arrow1Mesh.position.z = 0.71;
      group.add(arrow1Mesh);

      // Arrow at end - filled triangle
      const arrow2Shape = new THREE.Shape();
      arrow2Shape.moveTo(dim2X, dim2Y);
      arrow2Shape.lineTo(
        dim2X + arrowSize * Math.cos(angle1 - arrowAngle),
        dim2Y + arrowSize * Math.sin(angle1 - arrowAngle)
      );
      arrow2Shape.lineTo(
        dim2X + arrowSize * Math.cos(angle1 + arrowAngle),
        dim2Y + arrowSize * Math.sin(angle1 + arrowAngle)
      );
      arrow2Shape.closePath();
      const arrow2Geom = new THREE.ShapeGeometry(arrow2Shape);
      const arrow2Mat = new THREE.MeshBasicMaterial({ color: colors.fullyConstrained });
      const arrow2Mesh = new THREE.Mesh(arrow2Geom, arrow2Mat);
      arrow2Mesh.position.z = 0.71;
      group.add(arrow2Mesh);

      // Add label data for HTML overlay
      const textX = midX + perpX * offset;
      const textY = midY + perpY * offset;
      labels.push({
        id: constraint.id,
        x: textX,
        y: textY,
        value: lengthConstraint.value.toFixed(1),
        type: 'length',
      });
    }

    if (constraint.type === 'radius') {
      const radiusConstraint = constraint as RadiusConstraint;
      const circle = entities.circles.get(radiusConstraint.circleId);
      if (!circle) continue;

      const centerPoint = entities.points.get(circle.centerId);
      if (!centerPoint) continue;

      // Draw radius line from center to edge
      const angle = Math.PI / 4; // 45 degrees
      const edgeX = centerPoint.x + Math.cos(angle) * circle.radius;
      const edgeY = centerPoint.y + Math.sin(angle) * circle.radius;

      const radiusLineGeom = new LineGeometry();
      radiusLineGeom.setPositions([centerPoint.x, centerPoint.y, 0.7, edgeX, edgeY, 0.7]);
      const radiusLine = new Line2(radiusLineGeom, dimMaterial.clone());
      radiusLine.computeLineDistances();
      group.add(radiusLine);

      // Draw arrow at edge - filled triangle
      const arrowSize = 10 / zoom;
      const arrowAngle = Math.PI / 6;

      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(edgeX, edgeY);
      arrowShape.lineTo(
        edgeX + arrowSize * Math.cos(angle + Math.PI - arrowAngle),
        edgeY + arrowSize * Math.sin(angle + Math.PI - arrowAngle)
      );
      arrowShape.lineTo(
        edgeX + arrowSize * Math.cos(angle + Math.PI + arrowAngle),
        edgeY + arrowSize * Math.sin(angle + Math.PI + arrowAngle)
      );
      arrowShape.closePath();
      const arrowGeom = new THREE.ShapeGeometry(arrowShape);
      const arrowMat = new THREE.MeshBasicMaterial({ color: colors.fullyConstrained });
      const arrowMesh = new THREE.Mesh(arrowGeom, arrowMat);
      arrowMesh.position.z = 0.71;
      group.add(arrowMesh);

      // Add label data for HTML overlay
      const textX = centerPoint.x + Math.cos(angle) * (circle.radius / 2);
      const textY = centerPoint.y + Math.sin(angle) * (circle.radius / 2);
      labels.push({
        id: constraint.id,
        x: textX,
        y: textY,
        value: 'R' + radiusConstraint.value.toFixed(1),
        type: 'radius',
      });
    }

    // Render distance constraint (point-to-point)
    if (constraint.type === 'distance') {
      const distanceConstraint = constraint as DistanceConstraint;
      // Handle origin point specially - it's not in the entities map
      const getPointCoords = (id: string): { x: number; y: number } | null => {
        if (id === ORIGIN_POINT_ID) {
          return { x: 0, y: 0 };
        }
        const point = entities.points.get(id);
        return point ? { x: point.x, y: point.y } : null;
      };
      const point1 = getPointCoords(distanceConstraint.point1Id);
      const point2 = getPointCoords(distanceConstraint.point2Id);
      if (!point1 || !point2) continue;

      const offset = distanceConstraint.offset ?? (30 / zoom);
      const direction = distanceConstraint.direction ?? 'direct';

      let dim1X: number, dim1Y: number, dim2X: number, dim2Y: number;

      if (direction === 'x') {
        // Horizontal distance (X) - displayed with horizontal dimension line
        // Dimension line is at Y offset from midpoint
        const dimY = (point1.y + point2.y) / 2 + offset;
        dim1X = point1.x;
        dim1Y = dimY;
        dim2X = point2.x;
        dim2Y = dimY;
      } else if (direction === 'y') {
        // Vertical distance (Y) - displayed with vertical dimension line
        // Dimension line is at X offset from midpoint
        const dimX = (point1.x + point2.x) / 2 + offset;
        dim1X = dimX;
        dim1Y = point1.y;
        dim2X = dimX;
        dim2Y = point2.y;
      } else {
        // Direct dimension - perpendicular to line between points
        const midX = (point1.x + point2.x) / 2;
        const midY = (point1.y + point2.y) / 2;
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len > 0) {
          // Perpendicular direction
          const perpX = -dy / len;
          const perpY = dx / len;

          dim1X = point1.x + perpX * offset;
          dim1Y = point1.y + perpY * offset;
          dim2X = point2.x + perpX * offset;
          dim2Y = point2.y + perpY * offset;
        } else {
          // Degenerate case - points are the same
          dim1X = point1.x + offset;
          dim1Y = point1.y;
          dim2X = point2.x + offset;
          dim2Y = point2.y;
        }
      }

      // Draw dimension line
      const dimLineGeom = new LineGeometry();
      dimLineGeom.setPositions([dim1X, dim1Y, 0.7, dim2X, dim2Y, 0.7]);
      const dimLine = new Line2(dimLineGeom, dimMaterial.clone());
      dimLine.computeLineDistances();
      group.add(dimLine);

      // Draw extension lines
      const ext1Geom = new LineGeometry();
      ext1Geom.setPositions([point1.x, point1.y, 0.7, dim1X, dim1Y, 0.7]);
      const ext1Line = new Line2(ext1Geom, dimMaterial.clone());
      ext1Line.computeLineDistances();
      group.add(ext1Line);

      const ext2Geom = new LineGeometry();
      ext2Geom.setPositions([point2.x, point2.y, 0.7, dim2X, dim2Y, 0.7]);
      const ext2Line = new Line2(ext2Geom, dimMaterial.clone());
      ext2Line.computeLineDistances();
      group.add(ext2Line);

      // Draw arrows
      const arrowSize = 10 / zoom;
      const arrowAngle = Math.PI / 6;
      const angle1 = Math.atan2(dim2Y - dim1Y, dim2X - dim1X);

      // Arrow at start
      const arrow1Shape = new THREE.Shape();
      arrow1Shape.moveTo(dim1X, dim1Y);
      arrow1Shape.lineTo(
        dim1X + arrowSize * Math.cos(angle1 + Math.PI - arrowAngle),
        dim1Y + arrowSize * Math.sin(angle1 + Math.PI - arrowAngle)
      );
      arrow1Shape.lineTo(
        dim1X + arrowSize * Math.cos(angle1 + Math.PI + arrowAngle),
        dim1Y + arrowSize * Math.sin(angle1 + Math.PI + arrowAngle)
      );
      arrow1Shape.closePath();
      const arrow1Geom = new THREE.ShapeGeometry(arrow1Shape);
      const arrow1Mat = new THREE.MeshBasicMaterial({ color: colors.fullyConstrained });
      const arrow1Mesh = new THREE.Mesh(arrow1Geom, arrow1Mat);
      arrow1Mesh.position.z = 0.71;
      group.add(arrow1Mesh);

      // Arrow at end
      const arrow2Shape = new THREE.Shape();
      arrow2Shape.moveTo(dim2X, dim2Y);
      arrow2Shape.lineTo(
        dim2X + arrowSize * Math.cos(angle1 - arrowAngle),
        dim2Y + arrowSize * Math.sin(angle1 - arrowAngle)
      );
      arrow2Shape.lineTo(
        dim2X + arrowSize * Math.cos(angle1 + arrowAngle),
        dim2Y + arrowSize * Math.sin(angle1 + arrowAngle)
      );
      arrow2Shape.closePath();
      const arrow2Geom = new THREE.ShapeGeometry(arrow2Shape);
      const arrow2Mat = new THREE.MeshBasicMaterial({ color: colors.fullyConstrained });
      const arrow2Mesh = new THREE.Mesh(arrow2Geom, arrow2Mat);
      arrow2Mesh.position.z = 0.71;
      group.add(arrow2Mesh);

      // Add label at midpoint of dimension line
      const textX = (dim1X + dim2X) / 2;
      const textY = (dim1Y + dim2Y) / 2;
      labels.push({
        id: constraint.id,
        x: textX,
        y: textY,
        value: distanceConstraint.value.toFixed(1),
        type: 'distance',
      });
    }

    // Render angle constraint
    if (constraint.type === 'angle') {
      const angleConstraint = constraint as AngleConstraint;
      const line1 = entities.lines.get(angleConstraint.line1Id);
      const line2 = entities.lines.get(angleConstraint.line2Id);
      if (!line1 || !line2) continue;

      const p1Start = entities.points.get(line1.startId);
      const p1End = entities.points.get(line1.endId);
      const p2Start = entities.points.get(line2.startId);
      const p2End = entities.points.get(line2.endId);
      if (!p1Start || !p1End || !p2Start || !p2End) continue;

      // Find intersection point of the two lines
      const dx1 = p1End.x - p1Start.x;
      const dy1 = p1End.y - p1Start.y;
      const dx2 = p2End.x - p2Start.x;
      const dy2 = p2End.y - p2Start.y;

      // Find intersection using parametric form
      const det = dx1 * dy2 - dy1 * dx2;
      let centerX: number, centerY: number;

      if (Math.abs(det) < 0.001) {
        // Lines are parallel, use midpoint of closest endpoints
        centerX = (p1Start.x + p2Start.x) / 2;
        centerY = (p1Start.y + p2Start.y) / 2;
      } else {
        const t = ((p2Start.x - p1Start.x) * dy2 - (p2Start.y - p1Start.y) * dx2) / det;
        centerX = p1Start.x + t * dx1;
        centerY = p1Start.y + t * dy1;
      }

      // Calculate angles
      const angle1 = Math.atan2(dy1, dx1);
      const angle2 = Math.atan2(dy2, dx2);

      // Draw arc
      const arcRadius = 25 / zoom;
      const startAngle = Math.min(angle1, angle2);
      const endAngle = Math.max(angle1, angle2);
      let sweepAngle = endAngle - startAngle;
      if (sweepAngle > Math.PI) {
        sweepAngle = 2 * Math.PI - sweepAngle;
      }

      const segments = 32;
      const positions: number[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const theta = startAngle + t * sweepAngle;
        positions.push(
          centerX + Math.cos(theta) * arcRadius,
          centerY + Math.sin(theta) * arcRadius,
          0.7
        );
      }

      const arcGeom = new LineGeometry();
      arcGeom.setPositions(positions);
      const arcLine = new Line2(arcGeom, dimMaterial.clone());
      arcLine.computeLineDistances();
      group.add(arcLine);

      // Add label at arc midpoint
      const midAngle = startAngle + sweepAngle / 2;
      const textX = centerX + Math.cos(midAngle) * arcRadius * 1.3;
      const textY = centerY + Math.sin(midAngle) * arcRadius * 1.3;
      labels.push({
        id: constraint.id,
        x: textX,
        y: textY,
        value: angleConstraint.value.toFixed(1) + '°',
        type: 'angle',
      });
    }
  }

  scene.add(group);
  dimensionGroupRef.current = group;
  return labels;
}

// Snap point detection
interface SnapResult {
  x: number;
  y: number;
  type: 'origin' | 'point' | 'endpoint' | 'midpoint' | 'nearest-on-line' | 'center' | 'rectangle-center';
  entityId?: string;
  lineId?: string; // For midpoint snaps, the line the midpoint belongs to
}

// Wake reference for inference lines - when you hover over a snap point, it "wakes up"
// and an alignment line extends from it that you can snap to
interface WakeReference {
  id: string; // Unique ID for this reference
  x: number;  // Reference point X
  y: number;  // Reference point Y
  direction: 'horizontal' | 'vertical'; // Direction of the inference line
  snapType: SnapInfo['type']; // For constraint creation
  entityId?: string; // The entity this came from
  lineId?: string; // For midpoint references
}

function findSnapPoint(
  worldX: number,
  worldY: number,
  entities: SketchEntities,
  snapThreshold: number, // in world units
  excludePointId?: string // point to exclude from snapping (when dragging)
): SnapResult | null {
  let bestSnap: SnapResult | null = null;
  let bestDistance = snapThreshold;

  // Find lines connected to the excluded point (to exclude them from line snapping)
  const excludeLineIds = new Set<string>();
  if (excludePointId) {
    for (const line of entities.lines.values()) {
      if (line.startId === excludePointId || line.endId === excludePointId) {
        excludeLineIds.add(line.id);
      }
    }
  }

  // Check origin
  const originDist = Math.sqrt(worldX * worldX + worldY * worldY);
  if (originDist < bestDistance) {
    bestDistance = originDist;
    bestSnap = { x: 0, y: 0, type: 'origin' };
  }

  // Check points (including line endpoints and circle centers)
  for (const point of entities.points.values()) {
    // Skip the excluded point
    if (point.id === excludePointId) continue;

    const dist = Math.sqrt(
      Math.pow(worldX - point.x, 2) + Math.pow(worldY - point.y, 2)
    );
    if (dist < bestDistance) {
      bestDistance = dist;
      bestSnap = { x: point.x, y: point.y, type: 'point', entityId: point.id };
    }
  }

  // Check line midpoints and nearest points on lines
  for (const line of entities.lines.values()) {
    // Skip lines connected to excluded point
    if (excludeLineIds.has(line.id)) continue;

    const startPoint = entities.points.get(line.startId);
    const endPoint = entities.points.get(line.endId);
    if (!startPoint || !endPoint) continue;

    // Midpoint
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = (startPoint.y + endPoint.y) / 2;
    const midDist = Math.sqrt(
      Math.pow(worldX - midX, 2) + Math.pow(worldY - midY, 2)
    );
    if (midDist < bestDistance) {
      bestDistance = midDist;
      bestSnap = { x: midX, y: midY, type: 'midpoint', entityId: line.id, lineId: line.id };
    }

    // Nearest point on line segment
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq > 0) {
      let t = ((worldX - startPoint.x) * dx + (worldY - startPoint.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t)); // Clamp to segment
      const nearestX = startPoint.x + t * dx;
      const nearestY = startPoint.y + t * dy;
      const nearestDist = Math.sqrt(
        Math.pow(worldX - nearestX, 2) + Math.pow(worldY - nearestY, 2)
      );
      // Snap to line - use same threshold as points for consistent snapping
      if (nearestDist < bestDistance) {
        bestDistance = nearestDist;
        bestSnap = { x: nearestX, y: nearestY, type: 'nearest-on-line', entityId: line.id };
      }
    }
  }

  // Check circle centers (already covered by points, but mark as center type)
  for (const circle of entities.circles.values()) {
    const centerPoint = entities.points.get(circle.centerId);
    if (!centerPoint) continue;
    // Skip if center is the excluded point
    if (centerPoint.id === excludePointId) continue;

    const dist = Math.sqrt(
      Math.pow(worldX - centerPoint.x, 2) + Math.pow(worldY - centerPoint.y, 2)
    );
    if (dist < bestDistance) {
      bestDistance = dist;
      bestSnap = { x: centerPoint.x, y: centerPoint.y, type: 'center', entityId: circle.id };
    }
  }

  // Check rectangle centers (implicit - computed from corner points)
  for (const rect of entities.rectangles.values()) {
    // Get all four corner points: TL, TR, BR, BL
    const corners = rect.pointIds.map(id => entities.points.get(id));
    if (corners.some(c => !c)) continue;

    // Center is average of all corners (or just opposite corners)
    const centerX = (corners[0]!.x + corners[1]!.x + corners[2]!.x + corners[3]!.x) / 4;
    const centerY = (corners[0]!.y + corners[1]!.y + corners[2]!.y + corners[3]!.y) / 4;

    const dist = Math.sqrt(
      Math.pow(worldX - centerX, 2) + Math.pow(worldY - centerY, 2)
    );
    if (dist < bestDistance) {
      bestDistance = dist;
      bestSnap = { x: centerX, y: centerY, type: 'rectangle-center', entityId: rect.id };
    }
  }

  return bestSnap;
}

// Convert SnapResult to SnapInfo for passing to parent handlers
function snapResultToInfo(snap: SnapResult | null): SnapInfo | undefined {
  if (!snap) return undefined;
  return {
    type: snap.type === 'endpoint' ? 'point' : snap.type as SnapInfo['type'],
    entityId: snap.entityId,
    lineId: snap.lineId,
  };
}

// Create wake references from a snap point
// - Midpoints create ONE reference perpendicular to their line
// - Other points (origin, endpoints, centers) create TWO references (H and V)
function createWakeReferences(
  snap: SnapResult,
  entities: SketchEntities,
  idCounter: React.MutableRefObject<number>
): WakeReference[] {
  const refs: WakeReference[] = [];
  const snapType = snap.type === 'endpoint' ? 'point' : snap.type as SnapInfo['type'];

  if (snap.type === 'midpoint' && snap.lineId) {
    // For midpoints, create ONE line perpendicular to the parent line
    const line = entities.lines.get(snap.lineId);
    if (line) {
      const startPoint = entities.points.get(line.startId);
      const endPoint = entities.points.get(line.endId);
      if (startPoint && endPoint) {
        const dx = Math.abs(endPoint.x - startPoint.x);
        const dy = Math.abs(endPoint.y - startPoint.y);
        // If line is more horizontal, inference line is vertical (and vice versa)
        const direction: 'horizontal' | 'vertical' = dx > dy ? 'vertical' : 'horizontal';
        refs.push({
          id: `wake_${++idCounter.current}`,
          x: snap.x,
          y: snap.y,
          direction,
          snapType,
          entityId: snap.entityId,
          lineId: snap.lineId,
        });
      }
    }
  } else {
    // For other snap types, create BOTH horizontal and vertical references
    refs.push({
      id: `wake_${++idCounter.current}`,
      x: snap.x,
      y: snap.y,
      direction: 'horizontal',
      snapType,
      entityId: snap.entityId,
    });
    refs.push({
      id: `wake_${++idCounter.current}`,
      x: snap.x,
      y: snap.y,
      direction: 'vertical',
      snapType,
      entityId: snap.entityId,
    });
  }

  return refs;
}

// Find if an entity belongs to a rectangle, return rectangle ID if so
function findRectangleForEntity(entityId: string, entities: SketchEntities): string | null {
  for (const rect of entities.rectangles.values()) {
    if (rect.pointIds.includes(entityId) || rect.lineIds.includes(entityId)) {
      return rect.id;
    }
  }
  return null;
}

// Check if an entity is part of a selected rectangle
function isPartOfSelectedRectangle(entityId: string, selectedId: string | null, entities: SketchEntities): boolean {
  if (!selectedId) return false;
  const rect = entities.rectangles.get(selectedId);
  if (!rect) return false;
  return rect.pointIds.includes(entityId) || rect.lineIds.includes(entityId);
}

// Hit test to find entity at a position
interface HitTestResult {
  entityType: 'point' | 'line' | 'circle' | 'origin' | 'axis-x' | 'axis-y';
  entityId: string;
  pointId?: string; // For lines/circles, which point was hit (for dragging)
}

function hitTest(
  worldX: number,
  worldY: number,
  entities: SketchEntities,
  hitThreshold: number,
  includeOriginAndAxes: boolean = false
): HitTestResult | null {
  // Check origin point first (highest priority when enabled)
  if (includeOriginAndAxes) {
    const originDist = Math.sqrt(worldX * worldX + worldY * worldY);
    if (originDist < hitThreshold) {
      return { entityType: 'origin', entityId: 'origin' };
    }
  }

  // Check points first (highest priority)
  for (const point of entities.points.values()) {
    const dist = Math.sqrt(
      Math.pow(worldX - point.x, 2) + Math.pow(worldY - point.y, 2)
    );
    if (dist < hitThreshold) {
      return { entityType: 'point', entityId: point.id, pointId: point.id };
    }
  }

  // Check lines
  for (const line of entities.lines.values()) {
    const startPoint = entities.points.get(line.startId);
    const endPoint = entities.points.get(line.endId);
    if (!startPoint || !endPoint) continue;

    // Distance to line segment
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq > 0) {
      let t = ((worldX - startPoint.x) * dx + (worldY - startPoint.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const nearestX = startPoint.x + t * dx;
      const nearestY = startPoint.y + t * dy;
      const dist = Math.sqrt(
        Math.pow(worldX - nearestX, 2) + Math.pow(worldY - nearestY, 2)
      );
      if (dist < hitThreshold) {
        return { entityType: 'line', entityId: line.id };
      }
    }
  }

  // Check circles
  for (const circle of entities.circles.values()) {
    const centerPoint = entities.points.get(circle.centerId);
    if (!centerPoint) continue;

    const distToCenter = Math.sqrt(
      Math.pow(worldX - centerPoint.x, 2) + Math.pow(worldY - centerPoint.y, 2)
    );
    // Hit if near the circumference
    if (Math.abs(distToCenter - circle.radius) < hitThreshold) {
      return { entityType: 'circle', entityId: circle.id };
    }
  }

  // Check axes (lower priority - only when no other entity is hit)
  if (includeOriginAndAxes) {
    // X-axis: horizontal line through origin
    if (Math.abs(worldY) < hitThreshold) {
      return { entityType: 'axis-x', entityId: 'axis-x' };
    }
    // Y-axis: vertical line through origin
    if (Math.abs(worldX) < hitThreshold) {
      return { entityType: 'axis-y', entityId: 'axis-y' };
    }
  }

  return null;
}

// Render snap indicator
function renderSnapIndicator(
  scene: THREE.Scene,
  snapIndicatorRef: React.MutableRefObject<THREE.Group | null>,
  snapPoint: SnapResult | null,
  colors: CADColors,
  zoom: number
) {
  // Remove old indicator
  if (snapIndicatorRef.current) {
    scene.remove(snapIndicatorRef.current);
    snapIndicatorRef.current.traverse((obj) => {
      if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    snapIndicatorRef.current = null;
  }

  if (!snapPoint) return;

  const group = new THREE.Group();
  const size = 8 / zoom; // Size in world units, appears constant on screen

  // Orange snap indicator (square for points, different for lines)
  const material = new THREE.LineBasicMaterial({ color: colors.snap, linewidth: 2 });

  if (snapPoint.type === 'origin') {
    // Diamond shape for origin
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(snapPoint.x, snapPoint.y + size, 0.9),
      new THREE.Vector3(snapPoint.x + size, snapPoint.y, 0.9),
      new THREE.Vector3(snapPoint.x, snapPoint.y - size, 0.9),
      new THREE.Vector3(snapPoint.x - size, snapPoint.y, 0.9),
      new THREE.Vector3(snapPoint.x, snapPoint.y + size, 0.9),
    ]);
    group.add(new THREE.Line(geometry, material));
  } else if (snapPoint.type === 'midpoint') {
    // Triangle for midpoint
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(snapPoint.x, snapPoint.y + size * 0.8, 0.9),
      new THREE.Vector3(snapPoint.x + size * 0.7, snapPoint.y - size * 0.4, 0.9),
      new THREE.Vector3(snapPoint.x - size * 0.7, snapPoint.y - size * 0.4, 0.9),
      new THREE.Vector3(snapPoint.x, snapPoint.y + size * 0.8, 0.9),
    ]);
    group.add(new THREE.Line(geometry, material));
  } else if (snapPoint.type === 'nearest-on-line') {
    // X mark for nearest on line
    const geometry1 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(snapPoint.x - size * 0.5, snapPoint.y - size * 0.5, 0.9),
      new THREE.Vector3(snapPoint.x + size * 0.5, snapPoint.y + size * 0.5, 0.9),
    ]);
    const geometry2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(snapPoint.x - size * 0.5, snapPoint.y + size * 0.5, 0.9),
      new THREE.Vector3(snapPoint.x + size * 0.5, snapPoint.y - size * 0.5, 0.9),
    ]);
    group.add(new THREE.Line(geometry1, material));
    group.add(new THREE.Line(geometry2, material));
  } else if (snapPoint.type === 'rectangle-center') {
    // Crosshair with circle for rectangle center (inferred point)
    // Horizontal line
    const geometry1 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(snapPoint.x - size * 0.7, snapPoint.y, 0.9),
      new THREE.Vector3(snapPoint.x + size * 0.7, snapPoint.y, 0.9),
    ]);
    // Vertical line
    const geometry2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(snapPoint.x, snapPoint.y - size * 0.7, 0.9),
      new THREE.Vector3(snapPoint.x, snapPoint.y + size * 0.7, 0.9),
    ]);
    // Small circle around center
    const circlePoints: THREE.Vector3[] = [];
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      circlePoints.push(new THREE.Vector3(
        snapPoint.x + Math.cos(angle) * size * 0.4,
        snapPoint.y + Math.sin(angle) * size * 0.4,
        0.9
      ));
    }
    const geometry3 = new THREE.BufferGeometry().setFromPoints(circlePoints);
    group.add(new THREE.Line(geometry1, material));
    group.add(new THREE.Line(geometry2, material));
    group.add(new THREE.Line(geometry3, material));
  } else {
    // Square for points/endpoints/centers
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(snapPoint.x - size * 0.5, snapPoint.y - size * 0.5, 0.9),
      new THREE.Vector3(snapPoint.x + size * 0.5, snapPoint.y - size * 0.5, 0.9),
      new THREE.Vector3(snapPoint.x + size * 0.5, snapPoint.y + size * 0.5, 0.9),
      new THREE.Vector3(snapPoint.x - size * 0.5, snapPoint.y + size * 0.5, 0.9),
      new THREE.Vector3(snapPoint.x - size * 0.5, snapPoint.y - size * 0.5, 0.9),
    ]);
    group.add(new THREE.Line(geometry, material));
  }

  scene.add(group);
  snapIndicatorRef.current = group;
}

// Render inference lines from wake references (dotted alignment lines)
function renderInferenceLines(
  scene: THREE.Scene,
  inferenceGroupRef: React.MutableRefObject<THREE.Group | null>,
  wakeReferences: WakeReference[],
  cursorWorld: { x: number; y: number } | null,
  colors: CADColors,
  zoom: number,
  viewExtent: number // How far to extend lines (in world units)
) {
  // Remove old inference group
  if (inferenceGroupRef.current) {
    scene.remove(inferenceGroupRef.current);
    inferenceGroupRef.current.traverse((obj) => {
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    inferenceGroupRef.current = null;
  }

  if (wakeReferences.length === 0 || !cursorWorld) return;

  const group = new THREE.Group();

  // Threshold for showing inference line (cursor must be within this distance from line)
  const proximityThreshold = 30 / zoom; // 30 pixels in world units

  for (const ref of wakeReferences) {
    // Calculate distance from cursor to this reference line
    let distanceToLine: number;
    if (ref.direction === 'horizontal') {
      distanceToLine = Math.abs(cursorWorld.y - ref.y);
    } else {
      distanceToLine = Math.abs(cursorWorld.x - ref.x);
    }

    // Only show line if cursor is within proximity threshold
    if (distanceToLine > proximityThreshold) continue;

    // Create dashed line material
    const material = new THREE.LineDashedMaterial({
      color: colors.snap,
      dashSize: 8 / zoom,
      gapSize: 4 / zoom,
      linewidth: 1,
    });

    let startPoint: THREE.Vector3;
    let endPoint: THREE.Vector3;

    if (ref.direction === 'horizontal') {
      // Horizontal line through ref.y
      startPoint = new THREE.Vector3(ref.x - viewExtent, ref.y, 0.85);
      endPoint = new THREE.Vector3(ref.x + viewExtent, ref.y, 0.85);
    } else {
      // Vertical line through ref.x
      startPoint = new THREE.Vector3(ref.x, ref.y - viewExtent, 0.85);
      endPoint = new THREE.Vector3(ref.x, ref.y + viewExtent, 0.85);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances(); // Required for dashed lines
    group.add(line);

    // Also add a small indicator at the reference point
    const indicatorSize = 6 / zoom;
    const indicatorGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(ref.x - indicatorSize, ref.y, 0.86),
      new THREE.Vector3(ref.x + indicatorSize, ref.y, 0.86),
    ]);
    const indicatorGeometry2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(ref.x, ref.y - indicatorSize, 0.86),
      new THREE.Vector3(ref.x, ref.y + indicatorSize, 0.86),
    ]);
    const indicatorMaterial = new THREE.LineBasicMaterial({ color: colors.snap, linewidth: 1 });
    group.add(new THREE.Line(indicatorGeometry, indicatorMaterial));
    group.add(new THREE.Line(indicatorGeometry2, indicatorMaterial));
  }

  if (group.children.length > 0) {
    scene.add(group);
    inferenceGroupRef.current = group;
  }
}

// Find alignment snaps from wake references
// Returns adjusted x/y coordinates that align to any nearby inference lines
interface AlignmentResult {
  x: number;
  y: number;
  alignedRefs: WakeReference[]; // Which references we aligned to
}

function findAlignmentSnap(
  worldX: number,
  worldY: number,
  wakeReferences: WakeReference[],
  threshold: number // in world units
): AlignmentResult {
  let resultX = worldX;
  let resultY = worldY;
  const alignedRefs: WakeReference[] = [];

  for (const ref of wakeReferences) {
    if (ref.direction === 'horizontal') {
      // Check if cursor is close to this horizontal line
      const distance = Math.abs(worldY - ref.y);
      if (distance < threshold) {
        resultY = ref.y;
        alignedRefs.push(ref);
      }
    } else {
      // Check if cursor is close to this vertical line
      const distance = Math.abs(worldX - ref.x);
      if (distance < threshold) {
        resultX = ref.x;
        alignedRefs.push(ref);
      }
    }
  }

  return { x: resultX, y: resultY, alignedRefs };
}

// Angle snap - snap to horizontal/vertical/45degrees when within threshold
interface AngleSnapResult {
  x: number;
  y: number;
  snappedAngle: 'horizontal' | 'vertical' | 'diagonal' | null;
}

function applyAngleSnap(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  angleThresholdDegrees: number = 3
): AngleSnapResult {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 0.001) {
    return { x: endX, y: endY, snappedAngle: null };
  }

  const angleRad = Math.atan2(dy, dx);
  const angleDeg = angleRad * 180 / Math.PI;

  // Normalize to 0-360
  const normalizedAngle = ((angleDeg % 360) + 360) % 360;

  // Check for horizontal (0°, 180°)
  if (Math.abs(normalizedAngle) < angleThresholdDegrees ||
      Math.abs(normalizedAngle - 180) < angleThresholdDegrees ||
      Math.abs(normalizedAngle - 360) < angleThresholdDegrees) {
    // Snap to horizontal
    const snappedX = endX;
    const snappedY = startY;
    return { x: snappedX, y: snappedY, snappedAngle: 'horizontal' };
  }

  // Check for vertical (90°, 270°)
  if (Math.abs(normalizedAngle - 90) < angleThresholdDegrees ||
      Math.abs(normalizedAngle - 270) < angleThresholdDegrees) {
    // Snap to vertical
    const snappedX = startX;
    const snappedY = endY;
    return { x: snappedX, y: snappedY, snappedAngle: 'vertical' };
  }

  // Check for 45° angles (45°, 135°, 225°, 315°)
  const diagonal45 = [45, 135, 225, 315];
  for (const targetAngle of diagonal45) {
    if (Math.abs(normalizedAngle - targetAngle) < angleThresholdDegrees) {
      // Snap to 45 degree angle
      const targetRad = targetAngle * Math.PI / 180;
      const snappedX = startX + distance * Math.cos(targetRad);
      const snappedY = startY + distance * Math.sin(targetRad);
      return { x: snappedX, y: snappedY, snappedAngle: 'diagonal' };
    }
  }

  return { x: endX, y: endY, snappedAngle: null };
}

// Helper to determine dimension type based on cursor position for point-to-point dimensions
function determineDimensionType(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  cursor: { x: number; y: number }
): 'x' | 'y' | 'direct' {
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Vector from midpoint to cursor
  const cursorOffsetX = cursor.x - midX;
  const cursorOffsetY = cursor.y - midY;

  // Calculate the angle of the line between points
  const lineAngle = Math.atan2(dy, dx);

  // Calculate perpendicular distance from cursor to the line
  const perpDist = Math.abs(cursorOffsetX * Math.sin(lineAngle) - cursorOffsetY * Math.cos(lineAngle));

  // Calculate parallel distance from cursor to midpoint along the line
  const parallelDist = Math.abs(cursorOffsetX * Math.cos(lineAngle) + cursorOffsetY * Math.sin(lineAngle));

  // If cursor is far from the line (perpendicular distance), use H or V based on cursor position
  // If cursor is close to the line extension, use direct dimension
  const threshold = Math.max(20, Math.sqrt(dx * dx + dy * dy) * 0.3);

  if (perpDist < threshold * 0.5 && parallelDist > threshold) {
    // Cursor is along the line extension - direct dimension
    return 'direct';
  }

  // Determine H or V based on cursor position relative to midpoint
  // Cursor above/below → horizontal dimension line (measures X distance)
  // Cursor left/right → vertical dimension line (measures Y distance)
  const absOffsetX = Math.abs(cursorOffsetX);
  const absOffsetY = Math.abs(cursorOffsetY);

  if (absOffsetY > absOffsetX * 1.5) {
    // Cursor is mostly above/below - horizontal dimension line (measures X)
    return 'x';
  } else if (absOffsetX > absOffsetY * 1.5) {
    // Cursor is mostly left/right - vertical dimension line (measures Y)
    return 'y';
  }

  return 'direct';
}

// Helper to render a linear dimension with arrows
function renderLinearDimension(
  group: THREE.Group,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  cursor: { x: number; y: number },
  dimType: 'x' | 'y' | 'direct',
  colors: CADColors,
  zoom: number,
  valueOverride?: string
): { textX: number; textY: number; value: string } {
  const dimMaterial = new THREE.LineBasicMaterial({ color: colors.fullyConstrained, linewidth: 2 });

  let dim1X: number, dim1Y: number, dim2X: number, dim2Y: number;
  let value: number;

  if (dimType === 'x') {
    // Horizontal distance (X) - displayed with horizontal dimension line
    // User drags up/down, line follows cursor Y position
    const offsetY = cursor.y - (p1.y + p2.y) / 2;
    dim1X = p1.x;
    dim1Y = (p1.y + p2.y) / 2 + offsetY;
    dim2X = p2.x;
    dim2Y = dim1Y;
    value = Math.abs(p2.x - p1.x);
  } else if (dimType === 'y') {
    // Vertical distance (Y) - displayed with vertical dimension line
    // User drags left/right, line follows cursor X position
    const offsetX = cursor.x - (p1.x + p2.x) / 2;
    dim1X = (p1.x + p2.x) / 2 + offsetX;
    dim1Y = p1.y;
    dim2X = dim1X;
    dim2Y = p2.y;
    value = Math.abs(p2.y - p1.y);
  } else {
    // Direct distance - perpendicular to the line between points
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return { textX: cursor.x, textY: cursor.y, value: '0' };

    const perpX = -dy / len;
    const perpY = dx / len;
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const offset = (cursor.x - midX) * perpX + (cursor.y - midY) * perpY;

    dim1X = p1.x + perpX * offset;
    dim1Y = p1.y + perpY * offset;
    dim2X = p2.x + perpX * offset;
    dim2Y = p2.y + perpY * offset;
    value = len;
  }

  // Draw dimension line
  const dimLineGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(dim1X, dim1Y, 0.7),
    new THREE.Vector3(dim2X, dim2Y, 0.7),
  ]);
  group.add(new THREE.Line(dimLineGeom, dimMaterial));

  // Draw extension lines
  const ext1Geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(p1.x, p1.y, 0.7),
    new THREE.Vector3(dim1X, dim1Y, 0.7),
  ]);
  group.add(new THREE.Line(ext1Geom, dimMaterial));

  const ext2Geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(p2.x, p2.y, 0.7),
    new THREE.Vector3(dim2X, dim2Y, 0.7),
  ]);
  group.add(new THREE.Line(ext2Geom, dimMaterial));

  // Draw arrows
  const arrowSize = 8 / zoom;
  const arrowAngle = Math.PI / 6;
  const angle = Math.atan2(dim2Y - dim1Y, dim2X - dim1X);

  // Arrow at start
  const arrow1a = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(dim1X, dim1Y, 0.7),
    new THREE.Vector3(dim1X + arrowSize * Math.cos(angle + Math.PI - arrowAngle), dim1Y + arrowSize * Math.sin(angle + Math.PI - arrowAngle), 0.7),
  ]);
  group.add(new THREE.Line(arrow1a, dimMaterial));

  const arrow1b = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(dim1X, dim1Y, 0.7),
    new THREE.Vector3(dim1X + arrowSize * Math.cos(angle + Math.PI + arrowAngle), dim1Y + arrowSize * Math.sin(angle + Math.PI + arrowAngle), 0.7),
  ]);
  group.add(new THREE.Line(arrow1b, dimMaterial));

  // Arrow at end
  const arrow2a = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(dim2X, dim2Y, 0.7),
    new THREE.Vector3(dim2X + arrowSize * Math.cos(angle - arrowAngle), dim2Y + arrowSize * Math.sin(angle - arrowAngle), 0.7),
  ]);
  group.add(new THREE.Line(arrow2a, dimMaterial));

  const arrow2b = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(dim2X, dim2Y, 0.7),
    new THREE.Vector3(dim2X + arrowSize * Math.cos(angle + arrowAngle), dim2Y + arrowSize * Math.sin(angle + arrowAngle), 0.7),
  ]);
  group.add(new THREE.Line(arrow2b, dimMaterial));

  const textX = (dim1X + dim2X) / 2;
  const textY = (dim1Y + dim2Y) / 2;
  const valueText = valueOverride || value.toFixed(1);

  // Text background
  const textBgSize = (valueText.length * 6 + 8) / zoom;
  const textBgHeight = 14 / zoom;
  const bgGeom = new THREE.PlaneGeometry(textBgSize, textBgHeight);
  const bgMat = new THREE.MeshBasicMaterial({ color: colors.background });
  const bgMesh = new THREE.Mesh(bgGeom, bgMat);
  bgMesh.position.set(textX, textY, 0.75);
  group.add(bgMesh);

  return { textX, textY, value: valueText };
}

// Helper to render radius/diameter dimension for circles
function renderCircleDimension(
  group: THREE.Group,
  center: { x: number; y: number },
  radius: number,
  cursor: { x: number; y: number },
  isDiameter: boolean,
  colors: CADColors,
  zoom: number
): { textX: number; textY: number; value: string } {
  const dimMaterial = new THREE.LineBasicMaterial({ color: colors.fullyConstrained, linewidth: 2 });

  // Direction from center to cursor
  const dx = cursor.x - center.x;
  const dy = cursor.y - center.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dirX = dist > 0 ? dx / dist : 1;
  const dirY = dist > 0 ? dy / dist : 0;

  if (isDiameter) {
    // Diameter line goes through center
    const p1X = center.x - dirX * radius;
    const p1Y = center.y - dirY * radius;
    const p2X = center.x + dirX * radius;
    const p2Y = center.y + dirY * radius;

    const dimLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p1X, p1Y, 0.7),
      new THREE.Vector3(p2X, p2Y, 0.7),
    ]);
    group.add(new THREE.Line(dimLineGeom, dimMaterial));

    // Arrows at both ends
    const arrowSize = 8 / zoom;
    const arrowAngle = Math.PI / 6;
    const angle = Math.atan2(dirY, dirX);

    const arrow1a = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p1X, p1Y, 0.7),
      new THREE.Vector3(p1X + arrowSize * Math.cos(angle - arrowAngle), p1Y + arrowSize * Math.sin(angle - arrowAngle), 0.7),
    ]);
    group.add(new THREE.Line(arrow1a, dimMaterial));

    const arrow1b = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p1X, p1Y, 0.7),
      new THREE.Vector3(p1X + arrowSize * Math.cos(angle + arrowAngle), p1Y + arrowSize * Math.sin(angle + arrowAngle), 0.7),
    ]);
    group.add(new THREE.Line(arrow1b, dimMaterial));

    const arrow2a = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p2X, p2Y, 0.7),
      new THREE.Vector3(p2X + arrowSize * Math.cos(angle + Math.PI - arrowAngle), p2Y + arrowSize * Math.sin(angle + Math.PI - arrowAngle), 0.7),
    ]);
    group.add(new THREE.Line(arrow2a, dimMaterial));

    const arrow2b = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p2X, p2Y, 0.7),
      new THREE.Vector3(p2X + arrowSize * Math.cos(angle + Math.PI + arrowAngle), p2Y + arrowSize * Math.sin(angle + Math.PI + arrowAngle), 0.7),
    ]);
    group.add(new THREE.Line(arrow2b, dimMaterial));

    const value = `⌀${(radius * 2).toFixed(1)}`;
    const textBgSize = (value.length * 6 + 8) / zoom;
    const textBgHeight = 14 / zoom;
    const bgGeom = new THREE.PlaneGeometry(textBgSize, textBgHeight);
    const bgMat = new THREE.MeshBasicMaterial({ color: colors.background });
    const bgMesh = new THREE.Mesh(bgGeom, bgMat);
    bgMesh.position.set(center.x, center.y, 0.75);
    group.add(bgMesh);

    return { textX: center.x, textY: center.y, value };
  } else {
    // Radius line from center to edge
    const pX = center.x + dirX * radius;
    const pY = center.y + dirY * radius;

    const dimLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(center.x, center.y, 0.7),
      new THREE.Vector3(pX, pY, 0.7),
    ]);
    group.add(new THREE.Line(dimLineGeom, dimMaterial));

    // Arrow at edge
    const arrowSize = 8 / zoom;
    const arrowAngle = Math.PI / 6;
    const angle = Math.atan2(dirY, dirX);

    const arrow1a = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(pX, pY, 0.7),
      new THREE.Vector3(pX + arrowSize * Math.cos(angle + Math.PI - arrowAngle), pY + arrowSize * Math.sin(angle + Math.PI - arrowAngle), 0.7),
    ]);
    group.add(new THREE.Line(arrow1a, dimMaterial));

    const arrow1b = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(pX, pY, 0.7),
      new THREE.Vector3(pX + arrowSize * Math.cos(angle + Math.PI + arrowAngle), pY + arrowSize * Math.sin(angle + Math.PI + arrowAngle), 0.7),
    ]);
    group.add(new THREE.Line(arrow1b, dimMaterial));

    const textX = (center.x + pX) / 2;
    const textY = (center.y + pY) / 2;
    const value = `R${radius.toFixed(1)}`;
    const textBgSize = (value.length * 6 + 8) / zoom;
    const textBgHeight = 14 / zoom;
    const bgGeom = new THREE.PlaneGeometry(textBgSize, textBgHeight);
    const bgMat = new THREE.MeshBasicMaterial({ color: colors.background });
    const bgMesh = new THREE.Mesh(bgGeom, bgMat);
    bgMesh.position.set(textX, textY, 0.75);
    group.add(bgMesh);

    return { textX, textY, value };
  }
}

// Type for pending dimension state
type DimensionEntityType = 'point' | 'line' | 'circle' | 'origin' | 'axis-x' | 'axis-y';
type PendingDimensionState = {
  phase: 'selecting' | 'placing';
  entity1: { type: DimensionEntityType; id: string };
  entity2?: { type: DimensionEntityType; id: string };
  dimensionType?: 'x' | 'y' | 'direct' | 'radius' | 'diameter' | 'length' | 'angle';
} | null;

// Render preview geometry (while drawing)
function renderPreview(
  scene: THREE.Scene,
  previewGroupRef: React.MutableRefObject<THREE.Group | null>,
  activeTool: ToolType,
  pendingPoints: Array<{ x: number; y: number }>,
  currentMouse: { x: number; y: number } | null,
  colors: CADColors,
  pendingDimension: PendingDimensionState,
  entities: SketchEntities,
  zoom: number,
  containerWidth: number,
  containerHeight: number
) {
  // Remove old preview
  if (previewGroupRef.current) {
    scene.remove(previewGroupRef.current);
    previewGroupRef.current.traverse((obj) => {
      if (obj instanceof THREE.Line || obj instanceof THREE.Mesh || obj instanceof Line2) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          (obj.material as THREE.Material).dispose();
        }
      }
    });
  }

  // Handle dimension preview during placing phase
  if (pendingDimension?.phase === 'placing' && currentMouse) {
    const group = new THREE.Group();

    // Get the point coordinates based on entity types
    const getPointCoords = (entity: { type: DimensionEntityType; id: string }): { x: number; y: number } | null => {
      if (entity.type === 'origin') return { x: 0, y: 0 };
      if (entity.type === 'point') {
        const p = entities.points.get(entity.id);
        return p ? { x: p.x, y: p.y } : null;
      }
      if (entity.type === 'line') {
        const line = entities.lines.get(entity.id);
        if (!line) return null;
        const start = entities.points.get(line.startId);
        const end = entities.points.get(line.endId);
        if (!start || !end) return null;
        return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      }
      if (entity.type === 'circle') {
        const circle = entities.circles.get(entity.id);
        if (!circle) return null;
        const center = entities.points.get(circle.centerId);
        return center ? { x: center.x, y: center.y } : null;
      }
      return null;
    };

    const e1 = pendingDimension.entity1;
    const e2 = pendingDimension.entity2;

    // Single entity dimensioning (line length, circle radius/diameter)
    if (!e2) {
      if (e1.type === 'line') {
        // Line length dimension
        const line = entities.lines.get(e1.id);
        if (line) {
          const start = entities.points.get(line.startId);
          const end = entities.points.get(line.endId);
          if (start && end) {
            renderLinearDimension(group, start, end, currentMouse, 'direct', colors, zoom);
          }
        }
      } else if (e1.type === 'circle') {
        // Circle radius or diameter based on cursor position
        const circle = entities.circles.get(e1.id);
        if (circle) {
          const center = entities.points.get(circle.centerId);
          if (center) {
            const distToCenter = Math.sqrt(
              Math.pow(currentMouse.x - center.x, 2) + Math.pow(currentMouse.y - center.y, 2)
            );
            const isDiameter = distToCenter > circle.radius;
            renderCircleDimension(group, center, circle.radius, currentMouse, isDiameter, colors, zoom);
          }
        }
      }
    } else {
      // Two entity dimensioning
      const isPointLike = (type: DimensionEntityType) =>
        type === 'point' || type === 'origin';

      if (isPointLike(e1.type) && isPointLike(e2.type)) {
        // Point to point dimension
        const p1 = getPointCoords(e1);
        const p2 = getPointCoords(e2);
        if (p1 && p2) {
          const dimType = determineDimensionType(p1, p2, currentMouse);
          renderLinearDimension(group, p1, p2, currentMouse, dimType, colors, zoom);
        }
      } else if (isPointLike(e1.type) && (e2.type === 'axis-x' || e2.type === 'axis-y')) {
        // Point to axis dimension
        const p1 = getPointCoords(e1);
        if (p1) {
          if (e2.type === 'axis-x') {
            // Distance from point to X-axis (Y coordinate)
            const p2 = { x: p1.x, y: 0 };
            renderLinearDimension(group, p1, p2, currentMouse, 'y', colors, zoom);
          } else {
            // Distance from point to Y-axis (X coordinate)
            const p2 = { x: 0, y: p1.y };
            renderLinearDimension(group, p1, p2, currentMouse, 'x', colors, zoom);
          }
        }
      } else if ((e1.type === 'axis-x' || e1.type === 'axis-y') && isPointLike(e2.type)) {
        // Axis to point dimension (swap order)
        const p2 = getPointCoords(e2);
        if (p2) {
          if (e1.type === 'axis-x') {
            const p1 = { x: p2.x, y: 0 };
            renderLinearDimension(group, p1, p2, currentMouse, 'y', colors, zoom);
          } else {
            const p1 = { x: 0, y: p2.y };
            renderLinearDimension(group, p1, p2, currentMouse, 'x', colors, zoom);
          }
        }
      } else if (e1.type === 'line' && e2.type === 'line') {
        // Line to line - angle dimension (TODO: implement angle preview)
        // For now, just show nothing
      }
    }

    scene.add(group);
    previewGroupRef.current = group;
    return;
  }

  if (!currentMouse || pendingPoints.length === 0) return;

  const group = new THREE.Group();
  const resolution = new THREE.Vector2(containerWidth, containerHeight);

  // Use light blue color for preview lines (same weight as final)
  const previewColor = '#93c5fd'; // Light blue for preview
  const previewMaterial = new LineMaterial({
    color: new THREE.Color(previewColor).getHex(),
    linewidth: 3, // Same weight as final lines
    resolution: resolution,
    opacity: 0.9,
    transparent: true,
  });

  // Dashed material for snap indicators
  const dashedMaterial = new THREE.LineDashedMaterial({
    color: colors.underConstrained,
    dashSize: 5,
    gapSize: 3,
    opacity: 0.5,
    transparent: true,
  });

  if (activeTool === 'line' && pendingPoints.length === 1) {
    // Apply angle snapping
    const angleSnap = applyAngleSnap(
      pendingPoints[0].x, pendingPoints[0].y,
      currentMouse.x, currentMouse.y
    );

    // Preview line from first point to (angle-snapped) cursor using Line2
    const geometry = new LineGeometry();
    geometry.setPositions([
      pendingPoints[0].x, pendingPoints[0].y, 0.4,
      angleSnap.x, angleSnap.y, 0.4,
    ]);
    const line = new Line2(geometry, previewMaterial.clone());
    line.computeLineDistances();
    group.add(line);

    // Draw start point indicator
    const startPointGeom = new THREE.CircleGeometry(6 / zoom, 16);
    const startPointMat = new THREE.MeshBasicMaterial({ color: previewColor, opacity: 0.9, transparent: true });
    const startPoint = new THREE.Mesh(startPointGeom, startPointMat);
    startPoint.position.set(pendingPoints[0].x, pendingPoints[0].y, 0.45);
    group.add(startPoint);

    // Draw a visual indicator when angle is snapped
    if (angleSnap.snappedAngle) {
      const indicatorMaterial = new THREE.LineDashedMaterial({
        color: '#22c55e', // Green for snap indicator
        dashSize: 3,
        gapSize: 2,
        opacity: 0.5,
        transparent: true,
      });

      // Draw a dotted line showing the constraint direction
      const indicatorLength = 50;
      if (angleSnap.snappedAngle === 'horizontal') {
        const hLineGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(pendingPoints[0].x - indicatorLength, pendingPoints[0].y, 0.35),
          new THREE.Vector3(pendingPoints[0].x + indicatorLength, pendingPoints[0].y, 0.35),
        ]);
        const hLine = new THREE.Line(hLineGeom, indicatorMaterial);
        hLine.computeLineDistances();
        group.add(hLine);
      } else {
        const vLineGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(pendingPoints[0].x, pendingPoints[0].y - indicatorLength, 0.35),
          new THREE.Vector3(pendingPoints[0].x, pendingPoints[0].y + indicatorLength, 0.35),
        ]);
        const vLine = new THREE.Line(vLineGeom, indicatorMaterial);
        vLine.computeLineDistances();
        group.add(vLine);
      }
    }
  }

  if (activeTool === 'circle' && pendingPoints.length === 1) {
    // Preview circle from center to cursor using Line2
    const radius = Math.sqrt(
      Math.pow(currentMouse.x - pendingPoints[0].x, 2) +
      Math.pow(currentMouse.y - pendingPoints[0].y, 2)
    );
    const segments = 64;
    const positions: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions.push(
        pendingPoints[0].x + Math.cos(theta) * radius,
        pendingPoints[0].y + Math.sin(theta) * radius,
        0.4
      );
    }
    const geometry = new LineGeometry();
    geometry.setPositions(positions);
    const circle = new Line2(geometry, previewMaterial.clone());
    circle.computeLineDistances();
    group.add(circle);

    // Draw center point indicator
    const centerPointGeom = new THREE.CircleGeometry(6 / zoom, 16);
    const centerPointMat = new THREE.MeshBasicMaterial({ color: previewColor, opacity: 0.9, transparent: true });
    const centerPoint = new THREE.Mesh(centerPointGeom, centerPointMat);
    centerPoint.position.set(pendingPoints[0].x, pendingPoints[0].y, 0.45);
    group.add(centerPoint);
  }

  if ((activeTool === 'rectangle-corner' || activeTool === 'rectangle-center') && pendingPoints.length === 1) {
    let x1, y1, x2, y2;
    if (activeTool === 'rectangle-corner') {
      x1 = pendingPoints[0].x;
      y1 = pendingPoints[0].y;
      x2 = currentMouse.x;
      y2 = currentMouse.y;
    } else {
      // Center rectangle
      const halfW = Math.abs(currentMouse.x - pendingPoints[0].x);
      const halfH = Math.abs(currentMouse.y - pendingPoints[0].y);
      x1 = pendingPoints[0].x - halfW;
      y1 = pendingPoints[0].y - halfH;
      x2 = pendingPoints[0].x + halfW;
      y2 = pendingPoints[0].y + halfH;
    }

    // Use Line2 for thick rectangle preview
    const geometry = new LineGeometry();
    geometry.setPositions([
      x1, y1, 0.4,
      x2, y1, 0.4,
      x2, y2, 0.4,
      x1, y2, 0.4,
      x1, y1, 0.4,
    ]);
    const rect = new Line2(geometry, previewMaterial.clone());
    rect.computeLineDistances();
    group.add(rect);

    // Draw corner point indicator
    const cornerPointGeom = new THREE.CircleGeometry(6 / zoom, 16);
    const cornerPointMat = new THREE.MeshBasicMaterial({ color: previewColor, opacity: 0.9, transparent: true });
    const cornerPoint = new THREE.Mesh(cornerPointGeom, cornerPointMat);
    cornerPoint.position.set(pendingPoints[0].x, pendingPoints[0].y, 0.45);
    group.add(cornerPoint);
  }

  scene.add(group);
  previewGroupRef.current = group;
}

// Helper to create infinite grid
function createGrid(
  colors: CADColors,
  viewState: ViewState,
  containerWidth: number,
  containerHeight: number
): THREE.Group {
  const group = new THREE.Group();

  if (containerWidth === 0 || containerHeight === 0) return group;

  const baseSpacing = 1;
  let spacing = baseSpacing;
  const targetPixelSpacing = 50;

  if (spacing * viewState.zoom < targetPixelSpacing / 2) {
    while (spacing * viewState.zoom < targetPixelSpacing / 2) {
      spacing *= 10;
    }
  } else if (spacing * viewState.zoom > targetPixelSpacing * 2) {
    while (spacing * viewState.zoom > targetPixelSpacing * 2 && spacing > 0.001) {
      spacing /= 10;
    }
  }

  const majorSpacing = spacing * 10;

  const viewWidth = containerWidth / viewState.zoom;
  const viewHeight = containerHeight / viewState.zoom;
  const left = -viewState.panX / viewState.zoom - viewWidth / 2;
  const right = -viewState.panX / viewState.zoom + viewWidth / 2;
  const bottom = -viewState.panY / viewState.zoom - viewHeight / 2;
  const top = -viewState.panY / viewState.zoom + viewHeight / 2;

  const startX = Math.floor(left / spacing) * spacing;
  const endX = Math.ceil(right / spacing) * spacing;
  const startY = Math.floor(bottom / spacing) * spacing;
  const endY = Math.ceil(top / spacing) * spacing;

  const minorMaterial = new THREE.LineBasicMaterial({ color: colors.grid });
  const majorMaterial = new THREE.LineBasicMaterial({ color: colors.gridMajor });

  for (let x = startX; x <= endX; x += spacing) {
    const isMajor = Math.abs(x % majorSpacing) < spacing * 0.1;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, startY, 0),
      new THREE.Vector3(x, endY, 0),
    ]);
    const line = new THREE.Line(geometry, isMajor ? majorMaterial : minorMaterial);
    group.add(line);
  }

  for (let y = startY; y <= endY; y += spacing) {
    const isMajor = Math.abs(y % majorSpacing) < spacing * 0.1;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(startX, y, 0),
      new THREE.Vector3(endX, y, 0),
    ]);
    const line = new THREE.Line(geometry, isMajor ? majorMaterial : minorMaterial);
    group.add(line);
  }

  return group;
}

// Helper to create origin crosshairs
function createOrigin(
  colors: CADColors,
  viewState: ViewState,
  containerWidth: number,
  containerHeight: number
): THREE.Group {
  const group = new THREE.Group();

  if (containerWidth === 0 || containerHeight === 0) return group;

  const viewWidth = containerWidth / viewState.zoom;
  const viewHeight = containerHeight / viewState.zoom;
  const extent = Math.max(viewWidth, viewHeight) * 2;

  const xMaterial = new THREE.LineBasicMaterial({ color: colors.originX });
  const xGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-extent, 0, 0.1),
    new THREE.Vector3(extent, 0, 0.1),
  ]);
  const xLine = new THREE.Line(xGeometry, xMaterial);
  group.add(xLine);

  const yMaterial = new THREE.LineBasicMaterial({ color: colors.originY });
  const yGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -extent, 0.1),
    new THREE.Vector3(0, extent, 0.1),
  ]);
  const yLine = new THREE.Line(yGeometry, yMaterial);
  group.add(yLine);

  const originGeometry = new THREE.CircleGeometry(4 / viewState.zoom, 32);
  const originMaterial = new THREE.MeshBasicMaterial({ color: colors.fullyConstrained });
  const originPoint = new THREE.Mesh(originGeometry, originMaterial);
  originPoint.position.z = 0.2;
  group.add(originPoint);

  return group;
}

export default function Canvas({
  isDarkMode,
  viewState,
  onViewChange,
  entities,
  constraints,
  activeTool,
  constructionMode,
  onAddPoint,
  onAddLine,
  onAddCircle,
  onAddRectangle,
  onMovePoint,
  onDragStart,
  onAddDimension,
  onAddDistanceDimension,
  onAddAngleDimension,
  onUpdateConstraint,
  onUpdateDimensionOffset,
  selectedEntityId,
  onSelectEntity,
  overConstrainedEntities,
  entityConstraintStatus,
  getConstraintsForEntity,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const gridRef = useRef<THREE.Group | null>(null);
  const originRef = useRef<THREE.Group | null>(null);
  const entityGroupRef = useRef<THREE.Group | null>(null);
  const previewGroupRef = useRef<THREE.Group | null>(null);
  const snapIndicatorRef = useRef<THREE.Group | null>(null);
  const dimensionGroupRef = useRef<THREE.Group | null>(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pendingPoints, setPendingPoints] = useState<Array<{ x: number; y: number; snapInfo?: SnapInfo }>>([]);
  const [currentMouse, setCurrentMouse] = useState<{ x: number; y: number } | null>(null);
  const [snapPoint, setSnapPoint] = useState<SnapResult | null>(null);
  const [dimensionLabels, setDimensionLabels] = useState<DimensionLabel[]>([]);
  const [constraintIcons, setConstraintIcons] = useState<ConstraintIcon[]>([]);

  // Editing state for dimension values
  const [editingDimension, setEditingDimension] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Hover state for highlighting
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);

  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const dragButtonRef = useRef<number | null>(null);

  // Drag state for moving entities
  const isDraggingEntityRef = useRef(false);
  const draggingPointIdRef = useRef<string | null>(null);
  const didDragRef = useRef(false); // Track if a drag occurred to skip click

  // Drag state for repositioning dimension labels
  const draggingDimensionRef = useRef<string | null>(null);
  const dimensionDragStartRef = useRef<{ worldX: number; worldY: number; initialOffset: number } | null>(null);

  // Wake references for inference lines (Onshape-style "wake up" behavior)
  const [wakeReferences, setWakeReferences] = useState<WakeReference[]>([]);
  const inferenceGroupRef = useRef<THREE.Group | null>(null);
  const wakeIdCounter = useRef(0);

  // Dimension creation state - supports drag-to-place workflow
  // Phase 1: 'selecting' - user has clicked first entity, waiting for second click
  // Phase 2: 'placing' - user is dragging to position the dimension, type updates based on cursor
  type DimensionEntityType = 'point' | 'line' | 'circle' | 'origin' | 'axis-x' | 'axis-y';
  const [pendingDimension, setPendingDimension] = useState<{
    phase: 'selecting' | 'placing';
    entity1: { type: DimensionEntityType; id: string };
    entity2?: { type: DimensionEntityType; id: string };
    // For placing phase - determined by cursor position
    dimensionType?: 'x' | 'y' | 'direct' | 'radius' | 'diameter' | 'length' | 'angle';
  } | null>(null);

  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const mouseX = screenX - rect.left - rect.width / 2;
    const mouseY = -(screenY - rect.top - rect.height / 2);

    const worldX = (mouseX - viewState.panX) / viewState.zoom;
    const worldY = (mouseY - viewState.panY) / viewState.zoom;

    return { x: worldX, y: worldY };
  }, [viewState]);

  // Convert world coordinates to screen coordinates for HTML overlay
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    const screenX = worldX * viewState.zoom + viewState.panX + containerSize.width / 2;
    const screenY = -worldY * viewState.zoom - viewState.panY + containerSize.height / 2;
    return { x: screenX, y: screenY };
  }, [viewState, containerSize]);

  // Wake up inference references when hovering over snap points
  useEffect(() => {
    // Only wake when a drawing tool is active and we have a snap point
    if (activeTool === 'select' || activeTool === 'dimension' || !snapPoint) return;
    // Don't wake for nearest-on-line (that's for point-on-line snapping, not alignment)
    if (snapPoint.type === 'nearest-on-line') return;

    // Check if we already have a reference at this exact position
    const alreadyHas = wakeReferences.some(ref =>
      Math.abs(ref.x - snapPoint.x) < 0.001 &&
      Math.abs(ref.y - snapPoint.y) < 0.001 &&
      // For midpoints, also check if it's the same direction
      (snapPoint.type !== 'midpoint' || ref.lineId === snapPoint.lineId)
    );

    if (!alreadyHas) {
      const newRefs = createWakeReferences(snapPoint, entities, wakeIdCounter);
      if (newRefs.length > 0) {
        setWakeReferences(prev => [...prev, ...newRefs]);
      }
    }
  }, [snapPoint, activeTool, entities, wakeReferences]);

  // Clear wake references when tool changes or on escape
  useEffect(() => {
    if (activeTool === 'select') {
      setWakeReferences([]);
    }
  }, [activeTool]);

  // Handle dimension label dragging with document-level events
  const handleDimensionDragStart = useCallback((constraintId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const constraint = constraints.get(constraintId);
    if (!constraint) return;

    // Get current offset from constraint
    let initialOffset = 30 / viewState.zoom; // default
    if ('offset' in constraint && typeof constraint.offset === 'number') {
      initialOffset = constraint.offset;
    }

    const world = screenToWorld(e.clientX, e.clientY);
    draggingDimensionRef.current = constraintId;
    dimensionDragStartRef.current = { worldX: world.x, worldY: world.y, initialOffset };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!draggingDimensionRef.current || !dimensionDragStartRef.current) return;

      const world = screenToWorld(moveEvent.clientX, moveEvent.clientY);
      const constraint = constraints.get(draggingDimensionRef.current);
      if (!constraint) return;

      // Calculate offset based on constraint type and drag direction
      let newOffset = dimensionDragStartRef.current.initialOffset;

      if (constraint.type === 'length') {
        // Length constraint - offset is perpendicular to line
        const lc = constraint as LengthConstraint;
        const line = entities.lines.get(lc.lineId);
        if (line) {
          const startPoint = entities.points.get(line.startId);
          const endPoint = entities.points.get(line.endId);
          if (startPoint && endPoint) {
            const midX = (startPoint.x + endPoint.x) / 2;
            const midY = (startPoint.y + endPoint.y) / 2;
            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
              const perpX = -dy / len;
              const perpY = dx / len;
              newOffset = (world.x - midX) * perpX + (world.y - midY) * perpY;
            }
          }
        }
      } else if (constraint.type === 'distance') {
        // Distance constraint - offset depends on direction
        const dc = constraint as DistanceConstraint;
        const getPointCoords = (id: string): { x: number; y: number } | null => {
          if (id === ORIGIN_POINT_ID) return { x: 0, y: 0 };
          const point = entities.points.get(id);
          return point ? { x: point.x, y: point.y } : null;
        };
        const p1 = getPointCoords(dc.point1Id);
        const p2 = getPointCoords(dc.point2Id);
        if (p1 && p2) {
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          if (dc.direction === 'x') {
            // Horizontal line - Y offset
            newOffset = world.y - midY;
          } else if (dc.direction === 'y') {
            // Vertical line - X offset
            newOffset = world.x - midX;
          } else {
            // Direct - perpendicular offset
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
              const perpX = -dy / len;
              const perpY = dx / len;
              newOffset = (world.x - midX) * perpX + (world.y - midY) * perpY;
            }
          }
        }
      } else if (constraint.type === 'radius') {
        // Radius constraint - simple offset from center
        const rc = constraint as RadiusConstraint;
        const circle = entities.circles.get(rc.circleId);
        if (circle) {
          const center = entities.points.get(circle.centerId);
          if (center) {
            newOffset = Math.sqrt(Math.pow(world.x - center.x, 2) + Math.pow(world.y - center.y, 2));
          }
        }
      }

      // Update the offset in real-time
      if (onUpdateDimensionOffset) {
        onUpdateDimensionOffset(draggingDimensionRef.current, newOffset);
      }
    };

    const handleMouseUp = () => {
      draggingDimensionRef.current = null;
      dimensionDragStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [constraints, entities, screenToWorld, viewState.zoom, onUpdateDimensionOffset]);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0) {
      const timer = setTimeout(() => {
        if (containerRef.current) {
          setContainerSize({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }

    if (rendererRef.current) return;

    setContainerSize({ width, height });

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      0.1,
      1000
    );
    camera.position.z = 100;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    renderer.render(scene, camera);

    return () => {
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        renderer.dispose();
        container.removeChild(renderer.domElement);
        rendererRef.current = null;
        sceneRef.current = null;
        cameraRef.current = null;
      }
    };
  }, [containerSize.width, containerSize.height]);

  // Update colors when dark mode changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(colors.background);
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
  }, [colors.background]);

  // Update grid, origin, entities, and preview when view or entities change
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    if (containerSize.width === 0 || containerSize.height === 0) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    // Remove old grid and origin
    if (gridRef.current) {
      scene.remove(gridRef.current);
      gridRef.current.traverse((obj) => {
        if (obj instanceof THREE.Line) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
    }
    if (originRef.current) {
      scene.remove(originRef.current);
      originRef.current.traverse((obj) => {
        if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
    }

    // Create new grid and origin
    const grid = createGrid(colors, viewState, containerSize.width, containerSize.height);
    const origin = createOrigin(colors, viewState, containerSize.width, containerSize.height);
    scene.add(grid);
    scene.add(origin);
    gridRef.current = grid;
    originRef.current = origin;

    // Render entities
    renderEntities(scene, entities, colors, entityGroupRef, containerSize.width, containerSize.height, selectedEntityId, hoveredEntityId, viewState.zoom, overConstrainedEntities, entityConstraintStatus);

    // Render dimensions and get label data for HTML overlay
    const labels = renderDimensions(scene, entities, constraints, colors, dimensionGroupRef, viewState.zoom, containerSize.width, containerSize.height);
    setDimensionLabels(labels);

    // Calculate constraint icons for hovered entity
    if (hoveredEntityId) {
      const entityConstraints = getConstraintsForEntity(hoveredEntityId);
      // Filter out dimension constraints (length, radius, distance, angle) - they're shown separately
      const nonDimConstraints = entityConstraints.filter(c =>
        !['length', 'radius', 'distance', 'angle'].includes(c.type)
      );

      // Get entity position for icon placement
      let entityX = 0;
      let entityY = 0;

      // For points, use point position
      const point = entities.points.get(hoveredEntityId);
      if (point) {
        entityX = point.x;
        entityY = point.y;
      }

      // For lines, use midpoint
      const line = entities.lines.get(hoveredEntityId);
      if (line) {
        const start = entities.points.get(line.startId);
        const end = entities.points.get(line.endId);
        if (start && end) {
          entityX = (start.x + end.x) / 2;
          entityY = (start.y + end.y) / 2;
        }
      }

      // For circles, use center
      const circle = entities.circles.get(hoveredEntityId);
      if (circle) {
        const center = entities.points.get(circle.centerId);
        if (center) {
          entityX = center.x;
          entityY = center.y + circle.radius + 20 / viewState.zoom;
        }
      }

      // Create icon data
      const icons: ConstraintIcon[] = nonDimConstraints.map((c, i) => {
        // Map constraint types to display labels
        const labelMap: Record<string, string> = {
          'coincident': '●',
          'horizontal': '—',
          'vertical': '|',
          'parallel': '∥',
          'perpendicular': '⊥',
          'fixed': '⊕',
          'tangent': '⟜',
          'equal': '=',
          'midpoint': 'M',
          'concentric': '◎',
        };

        const offset = (i - (nonDimConstraints.length - 1) / 2) * 24;
        return {
          constraintId: c.id,
          constraintType: c.type,
          x: entityX * viewState.zoom + viewState.panX + containerSize.width / 2 + offset,
          y: -entityY * viewState.zoom - viewState.panY + containerSize.height / 2 - 30,
          label: labelMap[c.type] || c.type[0].toUpperCase(),
        };
      });

      setConstraintIcons(icons);
    } else {
      setConstraintIcons([]);
    }

    // Use snapped position for preview if available
    const previewMouse = snapPoint ? { x: snapPoint.x, y: snapPoint.y } : currentMouse;

    // Render preview
    renderPreview(scene, previewGroupRef, activeTool, pendingPoints, previewMouse, colors, pendingDimension, entities, viewState.zoom, containerSize.width, containerSize.height);

    // Render snap indicator
    renderSnapIndicator(scene, snapIndicatorRef, snapPoint, colors, viewState.zoom);

    // Render inference lines from wake references
    const viewExtent = Math.max(containerSize.width, containerSize.height) / viewState.zoom;
    renderInferenceLines(scene, inferenceGroupRef, wakeReferences, currentMouse, colors, viewState.zoom, viewExtent);

    // Update camera
    camera.left = -containerSize.width / 2 / viewState.zoom;
    camera.right = containerSize.width / 2 / viewState.zoom;
    camera.top = containerSize.height / 2 / viewState.zoom;
    camera.bottom = -containerSize.height / 2 / viewState.zoom;
    camera.position.x = -viewState.panX / viewState.zoom;
    camera.position.y = -viewState.panY / viewState.zoom;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  }, [viewState, colors, containerSize, entities, constraints, pendingPoints, currentMouse, activeTool, snapPoint, selectedEntityId, hoveredEntityId, pendingDimension, overConstrainedEntities, entityConstraintStatus, getConstraintsForEntity, wakeReferences]);

  // Clear pending points and dimension when tool changes
  useEffect(() => {
    setPendingPoints([]);
    setPendingDimension(null);
  }, [activeTool]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current || !sceneRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      if (width === 0 || height === 0) return;

      setContainerSize({ width, height });
      rendererRef.current.setSize(width, height);

      const camera = cameraRef.current;
      camera.left = -width / 2 / viewState.zoom;
      camera.right = width / 2 / viewState.zoom;
      camera.top = height / 2 / viewState.zoom;
      camera.bottom = -height / 2 / viewState.zoom;
      camera.updateProjectionMatrix();

      rendererRef.current.render(sceneRef.current, camera);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewState.zoom]);

  // Zoom handler
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const zoomFactor = 1.1;
    const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
    const newZoom = Math.max(0.01, Math.min(1000, viewState.zoom * delta));

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = -(e.clientY - rect.top - rect.height / 2);

    const worldX = (mouseX - viewState.panX) / viewState.zoom;
    const worldY = (mouseY - viewState.panY) / viewState.zoom;

    const newPanX = mouseX - worldX * newZoom;
    const newPanY = mouseY - worldY * newZoom;

    onViewChange({
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY,
    });
  }, [viewState, onViewChange]);

  // Handle click for drawing and selection
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only handle left click
    if (e.button !== 0) return;

    // Don't handle if we were dragging (panning or entity)
    if (isDraggingRef.current || isDraggingEntityRef.current) return;

    // Skip click if we just finished dragging
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);

    // Calculate snap point FRESH at click time to avoid stale closure issues
    // The snapPoint state may be stale if React hasn't committed the update from the last mouseMove
    const snapThreshold = 15 / viewState.zoom;
    const freshSnapPoint = (activeTool !== 'select')
      ? findSnapPoint(world.x, world.y, entities, snapThreshold)
      : null;

    // Apply alignment snap from wake references first
    const alignmentThreshold = 15 / viewState.zoom;
    const alignment = findAlignmentSnap(world.x, world.y, wakeReferences, alignmentThreshold);

    // Use alignment-adjusted coordinates, then snap point if available
    let clickX = alignment.x;
    let clickY = alignment.y;
    if (freshSnapPoint) {
      clickX = freshSnapPoint.x;
      clickY = freshSnapPoint.y;
    }

    switch (activeTool) {
      case 'select': {
        // Hit test to find entity
        const hitThreshold = 20 / viewState.zoom; // 20 screen pixels
        const hit = hitTest(world.x, world.y, entities, hitThreshold);
        if (hit) {
          // Check if this entity belongs to a rectangle - if so, select the rectangle
          const rectId = findRectangleForEntity(hit.entityId, entities);
          if (rectId) {
            onSelectEntity(rectId);
          } else {
            onSelectEntity(hit.entityId);
          }
        } else {
          onSelectEntity(null);
        }
        break;
      }

      case 'point': {
        onAddPoint(clickX, clickY, snapResultToInfo(freshSnapPoint));
        setWakeReferences([]); // Clear inference lines after placing geometry
        break;
      }

      case 'line':
        if (pendingPoints.length === 0) {
          // Store first point with its snap info
          setPendingPoints([{ x: clickX, y: clickY, snapInfo: snapResultToInfo(freshSnapPoint) }]);
        } else {
          // Apply angle snapping
          const angleSnap = applyAngleSnap(
            pendingPoints[0].x, pendingPoints[0].y,
            clickX, clickY
          );
          onAddLine(pendingPoints[0].x, pendingPoints[0].y, angleSnap.x, angleSnap.y, pendingPoints[0].snapInfo, snapResultToInfo(freshSnapPoint));
          setPendingPoints([]);
          setWakeReferences([]); // Clear inference lines after placing geometry
        }
        break;

      case 'circle':
        if (pendingPoints.length === 0) {
          // Store center point with snap info
          setPendingPoints([{ x: clickX, y: clickY, snapInfo: snapResultToInfo(freshSnapPoint) }]);
        } else {
          const radius = Math.sqrt(
            Math.pow(clickX - pendingPoints[0].x, 2) +
            Math.pow(clickY - pendingPoints[0].y, 2)
          );
          onAddCircle(pendingPoints[0].x, pendingPoints[0].y, radius, pendingPoints[0].snapInfo);
          setPendingPoints([]);
          setWakeReferences([]); // Clear inference lines after placing geometry
        }
        break;

      case 'rectangle-corner':
        if (pendingPoints.length === 0) {
          setPendingPoints([{ x: clickX, y: clickY }]);
        } else {
          onAddRectangle(pendingPoints[0].x, pendingPoints[0].y, clickX, clickY);
          setPendingPoints([]);
          setWakeReferences([]); // Clear inference lines after placing geometry
        }
        break;

      case 'rectangle-center':
        if (pendingPoints.length === 0) {
          setPendingPoints([{ x: clickX, y: clickY }]);
        } else {
          const halfW = Math.abs(clickX - pendingPoints[0].x);
          const halfH = Math.abs(clickY - pendingPoints[0].y);
          onAddRectangle(
            pendingPoints[0].x - halfW,
            pendingPoints[0].y - halfH,
            pendingPoints[0].x + halfW,
            pendingPoints[0].y + halfH
          );
          setPendingPoints([]);
          setWakeReferences([]); // Clear inference lines after placing geometry
        }
        break;

      case 'dimension': {
        // Onshape-style dimension tool with drag-to-place:
        // 1. Click entity → start selecting/placing
        // 2. For lines/circles: immediately enter placing mode, drag to position
        // 3. For points: click second point, then drag to position
        // 4. Click to finalize

        const hitThreshold = 20 / viewState.zoom;
        // Use includeOriginAndAxes=true for dimension tool to allow origin and axis selection
        const hit = hitTest(world.x, world.y, entities, hitThreshold, true);

        if (!pendingDimension) {
          // First click - select entity to dimension
          if (!hit) {
            // Clicked empty space with no pending dimension - do nothing
            break;
          }

          // Check if clicking on existing dimension - edit it
          if (hit.entityType === 'line' || hit.entityType === 'circle') {
            let existingConstraintId: string | null = null;
            let existingValue: string | null = null;

            for (const [constraintId, constraint] of constraints) {
              if (constraint.type === 'length' && (constraint as LengthConstraint).lineId === hit.entityId) {
                existingConstraintId = constraintId;
                existingValue = (constraint as LengthConstraint).value.toString();
                break;
              }
              if (constraint.type === 'radius' && (constraint as RadiusConstraint).circleId === hit.entityId) {
                existingConstraintId = constraintId;
                existingValue = (constraint as RadiusConstraint).value.toString();
                break;
              }
            }

            if (existingConstraintId && existingValue) {
              onSelectEntity(existingConstraintId);
              setEditingDimension(existingConstraintId);
              setEditValue(existingValue);
              break;
            }
          }

          // Start dimension based on what was clicked
          const entityType = hit.entityType as DimensionEntityType;

          if (entityType === 'line' || entityType === 'circle') {
            // Single-entity dimensions go directly to placing mode
            setPendingDimension({
              phase: 'placing',
              entity1: { type: entityType, id: hit.entityId },
            });
          } else {
            // Points, origin, axes need a second entity
            setPendingDimension({
              phase: 'selecting',
              entity1: { type: entityType, id: hit.entityId },
            });
          }
        } else if (pendingDimension.phase === 'selecting') {
          // Second click - select second entity or cancel
          if (!hit) {
            // Clicked empty space - cancel
            setPendingDimension(null);
            break;
          }

          const e1Type = pendingDimension.entity1.type;
          const e2Type = hit.entityType as DimensionEntityType;

          // Valid combinations for two-entity dimensions:
          // - point/origin + point/origin → distance
          // - point/origin + axis → distance to axis
          // - axis + point/origin → distance to axis
          const isPointLike = (t: DimensionEntityType) => t === 'point' || t === 'origin';
          const isAxis = (t: DimensionEntityType) => t === 'axis-x' || t === 'axis-y';

          if ((isPointLike(e1Type) && isPointLike(e2Type)) ||
              (isPointLike(e1Type) && isAxis(e2Type)) ||
              (isAxis(e1Type) && isPointLike(e2Type))) {
            // Valid combination - enter placing mode
            setPendingDimension({
              phase: 'placing',
              entity1: pendingDimension.entity1,
              entity2: { type: e2Type, id: hit.entityId },
            });
          } else {
            // Invalid combination - cancel
            setPendingDimension(null);
          }
        } else if (pendingDimension.phase === 'placing') {
          // Third click - finalize the dimension at current position
          const e1 = pendingDimension.entity1;
          const e2 = pendingDimension.entity2;

          // Helper to get point coordinates
          const getPointCoords = (entity: { type: DimensionEntityType; id: string }): { x: number; y: number } | null => {
            if (entity.type === 'origin') return { x: 0, y: 0 };
            if (entity.type === 'point') {
              const p = entities.points.get(entity.id);
              return p ? { x: p.x, y: p.y } : null;
            }
            return null;
          };

          if (!e2) {
            // Single entity dimension
            if (e1.type === 'line') {
              // Line length
              const line = entities.lines.get(e1.id);
              if (line) {
                const startPoint = entities.points.get(line.startId);
                const endPoint = entities.points.get(line.endId);
                if (startPoint && endPoint) {
                  const dx = endPoint.x - startPoint.x;
                  const dy = endPoint.y - startPoint.y;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  const perpX = len > 0 ? -dy / len : 0;
                  const perpY = len > 0 ? dx / len : 1;
                  const midX = (startPoint.x + endPoint.x) / 2;
                  const midY = (startPoint.y + endPoint.y) / 2;
                  const offset = (world.x - midX) * perpX + (world.y - midY) * perpY;

                  const constraintId = onAddDimension(e1.id, 'line', offset);
                  if (constraintId) {
                    setEditValue((Math.round(len * 10) / 10).toString());
                    setEditingDimension(constraintId);
                  }
                }
              }
            } else if (e1.type === 'circle') {
              // Circle radius or diameter
              const circle = entities.circles.get(e1.id);
              if (circle) {
                const center = entities.points.get(circle.centerId);
                if (center) {
                  const distToCenter = Math.sqrt(
                    Math.pow(world.x - center.x, 2) + Math.pow(world.y - center.y, 2)
                  );
                  const isDiameter = distToCenter > circle.radius;

                  // For now, always create radius constraint (diameter support TODO)
                  const constraintId = onAddDimension(e1.id, 'circle', 30 / viewState.zoom);
                  if (constraintId) {
                    const value = isDiameter ? circle.radius * 2 : circle.radius;
                    setEditValue((Math.round(value * 10) / 10).toString());
                    setEditingDimension(constraintId);
                  }
                }
              }
            }
          } else {
            // Two entity dimension
            const isPointLike = (t: DimensionEntityType) => t === 'point' || t === 'origin';

            if (isPointLike(e1.type) && isPointLike(e2.type)) {
              // Point to point
              const p1 = getPointCoords(e1);
              const p2 = getPointCoords(e2);
              if (p1 && p2) {
                const dimType = determineDimensionType(p1, p2, world);
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                let offset = 30 / viewState.zoom;
                if (dimType === 'x') {
                  // Horizontal distance - horizontal line - Y offset
                  offset = world.y - midY;
                } else if (dimType === 'y') {
                  // Vertical distance - vertical line - X offset
                  offset = world.x - midX;
                } else {
                  const len = Math.sqrt(dx * dx + dy * dy);
                  if (len > 0) {
                    const perpX = -dy / len;
                    const perpY = dx / len;
                    offset = (world.x - midX) * perpX + (world.y - midY) * perpY;
                  }
                }

                // Get point IDs for the constraint
                const point1Id = e1.type === 'origin' ? ORIGIN_POINT_ID : e1.id;
                const point2Id = e2.type === 'origin' ? ORIGIN_POINT_ID : e2.id;

                const constraintId = onAddDistanceDimension(point1Id, point2Id, offset, dimType);
                if (constraintId) {
                  let distance: number;
                  if (dimType === 'x') {
                    distance = Math.abs(p2.x - p1.x);
                  } else if (dimType === 'y') {
                    distance = Math.abs(p2.y - p1.y);
                  } else {
                    distance = Math.sqrt(dx * dx + dy * dy);
                  }
                  setEditValue((Math.round(distance * 10) / 10).toString());
                  setEditingDimension(constraintId);
                }
              }
            } else if ((isPointLike(e1.type) && (e2.type === 'axis-x' || e2.type === 'axis-y')) ||
                       ((e1.type === 'axis-x' || e1.type === 'axis-y') && isPointLike(e2.type))) {
              // Point to axis
              const pointEntity = isPointLike(e1.type) ? e1 : e2;
              const axisEntity = isPointLike(e1.type) ? e2 : e1;
              const p = getPointCoords(pointEntity);

              if (p) {
                const pointId = pointEntity.type === 'origin' ? ORIGIN_POINT_ID : pointEntity.id;
                const isXAxis = axisEntity.type === 'axis-x';

                // Distance to X-axis is |y|, distance to Y-axis is |x|
                const distance = isXAxis ? Math.abs(p.y) : Math.abs(p.x);
                const direction: 'x' | 'y' = isXAxis ? 'y' : 'x';

                // Create the dimension - use origin point and set direction
                // For direction='x' (horizontal line), offset is Y-based
                // For direction='y' (vertical line), offset is X-based
                const offset = isXAxis ? (world.x - p.x / 2) : (world.y - p.y / 2);
                const constraintId = onAddDistanceDimension(pointId, ORIGIN_POINT_ID, offset, direction);
                if (constraintId) {
                  setEditValue((Math.round(distance * 10) / 10).toString());
                  setEditingDimension(constraintId);
                }
              }
            }
          }

          setPendingDimension(null);
        }
        break;
      }
    }
  }, [activeTool, pendingPoints, pendingDimension, screenToWorld, viewState.zoom, entities, constraints, onAddPoint, onAddLine, onAddCircle, onAddRectangle, onAddDimension, onAddDistanceDimension, onAddAngleDimension, onSelectEntity, wakeReferences]);

  // Pan and drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle/right button for panning
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      isDraggingRef.current = true;
      dragButtonRef.current = e.button;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Left button - check for entity dragging in select mode
    if (e.button === 0 && activeTool === 'select') {
      const world = screenToWorld(e.clientX, e.clientY);
      const hitThreshold = 20 / viewState.zoom; // 20 screen pixels
      const hit = hitTest(world.x, world.y, entities, hitThreshold);

      // If we hit a point, start dragging it
      if (hit && hit.entityType === 'point') {
        onDragStart?.(); // Save state for undo before drag begins
        isDraggingEntityRef.current = true;
        draggingPointIdRef.current = hit.entityId;
        onSelectEntity(hit.entityId);
        e.preventDefault();
      }
    }
  }, [activeTool, screenToWorld, viewState.zoom, entities, onSelectEntity, onDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Update current mouse position for preview
    const world = screenToWorld(e.clientX, e.clientY);
    setCurrentMouse(world);

    // Handle entity dragging
    if (isDraggingEntityRef.current && draggingPointIdRef.current) {
      didDragRef.current = true; // Mark that we dragged

      // Use snap while dragging - exclude the point being dragged and its connected lines
      const snapThreshold = 15 / viewState.zoom;
      const snap = findSnapPoint(world.x, world.y, entities, snapThreshold, draggingPointIdRef.current);
      setSnapPoint(snap);

      let moveX = snap ? snap.x : world.x;
      let moveY = snap ? snap.y : world.y;

      // Apply angle snapping relative to connected lines
      // Find lines connected to this point
      if (!snap) {
        for (const line of entities.lines.values()) {
          let otherPointId: string | null = null;
          if (line.startId === draggingPointIdRef.current) {
            otherPointId = line.endId;
          } else if (line.endId === draggingPointIdRef.current) {
            otherPointId = line.startId;
          }

          if (otherPointId) {
            const otherPoint = entities.points.get(otherPointId);
            if (otherPoint) {
              // Check angle snapping relative to other point
              const angleSnap = applyAngleSnap(otherPoint.x, otherPoint.y, world.x, world.y, 3);
              if (angleSnap.snappedAngle) {
                moveX = angleSnap.x;
                moveY = angleSnap.y;
                break; // Use first angle snap found
              }
            }
          }
        }
      }

      onMovePoint(draggingPointIdRef.current, moveX, moveY);
      return;
    }

    // Calculate snap point when not dragging
    if (!isDraggingRef.current && activeTool !== 'select') {
      const snapThreshold = 15 / viewState.zoom; // 15 pixels in world units
      const snap = findSnapPoint(world.x, world.y, entities, snapThreshold);
      setSnapPoint(snap);
    } else {
      setSnapPoint(null);
    }

    // Update hover state - hit test to find entity under cursor
    if (!isDraggingRef.current && !isDraggingEntityRef.current) {
      const hitThreshold = 15 / viewState.zoom;
      const hit = hitTest(world.x, world.y, entities, hitThreshold);
      setHoveredEntityId(hit ? hit.entityId : null);
    }

    // Handle panning
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;

    onViewChange({
      ...viewState,
      panX: viewState.panX + dx,
      panY: viewState.panY - dy,
    });

    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, [viewState, onViewChange, screenToWorld, activeTool, entities, onMovePoint]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragButtonRef.current = null;
    isDraggingEntityRef.current = false;
    draggingPointIdRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCurrentMouse(null);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Attach wheel listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
      dragButtonRef.current = null;
      isDraggingEntityRef.current = false;
      draggingPointIdRef.current = null;
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Handle Escape to cancel current drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingPoints([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Determine cursor based on tool
  const getCursor = () => {
    if (activeTool === 'select') return 'default';
    return 'crosshair';
  };

  return (
    <div className="w-full h-full relative">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ cursor: getCursor() }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      />
      {/* HTML overlay for dimension labels */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {dimensionLabels.map((label) => {
          const screen = worldToScreen(label.x, label.y);
          const isEditing = editingDimension === label.id;

          if (isEditing) {
            return (
              <input
                key={label.id}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onFocus={(e) => e.target.select()} // Auto-select text for immediate typing
                onBlur={() => {
                  const num = parseFloat(editValue);
                  if (!isNaN(num) && num > 0) {
                    onUpdateConstraint(label.id, num);
                  }
                  setEditingDimension(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const num = parseFloat(editValue);
                    if (!isNaN(num) && num > 0) {
                      onUpdateConstraint(label.id, num);
                    }
                    setEditingDimension(null);
                  } else if (e.key === 'Escape') {
                    setEditingDimension(null);
                  }
                }}
                autoFocus
                className="absolute transform -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-xs font-medium text-center outline-none pointer-events-auto"
                style={{
                  left: screen.x,
                  top: screen.y,
                  backgroundColor: colors.background,
                  color: colors.fullyConstrained,
                  border: `2px solid ${colors.selected}`,
                  fontSize: '12px',
                  width: '60px',
                }}
              />
            );
          }

          const isSelected = selectedEntityId === label.id;
          const isOverConstrained = overConstrainedEntities.has(label.id);
          const labelColor = isSelected ? colors.selected : isOverConstrained ? colors.overConstrained : colors.fullyConstrained;

          return (
            <div
              key={label.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap cursor-move pointer-events-auto hover:opacity-80"
              style={{
                left: screen.x,
                top: screen.y,
                backgroundColor: colors.background,
                color: labelColor,
                border: `2px solid ${labelColor}`,
                fontSize: '12px',
              }}
              onMouseDown={(e) => {
                // Start drag on mouse down
                handleDimensionDragStart(label.id, e);
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Single click selects (only if not dragging)
                if (!draggingDimensionRef.current) {
                  onSelectEntity(label.id);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                // Double click edits
                setEditingDimension(label.id);
                setEditValue(label.value.replace('R', '').replace('⌀', '')); // Remove prefix
              }}
            >
              {label.value}
            </div>
          );
        })}
        {/* Constraint icons on hover */}
        {constraintIcons.map((icon) => (
          <div
            key={icon.constraintId}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-xs font-bold cursor-pointer pointer-events-auto transition-colors"
            style={{
              left: icon.x,
              top: icon.y,
              backgroundColor: colors.background,
              color: selectedEntityId === icon.constraintId ? colors.selected : colors.underConstrained,
              border: `1.5px solid ${selectedEntityId === icon.constraintId ? colors.selected : colors.underConstrained}`,
            }}
            title={`${icon.constraintType} (click to select, Delete to remove)`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectEntity(icon.constraintId);
            }}
          >
            {icon.label}
          </div>
        ))}
      </div>
    </div>
  );
}
