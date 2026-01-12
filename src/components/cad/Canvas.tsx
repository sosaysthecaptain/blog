'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { LIGHT_COLORS, DARK_COLORS, CADColors, ViewState } from '@/lib/cad/types';

interface CanvasProps {
  isDarkMode: boolean;
  viewState: ViewState;
  onViewChange: (view: ViewState) => void;
}

// Helper to create infinite grid
function createGrid(colors: CADColors, viewState: ViewState): THREE.Group {
  const group = new THREE.Group();

  // Calculate grid spacing based on zoom
  // We want grid lines roughly 20-100px apart on screen
  const baseSpacing = 1;
  let spacing = baseSpacing;

  // Find appropriate spacing based on zoom level
  const targetPixelSpacing = 50;
  const currentPixelSpacing = spacing * viewState.zoom;

  if (currentPixelSpacing < targetPixelSpacing / 2) {
    // Zoom out - increase spacing
    while (spacing * viewState.zoom < targetPixelSpacing / 2) {
      spacing *= 10;
    }
  } else if (currentPixelSpacing > targetPixelSpacing * 2) {
    // Zoom in - decrease spacing
    while (spacing * viewState.zoom > targetPixelSpacing * 2 && spacing > 0.001) {
      spacing /= 10;
    }
  }

  const majorSpacing = spacing * 10;

  // Calculate visible range
  const viewWidth = window.innerWidth / viewState.zoom;
  const viewHeight = window.innerHeight / viewState.zoom;
  const left = -viewState.panX / viewState.zoom - viewWidth / 2;
  const right = -viewState.panX / viewState.zoom + viewWidth / 2;
  const bottom = -viewState.panY / viewState.zoom - viewHeight / 2;
  const top = -viewState.panY / viewState.zoom + viewHeight / 2;

  // Round to grid spacing
  const startX = Math.floor(left / spacing) * spacing;
  const endX = Math.ceil(right / spacing) * spacing;
  const startY = Math.floor(bottom / spacing) * spacing;
  const endY = Math.ceil(top / spacing) * spacing;

  // Minor grid lines
  const minorMaterial = new THREE.LineBasicMaterial({ color: colors.grid });
  const majorMaterial = new THREE.LineBasicMaterial({ color: colors.gridMajor });

  // Vertical lines
  for (let x = startX; x <= endX; x += spacing) {
    const isMajor = Math.abs(x % majorSpacing) < spacing * 0.1;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, startY, 0),
      new THREE.Vector3(x, endY, 0),
    ]);
    const line = new THREE.Line(geometry, isMajor ? majorMaterial : minorMaterial);
    group.add(line);
  }

  // Horizontal lines
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
function createOrigin(colors: CADColors, viewState: ViewState): THREE.Group {
  const group = new THREE.Group();

  // Calculate visible range for extending origin lines
  const viewWidth = window.innerWidth / viewState.zoom;
  const viewHeight = window.innerHeight / viewState.zoom;
  const extent = Math.max(viewWidth, viewHeight) * 2;

  // X axis (red)
  const xMaterial = new THREE.LineBasicMaterial({ color: colors.originX, linewidth: 2 });
  const xGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-extent, 0, 0.1),
    new THREE.Vector3(extent, 0, 0.1),
  ]);
  const xLine = new THREE.Line(xGeometry, xMaterial);
  group.add(xLine);

  // Y axis (green)
  const yMaterial = new THREE.LineBasicMaterial({ color: colors.originY, linewidth: 2 });
  const yGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -extent, 0.1),
    new THREE.Vector3(0, extent, 0.1),
  ]);
  const yLine = new THREE.Line(yGeometry, yMaterial);
  group.add(yLine);

  // Origin point
  const originGeometry = new THREE.CircleGeometry(4 / viewState.zoom, 32);
  const originMaterial = new THREE.MeshBasicMaterial({ color: colors.fullyConstrained });
  const originPoint = new THREE.Mesh(originGeometry, originMaterial);
  originPoint.position.z = 0.2;
  group.add(originPoint);

  return group;
}

export default function Canvas({ isDarkMode, viewState, onViewChange }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const gridRef = useRef<THREE.Group | null>(null);
  const originRef = useRef<THREE.Group | null>(null);

  // Track dragging state
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const dragButtonRef = useRef<number | null>(null);

  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    sceneRef.current = scene;

    // Camera (orthographic for 2D)
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

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Initial render
    renderer.render(scene, camera);

    // Cleanup
    return () => {
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Update colors when dark mode changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(colors.background);
    }
  }, [colors.background]);

  // Update grid and origin when view changes
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

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
    const grid = createGrid(colors, viewState);
    const origin = createOrigin(colors, viewState);
    scene.add(grid);
    scene.add(origin);
    gridRef.current = grid;
    originRef.current = origin;

    // Update camera
    const width = containerRef.current?.clientWidth || window.innerWidth;
    const height = containerRef.current?.clientHeight || window.innerHeight;

    camera.left = -width / 2 / viewState.zoom;
    camera.right = width / 2 / viewState.zoom;
    camera.top = height / 2 / viewState.zoom;
    camera.bottom = -height / 2 / viewState.zoom;
    camera.position.x = -viewState.panX / viewState.zoom;
    camera.position.y = -viewState.panY / viewState.zoom;
    camera.updateProjectionMatrix();

    // Render
    renderer.render(scene, camera);
  }, [viewState, colors]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current || !sceneRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

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

    // Zoom toward cursor position
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = -(e.clientY - rect.top - rect.height / 2);

    // Calculate world position under cursor before zoom
    const worldX = (mouseX - viewState.panX) / viewState.zoom;
    const worldY = (mouseY - viewState.panY) / viewState.zoom;

    // Calculate new pan to keep world position under cursor
    const newPanX = mouseX - worldX * newZoom;
    const newPanY = mouseY - worldY * newZoom;

    onViewChange({
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY,
    });
  }, [viewState, onViewChange]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse or right mouse for pan
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      isDraggingRef.current = true;
      dragButtonRef.current = e.button;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;

    onViewChange({
      ...viewState,
      panX: viewState.panX + dx,
      panY: viewState.panY - dy,
    });

    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, [viewState, onViewChange]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragButtonRef.current = null;
  }, []);

  // Prevent context menu on right-click
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Attach wheel listener (needs passive: false for preventDefault)
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

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      style={{ touchAction: 'none' }}
    />
  );
}
