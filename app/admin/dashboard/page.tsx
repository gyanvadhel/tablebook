'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Calendar, LayoutGrid, CheckCircle2, TrendingUp, ArrowRight, Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { EventItem, BookingItem } from '@/types';

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [eventsRes, bookingsRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/bookings'),
        ]);

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(Array.isArray(eventsData) ? eventsData : []);
        }

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const totalEvents = events.length;
  const totalStalls = events.reduce((acc, e) => acc + (Number(e.total_tables) || 0), 0);
  const bookedStalls = events.reduce((acc, e) => acc + (Number(e.booked_tables) || 0), 0);
  const totalRevenue = bookings.reduce((acc, b) => acc + (Number(b.table_price) || 0), 0);

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">Overview of floor plan layouts and stall reservations</p>
          </div>
          <Link
            href="/admin/events"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Manage Exhibitions</span>
          </Link>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Total Exhibitions</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{totalEvents}</div>
            <div className="text-[11px] text-slate-500 mt-1">Active floor plans</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Total Stalls</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <LayoutGrid className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{totalStalls}</div>
            <div className="text-[11px] text-slate-500 mt-1">Across all halls</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Confirmed Bookings</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{bookedStalls}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {totalStalls > 0 ? `${Math.round((bookedStalls / totalStalls) * 100)}% occupancy` : '0%'}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Stall Value</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{formatCurrency(totalRevenue)}</div>
            <div className="text-[11px] text-slate-500 mt-1">Total reserved value</div>
          </div>
        </div>

        {/* Quick Launch & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Exhibitions Floor Plans List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Active Exhibitions</h3>
              <Link href="/admin/events" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                View All
              </Link>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-medium">
                No exhibitions created yet. Click "Manage Exhibitions" to add one.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {events.slice(0, 5).map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-white">{evt.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {evt.venue || 'Venue TBD'} · {evt.total_tables || 0} stalls ({evt.booked_tables || 0} booked)
                      </p>
                    </div>
                    <Link
                      href={`/admin/events/${evt.id}/studio`}
                      className="px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <span>Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Bookings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Recent Reservations</h3>
              <Link href="/admin/bookings" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                View All
              </Link>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-medium my-auto">
                No reservations yet.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {bookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">{b.user_name}</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(b.table_price || 0)}</span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Stall {b.table_number} · {b.event_name || 'Exhibition'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
