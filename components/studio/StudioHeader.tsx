'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ZoomIn, ZoomOut, Save } from 'lucide-react';
import { Units } from '@/lib/units';
import { RotateFloorMenu } from './RotateFloorMenu';
import type { EventItem } from '@/types';

interface StudioHeaderProps {
  event: EventItem | null;
  hallWidth: number;
  hallHeight: number;
  snapGrid: number;
  onSetSnapGrid: (val: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onRotateFloor: (mode: 'cw' | 'ccw' | '180') => void;
  onSave: () => void;
  isSaving: boolean;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  event,
  hallWidth,
  hallHeight,
  snapGrid,
  onSetSnapGrid,
  onZoomIn,
  onZoomOut,
  onResetView,
  onRotateFloor,
  onSave,
  isSaving,
}) => {
  return (
    <header className="h-12 bg-white border-b border-zinc-200 px-4 flex items-center justify-between shrink-0 z-20 select-none font-sans">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/events"
          className="w-8 h-8 flex items-center justify-center rounded-md bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 transition"
          title="Back to Exhibitions"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-xs md:text-sm font-bold text-zinc-900 truncate max-w-xs md:max-w-md">
            {event?.name ? event.name : 'Floor Plan Studio'}
          </h1>
          <span className="text-xs font-semibold px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-600 rounded">
            {Units.formatDims(hallWidth, hallHeight)}
          </span>
        </div>
      </div>

      {/* Center subtitle */}
      <div className="hidden md:block text-xs text-zinc-500 font-medium truncate max-w-sm text-center">
        {event?.venue ? `${event.venue} · Architectural Scale` : 'Architectural Scale (Feet)'}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Zoom Controls */}
        <div className="flex items-center border border-zinc-200 rounded-md bg-white overflow-hidden">
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out (-)"
            className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 border-r border-zinc-200 transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetView}
            title="Fit to Screen"
            className="px-2 h-7 flex items-center justify-center text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100 border-r border-zinc-200 transition"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In (+)"
            className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Snap Grid Selector */}
        <select
          value={snapGrid}
          onChange={(e) => onSetSnapGrid(parseFloat(e.target.value))}
          className="text-xs font-medium bg-white border border-zinc-300 text-zinc-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
        >
          <option value={1}>Snap: 1 ft</option>
          <option value={0.5}>Snap: 6 in</option>
          <option value={0.25}>Snap: 3 in</option>
          <option value={0}>Snap: Off</option>
        </select>

        {/* Rotate Floor Dropdown */}
        <RotateFloorMenu onRotateEntireFloor={onRotateFloor} />

        {/* Save Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold rounded-md shadow-xs transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving...' : 'Save Plan'}</span>
        </button>
      </div>
    </header>
  );
};
