'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, LayoutGrid, ShieldCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Units } from '@/lib/units';
import type { EventItem } from '@/types';

/** The corner tag on a poster, driven by how full the hall is. */
function availabilityTag(available: number, total: number): { label: string; className: string } {
  if (total > 0 && available === 0) return { label: 'SOLD OUT', className: 'bg-rose-600' };
  if (total > 0 && available / total <= 0.2) return { label: 'FILLING FAST', className: 'bg-amber-500' };
  return { label: 'BOOKING OPEN', className: 'bg-emerald-600' };
}

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

      {/* Exhibitions — poster wall */}
      <main className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Upcoming Exhibitions ({filteredEvents.length})</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col gap-2.5">
                <div className="aspect-[2/3] rounded-xl bg-zinc-200 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-zinc-200 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-zinc-200 animate-pulse" />
              </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredEvents.map((evt) => {
              const total = evt.total_tables || 0;
              const booked = evt.booked_tables || 0;
              const available = Math.max(0, total - booked);
              const initial = (evt.name || '?').trim().charAt(0).toUpperCase();
              const tag = availabilityTag(available, total);
              const href = `/events/${evt.id}`;

              const subtitle =
                [evt.venue, evt.start_date ? formatDate(evt.start_date) : null].filter(Boolean).join(' · ') ||
                `${Units.formatDims(evt.hall_width, evt.hall_height)} hall`;

              return (
                <article key={evt.id} className="group flex flex-col">
                  {/* Poster — the card itself */}
                  <Link
                    href={href}
                    aria-label={`${evt.name} — view floor plan and book`}
                    className="relative block aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 shadow-sm ring-1 ring-black/5 transition-shadow group-hover:shadow-lg"
                  >
                    {evt.poster_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={evt.poster_image}
                        alt={`${evt.name} poster`}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-950 text-white/90 text-6xl font-black select-none">
                        {initial}
                      </span>
                    )}

                    {/* Corner tag */}
                    <span
                      className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider text-white shadow-sm ${tag.className}`}
                    >
                      {tag.label}
                    </span>

                    {/* Stat band */}
                    <div className="absolute inset-x-0 bottom-0 bg-zinc-900/95 px-3 py-2 flex items-center gap-2 text-white">
                      <LayoutGrid className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {total > 0 ? (
                        <>
                          <span className="text-xs font-bold tabular-nums">{available} Available</span>
                          <span className="ml-auto text-[11px] font-medium text-zinc-400 tabular-nums">{total} Stalls</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-zinc-300">Floor plan coming soon</span>
                      )}
                    </div>
                  </Link>

                  {/* Title & subtitle */}
                  <div className="mt-2.5 px-0.5 min-w-0">
                    <Link href={href} className="block text-sm font-bold text-zinc-900 leading-snug line-clamp-2 hover:underline">
                      {evt.name}
                    </Link>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate" title={subtitle}>
                      {subtitle}
                    </p>
                  </div>

                  {/* Book */}
                  <Link
                    href={href}
                    className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition"
                  >
                    <span>View Floor Plan &amp; Book</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
