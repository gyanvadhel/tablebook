'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, MapPin, Calendar, Printer, ArrowLeft, Building, Hash } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Units } from '@/lib/units';
import type { BookingItem } from '@/types';

export default function ConfirmationPage() {
  const params = useParams();
  const bookingId = params?.id as string;
  const [booking, setBooking] = useState<BookingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBooking() {
      if (!bookingId) return;
      try {
        const res = await fetch(`/api/bookings`);
        if (res.ok) {
          const all: BookingItem[] = await res.json();
          const found = all.find((b) => String(b.id) === String(bookingId));
          if (found) setBooking(found);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadBooking();
  }, [bookingId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-medium">
        Loading confirmation details...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex flex-col items-center justify-center font-sans">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Banner */}
        <div className="bg-emerald-600 px-8 py-6 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-extrabold">Stall Reservation Confirmed!</h1>
          <p className="text-emerald-100 text-xs mt-1">
            Your stall has been reserved. Please keep your reference code for event check-in.
          </p>
        </div>

        {/* Pass Details */}
        <div className="p-8">
          {/* Reference Code Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center mb-6">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Booking Reference Code
            </div>
            <div className="text-2xl font-black tracking-widest text-slate-900 font-mono">
              {booking?.booking_code || `TB-${bookingId.padStart(6, '0')}`}
            </div>
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-6">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-slate-400 font-semibold mb-1">Exhibition</div>
              <div className="font-bold text-slate-900 text-sm">{booking?.event_name || 'Exhibition'}</div>
              {booking?.venue && (
                <div className="text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {booking.venue}
                </div>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-slate-400 font-semibold mb-1">Reserved Stall</div>
              <div className="font-bold text-slate-900 text-sm">Stall {booking?.table_number || '1'}</div>
              {booking?.table_width && booking?.table_height && (
                <div className="text-slate-500 mt-1">
                  {Units.formatDims(booking.table_width, booking.table_height)}
                </div>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-slate-400 font-semibold mb-1">Exhibitor Name</div>
              <div className="font-bold text-slate-900">{booking?.user_name || 'Attendee'}</div>
              <div className="text-slate-500 mt-0.5">{booking?.user_phone}</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-slate-400 font-semibold mb-1">Stall Fee</div>
              <div className="font-extrabold text-slate-900 text-sm">
                {formatCurrency(booking?.table_price || 0)}
              </div>
              <div className="text-emerald-700 font-semibold mt-0.5">Status: Confirmed</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save Pass</span>
            </button>
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Exhibitions</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
