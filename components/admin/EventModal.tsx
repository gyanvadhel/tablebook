'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Units } from '@/lib/units';
import { PosterField } from '@/components/admin/PosterField';
import type { EventItem } from '@/types';

interface EventModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedEvent: EventItem) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  event,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hallWidth, setHallWidth] = useState(80);
  const [hallHeight, setHallHeight] = useState(55);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'active' | 'completed'>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (event) {
      setName(event.name || '');
      setVenue(event.venue || '');
      setDescription(event.description || '');
      setStartDate(event.date || event.start_date || '');
      setEndDate(event.end_date || '');
      setHallWidth(event.hall_width || 80);
      setHallHeight(event.hall_height || 55);
      setPosterUrl(event.poster_image || null);
      setStatus((event.status as any) || 'draft');
    } else {
      setName('');
      setVenue('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setHallWidth(80);
      setHallHeight(55);
      setPosterUrl(null);
      setStatus('draft');
    }
  }, [event, isOpen]);

  // Escape closes; while open the page behind must not scroll
  useEffect(() => {
    if (!isOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Event name is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const url = event ? `/api/events/${event.id}` : '/api/events';
      const method = event ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          venue: venue.trim(),
          description: description.trim(),
          start_date: startDate || null,
          end_date: endDate || null,
          hall_width: Units.clampHallFt(hallWidth, 80),
          hall_height: Units.clampHallFt(hallHeight, 55),
          poster_image: posterUrl,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save exhibition');

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    /* A bottom sheet on phones, a centred dialog from `sm` up */
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in sm:slide-in-from-bottom-0 duration-200"
      >
        <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-base font-bold text-slate-900">
            {event ? 'Edit Exhibition Details' : 'Create New Exhibition'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-4 text-xs">
          {error && <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs font-semibold">{error}</div>}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Exhibition Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grand Home &amp; Crafts Expo 2026"
              className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900 text-base sm:text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Venue Location</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Hall 4, Convention Center"
                className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900 text-base sm:text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Event Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900 text-base sm:text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Main Hall Width (ft)</label>
              <input
                type="number"
                min={Units.MIN_HALL_FT}
                max={Units.MAX_HALL_FT}
                value={hallWidth}
                onChange={(e) => setHallWidth(parseFloat(e.target.value) || 80)}
                className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900 text-base sm:text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Main Hall Depth (ft)</label>
              <input
                type="number"
                min={Units.MIN_HALL_FT}
                max={Units.MAX_HALL_FT}
                value={hallHeight}
                onChange={(e) => setHallHeight(parseFloat(e.target.value) || 55)}
                className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900 text-base sm:text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the exhibition theme and target exhibitors..."
              className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900 text-base sm:text-xs"
            />
          </div>

          <PosterField value={posterUrl} onChange={setPosterUrl} disabled={isSubmitting} />

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Visibility</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900 text-base sm:text-xs bg-white"
            >
              <option value="draft">Draft — hidden from the public site</option>
              <option value="active">Active — listed and open for booking</option>
              <option value="completed">Completed — hidden from the public site</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Only active exhibitions appear on the visitor home page.
            </p>
          </div>
          </div>

          {/* Stays put while the fields above scroll */}
          <div className="shrink-0 flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-slate-100 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-5 py-2.5 sm:py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition"
            >
              {isSubmitting ? 'Saving...' : event ? 'Save Changes' : 'Create Exhibition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
