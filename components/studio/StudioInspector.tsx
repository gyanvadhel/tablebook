'use client';

import React from 'react';
import { Units } from '@/lib/units';
import {
  FlipHorizontal,
  RotateCw,
  Minus,
  Plus,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CaseSensitive,
  Type,
  LetterText,
  Move,
} from 'lucide-react';
import type { StudioSelectedItem, EventItem, TableItem, HallElement } from '@/types';

interface StudioInspectorProps {
  selectedItem: StudioSelectedItem | null;
  event: EventItem | null;
  hallWidth: number;
  hallHeight: number;
  hallX?: number;
  hallY?: number;
  onUpdateMainHall: (prop: 'name' | 'hall_width' | 'hall_height' | 'hall_x' | 'hall_y' | 'venue', val: any) => void;
  onMoveMainHall?: (newX: number, newY: number, shiftContents?: boolean) => void;
  shiftInteriorWithHall?: boolean;
  onToggleShiftInterior?: (val: boolean) => void;
  onRotateSelected: () => void;
  onFlipSelected: () => void;
  onToggleInvertL: () => void;
  onUpdateSecondaryHallName: (targetHallId: string, name: string) => void;
  allElements?: HallElement[];
}

export const StudioInspector: React.FC<StudioInspectorProps> = ({
  selectedItem,
  event,
  hallWidth,
  hallHeight,
  hallX,
  hallY,
  onUpdateMainHall,
  onMoveMainHall,
  shiftInteriorWithHall = false,
  onToggleShiftInterior,
  onUpdateItemProp,
  onRotateSelected,
  onFlipSelected,
  onToggleInvertL,
  onUpdateSecondaryHallName,
  allElements,
}) => {
  // 1. If nothing selected or main hall selected: show Main Hall properties
  if (!selectedItem || selectedItem.type === 'main_hall') {
    const areaSqFt = Math.round(hallWidth * hallHeight);
    const currentHallX = hallX ?? (event?.hall_x || 0);
    const currentHallY = hallY ?? (event?.hall_y || 0);

    return (
      <div className="border-b border-zinc-200">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50 border-b border-zinc-200">
          <span className="font-bold text-xs uppercase tracking-wider text-zinc-600">Main Hall Properties</span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-900 text-white rounded">Main Hall</span>
        </div>

        <div className="p-3.5 flex flex-col gap-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Exhibition / Main Hall Name</label>
            <input
              type="text"
              value={event?.name || ''}
              onChange={(e) => onUpdateMainHall('name', e.target.value)}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-none text-zinc-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Hall Width (ft)</label>
              <input
                type="number"
                min={Units.MIN_HALL_FT}
                max={Units.MAX_HALL_FT}
                value={hallWidth}
                onChange={(e) => onUpdateMainHall('hall_width', e.target.value)}
                onBlur={(e) => onUpdateMainHall('hall_width', Units.clampHallFt(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-none text-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Hall Depth (ft)</label>
              <input
                type="number"
                min={Units.MIN_HALL_FT}
                max={Units.MAX_HALL_FT}
                value={hallHeight}
                onChange={(e) => onUpdateMainHall('hall_height', e.target.value)}
                onBlur={(e) => onUpdateMainHall('hall_height', Units.clampHallFt(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-none text-zinc-900"
              />
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 font-medium">
            {Units.formatDims(hallWidth, hallHeight)} &middot; {areaSqFt.toLocaleString('en-IN')} sq ft
          </div>

          {/* Main Hall Position & Movement Controls */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-zinc-600" />
                Main Hall Position (ft)
              </label>
              <button
                type="button"
                onClick={() => onMoveMainHall?.(0, 0)}
                className="text-[10px] text-zinc-500 hover:text-zinc-900 font-semibold px-1.5 py-0.5 rounded hover:bg-zinc-200 transition"
                title="Reset Main Hall to (0, 0)"
              >
                Reset (0,0)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 mb-1">X Position</label>
                <input
                  type="number"
                  step={1}
                  value={Units.roundFt(currentHallX)}
                  onChange={(e) => onMoveMainHall?.(parseFloat(e.target.value) || 0, currentHallY)}
                  className="w-full px-2 py-1.5 border border-zinc-300 rounded-md text-xs font-mono focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 mb-1">Y Position</label>
                <input
                  type="number"
                  step={1}
                  value={Units.roundFt(currentHallY)}
                  onChange={(e) => onMoveMainHall?.(currentHallX, parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-zinc-300 rounded-md text-xs font-mono focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Nudge Buttons */}
            <div>
              <span className="block text-[10px] font-semibold text-zinc-500 mb-1">Nudge Position</span>
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => onMoveMainHall?.(currentHallX - 5, currentHallY)}
                  className="px-1.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded text-[10px] font-bold text-zinc-700 transition"
                  title="Move 5 ft Left"
                >
                  ◀ -5ft
                </button>
                <button
                  type="button"
                  onClick={() => onMoveMainHall?.(currentHallX + 5, currentHallY)}
                  className="px-1.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded text-[10px] font-bold text-zinc-700 transition"
                  title="Move 5 ft Right"
                >
                  +5ft ▶
                </button>
                <button
                  type="button"
                  onClick={() => onMoveMainHall?.(currentHallX, currentHallY - 5)}
                  className="px-1.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded text-[10px] font-bold text-zinc-700 transition"
                  title="Move 5 ft Up"
                >
                  ▲ -5ft
                </button>
                <button
                  type="button"
                  onClick={() => onMoveMainHall?.(currentHallX, currentHallY + 5)}
                  className="px-1.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded text-[10px] font-bold text-zinc-700 transition"
                  title="Move 5 ft Down"
                >
                  ▼ +5ft
                </button>
              </div>
            </div>

            {/* Shift Contents Toggle */}
            <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-zinc-200">
              <input
                type="checkbox"
                checked={shiftInteriorWithHall}
                onChange={(e) => onToggleShiftInterior?.(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <span className="text-[11px] font-medium text-zinc-700">
                Also move stalls with hall (blueprint never moves)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Venue Location</label>
            <input
              type="text"
              value={event?.venue || ''}
              onChange={(e) => onUpdateMainHall('venue', e.target.value)}
              placeholder="e.g. Hall 4, Convention Center"
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-none text-zinc-900"
            />
          </div>

          <p className="text-[11px] text-zinc-400 border-t border-zinc-100 pt-2">
            Tip: Drag the top bar or outer wall on canvas to move the Main Hall directly.
          </p>
        </div>
      </div>
    );
  }

  // 2. Selected Table / Stall
  if (selectedItem.type === 'table') {
    const table = selectedItem.obj as TableItem;
    const isLStall = table.shape && table.shape.startsWith('L');
    const isInverted = table.shape === 'L-Stall-Inverted' || table.shape === 'L-Inverted';

    return (
      <div className="border-b border-zinc-200">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50 border-b border-zinc-200">
          <span className="font-bold text-xs text-zinc-800">Stall {table.table_number}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded capitalize">
            {table.status || 'Available'}
          </span>
        </div>

        <div className="p-3.5 flex flex-col gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Stall Number / ID</label>
            <input
              type="text"
              value={table.table_number}
              onChange={(e) => onUpdateItemProp('table_number', e.target.value)}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md font-bold focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Stall Fee / Price (₹)</label>
            <input
              type="number"
              min={0}
              step={500}
              value={table.price || 0}
              onChange={(e) => onUpdateItemProp('price', parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Category / Label</label>
            <input
              type="text"
              value={table.label || ''}
              onChange={(e) => onUpdateItemProp('label', e.target.value)}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          {isLStall && (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">L-Shape Arm Orientation</label>
              <button
                type="button"
                onClick={onToggleInvertL}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md font-semibold text-zinc-800 transition"
              >
                <span>{isInverted ? 'Right-Hand (Inverted ⅃)' : 'Left-Hand (Standard L)'}</span>
                <span className="font-bold">⇄ Invert</span>
              </button>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Orientation &amp; Rotation</label>
            <div className="grid grid-cols-2 gap-2 mb-1.5">
              <button
                type="button"
                onClick={onFlipSelected}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md font-medium text-zinc-700 transition"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>Flip (F)</span>
              </button>
              <button
                type="button"
                onClick={onRotateSelected}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md font-medium text-zinc-700 transition"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate (R)</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={90}
                value={table.rotation || 0}
                onChange={(e) => onUpdateItemProp('rotation', (parseFloat(e.target.value) || 0) % 360)}
                className="w-20 px-2 py-1 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
              <span className="text-zinc-500 text-xs">degrees</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Width (ft)</label>
              <input
                type="number"
                step={0.25}
                value={table.width}
                onChange={(e) => onUpdateItemProp('width', parseFloat(e.target.value) || e.target.value)}
                onBlur={(e) => onUpdateItemProp('width', Units.clampStallFt(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Depth (ft)</label>
              <input
                type="number"
                step={0.25}
                value={table.height}
                onChange={(e) => onUpdateItemProp('height', parseFloat(e.target.value) || e.target.value)}
                onBlur={(e) => onUpdateItemProp('height', Units.clampStallFt(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">X Position</label>
              <input
                type="number"
                step={0.25}
                value={table.x}
                onChange={(e) => onUpdateItemProp('x', parseFloat(e.target.value) || (e.target.value === '' ? '' : 0))}
                onBlur={(e) => onUpdateItemProp('x', Units.roundFt(parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Y Position</label>
              <input
                type="number"
                step={0.25}
                value={table.y}
                onChange={(e) => onUpdateItemProp('y', parseFloat(e.target.value) || (e.target.value === '' ? '' : 0))}
                onBlur={(e) => onUpdateItemProp('y', Units.roundFt(parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Selected Architectural Element (Hall Room, Room Badge, Door, Sign, Structure)
  const elem = selectedItem.obj as HallElement;
  const isHallRoom = elem.type === 'hall_room';
  const isRoomBadge = elem.type === 'room_badge';

  // 3a. Secondary Hall Room Structure
  if (isHallRoom) {
    const areaSqFt = Math.round((elem.width || 30) * (elem.height || 20));

    return (
      <div className="border-b border-zinc-200">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50 border-b border-zinc-200">
          <span className="font-bold text-xs text-zinc-800">{elem.name || 'Secondary Hall'}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded">Hall Room</span>
        </div>

        <div className="p-3.5 flex flex-col gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Hall Name / Title</label>
            <input
              type="text"
              value={elem.name || elem.label || ''}
              onChange={(e) => onUpdateItemProp('name', e.target.value)}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md font-bold focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Width (ft)</label>
              <input
                type="number"
                step={1}
                min={10}
                max={200}
                value={elem.width || 30}
                onChange={(e) => onUpdateItemProp('width', parseFloat(e.target.value) || 30)}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Depth (ft)</label>
              <input
                type="number"
                step={1}
                min={10}
                max={200}
                value={elem.height || 20}
                onChange={(e) => onUpdateItemProp('height', parseFloat(e.target.value) || 20)}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 font-medium">
            {Units.formatDims(elem.width || 30, elem.height || 20)} &middot; {areaSqFt.toLocaleString('en-IN')} sq ft
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">X Position</label>
              <input
                type="number"
                step={1}
                value={Units.roundFt(elem.x)}
                onChange={(e) => onUpdateItemProp('x', Units.roundFt(parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Y Position</label>
              <input
                type="number"
                step={1}
                value={Units.roundFt(elem.y)}
                onChange={(e) => onUpdateItemProp('y', Units.roundFt(parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3b. Movable Hall Badge
  if (isRoomBadge) {
    const isSecondary = Boolean(elem.targetHallId);
    const targetHall = isSecondary
      ? allElements.find((el) => String(el.id || el._tempId) === String(elem.targetHallId))
      : null;
    const hallTitle = targetHall ? targetHall.name || targetHall.label : event?.name || 'Main Hall';

    const badgeFontSize = elem.fontSize ?? 12;
    const badgeFontWeight = elem.fontWeight ?? '700';
    const badgeFontStyle = elem.fontStyle ?? 'normal';
    const badgeTextColor = elem.textColor ?? '#18181b';
    const badgeBgColor = elem.color ?? '#ffffff';

    const BADGE_FS_MIN = 8;
    const BADGE_FS_MAX = 36;
    const adjustBadgeFontSize = (delta: number) => {
      const next = Math.min(BADGE_FS_MAX, Math.max(BADGE_FS_MIN, badgeFontSize + delta));
      onUpdateItemProp('fontSize', next);
    };

    const isBadgeBold = badgeFontWeight === '700' || badgeFontWeight === 'bold' || badgeFontWeight === '800' || badgeFontWeight === '900';

    return (
      <div className="border-b border-zinc-200">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50 border-b border-zinc-200">
          <span className="font-bold text-xs text-zinc-800">{hallTitle} Title Badge</span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded">Hall Badge</span>
        </div>

        <div className="p-3.5 flex flex-col gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Hall Name / Title</label>
            <input
              type="text"
              value={elem.label || ''}
              onChange={(e) => {
                onUpdateItemProp('label', e.target.value);
                if (elem.targetHallId) {
                  onUpdateSecondaryHallName(elem.targetHallId, e.target.value);
                } else {
                  onUpdateMainHall('name', e.target.value);
                }
              }}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md font-bold focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          {/* Font Size Control */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 mb-1.5">
              <Type className="w-3 h-3" />
              Font Size
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustBadgeFontSize(-1)}
                disabled={badgeFontSize <= BADGE_FS_MIN}
                className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Decrease font size"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min={BADGE_FS_MIN}
                max={BADGE_FS_MAX}
                step={1}
                value={badgeFontSize}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v >= BADGE_FS_MIN && v <= BADGE_FS_MAX) onUpdateItemProp('fontSize', v);
                }}
                className="w-14 px-2 py-1.5 text-center border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none font-bold tabular-nums"
              />
              <button
                type="button"
                onClick={() => adjustBadgeFontSize(1)}
                disabled={badgeFontSize >= BADGE_FS_MAX}
                className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Increase font size"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="text-zinc-400 text-[10px] font-medium ml-0.5">px</span>
            </div>
            {/* Quick Presets */}
            <div className="flex gap-1 mt-1.5">
              {[10, 12, 14, 16, 20, 24].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onUpdateItemProp('fontSize', size)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                    badgeFontSize === size
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Style Toggles */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1.5">Style</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateItemProp('fontWeight', isBadgeBold ? '400' : '700')}
                className={`flex items-center justify-center w-8 h-8 rounded-md border transition ${
                  isBadgeBold
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                    : 'bg-zinc-100 border-zinc-300 text-zinc-600 hover:bg-zinc-200'
                }`}
                title="Toggle Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateItemProp('fontStyle', badgeFontStyle === 'italic' ? 'normal' : 'italic')}
                className={`flex items-center justify-center w-8 h-8 rounded-md border transition ${
                  badgeFontStyle === 'italic'
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                    : 'bg-zinc-100 border-zinc-300 text-zinc-600 hover:bg-zinc-200'
                }`}
                title="Toggle Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={badgeTextColor.startsWith('#') ? badgeTextColor : '#18181b'}
                  onChange={(e) => onUpdateItemProp('textColor', e.target.value)}
                  className="w-7 h-7 rounded-md border border-zinc-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={badgeTextColor}
                  onChange={(e) => onUpdateItemProp('textColor', e.target.value)}
                  className="flex-1 min-w-0 px-1.5 py-1 border border-zinc-300 rounded-md text-[10px] font-mono focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Badge Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={badgeBgColor.startsWith('#') ? badgeBgColor : '#ffffff'}
                  onChange={(e) => onUpdateItemProp('color', e.target.value)}
                  className="w-7 h-7 rounded-md border border-zinc-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={badgeBgColor}
                  onChange={(e) => onUpdateItemProp('color', e.target.value)}
                  className="flex-1 min-w-0 px-1.5 py-1 border border-zinc-300 rounded-md text-[10px] font-mono focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Badge X (ft)</label>
              <input
                type="number"
                step={0.5}
                value={Units.roundFt(elem.x)}
                onChange={(e) => onUpdateItemProp('x', Units.roundFt(parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Badge Y (ft)</label>
              <input
                type="number"
                step={0.5}
                value={Units.roundFt(elem.y)}
                onChange={(e) => onUpdateItemProp('y', Units.roundFt(parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 font-medium">
            Drag this badge anywhere across the map to reposition it.
          </p>
        </div>
      </div>
    );
  }

  // 3c. Text Sign Element – rich formatting controls
  if (elem.type === 'text') {
    const currentFontSize = elem.fontSize ?? 10;
    const currentFontWeight = elem.fontWeight ?? '700';
    const currentFontStyle = elem.fontStyle ?? 'normal';
    const currentTextAlign = elem.textAlign ?? 'center';
    const currentLetterSpacing = elem.letterSpacing ?? 0;
    const currentTextTransform = elem.textTransform ?? 'uppercase';
    const hasBg = elem.color !== 'transparent' && elem.color !== 'none' && elem.badge !== false;
    const currentBgColor = hasBg ? (elem.color ?? '#27272a') : '#27272a';
    const currentTextColor = elem.textColor ?? (hasBg ? '#ffffff' : '#18181b');

    const FONT_SIZE_MIN = 5;
    const FONT_SIZE_MAX = 32;
    const FONT_SIZE_STEP = 1;

    const adjustFontSize = (delta: number) => {
      const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, currentFontSize + delta));
      onUpdateItemProp('fontSize', next);
    };

    const toggleBold = () => {
      onUpdateItemProp('fontWeight', currentFontWeight === '700' || currentFontWeight === 'bold' ? '400' : '700');
    };

    const toggleItalic = () => {
      onUpdateItemProp('fontStyle', currentFontStyle === 'italic' ? 'normal' : 'italic');
    };

    const isBold = currentFontWeight === '700' || currentFontWeight === 'bold' || currentFontWeight === '800' || currentFontWeight === '900';

    return (
      <div className="border-b border-zinc-200">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50 border-b border-zinc-200">
          <span className="font-bold text-xs text-zinc-800">{elem.label || elem.text || 'Text Sign'}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-violet-100 to-blue-100 text-violet-700 rounded capitalize">
            Text
          </span>
        </div>

        <div className="p-3.5 flex flex-col gap-3 text-xs">
          {/* Label / Text */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Label / Text</label>
            <input
              type="text"
              value={elem.label || elem.text || ''}
              onChange={(e) => onUpdateItemProp('text', e.target.value)}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          {/* Font Size Control */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 mb-1.5">
              <Type className="w-3 h-3" />
              Font Size
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustFontSize(-FONT_SIZE_STEP)}
                disabled={currentFontSize <= FONT_SIZE_MIN}
                className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Decrease font size"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step={FONT_SIZE_STEP}
                value={currentFontSize}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v >= FONT_SIZE_MIN && v <= FONT_SIZE_MAX) onUpdateItemProp('fontSize', v);
                }}
                className="w-14 px-2 py-1.5 text-center border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none font-bold tabular-nums"
              />
              <button
                type="button"
                onClick={() => adjustFontSize(FONT_SIZE_STEP)}
                disabled={currentFontSize >= FONT_SIZE_MAX}
                className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Increase font size"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="text-zinc-400 text-[10px] font-medium ml-0.5">px</span>
            </div>
            {/* Quick-size presets */}
            <div className="flex gap-1 mt-1.5">
              {[8, 10, 12, 14, 18, 24].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onUpdateItemProp('fontSize', size)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                    currentFontSize === size
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Style Toggles: Bold / Italic */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1.5">Style</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleBold}
                className={`flex items-center justify-center w-8 h-8 rounded-md border transition ${
                  isBold
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                    : 'bg-zinc-100 border-zinc-300 text-zinc-600 hover:bg-zinc-200'
                }`}
                title="Toggle Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={toggleItalic}
                className={`flex items-center justify-center w-8 h-8 rounded-md border transition ${
                  currentFontStyle === 'italic'
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                    : 'bg-zinc-100 border-zinc-300 text-zinc-600 hover:bg-zinc-200'
                }`}
                title="Toggle Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-6 bg-zinc-200 mx-0.5" />
              {/* Text Alignment */}
              {(['left', 'center', 'right'] as const).map((align) => {
                const AlignIcon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                return (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onUpdateItemProp('textAlign', align)}
                    className={`flex items-center justify-center w-8 h-8 rounded-md border transition ${
                      currentTextAlign === align
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-600 hover:bg-zinc-200'
                    }`}
                    title={`Align ${align}`}
                  >
                    <AlignIcon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Transform */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 mb-1.5">
              <CaseSensitive className="w-3 h-3" />
              Text Transform
            </label>
            <div className="flex gap-1">
              {([
                { val: 'none', label: 'None' },
                { val: 'uppercase', label: 'ABC' },
                { val: 'lowercase', label: 'abc' },
                { val: 'capitalize', label: 'Abc' },
              ] as const).map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onUpdateItemProp('textTransform', val)}
                  className={`flex-1 px-1.5 py-1 rounded-md text-[10px] font-bold border transition ${
                    currentTextTransform === val
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Letter Spacing */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 mb-1.5">
              <LetterText className="w-3 h-3" />
              Letter Spacing
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={-1}
                max={5}
                step={0.1}
                value={currentLetterSpacing}
                onChange={(e) => onUpdateItemProp('letterSpacing', parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-zinc-900 cursor-pointer"
              />
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums w-8 text-right">{currentLetterSpacing.toFixed(1)}</span>
            </div>
          </div>

          {/* Background Style Toggle */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1.5">Background</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => {
                  const restoreColor = currentBgColor === 'transparent' ? '#27272a' : currentBgColor;
                  onUpdateItemProp('color', restoreColor);
                  onUpdateItemProp('badge', true);
                  if (elem.textColor === '#18181b') {
                    onUpdateItemProp('textColor', '#ffffff');
                  }
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-bold transition ${
                  hasBg
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded bg-zinc-800 border border-zinc-600" />
                Badge Box
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateItemProp('color', 'transparent');
                  onUpdateItemProp('badge', false);
                  if (!elem.textColor || elem.textColor.toLowerCase() === '#ffffff') {
                    onUpdateItemProp('textColor', '#18181b');
                  }
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-bold transition ${
                  !hasBg
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <span className="text-[11px] text-zinc-400 font-mono leading-none">Ø</span>
                None / Clear
              </button>
            </div>
          </div>

          {/* Colors */}
          <div className={`grid ${hasBg ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentTextColor.startsWith('#') ? currentTextColor : '#18181b'}
                  onChange={(e) => onUpdateItemProp('textColor', e.target.value)}
                  className="w-7 h-7 rounded-md border border-zinc-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={currentTextColor}
                  onChange={(e) => onUpdateItemProp('textColor', e.target.value)}
                  className="flex-1 min-w-0 px-1.5 py-1 border border-zinc-300 rounded-md text-[10px] font-mono focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
            </div>
            {hasBg && (
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Box Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentBgColor.startsWith('#') ? currentBgColor : '#27272a'}
                    onChange={(e) => onUpdateItemProp('color', e.target.value)}
                    className="w-7 h-7 rounded-md border border-zinc-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={currentBgColor}
                    onChange={(e) => onUpdateItemProp('color', e.target.value)}
                    className="flex-1 min-w-0 px-1.5 py-1 border border-zinc-300 rounded-md text-[10px] font-mono focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">X Position</label>
              <input
                type="number"
                step={0.5}
                value={Units.roundFt(elem.x)}
                onChange={(e) => onUpdateItemProp('x', Units.roundFt(parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Y Position</label>
              <input
                type="number"
                step={0.5}
                value={Units.roundFt(elem.y)}
                onChange={(e) => onUpdateItemProp('y', Units.roundFt(parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Size */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Width (ft)</label>
              <input
                type="number"
                step={0.5}
                min={2}
                value={elem.width || 6}
                onChange={(e) => onUpdateItemProp('width', parseFloat(e.target.value) || 6)}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Height (ft)</label>
              <input
                type="number"
                step={0.5}
                min={1}
                value={elem.height || 2.2}
                onChange={(e) => onUpdateItemProp('height', parseFloat(e.target.value) || 2.2)}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Orientation</label>
            <div className="grid grid-cols-2 gap-2 mb-1.5">
              <button
                type="button"
                onClick={onFlipSelected}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md font-medium text-zinc-700 transition"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>Flip (F)</span>
              </button>
              <button
                type="button"
                onClick={onRotateSelected}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md font-medium text-zinc-700 transition"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate (R)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3d. Other Architectural Element (Door, Structure)
  return (
    <div className="border-b border-zinc-200">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <span className="font-bold text-xs text-zinc-800">{elem.label || elem.text || elem.type}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-200 text-zinc-700 rounded capitalize">
          {elem.type}
        </span>
      </div>

      <div className="p-3.5 flex flex-col gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Label / Text</label>
          <input
            type="text"
            value={elem.label || elem.text || ''}
            onChange={(e) => onUpdateItemProp('text', e.target.value)}
            className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">X Position</label>
            <input
              type="number"
              step={0.5}
              value={Units.roundFt(elem.x)}
              onChange={(e) => onUpdateItemProp('x', Units.roundFt(parseFloat(e.target.value) || 0))}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Y Position</label>
            <input
              type="number"
              step={0.5}
              value={Units.roundFt(elem.y)}
              onChange={(e) => onUpdateItemProp('y', Units.roundFt(parseFloat(e.target.value) || 0))}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Orientation</label>
          <div className="grid grid-cols-2 gap-2 mb-1.5">
            <button
              type="button"
              onClick={onFlipSelected}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md font-medium text-zinc-700 transition"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>Flip (F)</span>
            </button>
            <button
              type="button"
              onClick={onRotateSelected}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md font-medium text-zinc-700 transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate (R)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
