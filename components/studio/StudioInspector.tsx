'use client';

import React from 'react';
import { Units } from '@/lib/units';
import { FlipHorizontal, RotateCw } from 'lucide-react';
import type { StudioSelectedItem, EventItem, TableItem, HallElement } from '@/types';

interface StudioInspectorProps {
  selectedItem: StudioSelectedItem | null;
  event: EventItem | null;
  hallWidth: number;
  hallHeight: number;
  onUpdateMainHall: (prop: 'name' | 'hall_width' | 'hall_height' | 'venue', val: any) => void;
  onUpdateItemProp: (prop: string, val: any) => void;
  onRotateSelected: () => void;
  onFlipSelected: () => void;
  onToggleInvertL: () => void;
  onUpdateSecondaryHallName: (targetHallId: string, name: string) => void;
  allElements: HallElement[];
}

export const StudioInspector: React.FC<StudioInspectorProps> = ({
  selectedItem,
  event,
  hallWidth,
  hallHeight,
  onUpdateMainHall,
  onUpdateItemProp,
  onRotateSelected,
  onFlipSelected,
  onToggleInvertL,
  onUpdateSecondaryHallName,
  allElements,
}) => {
  // 1. If nothing selected: show Main Hall properties
  if (!selectedItem) {
    const areaSqFt = Math.round(hallWidth * hallHeight);

    return (
      <div className="border-b border-zinc-200">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50 border-b border-zinc-200">
          <span className="font-bold text-xs uppercase tracking-wider text-zinc-600">Main Hall Properties</span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded">Main Hall</span>
        </div>

        <div className="p-3.5 flex flex-col gap-3 text-xs">
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
                min={10}
                max={500}
                value={hallWidth}
                onChange={(e) => onUpdateMainHall('hall_width', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-none text-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Hall Depth (ft)</label>
              <input
                type="number"
                min={10}
                max={500}
                value={hallHeight}
                onChange={(e) => onUpdateMainHall('hall_height', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-none text-zinc-900"
              />
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 font-medium">
            {Units.formatDims(hallWidth, hallHeight)} &middot; {areaSqFt.toLocaleString('en-IN')} sq ft
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
            Click any stall, door, sign, or secondary hall to edit its properties.
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
                onChange={(e) => onUpdateItemProp('width', Units.clampStallFt(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Depth (ft)</label>
              <input
                type="number"
                step={0.25}
                value={table.height}
                onChange={(e) => onUpdateItemProp('height', Units.clampStallFt(e.target.value))}
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
                value={Units.roundFt(table.x)}
                onChange={(e) => onUpdateItemProp('x', Units.roundFt(parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Y Position</label>
              <input
                type="number"
                step={0.25}
                value={Units.roundFt(table.y)}
                onChange={(e) => onUpdateItemProp('y', Units.roundFt(parseFloat(e.target.value) || 0))}
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

    return (
      <div className="border-b border-zinc-200">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50 border-b border-zinc-200">
          <span className="font-bold text-xs text-zinc-800">{hallTitle} Title Badge</span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded">Movable Badge</span>
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

  // 3c. Other Architectural Element (Door, Sign, Structure)
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
