'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Link2,
  Ruler,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Maximize2,
  Trash2,
  X,
  Users,
  Loader2,
  RotateCw,
} from 'lucide-react';
import { Units } from '@/lib/units';
import { isSafeBlueprintUrl, BLUEPRINT_MIN_FT, BLUEPRINT_MAX_FT } from '@/lib/blueprint';
import { measureAspect } from '@/lib/clientImage';
import type { BlueprintPlacement } from '@/lib/blueprint';

interface BlueprintPanelProps {
  open: boolean;
  onClose: () => void;
  url: string | null;
  placement: BlueprintPlacement;
  naturalAspect: number | null;
  hallWidth: number;
  hallHeight: number;
  isCalibrating: boolean;
  onAttach: (url: string, aspect: number | null) => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<BlueprintPlacement>) => void;
  onFitToHall: () => void;
  onResetAspect: () => void;
  onStartCalibration: () => void;
  onCancelCalibration: () => void;
  onNotify: (text: string, type?: 'info' | 'success' | 'error') => void;
}

/**
 * A number input that lets you type freely and only commits on blur or Enter,
 * so a half-typed "1" on the way to "12" never snaps to the minimum.
 */
const NumberField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  onCommit: (val: number) => void;
}> = ({ label, value, min, max, step = 0.5, suffix, disabled, onCommit }) => {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const parsed = parseFloat(draft);
    if (isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    onCommit(Math.max(min, Math.min(max, Math.round(parsed * 100) / 100)));
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
        {label}
        {suffix ? <span className="text-zinc-400 normal-case tracking-normal"> ({suffix})</span> : null}
      </span>
      <input
        type="number"
        step={step}
        value={draft}
        disabled={disabled}
        onFocus={() => setEditing(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="w-full px-2 py-1.5 border border-zinc-300 rounded-md text-xs text-zinc-900 tabular-nums focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-400"
      />
    </label>
  );
};

const ToggleRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  hint?: string;
  active: boolean;
  onToggle: () => void;
}> = ({ icon, label, hint, active, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={active}
    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-zinc-50 transition text-left"
  >
    <span className={active ? 'text-zinc-900' : 'text-zinc-400'}>{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-xs font-semibold text-zinc-800">{label}</span>
      {hint && <span className="block text-[10px] text-zinc-500 leading-tight">{hint}</span>}
    </span>
    <span
      className={`relative w-8 h-[18px] rounded-full shrink-0 transition ${active ? 'bg-zinc-900' : 'bg-zinc-300'}`}
    >
      <span
        className={`absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm transition-all ${
          active ? 'left-[16px]' : 'left-[2px]'
        }`}
      />
    </span>
  </button>
);

export const BlueprintPanel: React.FC<BlueprintPanelProps> = ({
  open,
  onClose,
  url,
  placement,
  naturalAspect,
  hallWidth,
  hallHeight,
  isCalibrating,
  onAttach,
  onRemove,
  onUpdate,
  onFitToHall,
  onResetAspect,
  onStartCalibration,
  onCancelCalibration,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [isDropTarget, setIsDropTarget] = useState(false);

  useEffect(() => {
    if (open) setUrlDraft('');
  }, [open]);

  if (!open) return null;

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/uploads', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const aspect = await measureAspect(data.url);
      onAttach(data.url, aspect);
      onNotify(
        data.deduplicated
          ? `Blueprint attached · already on file, reused (${(data.bytes / 1024).toFixed(0)} KB)`
          : `Blueprint attached · ${(data.bytes / 1024).toFixed(0)} KB`,
        'success'
      );
    } catch (err: any) {
      onNotify(err.message || 'Failed to upload blueprint', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const attachFromUrl = async () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;

    if (!isSafeBlueprintUrl(trimmed)) {
      onNotify('That does not look like an image URL. Use http(s):// or a /uploads path.', 'error');
      return;
    }

    setIsUploading(true);
    const aspect = await measureAspect(trimmed);
    setIsUploading(false);

    if (aspect === null) {
      onNotify('Could not load that image. Check the URL allows hotlinking.', 'error');
      return;
    }

    onAttach(trimmed, aspect);
    setUrlDraft('');
    onNotify('Blueprint attached from URL', 'success');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const opacityPct = Math.round(placement.opacity * 100);
  const scaleNote = naturalAspect
    ? `${Units.formatFeetShort(placement.width)} wide at ${(placement.width / hallWidth * 100).toFixed(0)}% of hall width`
    : null;

  return (
    <div
      data-blueprint-panel
      className="absolute top-2 right-2 z-40 w-[320px] max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-2xl font-sans"
    >
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-zinc-200 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Ruler className="w-3.5 h-3.5 text-zinc-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">Blueprint Underlay</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!url ? (
        /* ---------- Empty state: attach an image ---------- */
        <div className="p-3.5 flex flex-col gap-3">
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Drop in a venue floor plan, calibrate it against a known measurement, then trace your stalls
            straight over it at true scale.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDropTarget(true);
            }}
            onDragLeave={() => setIsDropTarget(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 py-7 px-3 border-2 border-dashed rounded-lg cursor-pointer transition ${
              isDropTarget ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50'
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            ) : (
              <Upload className="w-5 h-5 text-zinc-400" />
            )}
            <span className="text-xs font-semibold text-zinc-700">
              {isUploading ? 'Uploading…' : 'Drop an image or browse'}
            </span>
            <span className="text-[10px] text-zinc-400">PNG, JPG, GIF or WEBP · up to 10 MB</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />

          <div className="flex items-center gap-2">
            <hr className="flex-1 border-zinc-200" />
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">or</span>
            <hr className="flex-1 border-zinc-200" />
          </div>

          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Link2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') attachFromUrl();
                }}
                placeholder="https://…/floor-plan.png"
                className="w-full pl-7 pr-2 py-1.5 border border-zinc-300 rounded-md text-xs focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={attachFromUrl}
              disabled={!urlDraft.trim() || isUploading}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-bold rounded-md transition"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        /* ---------- Loaded state: place and calibrate ---------- */
        <div className="flex flex-col">
          {/* Preview */}
          <div className="p-3.5 pb-3 border-b border-zinc-100">
            <div className="relative h-24 rounded-lg border border-zinc-200 bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%,transparent_75%,#f4f4f5_75%),linear-gradient(45deg,#f4f4f5_25%,transparent_25%,transparent_75%,#f4f4f5_75%)] bg-[length:12px_12px] bg-[position:0_0,6px_6px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Blueprint preview" className="w-full h-full object-contain" />
            </div>
            <p className="mt-1.5 text-[10px] text-zinc-400 truncate" title={url}>
              {url.split('/').pop()}
            </p>
          </div>

          {/* Calibration — the headline action */}
          <div className="p-3.5 border-b border-zinc-100">
            {isCalibrating ? (
              <div className="rounded-lg border border-zinc-900 bg-zinc-900 p-3 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Ruler className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">Calibrating…</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed mb-2.5">
                  Click two points on the plan that span a distance you know, then type what it measures
                  in real life.
                </p>
                <button
                  type="button"
                  onClick={onCancelCalibration}
                  className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-md transition"
                >
                  Cancel (Esc)
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onStartCalibration}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-md shadow-sm transition"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  Calibrate to a known distance
                </button>
                <p className="mt-1.5 text-[10px] text-zinc-500 leading-relaxed">
                  Match the image to real feet so traced stalls land on true coordinates.
                </p>
              </>
            )}
          </div>

          {/* Opacity */}
          <div className="p-3.5 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Opacity</span>
              <span className="text-[11px] font-bold text-zinc-900 tabular-nums">{opacityPct}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={placement.opacity}
              onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-zinc-900 cursor-pointer"
            />
          </div>

          {/* Toggles */}
          <div className="p-2 border-b border-zinc-100">
            <ToggleRow
              icon={placement.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              label="Show in studio"
              active={placement.visible}
              onToggle={() => onUpdate({ visible: !placement.visible })}
            />
            <ToggleRow
              icon={placement.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              label="Lock placement"
              hint="Stops drag and resize — calibration still works"
              active={placement.locked}
              onToggle={() => onUpdate({ locked: !placement.locked })}
            />
            <ToggleRow
              icon={<Users className="w-4 h-4" />}
              label="Show to visitors"
              hint="Also draws it on the public map"
              active={placement.showToVisitors}
              onToggle={() => onUpdate({ showToVisitors: !placement.showToVisitors })}
            />
          </div>

          {/* Placement numbers */}
          <div className="p-3.5 border-b border-zinc-100 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Placement</span>
              {placement.locked && <span className="text-[10px] text-zinc-400 font-medium">Locked</span>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="X"
                suffix="ft"
                value={placement.x}
                min={-BLUEPRINT_MAX_FT}
                max={BLUEPRINT_MAX_FT}
                disabled={placement.locked}
                onCommit={(v) => onUpdate({ x: v })}
              />
              <NumberField
                label="Y"
                suffix="ft"
                value={placement.y}
                min={-BLUEPRINT_MAX_FT}
                max={BLUEPRINT_MAX_FT}
                disabled={placement.locked}
                onCommit={(v) => onUpdate({ y: v })}
              />
              <NumberField
                label="Width"
                suffix="ft"
                value={placement.width}
                min={BLUEPRINT_MIN_FT}
                max={BLUEPRINT_MAX_FT}
                disabled={placement.locked}
                onCommit={(v) => {
                  // Keep the image undistorted: width drives height.
                  const aspect = naturalAspect || placement.width / placement.height;
                  onUpdate({ width: v, height: Math.round((v / aspect) * 100) / 100 });
                }}
              />
              <NumberField
                label="Height"
                suffix="ft"
                value={placement.height}
                min={BLUEPRINT_MIN_FT}
                max={BLUEPRINT_MAX_FT}
                disabled={placement.locked}
                onCommit={(v) => {
                  const aspect = naturalAspect || placement.width / placement.height;
                  onUpdate({ height: v, width: Math.round(v * aspect * 100) / 100 });
                }}
              />
            </div>

            {scaleNote && <p className="text-[10px] text-zinc-400">{scaleNote}</p>}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onUpdate({ rotation: (placement.rotation + 90) % 360 })}
                disabled={placement.locked}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-300 rounded-md text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition"
                title="Rotate the blueprint 90°"
              >
                <RotateCw className="w-3 h-3" />
                {placement.rotation}°
              </button>
              <button
                type="button"
                onClick={onFitToHall}
                disabled={placement.locked}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-300 rounded-md text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition"
                title={`Fit inside ${Units.formatDims(hallWidth, hallHeight)}`}
              >
                <Maximize2 className="w-3 h-3" />
                Fit hall
              </button>
              {naturalAspect && (
                <button
                  type="button"
                  onClick={onResetAspect}
                  disabled={placement.locked}
                  className="px-2.5 py-1.5 border border-zinc-300 rounded-md text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition"
                  title="Undo any stretching"
                >
                  Un-stretch
                </button>
              )}
            </div>
          </div>

          {/* Remove */}
          <div className="p-3.5">
            <button
              type="button"
              onClick={onRemove}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-semibold rounded-md transition"
            >
              <Trash2 className="w-3 h-3" />
              Remove blueprint
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
