'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { BookingItem } from '@/types';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleUpdateStatus = async (bookingId: number, newStatus: 'confirmed' | 'cancelled') => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
        );
      }
    } catch (e) {
      alert('Failed to update booking status');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      (b.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.user_phone || '').includes(searchTerm) ||
      (b.booking_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.event_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Reservations</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Manage attendee reservations and booth allotments</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          {/* Search Input */}
          <div className="w-full sm:w-80 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, code..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-zinc-200/70 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                statusFilter === 'all' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All ({bookings.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('confirmed')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                statusFilter === 'confirmed' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Confirmed
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                statusFilter === 'cancelled' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>

        {/* Table of Bookings */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Exhibitor</th>
                  <th className="px-5 py-3.5">Exhibition</th>
                  <th className="px-5 py-3.5">Stall</th>
                  <th className="px-5 py-3.5">Fee</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-zinc-400">
                      Loading reservations...
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-zinc-400 font-medium">
                      No reservations found.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-zinc-50 transition">
                      <td className="px-5 py-4 font-mono font-bold text-zinc-900">
                        {b.booking_code || `TB-${String(b.id).padStart(6, '0')}`}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-zinc-900">{b.user_name}</div>
                        <div className="text-zinc-500 text-[11px]">{b.user_phone}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-zinc-800">{b.event_name || 'Exhibition'}</div>
                        {b.venue && <div className="text-zinc-400 text-[11px]">{b.venue}</div>}
                      </td>
                      <td className="px-5 py-4 font-semibold text-zinc-800">
                        Stall {b.table_number || '1'}
                      </td>
                      <td className="px-5 py-4 font-bold text-zinc-900">
                        {formatCurrency(b.table_price || 0)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            b.status === 'confirmed'
                              ? 'bg-zinc-100 text-zinc-800 border border-zinc-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {b.status === 'confirmed' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, 'cancelled')}
                            className="px-2.5 py-1 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-md text-[11px] font-semibold transition"
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, 'confirmed')}
                            className="px-2.5 py-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md text-[11px] font-semibold transition"
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
