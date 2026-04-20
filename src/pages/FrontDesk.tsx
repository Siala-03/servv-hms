import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Key, LogOut, UserPlus, Search, MoreHorizontal, QrCode, X, Printer } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { listRooms, updateRoomStatus } from '../services/roomsService';
import { updateReservationStatus } from '../services/reservationsService';
import { api } from '../lib/api';
import { Room, RoomStatus } from '../domain/models';

interface ArrivalRow { id: string; name: string; room: string; type: string; checkInDate: string; status: string; guestId: string; }
interface DepartureRow { id: string; name: string; room: string; checkOutDate: string; status: string; roomId: string; }

const statusColor: Record<string, string> = {
  Available:   'bg-emerald-100 border-emerald-200 text-emerald-800',
  Occupied:    'bg-amber-100 border-amber-200 text-amber-800',
  Cleaning:    'bg-amber-100 border-amber-200 text-amber-800',
  Maintenance: 'bg-red-100 border-red-200 text-red-800',
  Reserved:    'bg-purple-100 border-purple-200 text-purple-800',
};

export function FrontDesk() {
  const [rooms, setRooms]         = useState<Room[]>([]);
  const [search, setSearch]       = useState('');
  const [arrivals, setArrivals]   = useState<ArrivalRow[]>([]);
  const [departures, setDepartures] = useState<DepartureRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Confirm dialogs
  const [checkInTarget, setCheckInTarget]   = useState<ArrivalRow | null>(null);
  const [checkOutTarget, setCheckOutTarget] = useState<DepartureRow | null>(null);
  const [roomStatusTarget, setRoomStatusTarget] = useState<{ room: Room; next: RoomStatus } | null>(null);
  const [processing, setProcessing]         = useState(false);
  const [qrRoom, setQrRoom]                 = useState<Room | null>(null);

  function reload() {
    setIsLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      listRooms(),
      api.get<{
        id: string; status: string; checkInDate: string; checkOutDate: string; roomId: string;
        guest?: { id: string; firstName: string; lastName: string } | null;
        room?: { id: string; roomNumber: string; roomType: string } | null;
      }[]>('/api/reservations'),
    ]).then(([roomData, resData]) => {
      setRooms(roomData);

      const arr: ArrivalRow[] = resData
        .filter((r) => r.checkInDate === today && (r.status === 'Confirmed' || r.status === 'Pending'))
        .map((r) => ({
          id:          r.id,
          name:        r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Unknown',
          room:        r.room?.roomNumber ?? '–',
          type:        r.room?.roomType ?? '',
          checkInDate: r.checkInDate,
          status:      r.status,
          guestId:     r.guest?.id ?? '',
        }));

      const dep: DepartureRow[] = resData
        .filter((r) => r.checkOutDate === today && r.status === 'Checked-in')
        .map((r) => ({
          id:          r.id,
          name:        r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Unknown',
          room:        r.room?.roomNumber ?? '–',
          checkOutDate: r.checkOutDate,
          status:      r.status,
          roomId:      r.roomId,
        }));

      setArrivals(arr);
      setDepartures(dep);
    }).catch(() => {}).finally(() => setIsLoading(false));
  }

  useEffect(() => { reload(); }, []);

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
              <div key={floor} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Floor {floor}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filtered.filter((r) => r.floor === floor).map((room) => (
                    <div key={room.id} className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${statusColor[room.status] ?? 'bg-gray-100 border-gray-200'}`}>
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
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600" /> Today's Arrivals
                </h3>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{arrivals.length}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {arrivals.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">No arrivals today.</div>}
                {arrivals.map((guest) => (
                  <div key={guest.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-900">{guest.name}</span>
                      <span className="text-xs text-gray-500">{guest.checkInDate}</span>
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
                  <LogOut className="w-4 h-4 text-amber-600" /> Today's Departures
                </h3>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{departures.length}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {departures.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">No departures today.</div>}
                {departures.map((guest) => (
                  <div key={guest.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-900">{guest.name}</span>
                      <span className="text-xs text-gray-500">{guest.checkOutDate}</span>
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
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Room {qrRoom.roomNumber}</h3>
                  <p className="text-gray-500 text-sm">{qrRoom.roomType} · Floor {qrRoom.floor}</p>
                </div>
                <button onClick={() => setQrRoom(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-center mb-4">
                <img src={qrSrc} alt={`QR code for room ${qrRoom.roomNumber}`} className="w-56 h-56 rounded-lg border border-gray-100" />
              </div>
              <p className="text-center text-gray-400 text-xs mb-4 break-all">{guestUrl}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(guestUrl, '_blank')}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Preview
                </button>
                <button
                  onClick={() => {
                    const w = window.open('', '_blank')!;
                    w.document.write(`<html><body style="margin:0;display:flex;flex-direction:column;align-items:center;padding:32px;font-family:sans-serif">
                      <h2 style="margin-bottom:8px">Room ${qrRoom.roomNumber}</h2>
                      <p style="color:#666;margin-bottom:16px">${qrRoom.roomType} — Floor ${qrRoom.floor}</p>
                      <img src="${qrSrc}" width="300" height="300" />
                      <p style="margin-top:12px;color:#888;font-size:12px">Scan to order room service or request assistance</p>
                    </body></html>`);
                    w.document.close();
                    w.print();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
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
