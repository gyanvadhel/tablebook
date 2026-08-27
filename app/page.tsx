'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Search, ArrowRight, LayoutGrid, ShieldCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Units } from '@/lib/units';
import type { EventItem } from '@/types';

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const data = await res.json();
          setEvents(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadEvents();
  }, []);

  const filteredEvents = events.filter((e) =>
    (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.venue || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Navbar */}
      <nav className="h-14 border-b border-zinc-200 bg-white px-6 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center font-black text-white text-sm shadow-xs">
            T
          </div>
          <span className="font-bold text-sm text-zinc-900 tracking-tight">TableBook</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/admin/login"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 transition flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-zinc-500" />
            <span>Admin Portal</span>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-14 pb-10 px-6 max-w-4xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight mb-3">
          Explore Exhibitions &amp; Reserve Stalls
        </h1>

        <p className="text-zinc-500 text-xs md:text-sm max-w-xl mx-auto leading-relaxed mb-6">
          Browse interactive floor plans measured accurately in real-world feet. Pick your preferred stall position and confirm your booking instantly.
        </p>

        {/* Search Bar */}
        <div className="max-w-md mx-auto relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search exhibitions by name or venue..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition shadow-xs"
          />
        </div>
      </section>

      {/* Exhibitions Grid */}
      <main className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Upcoming Exhibitions ({filteredEvents.length})</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-xl bg-white border border-zinc-200 animate-pulse" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-300 rounded-xl bg-white">
            <LayoutGrid className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-zinc-900 mb-1">No Exhibitions Found</h3>
            <p className="text-zinc-500 text-xs">
              {searchTerm ? 'Try adjusting your search keywords.' : 'No active exhibitions scheduled at the moment.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map((evt) => {
              const total = evt.total_tables || 0;
              const booked = evt.booked_tables || 0;
              const available = Math.max(0, total - booked);

              return (
                <div
                  key={evt.id}
                  className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-5 flex flex-col justify-between transition shadow-xs"
                >
                  <div>
                    {/* Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {Units.formatDims(evt.hall_width, evt.hall_height)}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {available} Available
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-900 mb-1.5">
                      {evt.name}
                    </h3>

                    {evt.description && (
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-3 leading-relaxed">{evt.description}</p>
                    )}

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

                  {/* Stall booking button */}
                  <Link
                    href={`/events/${evt.id}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition"
                  >
                    <span>View Floor Plan &amp; Book</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
