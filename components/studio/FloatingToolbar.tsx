'use client';

import React from 'react';
import { FlipHorizontal, RotateCw, Copy, Trash2 } from 'lucide-react';
import type { StudioSelectedItem } from '@/types';

interface FloatingToolbarProps {
  selectedItem: StudioSelectedItem | null;
  position: { left: number; top: number } | null;
  onFlip: () => void;
  onRotate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  selectedItem,
  position,
  onFlip,
  onRotate,
  onDuplicate,
  onDelete,
}) => {
  if (!selectedItem || !position) return null;

  return (
    <div
      data-floating-toolbar="true"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-50 flex flex-col items-center pointer-events-auto select-none transition-transform -translate-x-1/2 -translate-y-full -mt-3"
      style={{ left: `${position.left}px`, top: `${position.top}px` }}
    >
      <div className="bg-zinc-800 text-zinc-300 text-[9px] font-bold px-2 py-0.5 rounded-t tracking-wider uppercase">
        Edit
      </div>
      <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-700 rounded-md p-1 shadow-2xl">
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onFlip();
          }}
          title="Flip / Invert (F)"
          className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRotate();
          }}
          title="Rotate 90° (R)"
          className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate (Shift+D)"
          className="p-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete (Del)"
          className="p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
