'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Units } from '@/lib/units';
import { WALL_THICKNESS_FT } from '@/lib/constants';
import type { TableItem, HallElement } from '@/types';

interface VisitorHallMapProps {
  hallWidth: number;
  hallHeight: number;
  tables: TableItem[];
  elements: HallElement[];
  selectedTable: TableItem | null;
  onSelectTable: (table: TableItem) => void;
  eventName: string;
}

export const VisitorHallMap: React.FC<VisitorHallMapProps> = ({
  hallWidth,
  hallHeight,
  tables,
  elements,
  selectedTable,
  onSelectTable,
  eventName,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 1200,
    h: 800,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const px = (ft: number) => Units.ftToPx(ft);

  // Auto-fit viewBox
  useEffect(() => {
    let minX = -10;
    let minY = -10;
    let maxX = hallWidth + 10;
    let maxY = hallHeight + 10;

    tables.forEach((t) => {
      const rX = (t.x || 0) + (t.width || 4);
      const bY = (t.y || 0) + (t.height || 2);
      if (t.x < minX) minX = t.x - 5;
      if (t.y < minY) minY = t.y - 5;
      if (rX > maxX) maxX = rX + 5;
      if (bY > maxY) maxY = bY + 5;
    });

    elements.forEach((el) => {
      const rX = (el.x || 0) + (el.width || 4);
      const bY = (el.y || 0) + (el.height || 2);
      if (el.x < minX) minX = el.x - 5;
      if (el.y < minY) minY = el.y - 5;
      if (rX > maxX) maxX = rX + 5;
      if (bY > maxY) maxY = bY + 5;
    });

    const padX = 12;
    const padY = 12;
    const xPx = Units.ftToPx(minX - padX);
    const yPx = Units.ftToPx(minY - padY);
    const wPx = Units.ftToPx(maxX - minX + padX * 2);
    const hPx = Units.ftToPx(maxY - minY + padY * 2);

    setViewBox({ x: xPx, y: yPx, w: Math.max(wPx, 700), h: Math.max(hPx, 500) });
  }, [hallWidth, hallHeight, tables, elements]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !containerRef.current) return;
    const dx = (e.clientX - panStart.x) * (viewBox.w / containerRef.current.clientWidth);
    const dy = (e.clientY - panStart.y) * (viewBox.h / containerRef.current.clientHeight);
    setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
    const mouseY = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;

    const newW = viewBox.w * factor;
    const newH = viewBox.h * factor;

    setViewBox({
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

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="w-full h-full relative overflow-hidden bg-zinc-100 cursor-grab active:cursor-grabbing select-none"
    >
      <svg viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} className="w-full h-full block">
        <defs>
          {/* Architectural Drawing Grid Pattern */}
          <pattern id="visitor-grid" width={major} height={major} patternUnits="userSpaceOnUse">
            <rect width={major} height={major} fill="#fafafa" />
            <path
              d={`M ${minor} 0 L 0 0 0 ${minor} M ${minor * 2} 0 L 0 0 0 ${minor * 2} M ${minor * 3} 0 L 0 0 0 ${minor * 3} M ${minor * 4} 0 L 0 0 0 ${minor * 4}`}
              fill="none"
              stroke="#f0f0f1"
              strokeWidth="0.8"
            />
            <path d={`M ${major} 0 L 0 0 0 ${major}`} fill="none" stroke="#e4e4e7" strokeWidth="1" />
          </pattern>

          {/* Minimalist Warm Wood Parquet Floor */}
          <pattern id="visitor-wood" width={px(16)} height={px(4)} patternUnits="userSpaceOnUse">
            <rect width={px(16)} height={px(4)} fill="#ebe4d8" />
            <line x1="0" y1={px(2)} x2={px(16)} y2={px(2)} stroke="#dfd6c7" strokeWidth="1" />
            <line x1="0" y1={px(4)} x2={px(16)} y2={px(4)} stroke="#dfd6c7" strokeWidth="1" />
            <line x1={px(8)} y1="0" x2={px(8)} y2={px(2)} stroke="#dfd6c7" strokeWidth="0.8" />
            <line x1={px(16)} y1={px(2)} x2={px(16)} y2={px(4)} stroke="#dfd6c7" strokeWidth="0.8" />
            <line x1="0" y1={px(2)} x2="0" y2={px(4)} stroke="#dfd6c7" strokeWidth="0.8" />
          </pattern>

          {/* Available Stall Warm Oak */}
          <pattern id="visitor-table-avail" width={px(4)} height={px(2)} patternUnits="userSpaceOnUse">
            <rect width={px(4)} height={px(2)} fill="#d49b5c" />
            <line x1="0" y1={px(1)} x2={px(4)} y2={px(1)} stroke="#be8645" strokeWidth="0.8" strokeDasharray="8 2" />
          </pattern>

          {/* Booked Stall Muted Crimson */}
          <pattern id="visitor-table-booked" width={px(4)} height={px(2)} patternUnits="userSpaceOnUse">
            <rect width={px(4)} height={px(2)} fill="#e11d48" />
            <line x1="0" y1={px(1)} x2={px(4)} y2={px(1)} stroke="#be123c" strokeWidth="0.8" strokeDasharray="8 2" />
          </pattern>

          {/* Selected Stall Neutral Accent */}
          <pattern id="visitor-table-selected" width={px(4)} height={px(2)} patternUnits="userSpaceOnUse">
            <rect width={px(4)} height={px(2)} fill="#18181b" />
            <line x1="0" y1={px(1)} x2={px(4)} y2={px(1)} stroke="#3f3f46" strokeWidth="0.8" strokeDasharray="8 2" />
          </pattern>
        </defs>

        {/* Canvas Background Grid */}
        <rect x={-px(120)} y={-px(120)} width={wPx + px(240)} height={hPx + px(240)} fill="url(#visitor-grid)" />

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

        {/* Main Hall Parquet Floor */}
        <rect x="0" y="0" width={wPx} height={hPx} fill="url(#visitor-wood)" stroke="#18181b" strokeWidth="1.5" />

        {/* Hall Dimensions */}
        <text x={wPx / 2} y="-10" fill="#475569" fontSize="11" fontWeight="700" textAnchor="middle" pointerEvents="none">
          {Units.formatFeet(hallWidth)}
        </text>
        <text x="-12" y={hPx / 2} fill="#475569" fontSize="11" fontWeight="700" textAnchor="middle" transform={`rotate(-90, -12, ${hPx / 2})`} pointerEvents="none">
          {Units.formatFeet(hallHeight)}
        </text>

        {/* 1. Structures & Secondary Halls */}
        <g id="visitor-structures">
          {elements.map((elem) => {
            const elemId = String(elem.id || elem._tempId);
            const x = px(elem.x);
            const y = px(elem.y);
            const w = px(elem.width || 4);
            const h = px(elem.height || 2);
            const cx = px(elem.x + (elem.width || 4) / 2);
            const cy = px(elem.y + (elem.height || 2) / 2);

            if (elem.type === 'hall_room') {
              return (
                <g key={elemId} transform={elem.rotation ? `rotate(${elem.rotation}, ${cx}, ${cy})` : undefined}>
                  <rect x={x} y={y} width={w} height={h} fill="url(#visitor-wood)" stroke="#18181b" strokeWidth="1.5" />
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
                </g>
              );
            }

            if (elem.type === 'pillar_square') {
              return <rect key={elemId} x={x} y={y} width={w} height={h} fill="#3f3f46" stroke="#18181b" strokeWidth="1.5" rx="2" />;
            }

            if (elem.type === 'pillar_round') {
              const r = w / 2;
              return <circle key={elemId} cx={x + r} cy={y + r} r={r} fill="#3f3f46" stroke="#18181b" strokeWidth="1.5" />;
            }

            if (elem.type === 'stage') {
              return (
                <g key={elemId}>
                  <rect x={x} y={y} width={w} height={h} fill="#27272a" stroke="#09090b" strokeWidth="2" rx="4" />
                  <text x={x + w / 2} y={y + h / 2 + 4} fill="#fafafa" fontSize="11" fontWeight="700" textAnchor="middle">
                    {elem.label || 'MAIN STAGE'}
                  </text>
                </g>
              );
            }

            if (elem.type === 'arrow') {
              return (
                <g key={elemId} transform={elem.rotation ? `rotate(${elem.rotation}, ${cx}, ${cy})` : undefined}>
                  <path d={`M ${x} ${y + h / 2} L ${x + w - 10} ${y + h / 2} M ${x + w - 15} ${y} L ${x + w} ${y + h / 2} L ${x + w - 15} ${y + h}`} fill="none" stroke="#52525b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              );
            }

            return null;
          })}
        </g>

        {/* 2. Stalls Layer */}
        <g id="visitor-stalls">
          {tables.map((t) => {
            const tableId = String(t.id || t._tempId);
            const isSelected = selectedTable && String(selectedTable.id || selectedTable._tempId) === tableId;
            const isBooked = t.status === 'booked';
            const x = px(t.x);
            const y = px(t.y);
            const w = px(t.width);
            const h = px(t.height);
            const cx = px(t.x + t.width / 2);
            const cy = px(t.y + t.height / 2);
            const shape = t.shape || 'rect';

            const fillPattern = isSelected
              ? 'url(#visitor-table-selected)'
              : isBooked
              ? 'url(#visitor-table-booked)'
              : 'url(#visitor-table-avail)';

            return (
              <g
                key={tableId}
                transform={t.rotation ? `rotate(${t.rotation}, ${cx}, ${cy})` : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isBooked) onSelectTable(t);
                }}
                className={isBooked ? 'cursor-not-allowed opacity-95' : 'cursor-pointer hover:opacity-90 transition'}
              >
                {/* Stall Geometry */}
                {shape === 'L-Stall' ? (
                  <path
                    d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + px(2)} L ${x + px(2)} ${y + px(2)} L ${x + px(2)} ${y + h} L ${x} ${y + h} Z`}
                    fill={isBooked ? '#e11d48' : 'url(#visitor-table-avail)'}
                    stroke={isBooked ? '#be123c' : '#1e293b'}
                    strokeWidth="1.2"
                  />
                ) : shape === 'L-Stall-Inverted' || shape === 'L-Inverted' ? (
                  <path
                    d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x + w - px(2)} ${y + h} L ${x + w - px(2)} ${y + px(2)} L ${x} ${y + px(2)} Z`}
                    fill={isBooked ? '#e11d48' : 'url(#visitor-table-avail)'}
                    stroke={isBooked ? '#be123c' : '#1e293b'}
                    strokeWidth="1.2"
                  />
                ) : shape === 'T-Stall' ? (
                  <path
                    d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + px(2)} L ${x + w / 2 + px(1)} ${y + px(2)} L ${x + w / 2 + px(1)} ${y + h} L ${x + w / 2 - px(1)} ${y + h} L ${x + w / 2 - px(1)} ${y + px(2)} L ${x} ${y + px(2)} Z`}
                    fill={isBooked ? '#e11d48' : 'url(#visitor-table-avail)'}
                    stroke={isBooked ? '#be123c' : '#1e293b'}
                    strokeWidth="1.2"
                  />
                ) : (
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={isBooked ? '#e11d48' : 'url(#visitor-table-avail)'}
                    stroke={isBooked ? '#be123c' : '#1e293b'}
                    strokeWidth="1.2"
                    rx="2"
                  />
                )}

                {/* Full-surface invisible hitbox for reliable click detection across the entire stall */}
                <rect x={x} y={y} width={w} height={h} fill="transparent" pointerEvents="all" />

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

                {/* Smooth Glowing Selection Ring */}
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

        {/* 3. Doors, Text Signs & Movable Hall Badges */}
        <g id="visitor-signs">
          {elements.map((elem) => {
            const elemId = String(elem.id || elem._tempId);
            const x = px(elem.x);
            const y = px(elem.y);
            const w = px(elem.width || 4);
            const h = px(elem.height || 2);
            const cx = px(elem.x + (elem.width || 4) / 2);
            const cy = px(elem.y + (elem.height || 2) / 2);

            if (elem.type === 'door') {
              const isEntrance = elem.doorType === 'entrance' || !elem.doorType;
              const isExit = elem.doorType === 'exit';
              const isDouble = elem.doorType === 'double';
              const isWindow = elem.doorType === 'window';
              const doorColor = isEntrance ? '#16a34a' : isExit ? '#dc2626' : '#52525b';
              const labelText = isEntrance ? 'ENTRANCE' : isExit ? 'EXIT' : isDouble ? 'DOUBLE DOOR' : 'WINDOW';

              return (
                <g key={elemId} transform={elem.rotation ? `rotate(${elem.rotation}, ${cx}, ${cy})` : undefined}>
                  {isWindow ? (
                    <g>
                      <rect x={x} y={y} width={w} height={h} fill="#f0f9ff" stroke="#38bdf8" strokeWidth="1" />
                      <line x1={x} y1={y + h * 0.35} x2={x + w} y2={y + h * 0.35} stroke="#0284c7" strokeWidth="0.8" />
                      <line x1={x} y1={y + h * 0.65} x2={x + w} y2={y + h * 0.65} stroke="#0284c7" strokeWidth="0.8" />
                      <rect x={x} y={y - 1} width="3" height={h + 2} fill="#27272a" />
                      <rect x={x + w - 3} y={y - 1} width="3" height={h + 2} fill="#27272a" />
                    </g>
                  ) : isDouble ? (
                    <g>
                      <rect x={x + 3} y={y} width={w - 6} height={h} fill="#ebe4d8" />
                      <rect x={x} y={y - 1} width="3.5" height={h + 2} fill="#27272a" />
                      <rect x={x + w - 3.5} y={y - 1} width="3.5" height={h + 2} fill="#27272a" />
                      <line x1={x + 3} y1={y + h / 2} x2={x + 3} y2={y + h / 2 + w / 2 - 3} stroke={doorColor} strokeWidth="2.2" strokeLinecap="round" />
                      <path d={`M ${x + 3} ${y + h / 2 + w / 2 - 3} A ${w / 2 - 3} ${w / 2 - 3} 0 0 0 ${x + w / 2} ${y + h / 2}`} fill="none" stroke={doorColor} strokeWidth="1" strokeDasharray="3 2" />
                      <line x1={x + w - 3} y1={y + h / 2} x2={x + w - 3} y2={y + h / 2 + w / 2 - 3} stroke={doorColor} strokeWidth="2.2" strokeLinecap="round" />
                      <path d={`M ${x + w - 3} ${y + h / 2 + w / 2 - 3} A ${w / 2 - 3} ${w / 2 - 3} 0 0 1 ${x + w / 2} ${y + h / 2}`} fill="none" stroke={doorColor} strokeWidth="1" strokeDasharray="3 2" />
                    </g>
                  ) : (
                    <g>
                      <rect x={x + 3} y={y} width={w - 6} height={h} fill="#ebe4d8" />
                      <rect x={x} y={y - 1} width="3.5" height={h + 2} fill="#27272a" />
                      <rect x={x + w - 3.5} y={y - 1} width="3.5" height={h + 2} fill="#27272a" />
                      <line x1={x + 3} y1={y + h / 2} x2={x + 3} y2={y + h / 2 + w - 4} stroke={doorColor} strokeWidth="2.5" strokeLinecap="round" />
                      <path d={`M ${x + 3} ${y + h / 2 + w - 4} A ${w - 4} ${w - 4} 0 0 0 ${x + w - 3} ${y + h / 2}`} fill="none" stroke={doorColor} strokeWidth="1" strokeDasharray="3 2" />
                    </g>
                  )}

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
                </g>
              );
            }

            if (elem.type === 'text') {
              return (
                <g key={elemId}>
                  <rect x={x} y={y} width={w} height={h} rx="4" fill={elem.color || '#27272a'} filter="drop-shadow(0 1px 3px rgba(0,0,0,0.08))" />
                  <text x={x + w / 2} y={y + h / 2 + 4} fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">
                    {elem.text || elem.label || 'SIGN'}
                  </text>
                </g>
              );
            }

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
                <g key={elemId}>
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
                  <text x={x + 12} y={y + 16} fill="#18181b" fontSize="12" fontWeight="700">
                    {titleText}
                  </text>
                  <text x={x + 12} y={y + 29} fill="#71717a" fontSize="9.5" fontWeight="600">
                    {`${Units.formatFeetShort(wFt)} × ${Units.formatFeetShort(hFt)} · ${areaFt.toLocaleString('en-IN')} sq ft`}
                  </text>
                </g>
              );
            }

            return null;
          })}
        </g>
      </svg>
    </div>
  );
};
