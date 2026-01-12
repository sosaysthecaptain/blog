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
} from '@/lib/cad/types';

interface CanvasProps {
  isDarkMode: boolean;
  viewState: ViewState;
  onViewChange: (view: ViewState) => void;
  entities: SketchEntities;
  activeTool: ToolType;
  constructionMode: boolean;
  onAddPoint: (x: number, y: number) => void;
  onAddLine: (x1: number, y1: number, x2: number, y2: number) => void;
  onAddCircle: (cx: number, cy: number, radius: number) => void;
  onAddRectangle: (x1: number, y1: number, x2: number, y2: number) => void;
  onMovePoint: (pointId: string, x: number, y: number) => void;
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string | null) => void;
}

// Render entities to Three.js scene
function renderEntities(
  scene: THREE.Scene,
  entities: SketchEntities,
  colors: CADColors,
  entityGroupRef: React.MutableRefObject<THREE.Group | null>,
  containerWidth: number,
  containerHeight: number,
  selectedEntityId: string | null
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
  const lineMaterial = new LineMaterial({
    color: new THREE.Color(colors.underConstrained).getHex(),
    linewidth: 2, // in pixels
    resolution: resolution,
  });

  const constructionLineMaterial = new LineMaterial({
    color: new THREE.Color(colors.construction).getHex(),
    linewidth: 1,
    resolution: resolution,
    dashed: true,
    dashSize: 4,
    gapSize: 2,
  });

  const pointMaterial = new THREE.MeshBasicMaterial({ color: colors.underConstrained });
  const selectedPointMaterial = new THREE.MeshBasicMaterial({ color: colors.selected });

  const selectedLineMaterial = new LineMaterial({
    color: new THREE.Color(colors.selected).getHex(),
    linewidth: 3, // thicker when selected
    resolution: resolution,
  });

  // Render points
  for (const point of entities.points.values()) {
    const isSelected = selectedEntityId === point.id;
    const geometry = new THREE.CircleGeometry(isSelected ? 6 : 4, 16);
    let material;
    if (isSelected) {
      material = selectedPointMaterial;
    } else if (point.construction) {
      material = new THREE.MeshBasicMaterial({ color: colors.construction });
    } else {
      material = pointMaterial;
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(point.x, point.y, isSelected ? 0.6 : 0.5);
    group.add(mesh);
  }

  // Render lines using Line2 for thickness
  for (const line of entities.lines.values()) {
    const startPoint = entities.points.get(line.startId);
    const endPoint = entities.points.get(line.endId);
    if (!startPoint || !endPoint) continue;

    const isSelected = selectedEntityId === line.id;
    const geometry = new LineGeometry();
    geometry.setPositions([
      startPoint.x, startPoint.y, isSelected ? 0.35 : 0.3,
      endPoint.x, endPoint.y, isSelected ? 0.35 : 0.3,
    ]);

    let material;
    if (isSelected) {
      material = selectedLineMaterial.clone();
    } else if (line.construction) {
      material = constructionLineMaterial.clone();
    } else {
      material = lineMaterial.clone();
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
    const segments = 64;
    const positions: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions.push(
        centerPoint.x + Math.cos(theta) * circle.radius,
        centerPoint.y + Math.sin(theta) * circle.radius,
        isSelected ? 0.35 : 0.3
      );
    }

    const geometry = new LineGeometry();
    geometry.setPositions(positions);

    let material;
    if (isSelected) {
      material = selectedLineMaterial.clone();
    } else if (circle.construction) {
      material = constructionLineMaterial.clone();
    } else {
      material = lineMaterial.clone();
    }
    const circleObj = new Line2(geometry, material);
    circleObj.computeLineDistances();
    group.add(circleObj);
  }

  scene.add(group);
  entityGroupRef.current = group;
}

// Snap point detection
interface SnapResult {
  x: number;
  y: number;
  type: 'origin' | 'point' | 'endpoint' | 'midpoint' | 'nearest-on-line' | 'center';
  entityId?: string;
}

function findSnapPoint(
  worldX: number,
  worldY: number,
  entities: SketchEntities,
  snapThreshold: number // in world units
): SnapResult | null {
  let bestSnap: SnapResult | null = null;
  let bestDistance = snapThreshold;

  // Check origin
  const originDist = Math.sqrt(worldX * worldX + worldY * worldY);
  if (originDist < bestDistance) {
    bestDistance = originDist;
    bestSnap = { x: 0, y: 0, type: 'origin' };
  }

  // Check points (including line endpoints and circle centers)
  for (const point of entities.points.values()) {
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
      bestSnap = { x: midX, y: midY, type: 'midpoint', entityId: line.id };
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
      // Only snap to line if not already snapping to a point
      if (nearestDist < bestDistance && nearestDist < snapThreshold * 0.7) {
        bestDistance = nearestDist;
        bestSnap = { x: nearestX, y: nearestY, type: 'nearest-on-line', entityId: line.id };
      }
    }
  }

  // Check circle centers (already covered by points, but mark as center type)
  for (const circle of entities.circles.values()) {
    const centerPoint = entities.points.get(circle.centerId);
    if (!centerPoint) continue;

    const dist = Math.sqrt(
      Math.pow(worldX - centerPoint.x, 2) + Math.pow(worldY - centerPoint.y, 2)
    );
    if (dist < bestDistance) {
      bestDistance = dist;
      bestSnap = { x: centerPoint.x, y: centerPoint.y, type: 'center', entityId: circle.id };
    }
  }

  return bestSnap;
}

// Hit test to find entity at a position
interface HitTestResult {
  entityType: 'point' | 'line' | 'circle';
  entityId: string;
  pointId?: string; // For lines/circles, which point was hit (for dragging)
}

function hitTest(
  worldX: number,
  worldY: number,
  entities: SketchEntities,
  hitThreshold: number
): HitTestResult | null {
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

// Render preview geometry (while drawing)
function renderPreview(
  scene: THREE.Scene,
  previewGroupRef: React.MutableRefObject<THREE.Group | null>,
  activeTool: ToolType,
  pendingPoints: Array<{ x: number; y: number }>,
  currentMouse: { x: number; y: number } | null,
  colors: CADColors
) {
  // Remove old preview
  if (previewGroupRef.current) {
    scene.remove(previewGroupRef.current);
    previewGroupRef.current.traverse((obj) => {
      if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }

  if (!currentMouse || pendingPoints.length === 0) return;

  const group = new THREE.Group();
  const previewMaterial = new THREE.LineDashedMaterial({
    color: colors.underConstrained,
    dashSize: 5,
    gapSize: 3,
    opacity: 0.7,
    transparent: true,
  });

  if (activeTool === 'line' && pendingPoints.length === 1) {
    // Preview line from first point to cursor
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(pendingPoints[0].x, pendingPoints[0].y, 0.4),
      new THREE.Vector3(currentMouse.x, currentMouse.y, 0.4),
    ]);
    const line = new THREE.Line(geometry, previewMaterial);
    line.computeLineDistances();
    group.add(line);
  }

  if (activeTool === 'circle' && pendingPoints.length === 1) {
    // Preview circle from center to cursor
    const radius = Math.sqrt(
      Math.pow(currentMouse.x - pendingPoints[0].x, 2) +
      Math.pow(currentMouse.y - pendingPoints[0].y, 2)
    );
    const geometry = new THREE.BufferGeometry();
    const segments = 64;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          pendingPoints[0].x + Math.cos(theta) * radius,
          pendingPoints[0].y + Math.sin(theta) * radius,
          0.4
        )
      );
    }
    geometry.setFromPoints(points);
    const circle = new THREE.Line(geometry, previewMaterial);
    circle.computeLineDistances();
    group.add(circle);
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

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y1, 0.4),
      new THREE.Vector3(x2, y1, 0.4),
      new THREE.Vector3(x2, y2, 0.4),
      new THREE.Vector3(x1, y2, 0.4),
      new THREE.Vector3(x1, y1, 0.4),
    ]);
    const rect = new THREE.Line(geometry, previewMaterial);
    rect.computeLineDistances();
    group.add(rect);
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
  activeTool,
  constructionMode,
  onAddPoint,
  onAddLine,
  onAddCircle,
  onAddRectangle,
  onMovePoint,
  selectedEntityId,
  onSelectEntity,
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

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pendingPoints, setPendingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [currentMouse, setCurrentMouse] = useState<{ x: number; y: number } | null>(null);
  const [snapPoint, setSnapPoint] = useState<SnapResult | null>(null);

  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const dragButtonRef = useRef<number | null>(null);

  // Drag state for moving entities
  const isDraggingEntityRef = useRef(false);
  const draggingPointIdRef = useRef<string | null>(null);

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
    renderEntities(scene, entities, colors, entityGroupRef, containerSize.width, containerSize.height, selectedEntityId);

    // Use snapped position for preview if available
    const previewMouse = snapPoint ? { x: snapPoint.x, y: snapPoint.y } : currentMouse;

    // Render preview
    renderPreview(scene, previewGroupRef, activeTool, pendingPoints, previewMouse, colors);

    // Render snap indicator
    renderSnapIndicator(scene, snapIndicatorRef, snapPoint, colors, viewState.zoom);

    // Update camera
    camera.left = -containerSize.width / 2 / viewState.zoom;
    camera.right = containerSize.width / 2 / viewState.zoom;
    camera.top = containerSize.height / 2 / viewState.zoom;
    camera.bottom = -containerSize.height / 2 / viewState.zoom;
    camera.position.x = -viewState.panX / viewState.zoom;
    camera.position.y = -viewState.panY / viewState.zoom;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  }, [viewState, colors, containerSize, entities, pendingPoints, currentMouse, activeTool, snapPoint, selectedEntityId]);

  // Clear pending points when tool changes
  useEffect(() => {
    setPendingPoints([]);
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

    const world = screenToWorld(e.clientX, e.clientY);

    // Use snapped coordinates if available
    const clickX = snapPoint ? snapPoint.x : world.x;
    const clickY = snapPoint ? snapPoint.y : world.y;

    switch (activeTool) {
      case 'select': {
        // Hit test to find entity
        const hitThreshold = 10 / viewState.zoom;
        const hit = hitTest(world.x, world.y, entities, hitThreshold);
        if (hit) {
          onSelectEntity(hit.entityId);
        } else {
          onSelectEntity(null);
        }
        break;
      }

      case 'point':
        onAddPoint(clickX, clickY);
        break;

      case 'line':
        if (pendingPoints.length === 0) {
          setPendingPoints([{ x: clickX, y: clickY }]);
        } else {
          onAddLine(pendingPoints[0].x, pendingPoints[0].y, clickX, clickY);
          setPendingPoints([]);
        }
        break;

      case 'circle':
        if (pendingPoints.length === 0) {
          setPendingPoints([{ x: clickX, y: clickY }]);
        } else {
          const radius = Math.sqrt(
            Math.pow(clickX - pendingPoints[0].x, 2) +
            Math.pow(clickY - pendingPoints[0].y, 2)
          );
          onAddCircle(pendingPoints[0].x, pendingPoints[0].y, radius);
          setPendingPoints([]);
        }
        break;

      case 'rectangle-corner':
        if (pendingPoints.length === 0) {
          setPendingPoints([{ x: clickX, y: clickY }]);
        } else {
          onAddRectangle(pendingPoints[0].x, pendingPoints[0].y, clickX, clickY);
          setPendingPoints([]);
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
        }
        break;
    }
  }, [activeTool, pendingPoints, screenToWorld, snapPoint, viewState.zoom, entities, onAddPoint, onAddLine, onAddCircle, onAddRectangle, onSelectEntity]);

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
      const hitThreshold = 10 / viewState.zoom;
      const hit = hitTest(world.x, world.y, entities, hitThreshold);

      // If we hit a point, start dragging it
      if (hit && hit.entityType === 'point') {
        isDraggingEntityRef.current = true;
        draggingPointIdRef.current = hit.entityId;
        onSelectEntity(hit.entityId);
        e.preventDefault();
      }
    }
  }, [activeTool, screenToWorld, viewState.zoom, entities, onSelectEntity]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Update current mouse position for preview
    const world = screenToWorld(e.clientX, e.clientY);
    setCurrentMouse(world);

    // Handle entity dragging
    if (isDraggingEntityRef.current && draggingPointIdRef.current) {
      // Use snap while dragging
      const snapThreshold = 15 / viewState.zoom;
      const snap = findSnapPoint(world.x, world.y, entities, snapThreshold);
      setSnapPoint(snap);

      const moveX = snap ? snap.x : world.x;
      const moveY = snap ? snap.y : world.y;
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
  );
}
