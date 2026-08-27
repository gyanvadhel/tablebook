'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Units } from '@/lib/units';
import { WALL_THICKNESS_FT } from '@/lib/constants';
import { FloatingToolbar } from './FloatingToolbar';
import type { TableItem, HallElement, StudioSelectedItem } from '@/types';

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
}

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
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dragging & Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [floatingPos, setFloatingPos] = useState<{ left: number; top: number } | null>(null);

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

  // Global Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

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
  }, [onRotateSelected, onFlipSelected, onDuplicateSelected, onDeleteSelected, onDeselect]);

  // Mouse Down handler
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    const target = e.target as HTMLElement | SVGElement;

    // If clicking a button or floating toolbar, do not deselect or pan
    if (target.closest('button') || target.closest('[data-floating-toolbar]')) {
      return;
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

  const selectedId = selectedItem ? String(selectedItem.obj.id || selectedItem.obj._tempId) : null;

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

                {/* Stall Number Badge - Always upright and compact */}
                <g transform={t.rotation ? `rotate(${-t.rotation}, ${cx}, ${cy})` : undefined}>
                  <rect
                    x={cx - (String(t.table_number).length > 2 ? 12 : 9)}
                    y={cy - 7}
                    width={String(t.table_number).length > 2 ? 24 : 18}
                    height="14"
                    rx="2"
                    fill="#ffffff"
                    stroke="#d4d4d8"
                    strokeWidth="0.8"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
                    pointerEvents="none"
                  />
                  <text
                    x={cx}
                    y={cy + 3.5}
                    fill={isBooked ? '#be123c' : '#18181b'}
                    fontSize="9"
                    fontWeight="800"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {t.table_number}
                  </text>
                </g>

                {/* Selection Outline */}
                {isSelected && (
                  <rect
                    x={x - 4}
                    y={y - 4}
                    width={w + 8}
                    height={h + 8}
                    fill="none"
                    stroke="#18181b"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    rx="4"
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

            // Door / Entrance
            if (elem.type === 'door') {
              const isEntrance = elem.doorType === 'entrance' || !elem.doorType;
              const isExit = elem.doorType === 'exit';
              const doorColor = isEntrance ? '#15803d' : isExit ? '#b91c1c' : '#3f3f46';

              return (
                <g
                  key={elemId}
                  data-element-id={elemId}
                  transform={elem.rotation ? `rotate(${elem.rotation}, ${cx}, ${cy})` : undefined}
                  className="cursor-grab active:cursor-grabbing"
                >
                  {/* Door frame */}
                  <rect x={x} y={y} width={w} height={h} fill="#ffffff" stroke={doorColor} strokeWidth="1.5" rx="1" />
                  {/* Swing arc */}
                  <path d={`M ${x} ${y + h} A ${w} ${w} 0 0 1 ${x + w} ${y}`} fill="none" stroke={doorColor} strokeWidth="1" strokeDasharray="3 2" />
                  <text x={x + w / 2} y={y + h / 2 + 3} fill={doorColor} fontSize="8.5" fontWeight="700" textAnchor="middle" pointerEvents="none">
                    {isExit ? 'EXIT' : 'DOOR'}
                  </text>
                  {isSelected && (
                    <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="none" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 3" rx="4" />
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
      </svg>

      {/* Floating Action Bar */}
      <FloatingToolbar
        selectedItem={selectedItem}
        position={floatingPos}
        onFlip={onFlipSelected}
        onRotate={onRotateSelected}
        onDuplicate={onDuplicateSelected}
        onDelete={onDeleteSelected}
      />
    </div>
  );
};
