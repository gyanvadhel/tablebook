'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { measureImage } from '@/lib/clientImage';

interface PosterFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

/**
 * Portrait poster picker for an exhibition. Uploads straight into the
 * Postgres-backed store (kind "poster") and hands back the URL; the parent
 * form saves that URL with the rest of the event.
 */
export const PosterField: React.FC<PosterFieldProps> = ({ value, onChange, disabled }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [error, setError] = useState('');
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);

  // Read the intrinsic size so we can say whether it is actually portrait
  useEffect(() => {
    let alive = true;
    setDims(null);
    if (value) {
      measureImage(value).then((m) => {
        if (alive && m) setDims({ width: m.width, height: m.height });
      });
    }
    return () => {
      alive = false;
    };
  }, [value]);

  const upload = async (file: File) => {
    setError('');
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'poster');

      const res = await fetch('/api/uploads', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      onChange(data.url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload poster');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const pick = () => {
    if (!disabled && !isUploading) inputRef.current?.click();
  };

  const isLandscape = dims ? dims.width > dims.height : false;

  return (
    <div>
      <label className="block font-semibold text-slate-700 mb-1">Poster</label>

      <div className="flex gap-3 sm:gap-4">
        {/* Portrait frame — 2:3 like a movie poster, exactly how the card will crop it */}
        <button
          type="button"
          onClick={pick}
          disabled={disabled || isUploading}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDropTarget(true);
          }}
          onDragLeave={() => setIsDropTarget(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDropTarget(false);
            const file = e.dataTransfer.files?.[0];
            if (file && !disabled) upload(file);
          }}
          title={value ? 'Replace poster' : 'Upload poster'}
          className={`relative shrink-0 w-20 sm:w-24 aspect-[2/3] rounded-lg border-2 overflow-hidden transition text-left ${
            isDropTarget
              ? 'border-slate-900 bg-slate-100'
              : value
              ? 'border-slate-200 hover:border-slate-400'
              : 'border-dashed border-slate-300 hover:border-slate-400 bg-slate-50'
          } disabled:opacity-60`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Exhibition poster" className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400">
              <ImagePlus className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Add poster</span>
            </span>
          )}
          {isUploading && (
            <span className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-slate-700 animate-spin" />
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <p className="text-slate-500 leading-relaxed">
            Shown large on the exhibition card. Use a 2:3 portrait like a movie poster — for example 1000 × 1500. PNG,
            JPG, GIF or WEBP up to 10 MB.
          </p>

          {dims && (
            <p className={`text-[11px] font-semibold ${isLandscape ? 'text-amber-700' : 'text-emerald-700'}`}>
              {dims.width} × {dims.height} ·{' '}
              {isLandscape ? 'landscape — the card will crop it to portrait' : 'portrait'}
            </p>
          )}

          {error && <p className="text-[11px] font-semibold text-rose-700">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={pick}
              disabled={disabled || isUploading}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold disabled:opacity-50 transition"
            >
              {value ? <RefreshCw className="w-3.5 h-3.5" /> : <ImagePlus className="w-3.5 h-3.5" />}
              {value ? 'Replace' : 'Upload poster'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  onChange(null);
                }}
                disabled={disabled || isUploading}
                className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 border border-rose-200 rounded-lg text-rose-700 hover:bg-rose-50 font-semibold disabled:opacity-50 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
    </div>
  );
};
