'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Units } from '@/lib/units';
import { WALL_THICKNESS_FT } from '@/lib/constants';
import { cornerWorld, distanceFt, scaleAbout, BLUEPRINT_CORNERS } from '@/lib/blueprint';
import { FloatingToolbar } from './FloatingToolbar';
import type { TableItem, HallElement, StudioSelectedItem, BlueprintPlacement } from '@/types';

interface StudioCanvasProps {
  hallWidth: number;
  hallHeight: number;
  tables: TableItem[];
  elements: HallElement[];
  selectedItem: StudioSelectedItem | null;
  snapGrid: number;
  onSelectItem: (type: 'table' | 'element', obj: TableItem | HallElement) => void;
  onDeselect: () => void;
  onUpdatePosition: (type: 'table' | 'element', obj: TableItem | HallElement, x: number, y: number) => void;
  onRotateSelected: () => void;
  onFlipSelected: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  eventName: string;
  zoomLevel: number;
  viewBox: { x: number; y: number; w: number; h: number };
  onUpdateViewBox: (vb: { x: number; y: number; w: number; h: number }) => void;
  blueprintUrl: string | null;
  blueprint: BlueprintPlacement;
  /** Panel is open and the blueprint is draggable — show handles. */
  blueprintActive: boolean;
  onUpdateBlueprint: (patch: Partial<BlueprintPlacement>) => void;
  isCalibrating: boolean;
  onCalibrate: (from: { x: number; y: number }, to: { x: number; y: number }, realFt: number) => void;
  onCancelCalibration: () => void;
}

type BlueprintDrag =
  | { mode: 'move'; start: BlueprintPlacement; grabX: number; grabY: number }
  | { mode: 'scale'; start: BlueprintPlacement; anchor: { x: number; y: number }; startDist: number };

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  hallWidth,
  hallHeight,
  tables,
  elements,
  selectedItem,
  snapGrid,
  onSelectItem,
  onDeselect,
  onUpdatePosition,
  onRotateSelected,
  onFlipSelected,
  onDuplicateSelected,
  onDeleteSelected,
  eventName,
  viewBox,
  onUpdateViewBox,
  blueprintUrl,
  blueprint,
  blueprintActive,
  onUpdateBlueprint,
  isCalibrating,
  onCalibrate,
  onCancelCalibration,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dragging & Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [floatingPos, setFloatingPos] = useState<{ left: number; top: number } | null>(null);

  // Blueprint underlay interaction
  const [blueprintDrag, setBlueprintDrag] = useState<BlueprintDrag | null>(null);
  const [calibrationFrom, setCalibrationFrom] = useState<{ x: number; y: number } | null>(null);
  const [calibrationTo, setCalibrationTo] = useState<{ x: number; y: number } | null>(null);
  const [calibrationHover, setCalibrationHover] = useState<{ x: number; y: number } | null>(null);
  const [realDistanceDraft, setRealDistanceDraft] = useState('');
  const [calibrationInputPos, setCalibrationInputPos] = useState<{ left: number; top: number } | null>(null);
  const calibrationInputRef = useRef<HTMLInputElement | null>(null);

  const showBlueprint = Boolean(blueprintUrl) && blueprint.visible;
  const canGrabBlueprint = showBlueprint && blueprintActive && !blueprint.locked && !isCalibrating;

  // Feet to SVG pixels
  const px = (ft: number) => Units.ftToPx(ft);

  // SVG coordinate transformation
  const getSvgPointFt = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgRef.current.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(ctm);
    return { x: Units.pxToFt(transformed.x), y: Units.pxToFt(transformed.y) };
  }, []);

  // Update floating actions position
  const updateFloatingPos = useCallback(() => {
    if (!selectedItem || !svgRef.current || !containerRef.current) {
      setFloatingPos(null);
      return;
    }

    try {
      const obj = selectedItem.obj;
      const w = obj.width || 4;
      const cx = px(obj.x + w / 2);
      const topY = px(obj.y) - 15;

      const pt = svgRef.current.createSVGPoint();
      pt.x = cx;
      pt.y = topY;

      const screenPt = pt.matrixTransform(svgRef.current.getScreenCTM());
      const rect = containerRef.current.getBoundingClientRect();

      setFloatingPos({
        left: screenPt.x - rect.left,
        top: screenPt.y - rect.top,
      });
    } catch (e) {
      setFloatingPos(null);
    }
  }, [selectedItem]);

  useEffect(() => {
    updateFloatingPos();
  }, [selectedItem, viewBox, tables, elements, updateFloatingPos]);

  // Leaving calibration mode clears whatever was half-measured
  useEffect(() => {
    if (!isCalibrating) {
      setCalibrationFrom(null);
      setCalibrationTo(null);
      setCalibrationHover(null);
      setRealDistanceDraft('');
    }
  }, [isCalibrating]);

  // Focus the distance box the moment the second point lands
  useEffect(() => {
    if (calibrationTo) {
      const id = window.setTimeout(() => calibrationInputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [calibrationTo]);

  // Anchor the distance box to the midpoint of the measurement, and keep it
  // there while the canvas is zoomed or panned.
  useEffect(() => {
    if (!calibrationFrom || !calibrationTo || !svgRef.current || !containerRef.current) {
      setCalibrationInputPos(null);
      return;
    }

    try {
      const pt = svgRef.current.createSVGPoint();
      pt.x = Units.ftToPx((calibrationFrom.x + calibrationTo.x) / 2);
      pt.y = Units.ftToPx((calibrationFrom.y + calibrationTo.y) / 2);

      const screenPt = pt.matrixTransform(svgRef.current.getScreenCTM()!);
      const rect = containerRef.current.getBoundingClientRect();

      setCalibrationInputPos({ left: screenPt.x - rect.left, top: screenPt.y - rect.top });
    } catch (e) {
      setCalibrationInputPos(null);
    }
  }, [calibrationFrom, calibrationTo, viewBox]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;

      // Escape always backs out of calibration, even from the distance box
      if (e.key === 'Escape' && isCalibrating) {
        e.preventDefault();
        onCancelCalibration();
        return;
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (isCalibrating) return;

      if (e.key === 'r' || e.key === 'R') {
        onRotateSelected();
      } else if (e.key === 'f' || e.key === 'F') {
        onFlipSelected();
      } else if (e.key === 'd' || e.key === 'D') {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onDuplicateSelected();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'x' || e.key === 'X') {
        onDeleteSelected();
      } else if (e.key === 'Escape') {
        onDeselect();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRotateSelected, onFlipSelected, onDuplicateSelected, onDeleteSelected, onDeselect, isCalibrating, onCancelCalibration]);

  // Submit a completed calibration measurement
  const commitCalibration = () => {
    if (!calibrationFrom || !calibrationTo) return;
    const feet = parseFloat(realDistanceDraft);
    if (!isFinite(feet) || feet <= 0) return;
    onCalibrate(calibrationFrom, calibrationTo, feet);
  };

  // Mouse Down handler
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    const target = e.target as HTMLElement | SVGElement;

    // If clicking a button or floating toolbar, do not deselect or pan
    if (target.closest('button') || target.closest('[data-floating-toolbar]')) {
      return;
    }

    // Calibration mode swallows canvas clicks: first click sets the start of
    // the measurement, second sets the end. Nothing else is selectable.
    if (isCalibrating) {
      if (target.closest('[data-calibration-input]')) return;
      e.preventDefault();
      e.stopPropagation();

      const pt = getSvgPointFt(e.clientX, e.clientY);
      if (!calibrationFrom || calibrationTo) {
        setCalibrationFrom({ x: Units.roundFt(pt.x), y: Units.roundFt(pt.y) });
        setCalibrationTo(null);
        setRealDistanceDraft('');
      } else {
        setCalibrationTo({ x: Units.roundFt(pt.x), y: Units.roundFt(pt.y) });
      }
      return;
    }

    // Blueprint underlay: only grabbable while its panel is open, so panning
    // over the floor keeps working the rest of the time.
    if (canGrabBlueprint) {
      const handle = target.closest('[data-blueprint-handle]') as SVGElement | null;
      if (handle) {
        const index = parseInt(handle.getAttribute('data-blueprint-handle') || '0', 10);
        const corner = BLUEPRINT_CORNERS[index];
        // Pin the opposite corner and scale away from it.
        const anchor = cornerWorld(blueprint, (1 - corner.ix) as 0 | 1, (1 - corner.iy) as 0 | 1);
        const pt = getSvgPointFt(e.clientX, e.clientY);
        const startDist = Math.hypot(pt.x - anchor.x, pt.y - anchor.y);

        if (startDist > 0.01) {
          setBlueprintDrag({ mode: 'scale', start: blueprint, anchor, startDist });
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (target.closest('[data-blueprint-body]')) {
        const pt = getSvgPointFt(e.clientX, e.clientY);
        setBlueprintDrag({ mode: 'move', start: blueprint, grabX: pt.x - blueprint.x, grabY: pt.y - blueprint.y });
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // Check if clicked a table
    const tableGroup = target.closest('[data-table-id]') as SVGElement | null;
    if (tableGroup) {
      const id = tableGroup.getAttribute('data-table-id');
      const table = tables.find((t) => String(t.id || t._tempId) === String(id));
      if (table) {
        onSelectItem('table', table);
        if (table.status !== 'booked') {
          setIsDragging(true);
          const pt = getSvgPointFt(e.clientX, e.clientY);
          setDragOffset({ x: pt.x - table.x, y: pt.y - table.y });
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // Check if clicked an architectural element
    const elemGroup = target.closest('[data-element-id]') as SVGElement | null;
    if (elemGroup) {
      const id = elemGroup.getAttribute('data-element-id');
      const elem = elements.find((el) => String(el.id || el._tempId) === String(id));
      if (elem) {
        onSelectItem('element', elem);
        setIsDragging(true);
        const pt = getSvgPointFt(e.clientX, e.clientY);
        setDragOffset({ x: pt.x - elem.x, y: pt.y - elem.y });
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // Clicked empty canvas -> Deselect and Pan
    onDeselect();
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  // Mouse Move handler
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isCalibrating) {
      const pt = getSvgPointFt(e.clientX, e.clientY);
      setCalibrationHover({ x: pt.x, y: pt.y });
      return;
    }

    if (blueprintDrag) {
      const pt = getSvgPointFt(e.clientX, e.clientY);

      if (blueprintDrag.mode === 'move') {
        let nextX = pt.x - blueprintDrag.grabX;
        let nextY = pt.y - blueprintDrag.grabY;

        if (snapGrid > 0) {
          nextX = Math.round(nextX / snapGrid) * snapGrid;
          nextY = Math.round(nextY / snapGrid) * snapGrid;
        }

        onUpdateBlueprint({ x: Units.roundFt(nextX), y: Units.roundFt(nextY) });
      } else {
        const dist = Math.hypot(pt.x - blueprintDrag.anchor.x, pt.y - blueprintDrag.anchor.y);
        const factor = dist / blueprintDrag.startDist;
        // Always scale from the placement captured at grab time, so the drag
        // does not compound frame over frame.
        const next = scaleAbout(blueprintDrag.start, factor, blueprintDrag.anchor.x, blueprintDrag.anchor.y);
        onUpdateBlueprint({ x: next.x, y: next.y, width: next.width, height: next.height });
      }
      return;
    }

    if (isDragging && selectedItem) {
      const pt = getSvgPointFt(e.clientX, e.clientY);
      let rawX = pt.x - dragOffset.x;
      let rawY = pt.y - dragOffset.y;

      // Apply Snap Grid
      if (snapGrid > 0) {
        rawX = Math.round(rawX / snapGrid) * snapGrid;
        rawY = Math.round(rawY / snapGrid) * snapGrid;
      }

      onUpdatePosition(selectedItem.type, selectedItem.obj, Units.roundFt(rawX), Units.roundFt(rawY));
      return;
    }

    if (isPanning && containerRef.current) {
      const dx = (e.clientX - panStart.x) * (viewBox.w / containerRef.current.clientWidth);
      const dy = (e.clientY - panStart.y) * (viewBox.h / containerRef.current.clientHeight);
      onUpdateViewBox({
        x: viewBox.x - dx,
        y: viewBox.y - dy,
        w: viewBox.w,
        h: viewBox.h,
      });
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Mouse Up handler
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
    setBlueprintDrag(null);
  };

  // Wheel Zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
    const mouseY = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;

    const newW = viewBox.w * factor;
    const newH = viewBox.h * factor;

    onUpdateViewBox({
      x: mouseX - ((mouseX - viewBox.x) * newW) / viewBox.w,
      y: mouseY - ((mouseY - viewBox.y) * newH) / viewBox.h,
      w: newW,
      h: newH,
    });
  };

  const wPx = px(hallWidth);
  const hPx = px(hallHeight);
  const wallThick = px(WALL_THICKNESS_FT);
  const minor = px(1);
  const major = px(5);

  // Keeps handles and guide strokes roughly the same size on screen at any
  // zoom level, since zooming is done by resizing the viewBox.
  const ui = viewBox.w / 1200;

  const selectedId = selectedItem ? String(selectedItem.obj.id || selectedItem.obj._tempId) : null;

  // Blueprint geometry in drawing units
  const bpX = px(blueprint.x);
  const bpY = px(blueprint.y);
  const bpW = px(blueprint.width);
  const bpH = px(blueprint.height);
  const bpTransform = blueprint.rotation
    ? `rotate(${blueprint.rotation}, ${px(blueprint.x + blueprint.width / 2)}, ${px(blueprint.y + blueprint.height / 2)})`
    : undefined;

  const calibrationEnd = calibrationTo || calibrationHover;
  const measuredFt = calibrationFrom && calibrationEnd ? distanceFt(calibrationFrom, calibrationEnd) : 0;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="flex-1 h-full relative overflow-hidden bg-zinc-100 cursor-crosshair select-none"
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full block"
      >
        <defs>
          {/* Architectural Drawing Grid Pattern */}
          <pattern id="canvas-bg-grid" width={major} height={major} patternUnits="userSpaceOnUse">
            <rect width={major} height={major} fill="#fafafa" />
            <path
              d={`M ${minor} 0 L 0 0 0 ${minor} M ${minor * 2} 0 L 0 0 0 ${minor * 2} M ${minor * 3} 0 L 0 0 0 ${minor * 3} M ${minor * 4} 0 L 0 0 0 ${minor * 4}`}
              fill="none"
              stroke="#f0f0f1"
              strokeWidth="0.8"
            />
            <path d={`M ${major} 0 L 0 0 0 ${major}`} fill="none" stroke="#e4e4e7" strokeWidth="1" />
          </pattern>

          {/* Minimalist Warm Wood Parquet Texture */}
          <pattern id="wood-floor-texture" width={px(16)} height={px(4)} patternUnits="userSpaceOnUse">
            <rect width={px(16)} height={px(4)} fill="#ebe4d8" />
            <line x1="0" y1={px(2)} x2={px(16)} y2={px(2)} stroke="#dfd6c7" strokeWidth="1" />
            <line x1="0" y1={px(4)} x2={px(16)} y2={px(4)} stroke="#dfd6c7" strokeWidth="1" />
            <line x1={px(8)} y1="0" x2={px(8)} y2={px(2)} stroke="#dfd6c7" strokeWidth="0.8" />
            <line x1={px(16)} y1={px(2)} x2={px(16)} y2={px(4)} stroke="#dfd6c7" strokeWidth="0.8" />
            <line x1="0" y1={px(2)} x2="0" y2={px(4)} stroke="#dfd6c7" strokeWidth="0.8" />
          </pattern>

          {/* Minimalist Available Table Texture */}
          <pattern id="honey-oak-table" width={px(4)} height={px(2)} patternUnits="userSpaceOnUse">
            <rect width={px(4)} height={px(2)} fill="#d49b5c" />
            <line x1="0" y1={px(1)} x2={px(4)} y2={px(1)} stroke="#be8645" strokeWidth="0.8" strokeDasharray="8 2" />
          </pattern>

          {/* Booked Table Charcoal-Crimson Texture */}
          <pattern id="table-booked" width={px(4)} height={px(2)} patternUnits="userSpaceOnUse">
            <rect width={px(4)} height={px(2)} fill="#e11d48" />
            <line x1="0" y1={px(1)} x2={px(4)} y2={px(1)} stroke="#be123c" strokeWidth="0.8" strokeDasharray="8 2" />
          </pattern>
        </defs>

        {/* Expansive Canvas Background Grid */}
        <rect x={-px(120)} y={-px(120)} width={wPx + px(240)} height={hPx + px(240)} fill="url(#canvas-bg-grid)" />

        {/* Main Hall Outer Perimeter Wall */}
        <rect
          x={-wallThick}
          y={-wallThick}
          width={wPx + wallThick * 2}
          height={hPx + wallThick * 2}
          fill="#3f3f46"
          stroke="#18181b"
          strokeWidth="1.5"
          rx="2"
        />

        {/* Main Hall Parquet Interior */}
        <rect x="0" y="0" width={wPx} height={hPx} fill="url(#wood-floor-texture)" stroke="#18181b" strokeWidth="1.5" />

        {/* 0. Blueprint Underlay — sits on the floor, beneath everything drawn */}
        {showBlueprint && blueprintUrl && (
          <g id="blueprint-layer" transform={bpTransform}>
            <image
              href={blueprintUrl}
              x={bpX}
              y={bpY}
              width={bpW}
              height={bpH}
              opacity={blueprint.opacity}
              preserveAspectRatio="none"
              pointerEvents="none"
            />
            {canGrabBlueprint && (
              <rect
                data-blueprint-body=""
                x={bpX}
                y={bpY}
                width={bpW}
                height={bpH}
                fill="transparent"
                pointerEvents="all"
                style={{ cursor: 'move' }}
              />
            )}
          </g>
        )}

        {/* 1. Structures & Secondary Halls Layer */}
        <g id="structures-layer">
          {elements.map((elem) => {
            const elemId = String(elem.id || elem._tempId);
            const isSelected = selectedId === elemId;
            const x = px(elem.x);
            const y = px(elem.y);
            const w = px(elem.width || 4);
            const h = px(elem.height || 2);
            const cx = px(elem.x + (elem.width || 4) / 2);
            const cy = px(elem.y + (elem.height || 2) / 2);

            // Secondary Hall Room
            if (elem.type === 'hall_room') {
              return (
                <g
                  key={elemId}
                  data-element-id={elemId}
                  transform={elem.rotation ? `rotate(${elem.rotation}, ${cx}, ${cy})` : undefined}
                  className="cursor-grab active:cursor-grabbing"
                >
                  {/* Floor */}
                  <rect x={x} y={y} width={w} height={h} fill="url(#wood-floor-texture)" stroke="#18181b" strokeWidth="1.5" />
                  {/* Outer Wall */}
                  <rect
                    x={x - wallThick}
                    y={y - wallThick}
                    width={w + wallThick * 2}
                    height={h + wallThick * 2}
                    fill="none"
                    stroke="#18181b"
                    strokeWidth={wallThick}
                    rx="2"
                  />
                  {/* Hitbox */}
                  <rect x={x} y={y} width={w} height={h} fill="transparent" pointerEvents="all" />
                  {/* Selection Outline */}
                  {isSelected && (
                    <rect
                      x={x - 6}
                      y={y - 6}
                      width={w + 12}
                      height={h + 12}
                      fill="none"
                      stroke="#18181b"
                      strokeWidth="2"
                      strokeDasharray="5 4"
                      rx="6"
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            }

            // Square Pillar
            if (elem.type === 'pillar_square') {
              return (
                <g key={elemId} data-element-id={elemId} className="cursor-grab active:cursor-grabbing">
                  <rect x={x} y={y} width={w} height={h} fill="#3f3f46" stroke="#18181b" strokeWidth="1.5" rx="2" />
                  {isSelected && (
                    <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="none" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 3" rx="4" />
                  )}
                </g>
              );
            }

            // Round Column
            if (elem.type === 'pillar_round') {
              const r = w / 2;
              return (
                <g key={elemId} data-element-id={elemId} className="cursor-grab active:cursor-grabbing">
                  <circle cx={x + r} cy={y + r} r={r} fill="#3f3f46" stroke="#18181b" strokeWidth="1.5" />
                  {isSelected && (
                    <circle cx={x + r} cy={y + r} r={r + 4} fill="none" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 3" />
                  )}
                </g>
              );
            }

            // Stage
            if (elem.type === 'stage') {
              return (
                <g key={elemId} data-element-id={elemId} className="cursor-grab active:cursor-grabbing">
                  <rect x={x} y={y} width={w} height={h} fill="#27272a" stroke="#09090b" strokeWidth="2" rx="4" />
                  <text x={x + w / 2} y={y + h / 2 + 4} fill="#fafafa" fontSize="11" fontWeight="700" textAnchor="middle" pointerEvents="none">
                    {elem.label || 'MAIN STAGE'}
                  </text>
                  {isSelected && (
                    <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="none" stroke="#18181b" strokeWidth="2" strokeDasharray="4 4" rx="6" />
                  )}
                </g>
              );
            }

            // Flow Arrow
            if (elem.type === 'arrow') {
              return (
                <g key={elemId} data-element-id={elemId} transform={elem.rotation ? `rotate(${elem.rotation}, ${cx}, ${cy})` : undefined} className="cursor-grab active:cursor-grabbing">
                  <path d={`M ${x} ${y + h / 2} L ${x + w - 10} ${y + h / 2} M ${x + w - 15} ${y} L ${x + w} ${y + h / 2} L ${x + w - 15} ${y + h}`} fill="none" stroke="#52525b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x={x} y={y} width={w} height={h} fill="transparent" pointerEvents="all" />
                  {isSelected && (
                    <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="none" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 3" rx="4" />
                  )}
                </g>
              );
            }

            return null;
          })}
        </g>

        {/* 2. Tables / Stalls Layer */}
        <g id="tables-layer">
          {tables.map((t) => {
            const tableId = String(t.id || t._tempId);
            const isSelected = selectedId === tableId;
            const x = px(t.x);
            const y = px(t.y);
            const w = px(t.width);
            const h = px(t.height);
            const cx = px(t.x + t.width / 2);
            const cy = px(t.y + t.height / 2);
            const isBooked = t.status === 'booked';
            const shape = t.shape || 'rect';

            return (
              <g
                key={tableId}
                data-table-id={tableId}
                transform={t.rotation ? `rotate(${t.rotation}, ${cx}, ${cy})` : undefined}
                className="cursor-grab active:cursor-grabbing"
              >
                {/* Rectangular or Custom Stall Shape */}
                {shape === 'L-Stall' ? (
                  <path
                    d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + px(2)} L ${x + px(2)} ${y + px(2)} L ${x + px(2)} ${y + h} L ${x} ${y + h} Z`}
                    fill={isBooked ? 'url(#table-booked)' : 'url(#honey-oak-table)'}
                    stroke="#18181b"
                    strokeWidth="1.2"
                  />
                ) : shape === 'L-Stall-Inverted' || shape === 'L-Inverted' ? (
                  <path
                    d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x + w - px(2)} ${y + h} L ${x + w - px(2)} ${y + px(2)} L ${x} ${y + px(2)} Z`}
                    fill={isBooked ? 'url(#table-booked)' : 'url(#honey-oak-table)'}
                    stroke="#18181b"
                    strokeWidth="1.2"
                  />
                ) : shape === 'T-Stall' ? (
                  <path
                    d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + px(2)} L ${x + w / 2 + px(1)} ${y + px(2)} L ${x + w / 2 + px(1)} ${y + h} L ${x + w / 2 - px(1)} ${y + h} L ${x + w / 2 - px(1)} ${y + px(2)} L ${x} ${y + px(2)} Z`}
                    fill={isBooked ? 'url(#table-booked)' : 'url(#honey-oak-table)'}
                    stroke="#18181b"
                    strokeWidth="1.2"
                  />
                ) : (
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={isBooked ? 'url(#table-booked)' : 'url(#honey-oak-table)'}
                    stroke="#18181b"
                    strokeWidth="1.2"
                    rx="2"
                  />
                )}

                {/* Clean Upright Typography: Stall Number & Dimension Subtitle (NO white box) */}
                <g transform={t.rotation ? `rotate(${-t.rotation}, ${cx}, ${cy})` : undefined} pointerEvents="none">
                  {/* Bold Stall Number */}
                  <text
                    x={cx}
                    y={isBooked ? cy - 2 : cy - 3}
                    fill={isBooked ? '#ffffff' : '#1e293b'}
                    fontSize="11"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {t.table_number}
                  </text>
                  {/* Subtle Dimensions / Status Subtitle */}
                  <text
                    x={cx}
                    y={isBooked ? cy + 7 : cy + 7.5}
                    fill={isBooked ? '#ffffff' : '#475569'}
                    fontSize={isBooked ? '7' : '7.5'}
                    fontWeight="700"
                    letterSpacing={isBooked ? '0.04em' : 'normal'}
                    textAnchor="middle"
                  >
                    {isBooked ? 'RESERVED' : `${Units.formatFeetShort(t.width)} × ${Units.formatFeetShort(t.height)}`}
                  </text>
                </g>

                {/* Selection Outline */}
                {isSelected && (
                  <rect
                    x={x - 3.5}
                    y={y - 3.5}
                    width={w + 7}
                    height={h + 7}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    rx="4"
                    filter="drop-shadow(0 0 4px rgba(37,99,235,0.4))"
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* 3. Doors & Signs Layer */}
        <g id="doors-signs-layer">
          {elements.map((elem) => {
            const elemId = String(elem.id || elem._tempId);
            const isSelected = selectedId === elemId;
            const x = px(elem.x);
            const y = px(elem.y);
            const w = px(elem.width || 4);
            const h = px(elem.height || 2);
            const cx = px(elem.x + (elem.width || 4) / 2);
            const cy = px(elem.y + (elem.height || 2) / 2);

            // Authentic Architectural Door / Entrance / Window
            if (elem.type === 'door') {
              const isEntrance = elem.doorType === 'entrance' || !elem.doorType;
              const isExit = elem.doorType === 'exit';
              const isDouble = elem.doorType === 'double';
              const isWindow = elem.doorType === 'window';
              const doorColor = isEntrance ? '#16a34a' : isExit ? '#dc2626' : '#52525b';
              const labelText = isEntrance ? 'ENTRANCE' : isExit ? 'EXIT' : isDouble ? 'DOUBLE DOOR' : 'WINDOW';

              return (
                <g
                  key={elemId}
                  data-element-id={elemId}
                  transform={elem.rotation ? `rotate(${elem.rotation}, ${cx}, ${cy})` : undefined}
                  className="cursor-grab active:cursor-grabbing select-none"
                >
                  {isWindow ? (
                    /* Architectural Window */
                    <g>
                      {/* Window Opening Glass */}
                      <rect x={x} y={y} width={w} height={h} fill="#f0f9ff" stroke="#38bdf8" strokeWidth="1" />
                      {/* Glass Panes */}
                      <line x1={x} y1={y + h * 0.35} x2={x + w} y2={y + h * 0.35} stroke="#0284c7" strokeWidth="0.8" />
                      <line x1={x} y1={y + h * 0.65} x2={x + w} y2={y + h * 0.65} stroke="#0284c7" strokeWidth="0.8" />
                      {/* Left and Right End Jambs */}
                      <rect x={x} y={y - 1} width="3" height={h + 2} fill="#27272a" />
                      <rect x={x + w - 3} y={y - 1} width="3" height={h + 2} fill="#27272a" />
                    </g>
                  ) : isDouble ? (
                    /* Architectural Double Door (Dual Leaf & Dual 90° Swing Arcs) */
                    <g>
                      {/* Floor passage */}
                      <rect x={x + 3} y={y} width={w - 6} height={h} fill="#ebe4d8" />
                      {/* Left & Right Jambs */}
                      <rect x={x} y={y - 1} width="3.5" height={h + 2} fill="#27272a" />
                      <rect x={x + w - 3.5} y={y - 1} width="3.5" height={h + 2} fill="#27272a" />
                      {/* Left Door Leaf (swung 90°) */}
                      <line x1={x + 3} y1={y + h / 2} x2={x + 3} y2={y + h / 2 + w / 2 - 3} stroke={doorColor} strokeWidth="2.2" strokeLinecap="round" />
                      {/* Left Swing Arc */}
                      <path d={`M ${x + 3} ${y + h / 2 + w / 2 - 3} A ${w / 2 - 3} ${w / 2 - 3} 0 0 0 ${x + w / 2} ${y + h / 2}`} fill="none" stroke={doorColor} strokeWidth="1" strokeDasharray="3 2" />
                      {/* Right Door Leaf (swung 90°) */}
                      <line x1={x + w - 3} y1={y + h / 2} x2={x + w - 3} y2={y + h / 2 + w / 2 - 3} stroke={doorColor} strokeWidth="2.2" strokeLinecap="round" />
                      {/* Right Swing Arc */}
                      <path d={`M ${x + w - 3} ${y + h / 2 + w / 2 - 3} A ${w / 2 - 3} ${w / 2 - 3} 0 0 1 ${x + w / 2} ${y + h / 2}`} fill="none" stroke={doorColor} strokeWidth="1" strokeDasharray="3 2" />
                    </g>
                  ) : (
                    /* Architectural Single Door / Main Entrance / Emergency Exit */
                    <g>
                      {/* Floor passage */}
                      <rect x={x + 3} y={y} width={w - 6} height={h} fill="#ebe4d8" />
                      {/* Left & Right Jambs */}
                      <rect x={x} y={y - 1} width="3.5" height={h + 2} fill="#27272a" />
                      <rect x={x + w - 3.5} y={y - 1} width="3.5" height={h + 2} fill="#27272a" />
                      {/* Door Leaf (swung open 90° from left hinge) */}
                      <line x1={x + 3} y1={y + h / 2} x2={x + 3} y2={y + h / 2 + w - 4} stroke={doorColor} strokeWidth="2.5" strokeLinecap="round" />
                      {/* Quarter-circle 90° Swing Arc */}
                      <path d={`M ${x + 3} ${y + h / 2 + w - 4} A ${w - 4} ${w - 4} 0 0 0 ${x + w - 3} ${y + h / 2}`} fill="none" stroke={doorColor} strokeWidth="1" strokeDasharray="3 2" />
                    </g>
                  )}

                  {/* Clean Entrance / Exit Tag Badge Above Door (never crossing swing arc) */}
                  {(isEntrance || isExit) && (
                    <g pointerEvents="none">
                      <rect
                        x={x + w / 2 - 18}
                        y={y - 11}
                        width="36"
                        height="9.5"
                        rx="2"
                        fill="#ffffff"
                        stroke={doorColor}
                        strokeWidth="0.8"
                        filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
                      />
                      <text
                        x={x + w / 2}
                        y={y - 4}
                        fill={doorColor}
                        fontSize="6.5"
                        fontWeight="800"
                        letterSpacing="0.4"
                        textAnchor="middle"
                      >
                        {labelText}
                      </text>
                    </g>
                  )}

                  {/* Selection Outline */}
                  {isSelected && (
                    <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="none" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 3" rx="4" pointerEvents="none" />
                  )}
                </g>
              );
            }

            // Text Sign
            if (elem.type === 'text') {
              const text = elem.text || elem.label || 'SIGN';
              const bg = elem.color || '#27272a';

              return (
                <g key={elemId} data-element-id={elemId} className="cursor-grab active:cursor-grabbing">
                  <rect x={x} y={y} width={w} height={h} rx="4" fill={bg} filter="drop-shadow(0 1px 3px rgba(0,0,0,0.08))" />
                  <text x={x + w / 2} y={y + h / 2 + 4} fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle" pointerEvents="none">
                    {text}
                  </text>
                  {isSelected && (
                    <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="none" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 3" rx="6" />
                  )}
                </g>
              );
            }

            // Movable Room Badge (Main Hall & Secondary Halls)
            if (elem.type === 'room_badge') {
              const targetHall = elem.targetHallId
                ? elements.find((el) => String(el.id || el._tempId) === String(elem.targetHallId))
                : null;
              const titleText = targetHall ? targetHall.name || targetHall.label : elem.label || eventName || 'Main Hall';
              const wFt = targetHall ? targetHall.width || 30 : hallWidth;
              const hFt = targetHall ? targetHall.height || 20 : hallHeight;
              const areaFt = Math.round(wFt * hFt);
              const badgeW = Math.max(titleText.length * 8 + 28, 115);
              const badgeH = 38;

              return (
                <g key={elemId} data-element-id={elemId} className="cursor-grab active:cursor-grabbing">
                  <rect
                    x={x}
                    y={y}
                    width={badgeW}
                    height={badgeH}
                    rx="6"
                    fill="rgba(255, 255, 255, 0.98)"
                    stroke="#e4e4e7"
                    strokeWidth="1"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.05))"
                  />
                  <rect x={x} y={y} width={badgeW} height={badgeH} fill="transparent" pointerEvents="all" />
                  <text x={x + 12} y={y + 16} fill="#18181b" fontSize="12" fontWeight="700" pointerEvents="none">
                    {titleText}
                  </text>
                  <text x={x + 12} y={y + 29} fill="#71717a" fontSize="9.5" fontWeight="600" pointerEvents="none">
                    {`${Units.formatFeetShort(wFt)} × ${Units.formatFeetShort(hFt)} · ${areaFt.toLocaleString('en-IN')} sq ft`}
                  </text>
                  {isSelected && (
                    <rect
                      x={x - 4}
                      y={y - 4}
                      width={badgeW + 8}
                      height={badgeH + 8}
                      fill="none"
                      stroke="#18181b"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      rx="8"
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            }

            return null;
          })}
        </g>

        {/* 4. Architectural Dimension Lines & Guides Layer */}
        <g id="dimension-lines-layer" pointerEvents="none">
          {/* Main Hall Top Dimension */}
          <path d={`M 0 -12 L ${wPx} -12 M 0 -16 L 0 -8 M ${wPx} -16 L ${wPx} -8`} fill="none" stroke="#71717a" strokeWidth="1" />
          <rect x={wPx / 2 - 28} y="-20" width="56" height="15" rx="3" fill="#ffffff" stroke="#e4e4e7" strokeWidth="0.8" />
          <text x={wPx / 2} y="-9" fill="#000000" fontSize="9.5" fontWeight="800" textAnchor="middle">
            {Units.formatFeet(hallWidth)}
          </text>

          {/* Main Hall Left Dimension */}
          <path d={`M -12 0 L -12 ${hPx} M -16 0 L -8 0 M -16 ${hPx} L -8 ${hPx}`} fill="none" stroke="#71717a" strokeWidth="1" />
          <rect x="-35" y={hPx / 2 - 8} width="46" height="15" rx="3" fill="#ffffff" stroke="#e4e4e7" strokeWidth="0.8" transform={`rotate(-90, -12, ${hPx / 2})`} />
          <text x="-12" y={hPx / 2 + 3} fill="#000000" fontSize="9.5" fontWeight="800" textAnchor="middle" transform={`rotate(-90, -12, ${hPx / 2})`}>
            {Units.formatFeet(hallHeight)}
          </text>



          {/* Active / Selected Object Measurement Leader Lines */}
          {selectedItem && (() => {
            const obj = selectedItem.obj;
            const ox = px(obj.x);
            const oy = px(obj.y);
            const ow = px(obj.width || 4);
            const oh = px(obj.height || 2);
            const rot = obj.rotation || 0;
            const wFt = obj.width || 4;
            const hFt = obj.height || 2;
            const cx = ox + ow / 2;
            const cy = oy + oh / 2;

            return (
              <g id="selected-measurements">
                {/* Distance Guides to Left & Top Walls */}
                {obj.x > 0 && (
                  <g>
                    <line x1="0" y1={cy} x2={ox} y2={cy} stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
                    {ox > 35 && (
                      <g>
                        <rect x={ox / 2 - 18} y={cy - 7} width="36" height="13" rx="2" fill="#ffffff" stroke="#d4d4d8" strokeWidth="0.8" />
                        <text x={ox / 2} y={cy + 3} fill="#52525b" fontSize="8" fontWeight="600" textAnchor="middle">
                          {Units.formatFeetShort(obj.x)}
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {obj.y > 0 && (
                  <g>
                    <line x1={cx} y1="0" x2={cx} y2={oy} stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
                    {oy > 25 && (
                      <g>
                        <rect x={cx - 18} y={oy / 2 - 7} width="36" height="13" rx="2" fill="#ffffff" stroke="#d4d4d8" strokeWidth="0.8" />
                        <text x={cx} y={oy / 2 + 3} fill="#52525b" fontSize="8" fontWeight="600" textAnchor="middle">
                          {Units.formatFeetShort(obj.y)}
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* Object Local Width & Depth Dimension Lines */}
                <g transform={rot ? `rotate(${rot}, ${cx}, ${cy})` : undefined}>
                  {/* Top Width Dimension Line */}
                  <path d={`M ${ox} ${oy - 11} L ${ox + ow} ${oy - 11} M ${ox} ${oy - 14} L ${ox} ${oy - 8} M ${ox + ow} ${oy - 14} L ${ox + ow} ${oy - 8}`} fill="none" stroke="#52525b" strokeWidth="0.8" />
                  <rect x={ox + ow / 2 - 9} y={oy - 15.5} width="18" height="9" rx="2" fill="#ffffff" stroke="#d4d4d8" strokeWidth="0.6" />
                  <text x={ox + ow / 2} y={oy - 9} fill="#18181b" fontSize="6.5" fontWeight="700" textAnchor="middle">
                    {Units.formatFeetShort(wFt)}
                  </text>

                  {/* Left Depth Dimension Line */}
                  <path d={`M ${ox - 11} ${oy} L ${ox - 11} ${oy + oh} M ${ox - 14} ${oy} L ${ox - 8} ${oy} M ${ox - 14} ${oy + oh} L ${ox - 8} ${oy + oh}`} fill="none" stroke="#52525b" strokeWidth="0.8" />
                  <rect x={ox - 18} y={oy + oh / 2 - 4.5} width="14" height="9" rx="2" fill="#ffffff" stroke="#d4d4d8" strokeWidth="0.6" />
                  <text x={ox - 11} y={oy + oh / 2 + 2} fill="#18181b" fontSize="6.5" fontWeight="700" textAnchor="middle">
                    {Units.formatFeetShort(hFt)}
                  </text>
                </g>
              </g>
            );
          })()}
        </g>
        {/* 5. Blueprint Placement Handles — above the plan so they stay grabbable */}
        {canGrabBlueprint && (
          <g id="blueprint-handles" transform={bpTransform}>
            <rect
              x={bpX}
              y={bpY}
              width={bpW}
              height={bpH}
              fill="none"
              stroke="#2563eb"
              strokeWidth={1.5 * ui}
              strokeDasharray={`${7 * ui} ${5 * ui}`}
              pointerEvents="none"
            />
            {BLUEPRINT_CORNERS.map((corner, index) => (
              <rect
                key={index}
                data-blueprint-handle={index}
                x={bpX + corner.ix * bpW - 5 * ui}
                y={bpY + corner.iy * bpH - 5 * ui}
                width={10 * ui}
                height={10 * ui}
                rx={2 * ui}
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth={1.5 * ui}
                pointerEvents="all"
                style={{ cursor: corner.cursor }}
              />
            ))}
          </g>
        )}

        {/* 6. Calibration Measurement */}
        {isCalibrating && calibrationFrom && (
          <g id="calibration-layer" pointerEvents="none">
            {calibrationEnd && (
              <>
                <line
                  x1={px(calibrationFrom.x)}
                  y1={px(calibrationFrom.y)}
                  x2={px(calibrationEnd.x)}
                  y2={px(calibrationEnd.y)}
                  stroke="#2563eb"
                  strokeWidth={2 * ui}
                  strokeDasharray={calibrationTo ? undefined : `${6 * ui} ${4 * ui}`}
                  strokeLinecap="round"
                />
                {!calibrationTo && measuredFt > 0 && (
                  <text
                    x={px((calibrationFrom.x + calibrationEnd.x) / 2)}
                    y={px((calibrationFrom.y + calibrationEnd.y) / 2) - 8 * ui}
                    fill="#2563eb"
                    fontSize={11 * ui}
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {Units.formatFeetShort(measuredFt)} on plan
                  </text>
                )}
              </>
            )}

            {[calibrationFrom, calibrationTo].map((point, index) =>
              point ? (
                <g key={index}>
                  <circle cx={px(point.x)} cy={px(point.y)} r={5 * ui} fill="#ffffff" stroke="#2563eb" strokeWidth={2 * ui} />
                  <circle cx={px(point.x)} cy={px(point.y)} r={1.5 * ui} fill="#2563eb" />
                </g>
              ) : null
            )}
          </g>
        )}
      </svg>

      {/* Calibration guidance banner */}
      {isCalibrating && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3.5 py-2 bg-zinc-900 text-white rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 pointer-events-none">
          <span className="w-4 h-4 rounded-full bg-blue-500 text-[10px] flex items-center justify-center font-bold">
            {calibrationTo ? 3 : calibrationFrom ? 2 : 1}
          </span>
          {calibrationTo
            ? 'Type the real distance between those two points'
            : calibrationFrom
            ? 'Click the second point of the known distance'
            : 'Click the first point of a distance you know'}
        </div>
      )}

      {/* Real-distance entry, pinned to the middle of the measurement */}
      {calibrationInputPos && calibrationFrom && calibrationTo && (
        <div
          data-calibration-input=""
          className="absolute z-50 -translate-x-1/2 -translate-y-[140%] bg-white border border-zinc-300 rounded-lg shadow-2xl p-2.5 w-[210px]"
          style={{ left: calibrationInputPos.left, top: calibrationInputPos.top }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
            Measures {Units.formatFeetShort(distanceFt(calibrationFrom, calibrationTo))} · really is
          </p>
          <div className="flex gap-1.5">
            <input
              ref={calibrationInputRef}
              type="number"
              min={0.1}
              step={0.5}
              value={realDistanceDraft}
              onChange={(e) => setRealDistanceDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitCalibration();
                }
              }}
              placeholder="40"
              className="flex-1 min-w-0 px-2 py-1.5 border border-zinc-300 rounded-md text-xs tabular-nums focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-none"
            />
            <span className="self-center text-[11px] font-semibold text-zinc-500">ft</span>
            <button
              type="button"
              onClick={commitCalibration}
              disabled={!(parseFloat(realDistanceDraft) > 0)}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-[11px] font-bold rounded-md transition"
            >
              Set
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <FloatingToolbar
        selectedItem={selectedItem}
        position={isCalibrating ? null : floatingPos}
        onFlip={onFlipSelected}
        onRotate={onRotateSelected}
        onDuplicate={onDuplicateSelected}
        onDelete={onDeleteSelected}
      />
    </div>
  );
};
