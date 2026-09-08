'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { EventModal } from '@/components/admin/EventModal';
import { Plus, Edit2, Trash2, LayoutGrid, Eye, MapPin, Calendar, ImagePlus } from 'lucide-react';
import { Units } from '@/lib/units';
import { formatDate } from '@/lib/utils';
import type { EventItem } from '@/types';

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadEvents = async () => {
    try {
      setLoadError('');
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error(`Failed to load exhibitions (${res.status})`);

      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      setLoadError(e?.message || 'Failed to load exhibitions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? All associated stalls and bookings will also be removed.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          alert('Session expired. Please log in again.');
          router.push('/admin/login');
          return;
        }
        alert(err.error || 'Failed to delete exhibition');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to delete exhibition');
    }
  };

  return (
    <AdminShell
      title="Exhibitions"
      subtitle="Manage exhibitions, configure halls, and launch the CAD Studio"
      actions={
        <button
          type="button"
          onClick={() => {
            setSelectedEvent(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create Exhibition</span>
        </button>
      }
    >
      {/* Grid of Events */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-xl bg-white border border-zinc-200 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
        <div className="text-center py-16 border border-dashed border-rose-300 bg-rose-50/50 rounded-xl">
          <h3 className="text-sm font-bold text-rose-900 mb-1">Could not load exhibitions</h3>
          <p className="text-rose-700 text-xs mb-4">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              loadEvents();
            }}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition"
          >
            Try again
          </button>
        </div>
      ) : events.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-300 rounded-xl bg-white">
            <LayoutGrid className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-zinc-900 mb-1">No Exhibitions Created</h3>
            <p className="text-zinc-500 text-xs mb-4">Get started by creating your first exhibition event.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedEvent(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold"
            >
              Create Exhibition
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((evt) => {
              const total = evt.total_tables || 0;
              const booked = evt.booked_tables || 0;

              return (
                <div
                  key={evt.id}
                  className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-5 flex flex-col justify-between shadow-xs transition"
                >
                  <div className="flex gap-3 mb-4">
                    {/* Poster thumbnail — click to edit details, where it is set */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEvent(evt);
                        setIsModalOpen(true);
                      }}
                      title={evt.poster_image ? 'Change poster' : 'Add a poster'}
                      className="shrink-0 w-16 aspect-[2/3] rounded-md overflow-hidden border border-zinc-200 bg-zinc-100 hover:border-zinc-400 transition"
                    >
                      {evt.poster_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={evt.poster_image} alt={`${evt.name} poster`} className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-zinc-400">
                          <ImagePlus className="w-4 h-4" />
                        </span>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 whitespace-nowrap">
                            {Units.formatDims(evt.hall_width, evt.hall_height)}
                          </span>
                          {/* Only "active" reaches the public site */}
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap ${
                              evt.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : evt.status === 'completed'
                                ? 'bg-zinc-100 text-zinc-500 border-zinc-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                            title={evt.status === 'active' ? 'Listed on the public site' : 'Hidden from the public site'}
                          >
                            {evt.status || 'draft'}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-zinc-500 whitespace-nowrap shrink-0">
                          {total} Stalls ({booked} Booked)
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-zinc-900 mb-2 leading-snug">{evt.name}</h3>

                      <div className="flex flex-col gap-1 text-xs text-zinc-500">
                        {evt.venue && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{evt.venue}</span>
                          </div>
                        )}
                        {evt.start_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>{formatDate(evt.start_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-zinc-100">
                    <Link
                      href={`/admin/events/${evt.id}/studio`}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Edit Floor Plan Studio</span>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/events/${evt.id}`}
                        target="_blank"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Public View</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(evt);
                          setIsModalOpen(true);
                        }}
                        className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition"
                        title="Edit Info"
                        aria-label={`Edit ${evt.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(evt.id, evt.name)}
                        className="p-2 rounded-lg border border-zinc-200 hover:bg-rose-50 text-rose-600 transition"
                        title="Delete Exhibition"
                        aria-label={`Delete ${evt.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          loadEvents();
        }}
      />
    </AdminShell>
  );
}
