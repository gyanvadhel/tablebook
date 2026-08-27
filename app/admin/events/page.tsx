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
    <div className="flex h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Exhibitions</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Manage exhibitions, configure halls, and launch the CAD Studio</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedEvent(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Exhibition</span>
          </button>
        </div>

        {/* Grid of Events */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-xl bg-white border border-zinc-200 animate-pulse" />
            ))}
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
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {Units.formatDims(evt.hall_width, evt.hall_height)}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-500">
                        {total} Stalls ({booked} Booked)
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-900 mb-2">{evt.name}</h3>

                    <div className="flex flex-col gap-1 text-xs text-zinc-500 mb-4">
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
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition"
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
                        className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition"
                        title="Edit Info"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(evt.id, evt.name)}
                        className="p-1.5 rounded-lg border border-zinc-200 hover:bg-rose-50 text-rose-600 transition"
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
