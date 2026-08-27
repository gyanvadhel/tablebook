'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { EventModal } from '@/components/admin/EventModal';
import { Plus, Edit2, Trash2, LayoutGrid, Eye, MapPin, Calendar } from 'lucide-react';
import { Units } from '@/lib/units';
import { formatDate } from '@/lib/utils';
import type { EventItem } from '@/types';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
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
      }
    } catch (e) {
      alert('Failed to delete exhibition');
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">Exhibitions Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">Create exhibitions, configure halls, and launch the CAD Studio</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedEvent(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Exhibition</span>
          </button>
        </div>

        {/* Grid of Events */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-60 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
            <LayoutGrid className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Exhibitions Created</h3>
            <p className="text-slate-400 text-xs mb-4">Get started by creating your first exhibition event.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedEvent(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Create Exhibition
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => {
              const total = evt.total_tables || 0;
              const booked = evt.booked_tables || 0;
              const available = Math.max(0, total - booked);

              return (
                <div
                  key={evt.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between shadow-xl transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {Units.formatDims(evt.hall_width, evt.hall_height)}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {total} Stalls ({booked} Booked)
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-2">{evt.name}</h3>

                    <div className="flex flex-col gap-1 text-xs text-slate-400 mb-4">
                      {evt.venue && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{evt.venue}</span>
                        </div>
                      )}
                      {evt.start_date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{formatDate(evt.start_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
                    <Link
                      href={`/admin/events/${evt.id}/studio`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>Edit Floor Plan Studio</span>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/events/${evt.id}`}
                        target="_blank"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
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
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="Edit Info"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(evt.id, evt.name)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-rose-400 transition"
                        title="Delete Exhibition"
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
      </main>

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
    </div>
  );
}
