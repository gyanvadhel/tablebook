'use client';

import React from 'react';
import {
  FlipHorizontal,
  RotateCw,
  Copy,
  Trash2,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from 'lucide-react';
import type { StudioSelectedItem, AlignmentType, DistributeType } from '@/types';

interface FloatingToolbarProps {
  selectedItem: StudioSelectedItem | null;
  selectedCount?: number;
  position: { left: number; top: number } | null;
  onFlip: () => void;
  onRotate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAlign?: (alignment: AlignmentType) => void;
  onDistribute?: (distribute: DistributeType) => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  selectedItem,
  selectedCount = 1,
  position,
  onFlip,
  onRotate,
  onDuplicate,
  onDelete,
  onAlign,
  onDistribute,
}) => {
  if ((!selectedItem && selectedCount <= 1) || !position) return null;

  const stopProp = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const isMulti = selectedCount > 1;

  return (
    <div
      data-floating-toolbar="true"
      onPointerDown={stopProp}
      onMouseDown={stopProp}
      onClick={stopProp}
      className="absolute z-50 flex flex-col items-center pointer-events-auto select-none transition-transform -translate-x-1/2 -translate-y-full -mt-3"
      style={{ left: `${position.left}px`, top: `${position.top}px` }}
    >
      <div className="bg-zinc-800 text-zinc-300 text-[9px] font-bold px-2 py-0.5 rounded-t tracking-wider uppercase flex items-center gap-1.5">
        {isMulti ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            <span>{selectedCount} Tables Selected</span>
          </>
        ) : (
          <span>Edit</span>
        )}
      </div>

      <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-700 rounded-md p-1 shadow-2xl">
        {/* Alignment & Distribution Tools (Multi-Select Only) */}
        {isMulti && onAlign && onDistribute && (
          <>
            {/* Horizontal Alignment */}
            <button
              type="button"
              onPointerDown={stopProp}
              onClick={(e) => {
                e.stopPropagation();
                onAlign('left');
              }}
              title="Align Left"
              className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
            >
              <AlignStartHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onPointerDown={stopProp}
              onClick={(e) => {
                e.stopPropagation();
                onAlign('center-x');
              }}
              title="Center Horizontally"
              className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
            >
              <AlignCenterHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onPointerDown={stopProp}
              onClick={(e) => {
                e.stopPropagation();
                onAlign('right');
              }}
              title="Align Right"
              className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
            >
              <AlignEndHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Vertical Alignment */}
            <button
              type="button"
              onPointerDown={stopProp}
              onClick={(e) => {
                e.stopPropagation();
                onAlign('top');
              }}
              title="Align Top"
              className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
            >
              <AlignStartVertical className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onPointerDown={stopProp}
              onClick={(e) => {
                e.stopPropagation();
                onAlign('center-y');
              }}
              title="Center Vertically"
              className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
            >
              <AlignCenterVertical className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onPointerDown={stopProp}
              onClick={(e) => {
                e.stopPropagation();
                onAlign('bottom');
              }}
              title="Align Bottom"
              className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
            >
              <AlignEndVertical className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-zinc-700 mx-0.5" />

            {/* Distribute Evenly */}
            <button
              type="button"
              onPointerDown={stopProp}
              onClick={(e) => {
                e.stopPropagation();
                onDistribute('horizontal');
              }}
              title="Distribute Horizontally (Equal Spacing)"
              className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
            >
              <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onPointerDown={stopProp}
              onClick={(e) => {
                e.stopPropagation();
                onDistribute('vertical');
              }}
              title="Distribute Vertically (Equal Spacing)"
              className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
            >
              <AlignVerticalDistributeCenter className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-zinc-700 mx-0.5" />
          </>
        )}

        {/* Flip / Invert */}
        <button
          type="button"
          onPointerDown={stopProp}
          onClick={(e) => {
            e.stopPropagation();
            onFlip();
          }}
          title={isMulti ? 'Flip / Invert All (F)' : 'Flip / Invert (F)'}
          className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
        </button>

        {/* Rotate */}
        <button
          type="button"
          onPointerDown={stopProp}
          onClick={(e) => {
            e.stopPropagation();
            onRotate();
          }}
          title={isMulti ? 'Rotate All 90° (R)' : 'Rotate 90° (R)'}
          className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Duplicate */}
        <button
          type="button"
          onPointerDown={stopProp}
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title={isMulti ? 'Duplicate All (Shift+D)' : 'Duplicate (Shift+D)'}
          className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        <button
          type="button"
          onPointerDown={stopProp}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title={isMulti ? 'Delete All Selected (Del)' : 'Delete (Del)'}
          className="p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 active:scale-95 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
