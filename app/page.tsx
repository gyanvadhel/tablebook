'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Search, ArrowRight, LayoutGrid, Sparkles, ShieldCheck } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* Navbar */}
      <nav className="h-16 border-b border-slate-800/80 px-6 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-600/30">
            TB
          </div>
          <span className="font-extrabold text-lg text-white tracking-tight">TableBook</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/admin/login"
            className="text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <span>Admin Portal</span>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-12 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-World Architectural Scale Floor Plans</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-3xl mx-auto leading-tight mb-4">
          Explore Exhibitions &amp; Reserve Stalls Visually
        </h1>

        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-8">
          Browse interactive hall layouts measured accurately in feet. Pick your preferred stall position and confirm your booking instantly.
        </p>

        {/* Search Bar */}
        <div className="max-w-md mx-auto relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search exhibitions by name or city..."
            className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-lg"
          />
        </div>
      </section>

      {/* Exhibitions Grid */}
      <main className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Upcoming Exhibitions ({filteredEvents.length})</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-800/50 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-800/20">
            <LayoutGrid className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Exhibitions Found</h3>
            <p className="text-slate-400 text-xs">
              {searchTerm ? 'Try adjusting your search keywords.' : 'No active exhibitions scheduled at the moment.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => {
              const total = evt.total_tables || 0;
              const booked = evt.booked_tables || 0;
              const available = Math.max(0, total - booked);

              return (
                <div
                  key={evt.id}
                  className="bg-slate-800/60 border border-slate-700/60 hover:border-blue-500/50 rounded-2xl p-5 flex flex-col justify-between transition group shadow-xl hover:shadow-blue-500/5"
                >
                  <div>
                    {/* Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {Units.formatDims(evt.hall_width, evt.hall_height)}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {available} Available
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition mb-2">
                      {evt.name}
                    </h3>

                    {evt.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{evt.description}</p>
                    )}

                    <div className="flex flex-col gap-1.5 text-xs text-slate-400 mb-5">
                      {evt.venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{evt.venue}</span>
                        </div>
                      )}
                      {evt.start_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{formatDate(evt.start_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stall booking button */}
                  <Link
                    href={`/events/${evt.id}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/20"
                  >
                    <span>View Floor Plan &amp; Book</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
