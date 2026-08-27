'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RotateCw } from 'lucide-react';

interface RotateFloorMenuProps {
  onRotateEntireFloor: (mode: 'cw' | 'ccw' | '180') => void;
}

export const RotateFloorMenu: React.FC<RotateFloorMenuProps> = ({ onRotateEntireFloor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-300 rounded-md text-slate-700 transition"
        title="Rotate Entire Hall Orientation"
      >
        <RotateCw className="w-3.5 h-3.5" />
        <span>Rotate Floor</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[210px] bg-white border border-slate-200 rounded-lg p-1.5 shadow-xl flex flex-col gap-1 text-slate-700">
          <button
            type="button"
            onClick={() => {
              onRotateEntireFloor('cw');
              setIsOpen(false);
            }}
            className="flex items-center justify-between px-3 py-2 text-xs font-medium rounded hover:bg-slate-100 transition text-left"
          >
            <span>Rotate 90° Clockwise</span>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">CW</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onRotateEntireFloor('ccw');
              setIsOpen(false);
            }}
            className="flex items-center justify-between px-3 py-2 text-xs font-medium rounded hover:bg-slate-100 transition text-left"
          >
            <span>Rotate 90° Counter-CW</span>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">CCW</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onRotateEntireFloor('180');
              setIsOpen(false);
            }}
            className="flex items-center justify-between px-3 py-2 text-xs font-medium rounded hover:bg-slate-100 transition text-left"
          >
            <span>Rotate 180° Inverted</span>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">180°</span>
          </button>
        </div>
      )}
    </div>
  );
};
