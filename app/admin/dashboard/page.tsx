'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';
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
    <AdminShell
      title="Dashboard"
      subtitle="Overview of floor plan layouts and stall reservations"
      actions={
        <Link
          href="/admin/events"
          className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Manage Exhibitions</span>
        </Link>
      }
    >
      {/* Metric Cards — two up on phones so the row stays scannable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 lg:mb-8">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500">Total Exhibitions</span>
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900">{totalEvents}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Active floor plans</div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500">Total Stalls</span>
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <LayoutGrid className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900">{totalStalls}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Across all halls</div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500">Confirmed Bookings</span>
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900">{bookedStalls}</div>
            <div className="text-[11px] text-zinc-400 mt-1">
              {totalStalls > 0 ? `${Math.round((bookedStalls / totalStalls) * 100)}% occupancy` : '0%'}
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500">Stall Value</span>
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900">{formatCurrency(totalRevenue)}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Total reserved value</div>
          </div>
        </div>

      {/* Quick Launch & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Exhibitions Floor Plans List */}
          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-900">Active Exhibitions</h3>
              <Link href="/admin/events" className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
                View All
              </Link>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-10 text-zinc-400 text-xs font-medium">
                No exhibitions created yet. Click "Manage Exhibitions" to add one.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {events.slice(0, 5).map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-zinc-900 truncate">{evt.name}</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                        {evt.venue || 'Venue TBD'} · {evt.total_tables || 0} stalls ({evt.booked_tables || 0} booked)
                      </p>
                    </div>
                    <Link
                      href={`/admin/events/${evt.id}/studio`}
                      className="shrink-0 px-3 py-2 sm:py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-xs font-semibold transition flex items-center gap-1.5"
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
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-900">Recent Reservations</h3>
              <Link href="/admin/bookings" className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
                View All
              </Link>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-10 text-zinc-400 text-xs font-medium my-auto">
                No reservations yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {bookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-zinc-900 truncate">
                        {b.customer_name || b.user_name || 'Exhibitor'}
                      </span>
                      <span className="font-bold text-zinc-900 shrink-0">{formatCurrency(b.table_price || 0)}</span>
                    </div>
                    <div className="text-zinc-500 text-[11px] truncate">
                      {b.business_name ? `${b.business_name} · ` : ''}Stall {b.table_number} · {b.event_name || 'Exhibition'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </AdminShell>
  );
}
