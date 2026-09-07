'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Search, ChevronDown, ChevronRight, Download, Building2, Mail, Phone, StickyNote, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Units } from '@/lib/units';
import type { BookingItem } from '@/types';

/** The booking as the API returns it, with the legacy names folded in. */
function normalize(b: BookingItem) {
  return {
    id: b.id,
    code: b.reference_code || b.booking_code || `TB-${String(b.id).padStart(6, '0')}`,
    name: b.customer_name || b.user_name || '',
    phone: b.customer_phone || b.user_phone || '',
    email: b.customer_email || b.user_email || '',
    brand: b.business_name || '',
    notes: (b.notes || '').trim(),
    event: b.event_name || 'Exhibition',
    venue: (b as any).event_venue || b.venue || '',
    stall: b.table_number || '',
    stallLabel: b.table_label || '',
    stallW: Number(b.table_width) || 0,
    stallH: Number(b.table_height) || 0,
    fee: Number(b.table_price ?? (b as any).price ?? 0) || 0,
    status: b.status,
    bookedAt: b.booked_at || b.created_at || '',
  };
}
type Row = ReturnType<typeof normalize>;

function formatWhen(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function stallSize(r: Row): string | null {
  if (!(r.stallW > 0 && r.stallH > 0)) return null;
  return `${Units.formatFeetShort(r.stallW)} × ${Units.formatFeetShort(r.stallH)}`;
}

/** RFC 4180-ish: quote everything, double any embedded quotes. */
function csvCell(value: string | number): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

const StatusChip: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
      status === 'confirmed'
        ? 'bg-zinc-100 text-zinc-800 border border-zinc-200'
        : 'bg-rose-50 text-rose-700 border border-rose-200'
    }`}
  >
    {status}
  </span>
);

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)));
      }
    } catch (e) {
      alert('Failed to update booking status');
    }
  };

  const rows = useMemo(() => bookings.map(normalize), [bookings]);

  const filteredRows = rows.filter((r) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.brand.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.event.toLowerCase().includes(q) ||
      r.notes.toLowerCase().includes(q) ||
      `stall ${r.stall}`.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Everything in the current view, one row per booking — for the venue team
  const exportCsv = () => {
    const header = ['Code', 'Name', 'Brand / Company', 'Phone', 'Email', 'Exhibition', 'Stall', 'Stall Size', 'Fee', 'Status', 'Booked At', 'Notes'];
    const lines = filteredRows.map((r) =>
      [
        r.code,
        r.name,
        r.brand,
        r.phone,
        r.email,
        r.event,
        r.stall ? `Stall ${r.stall}` : '',
        stallSize(r) ? `${r.stallW} x ${r.stallH} ft` : '',
        r.fee,
        r.status,
        formatWhen(r.bookedAt),
        r.notes,
      ]
        .map(csvCell)
        .join(',')
    );
    const csv = '﻿' + [header.map(csvCell).join(','), ...lines].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations-${new Date().toISOString().slice(0, 10)}${statusFilter !== 'all' ? `-${statusFilter}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (id: number) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <AdminShell
      title="Reservations"
      subtitle="Every booking with the exhibitor's contact, brand and requirements"
      actions={
        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredRows.length === 0}
          title="Download the bookings currently shown as a spreadsheet"
          className="flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 bg-white border border-zinc-300 hover:bg-zinc-50 disabled:opacity-40 text-zinc-800 rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV ({filteredRows.length})
        </button>
      }
    >
      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
        <div className="w-full lg:w-96 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, brand, phone, email, code, notes..."
            /* 16px on phones stops iOS zooming in when the field is focused */
            className="w-full pl-9 pr-4 py-2.5 sm:py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition"
          />
        </div>

        <div className="grid grid-cols-3 lg:flex lg:items-center gap-1 bg-zinc-200/70 p-1 rounded-lg text-xs">
          {(['all', 'confirmed', 'cancelled'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-2 lg:py-1 rounded-md font-semibold capitalize transition ${
                statusFilter === key ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {key === 'all' ? `All (${rows.length})` : key}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Phones & tablets: one card per booking ---------- */}
      <div className="lg:hidden">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-white border border-zinc-200 animate-pulse" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-12 bg-white border border-zinc-200 rounded-xl text-zinc-400 text-xs font-medium">
            No reservations found.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredRows.map((r) => (
              <article key={r.id} className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
                {/* Header: code + status */}
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
                  <span className="font-mono font-bold text-xs text-zinc-900">{r.code}</span>
                  <StatusChip status={r.status} />
                </div>

                <div className="p-4 flex flex-col gap-3 text-xs">
                  {/* Who */}
                  <div>
                    <div className="text-sm font-bold text-zinc-900 leading-snug">{r.name || 'Exhibitor'}</div>
                    {r.brand ? (
                      <div className="flex items-center gap-1.5 text-zinc-600 mt-1">
                        <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{r.brand}</span>
                      </div>
                    ) : (
                      <div className="text-zinc-400 mt-1">No brand given</div>
                    )}
                  </div>

                  {/* Stall & fee */}
                  <div className="flex items-center justify-between gap-3 py-2.5 border-y border-zinc-100">
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-900">Stall {r.stall || '—'}</div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {stallSize(r) ? `${stallSize(r)} · ` : ''}
                        {r.event}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-zinc-900 shrink-0">{formatCurrency(r.fee)}</div>
                  </div>

                  {/* Contact — tappable */}
                  <div className="flex flex-col gap-1.5">
                    {r.phone && (
                      <a href={`tel:${r.phone}`} className="flex items-center gap-2 text-zinc-800 font-medium">
                        <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        {r.phone}
                      </a>
                    )}
                    {r.email ? (
                      <a href={`mailto:${r.email}`} className="flex items-center gap-2 text-zinc-800 font-medium break-all">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        {r.email}
                      </a>
                    ) : (
                      <span className="flex items-center gap-2 text-zinc-400">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        No email
                      </span>
                    )}
                    <span className="flex items-center gap-2 text-zinc-500">
                      <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      {formatWhen(r.bookedAt)}
                    </span>
                  </div>

                  {/* Notes */}
                  {r.notes && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">
                        <StickyNote className="w-3.5 h-3.5" />
                        Special requirements
                      </div>
                      <p className="text-zinc-800 whitespace-pre-wrap leading-relaxed">{r.notes}</p>
                    </div>
                  )}

                  {/* Action */}
                  {r.status === 'confirmed' ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(r.id, 'cancelled')}
                      className="w-full py-2.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold transition"
                    >
                      Cancel Reservation
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(r.id, 'confirmed')}
                      className="w-full py-2.5 rounded-lg border border-zinc-300 text-zinc-800 hover:bg-zinc-50 font-semibold transition"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Desktop: full table with an expandable detail row ---------- */}
      <div className="hidden lg:block bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3.5 w-8" aria-label="Expand" />
                <th className="px-4 py-3.5">Code</th>
                <th className="px-4 py-3.5">Exhibitor</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Exhibition</th>
                <th className="px-4 py-3.5">Stall</th>
                <th className="px-4 py-3.5">Notes</th>
                <th className="px-4 py-3.5">Fee</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-zinc-400">
                    Loading reservations...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-zinc-400 font-medium">
                    No reservations found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r: Row) => {
                  const isOpen = expandedId === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        onClick={() => toggle(r.id)}
                        className={`cursor-pointer transition ${isOpen ? 'bg-zinc-50' : 'hover:bg-zinc-50'}`}
                        aria-expanded={isOpen}
                      >
                        <td className="px-4 py-4 text-zinc-400">
                          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </td>
                        <td className="px-4 py-4 font-mono font-bold text-zinc-900 whitespace-nowrap">{r.code}</td>

                        {/* Exhibitor: name, then the brand they are exhibiting as */}
                        <td className="px-4 py-4">
                          <div className="font-bold text-zinc-900">{r.name}</div>
                          {r.brand ? (
                            <div className="flex items-center gap-1 text-zinc-600 text-[11px] mt-0.5">
                              <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className="truncate max-w-[180px]" title={r.brand}>
                                {r.brand}
                              </span>
                            </div>
                          ) : (
                            <div className="text-zinc-400 text-[11px] mt-0.5">No brand given</div>
                          )}
                        </td>

                        {/* Contact: phone and email, both actionable */}
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <a href={`tel:${r.phone}`} className="block text-zinc-800 font-medium hover:underline whitespace-nowrap">
                            {r.phone}
                          </a>
                          {r.email ? (
                            <a href={`mailto:${r.email}`} className="block text-zinc-500 text-[11px] hover:underline truncate max-w-[200px]" title={r.email}>
                              {r.email}
                            </a>
                          ) : (
                            <span className="block text-zinc-400 text-[11px]">No email</span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-semibold text-zinc-800">{r.event}</div>
                          {r.venue && <div className="text-zinc-400 text-[11px]">{r.venue}</div>}
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-semibold text-zinc-800">Stall {r.stall || '—'}</div>
                          {stallSize(r) && <div className="text-zinc-400 text-[11px]">{stallSize(r)}</div>}
                        </td>

                        {/* Notes preview; the full text lives in the expanded row */}
                        <td className="px-4 py-4 max-w-[240px]">
                          {r.notes ? (
                            <div className="flex items-start gap-1.5 text-zinc-700">
                              <StickyNote className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-2 leading-snug" title={r.notes}>
                                {r.notes}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4 font-bold text-zinc-900 whitespace-nowrap">{formatCurrency(r.fee)}</td>

                        <td className="px-4 py-4">
                          <StatusChip status={r.status} />
                        </td>

                        <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {r.status === 'confirmed' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(r.id, 'cancelled')}
                              className="px-2.5 py-1 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-md text-[11px] font-semibold transition"
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(r.id, 'confirmed')}
                              className="px-2.5 py-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md text-[11px] font-semibold transition"
                            >
                              Reactivate
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Full record */}
                      {isOpen && (
                        <tr className="bg-zinc-50/70">
                          <td colSpan={10} className="px-6 pb-5 pt-1">
                            <div className="ml-8 grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-4 rounded-lg border border-zinc-200 bg-white p-4">
                              <Detail icon={<Building2 className="w-3.5 h-3.5" />} label="Brand / Company" value={r.brand || '—'} />
                              <Detail
                                icon={<Phone className="w-3.5 h-3.5" />}
                                label="Phone"
                                value={
                                  <a href={`tel:${r.phone}`} className="hover:underline">
                                    {r.phone || '—'}
                                  </a>
                                }
                              />
                              <Detail
                                icon={<Mail className="w-3.5 h-3.5" />}
                                label="Email"
                                value={
                                  r.email ? (
                                    <a href={`mailto:${r.email}`} className="hover:underline break-all">
                                      {r.email}
                                    </a>
                                  ) : (
                                    '—'
                                  )
                                }
                              />
                              <Detail icon={<Clock className="w-3.5 h-3.5" />} label="Booked at" value={formatWhen(r.bookedAt)} />
                              <div className="md:col-span-4">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                  <StickyNote className="w-3.5 h-3.5" />
                                  Special requirements / notes
                                </div>
                                {r.notes ? (
                                  <p className="text-zinc-800 whitespace-pre-wrap leading-relaxed">{r.notes}</p>
                                ) : (
                                  <p className="text-zinc-400">None given</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

const Detail: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
      {icon}
      {label}
    </div>
    <div className="text-zinc-900 font-medium break-words">{value}</div>
  </div>
);
