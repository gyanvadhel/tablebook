'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Check, Info } from 'lucide-react';
import { VisitorHallMap } from '@/components/visitor/VisitorHallMap';
import { BookingModal } from '@/components/visitor/BookingModal';
import { Units } from '@/lib/units';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { EventItem, TableItem, HallElement } from '@/types';

export default function EventBookingPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [elements, setElements] = useState<HallElement[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!eventId) return;
      setIsLoading(true);
      try {
        const [eventRes, tablesRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/tables`),
        ]);

        if (!eventRes.ok) throw new Error('Event not found');

        const eventData = await eventRes.json();
        setEvent(eventData);

        let parsedElements: HallElement[] = [];
        if (eventData.hall_elements) {
          try {
            parsedElements = Array.isArray(eventData.hall_elements)
              ? eventData.hall_elements
              : JSON.parse(eventData.hall_elements);
          } catch (e) {
            parsedElements = [];
          }
        }
        setElements(parsedElements);

        if (tablesRes.ok) {
          const tablesData = await tablesRes.json();
          setTables(Array.isArray(tablesData) ? tablesData : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [eventId]);

  const handleBookingSuccess = (booking: any) => {
    setIsBookingModalOpen(false);
    router.push(`/confirmation/${booking.id}`);
  };

  const availableCount = tables.filter((t) => t.status !== 'booked').length;
  const bookedCount = tables.filter((t) => t.status === 'booked').length;

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-100 text-slate-600 font-medium">
        Loading Exhibition Floor Plan...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-100 text-slate-600 gap-4">
        <p className="text-lg font-bold text-slate-900">Exhibition not found</p>
        <Link href="/" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold">
          Return to Exhibitions List
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-900 font-sans">
      {/* Top Navigation & Legend */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 z-20 text-white select-none">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm md:text-base font-bold text-white leading-tight">{event.name}</h1>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              {event.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  {event.venue}
                </span>
              )}
              {event.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {formatDate(event.start_date)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#c98a46] border border-[#b87733]"></span>
            <span className="text-slate-300 font-medium hidden sm:inline">Available ({availableCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#e11d48] border border-[#be123c]"></span>
            <span className="text-slate-300 font-medium hidden sm:inline">Booked ({bookedCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#2563eb] border border-[#1d4ed8]"></span>
            <span className="text-slate-300 font-medium hidden sm:inline">Selected</span>
          </div>
        </div>
      </header>

      {/* Center SVG Interactive Map */}
      <div className="flex-1 relative overflow-hidden">
        <VisitorHallMap
          hallWidth={event.hall_width}
          hallHeight={event.hall_height}
          tables={tables}
          elements={elements}
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
          eventName={event.name}
        />

        {/* Floating Selected Stall Action Bar */}
        {selectedTable && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-md bg-white border border-slate-200 rounded-xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">Stall {selectedTable.table_number}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                    Available
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {Units.formatDims(selectedTable.width, selectedTable.height)} · {Units.formatArea(selectedTable.width, selectedTable.height)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-base font-extrabold text-slate-900">{formatCurrency(selectedTable.price)}</div>
                <div className="text-[10px] text-slate-400 font-medium">Stall Fee</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition"
              >
                Deselect
              </button>
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(true)}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <span>Reserve Stall {selectedTable.table_number}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {isBookingModalOpen && (
        <BookingModal
          table={selectedTable}
          event={event}
          onClose={() => setIsBookingModalOpen(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
