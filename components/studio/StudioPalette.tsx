'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  LayoutGrid,
  Plus,
  DoorOpen,
  Square,
  Circle,
  ArrowRight,
} from 'lucide-react';

interface StudioPaletteProps {
  onAddTable: (shape: 'single' | 'double' | 'L-Stall' | 'L-Stall-Inverted' | 'T-Stall' | 'Pod') => void;
  onAddHallRoom: (preset: { width: number; height: number; name?: string }) => void;
  onPromptCustomHall: () => void;
  onAddDoor: (doorType: 'entrance' | 'exit' | 'double' | 'window') => void;
  onAddText: (text: string, options?: { badge?: boolean; color?: string }) => void;
  onPromptCustomText: () => void;
  onAddStructure: (structType: 'pillar_square' | 'pillar_round' | 'stage' | 'arrow') => void;
}

export const StudioPalette: React.FC<StudioPaletteProps> = ({
  onAddTable,
  onAddHallRoom,
  onPromptCustomHall,
  onAddDoor,
  onAddText,
  onPromptCustomText,
  onAddStructure,
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    stalls: true,
    halls: true,
    doors: true,
    text: false,
    structures: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-[220px] bg-white border-r border-zinc-200 flex flex-col h-full overflow-y-auto select-none shrink-0 text-zinc-800 text-xs">
      {/* 1. Stalls Section */}
      <div className="border-b border-zinc-100">
        <button
          type="button"
          onClick={() => toggleSection('stalls')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-50 font-bold text-[11px] text-zinc-500 uppercase tracking-wider transition"
        >
          <span>Stalls</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              openSections.stalls ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {openSections.stalls && (
          <div className="px-2 pb-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => onAddTable('single')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition text-left"
              title="Single Table — 4 ft × 2 ft"
            >
              <span className="w-5 text-center font-bold text-zinc-400">▬</span>
              <span className="flex-1 font-medium">Single <small className="text-zinc-400">4'×2'</small></span>
            </button>
            <button
              type="button"
              onClick={() => onAddTable('double')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition text-left"
              title="Double Table — 8 ft × 2 ft"
            >
              <span className="w-5 text-center font-bold text-zinc-400">▬▬</span>
              <span className="flex-1 font-medium">Double <small className="text-zinc-400">8'×2'</small></span>
            </button>
            <button
              type="button"
              onClick={() => onAddTable('L-Stall')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition text-left"
              title="L-Stall Corner — 6 ft × 4 ft"
            >
              <span className="w-5 text-center font-bold text-zinc-400">└</span>
              <span className="flex-1 font-medium">L-Stall <small className="text-zinc-400">6'×4'</small></span>
            </button>
            <button
              type="button"
              onClick={() => onAddTable('L-Stall-Inverted')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition text-left"
              title="L-Inverted Corner — 6 ft × 4 ft"
            >
              <span className="w-5 text-center font-bold text-zinc-400">┘</span>
              <span className="flex-1 font-medium">L-Inverted <small className="text-zinc-400">6'×4'</small></span>
            </button>
            <button
              type="button"
              onClick={() => onAddTable('T-Stall')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition text-left"
              title="T-Stall — 6 ft × 4 ft"
            >
              <span className="w-5 text-center font-bold text-zinc-400">┴</span>
              <span className="flex-1 font-medium">T-Stall <small className="text-zinc-400">6'×4'</small></span>
            </button>
            <button
              type="button"
              onClick={() => onAddTable('Pod')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition text-left"
              title="Pod Cluster — 8 ft × 4 ft"
            >
              <span className="w-5 text-center font-bold text-zinc-400">⊞</span>
              <span className="flex-1 font-medium">Pod (4-Pack) <small className="text-zinc-400">8'×4'</small></span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Halls / Rooms */}
      <div className="border-b border-zinc-100">
        <button
          type="button"
          onClick={() => toggleSection('halls')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-50 font-bold text-[11px] text-zinc-500 uppercase tracking-wider transition"
        >
          <span>Halls / Rooms</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              openSections.halls ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {openSections.halls && (
          <div className="px-2 pb-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => onAddHallRoom({ width: 30, height: 20 })}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition text-left"
              title="Standard Secondary Hall — 30' × 20'"
            >
              <span className="w-5 text-center font-bold text-zinc-400">▢</span>
              <span className="flex-1 font-medium">Standard <small className="text-zinc-400">30'×20'</small></span>
            </button>
            <button
              type="button"
              onClick={() => onAddHallRoom({ width: 50, height: 30 })}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition text-left"
              title="Large Hall — 50' × 30'"
            >
              <span className="w-5 text-center font-bold text-zinc-400">▢</span>
              <span className="flex-1 font-medium">Large Hall <small className="text-zinc-400">50'×30'</small></span>
            </button>
            <button
              type="button"
              onClick={() => onAddHallRoom({ width: 20, height: 15 })}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition text-left"
              title="Gallery Room — 20' × 15'"
            >
              <span className="w-5 text-center font-bold text-zinc-400">▢</span>
              <span className="flex-1 font-medium">Gallery <small className="text-zinc-400">20'×15'</small></span>
            </button>
            <button
              type="button"
              onClick={onPromptCustomHall}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-900 font-semibold transition text-left"
            >
              <Plus className="w-4 h-4 text-zinc-500" />
              <span>Custom Hall...</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Doors & Openings */}
      <div className="border-b border-zinc-100">
        <button
          type="button"
          onClick={() => toggleSection('doors')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-50 font-bold text-[11px] text-zinc-500 uppercase tracking-wider transition"
        >
          <span>Doors &amp; Openings</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              openSections.doors ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {openSections.doors && (
          <div className="px-2 pb-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => onAddDoor('entrance')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-800 transition text-left"
            >
              <DoorOpen className="w-4 h-4 text-zinc-600" />
              <span className="font-semibold">Main Entrance</span>
            </button>
            <button
              type="button"
              onClick={() => onAddDoor('exit')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-800 transition text-left"
            >
              <DoorOpen className="w-4 h-4 text-zinc-600" />
              <span className="font-semibold">Emergency Exit</span>
            </button>
            <button
              type="button"
              onClick={() => onAddDoor('double')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 transition text-left"
            >
              <DoorOpen className="w-4 h-4 text-zinc-400" />
              <span>Double Door (6')</span>
            </button>
            <button
              type="button"
              onClick={() => onAddDoor('window')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 transition text-left"
            >
              <Square className="w-4 h-4 text-zinc-400" />
              <span>Wall Window (6')</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Text & Signs */}
      <div className="border-b border-zinc-100">
        <button
          type="button"
          onClick={() => toggleSection('text')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-50 font-bold text-[11px] text-zinc-500 uppercase tracking-wider transition"
        >
          <span>Text &amp; Signs</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              openSections.text ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {openSections.text && (
          <div className="px-2 pb-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => onAddText('MAIN ENTRANCE', { badge: true, color: '#27272a' })}
              className="px-2.5 py-1.5 rounded hover:bg-zinc-100 text-left font-medium text-zinc-700 truncate"
            >
              Entrance Sign
            </button>
            <button
              type="button"
              onClick={() => onAddText('EMERGENCY EXIT', { badge: true, color: '#27272a' })}
              className="px-2.5 py-1.5 rounded hover:bg-zinc-100 text-left font-medium text-zinc-700 truncate"
            >
              Exit Sign
            </button>
            <button
              type="button"
              onClick={() => onAddText('REGISTRATION DESK', { badge: true, color: '#27272a' })}
              className="px-2.5 py-1.5 rounded hover:bg-zinc-100 text-left font-medium text-zinc-700 truncate"
            >
              Registration Desk
            </button>
            <button
              type="button"
              onClick={() => onAddText('FOOD COURT', { badge: true, color: '#27272a' })}
              className="px-2.5 py-1.5 rounded hover:bg-zinc-100 text-left font-medium text-zinc-700 truncate"
            >
              Food Court
            </button>
            <button
              type="button"
              onClick={() => onAddText('RESTROOMS', { badge: true, color: '#27272a' })}
              className="px-2.5 py-1.5 rounded hover:bg-zinc-100 text-left font-medium text-zinc-700 truncate"
            >
              Restrooms
            </button>
            <button
              type="button"
              onClick={onPromptCustomText}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-zinc-100 text-left font-semibold text-zinc-900"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-500" />
              <span>Custom Label...</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Structures */}
      <div className="border-b border-zinc-100">
        <button
          type="button"
          onClick={() => toggleSection('structures')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-50 font-bold text-[11px] text-zinc-500 uppercase tracking-wider transition"
        >
          <span>Structures</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              openSections.structures ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {openSections.structures && (
          <div className="px-2 pb-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => onAddStructure('pillar_square')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 text-zinc-700 text-left"
            >
              <Square className="w-3.5 h-3.5 text-zinc-400" />
              <span>Pillar (2'×2')</span>
            </button>
            <button
              type="button"
              onClick={() => onAddStructure('pillar_round')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 text-zinc-700 text-left"
            >
              <Circle className="w-3.5 h-3.5 text-zinc-400" />
              <span>Column (2' dia)</span>
            </button>
            <button
              type="button"
              onClick={() => onAddStructure('stage')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 text-zinc-700 text-left"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-zinc-400" />
              <span>Stage (16'×8')</span>
            </button>
            <button
              type="button"
              onClick={() => onAddStructure('arrow')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 text-zinc-700 text-left"
            >
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              <span>Flow Arrow</span>
            </button>
          </div>
        )}
      </div>

      {/* Shortcuts Footer */}
      <div className="mt-auto p-3 bg-zinc-50 border-t border-zinc-200">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Shortcuts</div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-600">
          <div><strong className="text-zinc-900 font-bold">F</strong> Flip</div>
          <div><strong className="text-zinc-900 font-bold">R</strong> Rotate</div>
          <div><strong className="text-zinc-900 font-bold">Shift+D</strong> Clone</div>
          <div><strong className="text-zinc-900 font-bold">Del</strong> Delete</div>
        </div>
      </div>
    </aside>
  );
};
