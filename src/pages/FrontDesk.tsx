import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Key, LogOut, UserPlus, Search, MoreHorizontal, QrCode, X, Printer, Download, MapPin, Phone, Mail, CalendarDays, Users, Receipt } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { listRooms, updateRoomStatus } from '../services/roomsService';
import { updateReservationStatus } from '../services/reservationsService';
import { api } from '../lib/api';
import { Room, RoomStatus } from '../domain/models';

type FrontDeskWindow = 'today' | 'tomorrow' | 'week';

interface StayRow {
  id: string;
  name: string;
  room: string;
  type: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  guestId: string;
  roomId: string;
  channel: string;
  adults: number;
  children: number;
  createdAt: string;
  folioId?: string;
}

interface FolioSummary {
  id: string;
  reservationId: string;
  isClosed: boolean;
  currency: string;
}
interface RoomQrData {
  hotel: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

const statusColor: Record<string, string> = {
  Available:   'bg-emerald-100 border-emerald-200 text-emerald-800',
  Occupied:    'bg-amber-50 border-amber-200 text-amber-700',
  Cleaning:    'bg-amber-50 border-amber-200 text-amber-700',
  Maintenance: 'bg-red-100 border-red-200 text-red-800',
  Reserved:    'bg-purple-100 border-purple-200 text-purple-800',
};

export function FrontDesk() {
  const [rooms, setRooms]         = useState<Room[]>([]);
  const [search, setSearch]       = useState('');
  const [arrivals, setArrivals]   = useState<StayRow[]>([]);
  const [departures, setDepartures] = useState<StayRow[]>([]);
  const [frontDeskWindow, setFrontDeskWindow] = useState<FrontDeskWindow>('today');
  const [isLoading, setIsLoading] = useState(true);

  // Confirm dialogs
  const [checkInTarget, setCheckInTarget]   = useState<StayRow | null>(null);
  const [checkOutTarget, setCheckOutTarget] = useState<StayRow | null>(null);
  const [roomStatusTarget, setRoomStatusTarget] = useState<{ room: Room; next: RoomStatus } | null>(null);
  const [processing, setProcessing]         = useState(false);
  const [qrRoom, setQrRoom]                 = useState<Room | null>(null);
  const [qrData, setQrData]                 = useState<RoomQrData | null>(null);
  const [qrDataLoading, setQrDataLoading]   = useState(false);

  function reload() {
    setIsLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      listRooms(),
      api.get<{
        id: string; status: string; checkInDate: string; checkOutDate: string; roomId: string;
        channel: string; adults: number; children: number; createdAt: string;
        guest?: { id: string; firstName: string; lastName: string } | null;
        room?: { id: string; roomNumber: string; roomType: string } | null;
      }[]>('/api/reservations'),
    ]).then(async ([roomData, resData]) => {
      setRooms(roomData);

      const reservationIds = resData.map((r) => r.id);
      const folios = reservationIds.length
        ? await api.get<FolioSummary[]>(`/api/folios?reservationIds=${reservationIds.join(',')}`).catch(() => [])
        : [];

      const folioMap = new Map(folios.map((f) => [f.reservationId, f.id]));

      const arr: StayRow[] = resData
        .filter((r) => r.checkInDate === today && (r.status === 'Confirmed' || r.status === 'Pending'))
        .map((r) => ({
          id:          r.id,
          name:        r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Unknown',
          room:        r.room?.roomNumber ?? '–',
          type:        r.room?.roomType ?? '',
          checkInDate: r.checkInDate,
          checkOutDate: r.checkOutDate,
          status:      r.status,
          guestId:     r.guest?.id ?? '',
          roomId:      r.roomId,
          channel:     r.channel ?? 'Direct',
          adults:      Number(r.adults ?? 1),
          children:    Number(r.children ?? 0),
          createdAt:   r.createdAt,
          folioId:     folioMap.get(r.id),
        }));

      const dep: StayRow[] = resData
        .filter((r) => r.checkOutDate === today && r.status === 'Checked-in')
        .map((r) => ({
          id:          r.id,
          name:        r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Unknown',
          room:        r.room?.roomNumber ?? '–',
          type:        r.room?.roomType ?? '',
          checkInDate: r.checkInDate,
          checkOutDate: r.checkOutDate,
          status:      r.status,
          roomId:      r.roomId,
          guestId:     r.guest?.id ?? '',
          channel:     r.channel ?? 'Direct',
          adults:      Number(r.adults ?? 1),
          children:    Number(r.children ?? 0),
          createdAt:   r.createdAt,
          folioId:     folioMap.get(r.id),
        }));

      setArrivals(arr);
      setDepartures(dep);
    }).catch(() => {}).finally(() => setIsLoading(false));
  }

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    let cancelled = false;
    if (!qrRoom) {
      setQrData(null);
      setQrDataLoading(false);
      return;
    }

    setQrDataLoading(true);
    api.get<{ room: unknown; hotel: { name?: string; address?: string; phone?: string; email?: string } }>(`/api/public/room/${qrRoom.id}`)
      .then((data) => {
        if (cancelled) return;
        setQrData({
          hotel: {
            name: data?.hotel?.name ?? 'SERVV Hotel',
            address: data?.hotel?.address ?? '',
            phone: data?.hotel?.phone ?? '',
            email: data?.hotel?.email ?? '',
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setQrData({ hotel: { name: 'SERVV Hotel', address: '', phone: '', email: '' } });
      })
      .finally(() => {
        if (!cancelled) setQrDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [qrRoom]);

  async function handleCheckIn() {
    if (!checkInTarget) return;
    setProcessing(true);
    try {
      await updateReservationStatus(checkInTarget.id, 'Checked-in');
      const room = rooms.find((r) => r.roomNumber === checkInTarget.room);
      if (room) await updateRoomStatus(room.id, 'Occupied');
      reload();
    } finally { setProcessing(false); setCheckInTarget(null); }
  }

  async function handleCheckOut() {
    if (!checkOutTarget) return;
    setProcessing(true);
    try {
      await updateReservationStatus(checkOutTarget.id, 'Checked-out');
      await updateRoomStatus(checkOutTarget.roomId, 'Cleaning');
      reload();
    } finally { setProcessing(false); setCheckOutTarget(null); }
  }

  async function handleRoomStatusChange() {
    if (!roomStatusTarget) return;
    setProcessing(true);
    try {
      await updateRoomStatus(roomStatusTarget.room.id, roomStatusTarget.next);
      reload();
    } finally { setProcessing(false); setRoomStatusTarget(null); }
  }

  async function downloadQrPng(room: Room) {
    const guestUrl = `${window.location.origin}/room/${room.id}`;
    const qrSrc    = `https://api.qrserver.com/v1/create-qr-code/?size=900x900&data=${encodeURIComponent(guestUrl)}`;
    const hotel    = qrData?.hotel ?? { name: 'SERVV Hotel', address: '', phone: '', email: '' };

    const response = await fetch(qrSrc);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 1900;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const wrap = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      if (!text.trim()) return y;
      const words = text.split(/\s+/);
      let line = '';
      let currentY = y;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, x, currentY);
          line = word;
          currentY += lineHeight;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, x, currentY);
      return currentY + lineHeight;
    };

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, 220);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 220, canvas.width, 8);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 62px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(hotel.name || 'SERVV Hotel', 80, 105);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 30px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Guest Room Service QR', 80, 162);

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 84px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(`Room ${room.roomNumber}`, 80, 340);

    ctx.fillStyle = '#334155';
    ctx.font = '600 38px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(`${room.roomType}  |  Floor ${room.floor}`, 80, 400);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.fillRect(250, 470, 900, 900);
    ctx.strokeRect(250, 470, 900, 900);
    ctx.drawImage(bitmap, 300, 520, 800, 800);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 28px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Scan to open guest services menu', 420, 1405);

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 34px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Hotel Contact', 80, 1505);

    ctx.fillStyle = '#334155';
    ctx.font = '500 29px system-ui, -apple-system, Segoe UI, sans-serif';
    let nextY = 1560;
    nextY = wrap(`Address: ${hotel.address || 'N/A'}`, 80, nextY, 1240, 44);
    nextY = wrap(`Phone: ${hotel.phone || 'N/A'}`, 80, nextY, 1240, 44);
    nextY = wrap(`Email: ${hotel.email || 'N/A'}`, 80, nextY, 1240, 44);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 23px system-ui, -apple-system, Segoe UI, sans-serif';
    wrap(`URL: ${guestUrl}`, 80, Math.max(nextY + 10, 1820), 1240, 34);

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
    if (!pngBlob) return;

    const url = URL.createObjectURL(pngBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `room-${room.roomNumber}-qr.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const ROOM_STATUS_CYCLE: Record<RoomStatus, RoomStatus> = {
    Available:   'Cleaning',
    Cleaning:    'Available',
    Maintenance: 'Available',
    Reserved:    'Available',
    Occupied:    'Maintenance',
  };

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort();
  const filtered = search
    ? rooms.filter((r) => r.roomNumber.includes(search) || r.roomType.toLowerCase().includes(search.toLowerCase()))
    : rooms;

  function iso(offsetDays: number) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  const todayIso = iso(0);
  const tomorrowIso = iso(1);
  const weekEndIso = iso(7);

  function inWindow(dateIso: string, window: FrontDeskWindow) {
    if (window === 'today') return dateIso === todayIso;
    if (window === 'tomorrow') return dateIso === tomorrowIso;
    return dateIso >= todayIso && dateIso <= weekEndIso;
  }

  const arrivalsView = arrivals.filter((r) => inWindow(r.checkInDate, frontDeskWindow));
  const departuresView = departures.filter((r) => inWindow(r.checkOutDate, frontDeskWindow));

  function nights(checkInDate: string, checkOutDate: string) {
    return Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86_400_000));
  }

  function shortId(id: string) {
    return id.length > 8 ? id.slice(0, 8) : id;
  }

  const channelTone: Record<string, string> = {
    Direct: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inquiry: 'bg-blue-50 text-blue-700 border-blue-200',
    Hold: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Front Desk"
        subtitle="Manage daily operations, room status, and guest check-ins."
        actions={
          <button
            onClick={() => window.location.assign('/reservations')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Walk-in
          </button>
        }
      />

      {isLoading ? (
        <div className="text-center py-16 text-slate-500 text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Room Grid */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3 text-sm">
                {Object.entries(statusColor).map(([s, cls]) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full border ${cls}`}></div> {s}
                  </div>
                ))}
              </div>
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search room…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {floors.map((floor) => (
              <div key={floor} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Floor {floor}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                  {filtered.filter((r) => r.floor === floor).map((room) => (
                    <div key={room.id} className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${statusColor[room.status] ?? 'bg-gray-100 border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-lg">{room.roomNumber}</span>
                        <button
                          title="Cycle status"
                          onClick={() => setRoomStatusTarget({ room, next: ROOM_STATUS_CYCLE[room.status] ?? 'Available' })}
                          className="text-current opacity-50 hover:opacity-100"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs font-medium opacity-80 mb-1">{room.roomType}</div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-semibold truncate">{room.status}</div>
                        <button
                          title="Show QR code"
                          onClick={(e) => { e.stopPropagation(); setQrRoom(room); }}
                          className="opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Arrivals & Departures */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2">
              <div className="grid grid-cols-3 gap-1 text-xs">
                {([
                  { key: 'today', label: 'Today' },
                  { key: 'tomorrow', label: 'Tomorrow' },
                  { key: 'week', label: 'Week' },
                ] as const).map((w) => (
                  <button
                    key={w.key}
                    onClick={() => setFrontDeskWindow(w.key)}
                    className={`px-2.5 py-2 rounded-lg font-medium transition-colors ${
                      frontDeskWindow === w.key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600" /> Arrivals
                </h3>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{arrivalsView.length}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {arrivalsView.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">No arrivals in this window.</div>}
                {arrivalsView.map((guest) => (
                  <div key={guest.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div>
                        <span className="font-semibold text-gray-900">{guest.name}</span>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                          <span className={`px-2 py-0.5 rounded-full border ${channelTone[guest.channel] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>{guest.channel}</span>
                          <span className="px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 bg-white">Res #{shortId(guest.id)}</span>
                          <span className="px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 bg-white">Folio {guest.folioId ? `#${shortId(guest.folioId)}` : 'Pending'}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {guest.checkInDate}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {guest.adults}A{guest.children ? ` / ${guest.children}C` : ''}</span>
                      <span>{nights(guest.checkInDate, guest.checkOutDate)} night{nights(guest.checkInDate, guest.checkOutDate) !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Room {guest.room} • {guest.type}</span>
                      <button
                        onClick={() => setCheckInTarget(guest)}
                        className="text-amber-600 font-medium hover:text-amber-700 text-xs bg-amber-50 px-2 py-1 rounded"
                      >
                        Check-in
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-amber-600" /> Departures
                </h3>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{departuresView.length}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {departuresView.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">No departures in this window.</div>}
                {departuresView.map((guest) => (
                  <div key={guest.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div>
                        <span className="font-semibold text-gray-900">{guest.name}</span>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                          <span className={`px-2 py-0.5 rounded-full border ${channelTone[guest.channel] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>{guest.channel}</span>
                          <span className="px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 bg-white">Res #{shortId(guest.id)}</span>
                          <span className="px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 bg-white inline-flex items-center gap-1"><Receipt className="w-3 h-3" /> Folio {guest.folioId ? `#${shortId(guest.folioId)}` : 'Pending'}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {guest.checkOutDate}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {guest.adults}A{guest.children ? ` / ${guest.children}C` : ''}</span>
                      <span>{nights(guest.checkInDate, guest.checkOutDate)} night{nights(guest.checkInDate, guest.checkOutDate) !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Room {guest.room}</span>
                      <button
                        onClick={() => setCheckOutTarget(guest)}
                        className="text-amber-600 font-medium hover:text-amber-700 text-xs bg-amber-50 px-2 py-1 rounded"
                      >
                        Check-out
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* QR Codes panel */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-600" /> Room QR Codes
                </h3>
                <span className="text-xs text-gray-500">{rooms.length} rooms</span>
              </div>
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {rooms.length === 0 && <div className="p-6 text-center text-gray-500 text-sm">No rooms found.</div>}
                {rooms.map((r) => (
                  <div key={r.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <span className="font-medium text-gray-900 text-sm">Room {r.roomNumber}</span>
                      <span className="text-gray-500 text-xs ml-1.5">{r.roomType}</span>
                    </div>
                    <button
                      onClick={() => setQrRoom(r)}
                      className="flex items-center gap-1 text-amber-600 hover:text-amber-700 text-xs font-medium"
                    >
                      <QrCode className="w-3.5 h-3.5" /> View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code modal */}
      {qrRoom && (() => {
        const guestUrl = `${window.location.origin}/room/${qrRoom.id}`;
        const qrSrc    = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(guestUrl)}`;
        const hotelName = qrData?.hotel.name ?? 'SERVV Hotel';
        const hotelAddress = qrData?.hotel.address ?? '';
        const hotelPhone = qrData?.hotel.phone ?? '';
        const hotelEmail = qrData?.hotel.email ?? '';
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Room QR Card</p>
                  <h3 className="font-semibold text-gray-900">Room {qrRoom.roomNumber}</h3>
                  <p className="text-gray-500 text-sm">{qrRoom.roomType} · Floor {qrRoom.floor}</p>
                </div>
                <button onClick={() => setQrRoom(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">{hotelName}</p>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400" /> <span>{hotelAddress || (qrDataLoading ? 'Loading address...' : 'Address not set')}</span></p>
                  <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> <span>{hotelPhone || (qrDataLoading ? 'Loading phone...' : 'Phone not set')}</span></p>
                  <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> <span>{hotelEmail || (qrDataLoading ? 'Loading email...' : 'Email not set')}</span></p>
                </div>
              </div>

              <div className="flex justify-center mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <img src={qrSrc} alt={`QR code for room ${qrRoom.roomNumber}`} className="w-60 h-60 rounded-lg border border-gray-100" />
              </div>

              <p className="text-center text-gray-500 text-xs mb-4 break-all">{guestUrl}</p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => window.open(guestUrl, '_blank')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Preview
                </button>
                <button
                  onClick={() => downloadQrPng(qrRoom)}
                  className="px-3 py-2 flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-medium transition-colors border border-amber-200"
                >
                  <Download className="w-4 h-4" /> PNG
                </button>
                <button
                  onClick={() => {
                    const w = window.open('', '_blank')!;
                    w.document.write(`<html><body style="margin:0;display:flex;flex-direction:column;align-items:center;padding:32px;font-family:sans-serif">
                      <h2 style="margin-bottom:8px">${hotelName}</h2>
                      <p style="color:#111;margin-bottom:4px;font-size:20px;font-weight:700">Room ${qrRoom.roomNumber}</p>
                      <p style="color:#666;margin-bottom:10px">${qrRoom.roomType} — Floor ${qrRoom.floor}</p>
                      <img src="${qrSrc}" width="300" height="300" />
                      <p style="margin-top:12px;color:#888;font-size:12px">Scan to order room service or request assistance</p>
                      <p style="margin-top:14px;color:#444;font-size:12px">${hotelAddress || ''}</p>
                      <p style="margin-top:4px;color:#444;font-size:12px">${hotelPhone || ''}${hotelPhone && hotelEmail ? ' • ' : ''}${hotelEmail || ''}</p>
                    </body></html>`);
                    w.document.close();
                    w.print();
                  }}
                  className="px-3 py-2 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {checkInTarget && (
        <ConfirmDialog
          title="Check In Guest"
          message={`Check in ${checkInTarget.name} to Room ${checkInTarget.room}? The room will be marked Occupied.`}
          confirmLabel="Check In"
          confirmClassName="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50"
          onConfirm={handleCheckIn}
          onCancel={() => setCheckInTarget(null)}
          isLoading={processing}
        />
      )}

      {checkOutTarget && (
        <ConfirmDialog
          title="Check Out Guest"
          message={`Check out ${checkOutTarget.name} from Room ${checkOutTarget.room}? The room will be queued for cleaning.`}
          confirmLabel="Check Out"
          confirmClassName="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50"
          onConfirm={handleCheckOut}
          onCancel={() => setCheckOutTarget(null)}
          isLoading={processing}
        />
      )}

      {roomStatusTarget && (
        <ConfirmDialog
          title="Update Room Status"
          message={`Change Room ${roomStatusTarget.room.roomNumber} from "${roomStatusTarget.room.status}" to "${roomStatusTarget.next}"?`}
          confirmLabel="Update"
          confirmClassName="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-medium disabled:opacity-50"
          onConfirm={handleRoomStatusChange}
          onCancel={() => setRoomStatusTarget(null)}
          isLoading={processing}
        />
      )}
    </motion.div>
  );
}
