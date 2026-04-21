import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Users } from 'lucide-react';
import { listRooms } from '../services/roomsService';
import { api } from '../lib/api';
import { Room } from '../domain/models';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CalReservation {
  id:          string;
  roomId:      string;
  guestName:   string;
  checkIn:     string; // YYYY-MM-DD
  checkOut:    string; // YYYY-MM-DD
  status:      string;
  adults:      number;
  children:    number;
  channel:     string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COL_W    = 44;   // px per day column
const ROW_H    = 48;   // px per room row
const LEFT_W   = 160;  // px for the sticky room-label column

const PALETTE = [
  { bar: '#3b82f6', bg: '#eff6ff', text: '#1e40af' },  // blue
  { bar: '#f59e0b', bg: '#fffbeb', text: '#92400e' },  // amber
  { bar: '#8b5cf6', bg: '#f5f3ff', text: '#4c1d95' },  // purple
  { bar: '#10b981', bg: '#ecfdf5', text: '#064e3b' },  // emerald
  { bar: '#f43f5e', bg: '#fff1f2', text: '#881337' },  // rose
  { bar: '#06b6d4', bg: '#ecfeff', text: '#164e63' },  // cyan
  { bar: '#f97316', bg: '#fff7ed', text: '#7c2d12' },  // orange
  { bar: '#6366f1', bg: '#eef2ff', text: '#312e81' },  // indigo
];

function typeColor(roomType: string, allTypes: string[]) {
  const idx = allTypes.indexOf(roomType);
  return PALETTE[idx % PALETTE.length];
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function fmtDay(iso: string) {
  const d = new Date(iso);
  return { day: d.getDate(), dow: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2) };
}

function fmtMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const STATUS_STYLE: Record<string, { opacity: number; dashed: boolean }> = {
  'Confirmed':   { opacity: 1,   dashed: false },
  'Pending':     { opacity: 0.7, dashed: true  },
  'Checked-in':  { opacity: 1,   dashed: false },
  'Checked-out': { opacity: 0.45, dashed: false },
  'Cancelled':   { opacity: 0.25, dashed: true  },
};

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipData {
  res: CalReservation;
  x: number;
  y: number;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function RoomCalendar() {
  const today = isoDate(new Date());

  const [viewStart, setViewStart] = useState(() => {
    // Start at beginning of current month
    const d = new Date();
    d.setDate(1);
    return isoDate(d);
  });

  const DAYS = 35; // 5-week window

  const [rooms, setRooms]             = useState<Room[]>([]);
  const [reservations, setReservations] = useState<CalReservation[]>([]);
  const [loading, setLoading]          = useState(true);
  const [tooltip, setTooltip]          = useState<TooltipData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Derived dates
  const dates = useMemo(() => {
    return Array.from({ length: DAYS }, (_, i) => addDays(viewStart, i));
  }, [viewStart]);

  const viewEnd = dates[dates.length - 1];

  // Fetch rooms + reservations
  useEffect(() => {
    setLoading(true);
    Promise.all([
      listRooms(),
      api.get<any[]>('/api/reservations'),
    ]).then(([roomData, resData]) => {
      setRooms(roomData);
      setReservations(resData.map((r) => ({
        id:        r.id,
        roomId:    r.roomId,
        guestName: r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Guest',
        checkIn:   r.checkInDate,
        checkOut:  r.checkOutDate,
        status:    r.status,
        adults:    r.adults ?? 1,
        children:  r.children ?? 0,
        channel:   r.channel ?? '',
      })));
    }).finally(() => setLoading(false));
  }, []);

  // Auto-scroll to today on first load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const offset = daysBetween(viewStart, today);
      if (offset >= 0 && offset < DAYS) {
        scrollRef.current.scrollLeft = Math.max(0, (offset - 2) * COL_W);
      }
    }
  }, [loading, viewStart, today]);

  // Sorted room types for legend + color assignment
  const allTypes = useMemo(() => {
    const types = [...new Set(rooms.map((r) => r.roomType))].sort();
    return types;
  }, [rooms]);

  // Group rooms by type, sorted by floor then room number
  const groupedRooms = useMemo(() => {
    const groups: Record<string, Room[]> = {};
    for (const t of allTypes) {
      groups[t] = rooms
        .filter((r) => r.roomType === t)
        .sort((a, b) => {
          const fa = Number(a.floor ?? 0), fb = Number(b.floor ?? 0);
          return fa !== fb ? fa - fb : a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
        });
    }
    return groups;
  }, [rooms, allTypes]);

  // Build reservation lookup by roomId
  const resByRoom = useMemo(() => {
    const map: Record<string, CalReservation[]> = {};
    for (const r of reservations) {
      if (!map[r.roomId]) map[r.roomId] = [];
      map[r.roomId].push(r);
    }
    return map;
  }, [reservations]);

  function prevPeriod() {
    const d = new Date(viewStart);
    d.setDate(d.getDate() - 30);
    d.setDate(1);
    setViewStart(isoDate(d));
  }

  function nextPeriod() {
    const d = new Date(viewStart);
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    setViewStart(isoDate(d));
  }

  function goToToday() {
    const d = new Date();
    d.setDate(1);
    setViewStart(isoDate(d));
  }

  function handleBarClick(e: React.MouseEvent, res: CalReservation) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ res, x: rect.left + rect.width / 2, y: rect.top });
  }

  const totalGridW = DAYS * COL_W;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5" onClick={() => setTooltip(null)}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Room Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">Booking timeline by room</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={prevPeriod} className="px-2.5 py-1.5 hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <span className="px-3 py-1.5 text-sm font-semibold text-slate-700 border-x border-slate-200 min-w-[140px] text-center">
              {fmtMonthYear(viewStart)}
            </span>
            <button onClick={nextPeriod} className="px-2.5 py-1.5 hover:bg-slate-50 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      {allTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTypes.map((t) => {
            const c = typeColor(t, allTypes);
            return (
              <span
                key={t}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border"
                style={{ background: c.bg, color: c.text, borderColor: c.bar + '40' }}
              >
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: c.bar }} />
                {t}
              </span>
            );
          })}
          {/* Status legend */}
          <span className="ml-auto flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-8 h-3 rounded bg-slate-400 opacity-100 inline-block" />Confirmed</span>
            <span className="flex items-center gap-1"><span className="w-8 h-3 rounded bg-slate-400 opacity-60 inline-block border-2 border-dashed border-slate-400" />Pending</span>
            <span className="flex items-center gap-1"><span className="w-8 h-3 rounded bg-slate-300 opacity-40 inline-block" />Checked-out</span>
          </span>
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <CalendarDays className="w-8 h-8 animate-pulse" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
            <CalendarDays className="w-10 h-10" />
            <p className="text-sm">No rooms configured yet</p>
          </div>
        ) : (
          <div className="flex">

            {/* Sticky left column */}
            <div className="shrink-0 z-10 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)]" style={{ width: LEFT_W }}>
              {/* Header cell */}
              <div
                className="border-b border-slate-200 bg-slate-50 flex items-center px-3"
                style={{ height: 52 }}
              >
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Room</span>
              </div>

              {/* Room rows */}
              {allTypes.map((type) => {
                const c    = typeColor(type, allTypes);
                const rows = groupedRooms[type] ?? [];
                return (
                  <React.Fragment key={type}>
                    {/* Type group header */}
                    <div
                      className="flex items-center px-3 text-xs font-bold uppercase tracking-wider border-b"
                      style={{
                        height: 28,
                        background: c.bg,
                        color: c.text,
                        borderColor: c.bar + '30',
                      }}
                    >
                      {type}
                    </div>
                    {/* Individual rooms */}
                    {rows.map((room, i) => (
                      <div
                        key={room.id}
                        className="flex items-center px-3 border-b border-slate-100"
                        style={{
                          height: ROW_H,
                          background: i % 2 === 0 ? '#fff' : '#fafafa',
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full mr-2 shrink-0"
                          style={{ background: c.bar }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 leading-tight">
                            {room.roomNumber}
                          </p>
                          <p className="text-[11px] text-slate-400 leading-tight truncate">
                            {room.floor ? `Floor ${room.floor}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Scrollable dates area */}
            <div className="overflow-x-auto flex-1" ref={scrollRef}>
              <div style={{ width: totalGridW, minWidth: totalGridW }}>

                {/* Date header row */}
                <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-[5]" style={{ height: 52 }}>
                  {dates.map((d) => {
                    const { day, dow } = fmtDay(d);
                    const isToday      = d === today;
                    const isSun        = new Date(d).getDay() === 0;
                    const isSat        = new Date(d).getDay() === 6;
                    return (
                      <div
                        key={d}
                        className="shrink-0 flex flex-col items-center justify-center border-r border-slate-100"
                        style={{
                          width: COL_W,
                          background: isToday
                            ? '#fef3c7'
                            : (isSat || isSun) ? '#f8fafc' : undefined,
                        }}
                      >
                        <span
                          className={`text-[10px] font-medium ${isSat || isSun ? 'text-slate-400' : 'text-slate-400'}`}
                        >
                          {dow}
                        </span>
                        <span
                          className={`text-sm font-bold mt-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday
                              ? 'bg-amber-500 text-white'
                              : isSat || isSun
                              ? 'text-slate-400'
                              : 'text-slate-700'
                          }`}
                        >
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Room rows */}
                {allTypes.map((type) => {
                  const c    = typeColor(type, allTypes);
                  const rows = groupedRooms[type] ?? [];
                  return (
                    <React.Fragment key={type}>
                      {/* Group header spacer */}
                      <div
                        className="flex border-b"
                        style={{ height: 28, background: c.bg, borderColor: c.bar + '30' }}
                      >
                        {dates.map((d) => (
                          <div
                            key={d}
                            className="shrink-0 border-r"
                            style={{ width: COL_W, borderColor: c.bar + '20' }}
                          />
                        ))}
                      </div>

                      {/* Individual room rows */}
                      {rows.map((room, rowIdx) => {
                        const roomRes = (resByRoom[room.id] ?? []).filter(
                          (r) => r.checkIn < viewEnd && r.checkOut > viewStart,
                        );
                        return (
                          <div
                            key={room.id}
                            className="relative flex border-b border-slate-100"
                            style={{
                              height: ROW_H,
                              background: rowIdx % 2 === 0 ? '#fff' : '#fafafa',
                            }}
                          >
                            {/* Column lines */}
                            {dates.map((d) => {
                              const isSat  = new Date(d).getDay() === 6;
                              const isSun  = new Date(d).getDay() === 0;
                              const isTdy  = d === today;
                              return (
                                <div
                                  key={d}
                                  className="shrink-0 h-full border-r border-slate-100"
                                  style={{
                                    width: COL_W,
                                    background: isTdy
                                      ? 'rgba(245,158,11,0.06)'
                                      : (isSat || isSun)
                                      ? 'rgba(0,0,0,0.018)'
                                      : undefined,
                                  }}
                                />
                              );
                            })}

                            {/* Reservation bars */}
                            {roomRes.map((res) => {
                              const ss = STATUS_STYLE[res.status] ?? { opacity: 1, dashed: false };
                              if (ss.opacity === 0) return null;

                              const startClipped = res.checkIn < viewStart ? viewStart : res.checkIn;
                              const endClipped   = res.checkOut > viewEnd   ? addDays(viewEnd, 1) : res.checkOut;

                              const offsetDays = daysBetween(viewStart, startClipped);
                              const spanDays   = daysBetween(startClipped, endClipped);
                              if (spanDays <= 0) return null;

                              const left  = offsetDays * COL_W + 3;
                              const width = spanDays * COL_W - 6;
                              const barH  = ROW_H - 14;
                              const top   = 7;

                              return (
                                <div
                                  key={res.id}
                                  onClick={(e) => handleBarClick(e, res)}
                                  title={`${res.guestName} · ${res.checkIn} → ${res.checkOut}`}
                                  className="absolute flex items-center px-2 rounded-md cursor-pointer select-none transition-all hover:brightness-90 hover:scale-[1.01] active:scale-[0.99]"
                                  style={{
                                    left,
                                    width,
                                    top,
                                    height: barH,
                                    background: c.bar,
                                    opacity: ss.opacity,
                                    outline: ss.dashed ? `2px dashed ${c.bar}` : 'none',
                                    outlineOffset: ss.dashed ? -2 : 0,
                                    filter: res.status === 'Checked-out' ? 'saturate(0.3)' : undefined,
                                    zIndex: 2,
                                  }}
                                >
                                  <span
                                    className="text-white text-[11px] font-semibold truncate leading-tight"
                                    style={{ maxWidth: width - 12, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                                  >
                                    {res.guestName}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {!loading && rooms.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {allTypes.map((type) => {
            const c       = typeColor(type, allTypes);
            const typeRms = groupedRooms[type] ?? [];
            const active  = typeRms.filter((r) =>
              (resByRoom[r.id] ?? []).some(
                (res) => res.status === 'Checked-in' || res.status === 'Confirmed',
              )
            ).length;
            return (
              <div
                key={type}
                className="rounded-xl border p-3 flex items-center gap-3"
                style={{ background: c.bg, borderColor: c.bar + '40' }}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.bar }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: c.text }}>{type}</p>
                  <p className="text-lg font-bold" style={{ color: c.bar }}>
                    {active}
                    <span className="text-xs font-normal ml-1 opacity-60">/ {typeRms.length}</span>
                  </p>
                  <p className="text-[10px] opacity-60" style={{ color: c.text }}>active bookings</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-4 w-64 pointer-events-auto">
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="font-bold text-sm leading-tight">{tooltip.res.guestName}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                tooltip.res.status === 'Checked-in'  ? 'bg-emerald-500/20 text-emerald-300' :
                tooltip.res.status === 'Confirmed'   ? 'bg-blue-500/20 text-blue-300' :
                tooltip.res.status === 'Pending'     ? 'bg-amber-500/20 text-amber-300' :
                tooltip.res.status === 'Checked-out' ? 'bg-slate-500/20 text-slate-400' :
                'bg-red-500/20 text-red-400'
              }`}>{tooltip.res.status}</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Check-in</span>
                <span className="font-medium">{tooltip.res.checkIn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Check-out</span>
                <span className="font-medium">{tooltip.res.checkOut}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium">{daysBetween(tooltip.res.checkIn, tooltip.res.checkOut)} nights</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Guests</span>
                <span className="font-medium flex items-center gap-1">
                  <Users className="w-3 h-3" /> {tooltip.res.adults + tooltip.res.children}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Channel</span>
                <span className="font-medium">{tooltip.res.channel || '—'}</span>
              </div>
            </div>
          </div>
          {/* Arrow */}
          <div className="flex justify-center -mt-0.5">
            <div className="w-3 h-3 bg-slate-900 rotate-45 translate-y-[-6px]" />
          </div>
        </div>
      )}
    </div>
  );
}
