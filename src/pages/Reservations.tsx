import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Search, Download, Plus, CalendarRange, List, MoreVertical, X } from 'lucide-react';
import { RoomCalendar } from './RoomCalendar';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  listReservationChannels,
  listReservationItems,
  ReservationListItem,
  listReservationStatuses,
  createReservation,
  updateReservationStatus,
} from '../services/reservationsService';
import { api } from '../lib/api';
import { GuestProfile, Room, RatePlan, ReservationStatus } from '../domain/models';

const CHANNELS = ['Direct', 'Booking.com', 'Airbnb', 'Expedia', 'Agoda', 'Triply'];

interface BookingForm {
  guestId: string;
  roomId: string;
  ratePlanId: string;
  channel: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number | '';
  children: number | '';
  totalAmount: number | '';
}

type BookingType = 'confirm' | 'inquiry' | 'hold';
type GuestMode = 'returning' | 'new';

interface NewGuestForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const emptyForm = (): BookingForm => ({
  guestId: '', roomId: '', ratePlanId: '', channel: 'Direct',
  checkInDate: '', checkOutDate: '', adults: '', children: '', totalAmount: '',
});

const STATUS_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  Pending:      ['Confirmed', 'Cancelled'],
  Confirmed:    ['Checked-in', 'Cancelled'],
  'Checked-in': ['Checked-out'],
  'Checked-out': [],
  Cancelled:    [],
};

export function Reservations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView]               = useState<'list' | 'calendar'>('list');
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [channels, setChannels]       = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedChannel, setSelectedChannel] = useState('All Channels');
  const [search, setSearch]           = useState('');
  const [isLoading, setIsLoading]     = useState(true);
  const [loadError, setLoadError]     = useState('');
  const statuses = listReservationStatuses();

  // Modals
  const [showNew, setShowNew]             = useState(false);
  const [formData, setFormData]           = useState<BookingForm>(emptyForm());
  const [bookingType, setBookingType]     = useState<BookingType>('confirm');
  const [guestMode, setGuestMode]         = useState<GuestMode>('returning');
  const [newGuest, setNewGuest]           = useState<NewGuestForm>({ firstName: '', lastName: '', email: '', phone: '' });
  const [formError, setFormError]         = useState('');
  const [submitting, setSubmitting]       = useState(false);

  // Action menu
  const [menuOpen, setMenuOpen]           = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Status change confirm
  const [pendingStatus, setPendingStatus] = useState<{ id: string; status: ReservationStatus } | null>(null);
  const [cancelTarget, setCancelTarget]   = useState<string | null>(null);

  // Reference data for form
  const [guests, setGuests]     = useState<GuestProfile[]>([]);
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load reference data when New modal opens
  useEffect(() => {
    if (!showNew) return;
    Promise.all([
      api.get<GuestProfile[]>('/api/guests'),
      api.get<Room[]>('/api/rooms'),
      api.get<RatePlan[]>('/api/rate-plans'),
    ]).then(([g, r, rp]) => { setGuests(g); setRooms(r); setRatePlans(rp); }).catch(() => {});
  }, [showNew]);

  useEffect(() => {
    let alive = true;
    listReservationChannels().then((d) => { if (alive) setChannels(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;

    setFormData(emptyForm());
    setBookingType('confirm');
    setGuestMode('returning');
    setNewGuest({ firstName: '', lastName: '', email: '', phone: '' });
    setFormError('');
    setShowNew(true);

    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  function reload() {
    setIsLoading(true);
    setLoadError('');
    listReservationItems({
      status:  selectedStatus  === 'All Statuses'  ? undefined : selectedStatus,
      channel: selectedChannel === 'All Channels'  ? undefined : selectedChannel,
    })
      .then((d) => setReservations(d))
      .catch(() => { setReservations([]); setLoadError('Unable to load reservations.'); })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { reload(); }, [selectedStatus, selectedChannel]); // eslint-disable-line

  const visible = search
    ? reservations.filter((r) =>
        r.guest.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase()))
    : reservations;

  // ── New Booking submit ────────────────────────────────────────
  async function handleCreate() {
    if (!formData.roomId || !formData.ratePlanId || !formData.checkInDate || !formData.checkOutDate) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (guestMode === 'returning' && !formData.guestId) {
      setFormError('Please select a returning guest or switch to New guest.');
      return;
    }

    if (guestMode === 'new') {
      if (!newGuest.firstName.trim() || !newGuest.lastName.trim() || !newGuest.email.trim() || !newGuest.phone.trim()) {
        setFormError('Please fill all new guest fields.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newGuest.email.trim())) {
        setFormError('Please enter a valid email address for the new guest.');
        return;
      }
    }

    if (formData.checkOutDate <= formData.checkInDate) {
      setFormError('Check-out date must be after check-in date.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await createReservation({
        ...formData,
        bookingType,
        guestId: guestMode === 'returning' ? formData.guestId : undefined,
        newGuest: guestMode === 'new'
          ? {
              firstName: newGuest.firstName.trim(),
              lastName: newGuest.lastName.trim(),
              email: newGuest.email.trim().toLowerCase(),
              phone: newGuest.phone.trim(),
            }
          : undefined,
        adults:      Number(formData.adults)      || 1,
        children:    Number(formData.children)    || 0,
        totalAmount: Number(formData.totalAmount) || 0,
      });
      setShowNew(false);
      setFormData(emptyForm());
      setBookingType('confirm');
      setGuestMode('returning');
      setNewGuest({ firstName: '', lastName: '', email: '', phone: '' });
      reload();
    } catch (e) {
      setFormError((e as Error).message ?? 'Failed to create booking.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Status change ─────────────────────────────────────────────
  async function handleStatusChange() {
    if (!pendingStatus) return;
    setSubmitting(true);
    try {
      await updateReservationStatus(pendingStatus.id, pendingStatus.status);
      reload();
    } finally {
      setSubmitting(false);
      setPendingStatus(null);
    }
  }

  function exportCSV() {
    const rows = [
      ['ID', 'Guest', 'Email', 'Room', 'Room No', 'Check-in', 'Check-out', 'Channel', 'Status', 'Amount'],
      ...visible.map((r) => [r.id, r.guest, r.email, r.room, r.roomNo, r.checkIn, r.checkOut, r.channel, r.status, r.amount]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `reservations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  // ── Cancel booking ────────────────────────────────────────────
  async function handleCancel() {
    if (!cancelTarget) return;
    setSubmitting(true);
    try {
      await updateReservationStatus(cancelTarget, 'Cancelled');
      reload();
    } finally {
      setSubmitting(false);
      setCancelTarget(null);
    }
  }

  function field(label: string, children: React.ReactNode, required = false) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500';

  // Auto-calculate total amount from room base rate × nights
  function calcTotal(fd: BookingForm): number | '' {
    const room = rooms.find((r) => r.id === fd.roomId);
    if (!room || !fd.checkInDate || !fd.checkOutDate) return '';
    const nights = Math.round(
      (new Date(fd.checkOutDate).getTime() - new Date(fd.checkInDate).getTime()) / 86_400_000
    );
    return nights > 0 ? Math.round(room.baseRate * nights * 100) / 100 : '';
  }

  function updateForm(patch: Partial<BookingForm>) {
    const next = { ...formData, ...patch };
    const auto = calcTotal(next);
    setFormData({ ...next, totalAmount: auto !== '' ? auto : next.totalAmount });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Reservations"
        subtitle="Manage all your bookings across channels in one place."
        actions={
          <>
            <div className="flex bg-white rounded-lg border border-slate-200 p-1 gap-0.5">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <CalendarRange className="w-3.5 h-3.5" /> Calendar
              </button>
            </div>
            <button
              onClick={exportCSV}
              className="focus-ring flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
            >
              <Download className="w-4 h-4" /><span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={() => { setFormData(emptyForm()); setFormError(''); setShowNew(true); }}
              className="focus-ring brand-btn flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm shadow-amber-900/25"
            >
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Booking</span><span className="sm:hidden">New</span>
            </button>
          </>
        }
      />

      <section className="hero-banner hidden sm:block p-5 sm:p-6 mb-6 text-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold mb-1.5">Reservation Flow</p>
            <p className="text-sm text-slate-200">High conversion windows: 6 PM - 9 PM direct bookings. Keep premium rooms visible for same-day upsell.</p>
          </div>
          <div className="flex gap-2.5">
            <div className="hero-chip rounded-xl px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Confirmed</p>
              <p className="text-base font-semibold">{reservations.filter((r) => r.status === 'Confirmed').length}</p>
            </div>
            <div className="hero-chip rounded-xl px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Pending</p>
              <p className="text-base font-semibold">{reservations.filter((r) => r.status === 'Pending').length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters — hidden in calendar view */}
      {view === 'list' && <div className="luxury-panel luxury-panel-spotlight p-4 rounded-2xl mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search guest name, booking ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus-ring w-full pl-9 pr-4 py-2 bg-white/70 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white transition-colors"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="focus-ring px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700">
            <option>All Statuses</option>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)} className="focus-ring px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700">
            <option>All Channels</option>
            {channels.map((c) => <option key={c}>{c}</option>)}
          </select>
          {(search || selectedStatus !== 'All Statuses' || selectedChannel !== 'All Channels') && (
            <button
              onClick={() => { setSearch(''); setSelectedStatus('All Statuses'); setSelectedChannel('All Channels'); }}
              className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-slate-700 text-sm"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>}

      {/* Table / Calendar */}
      {view === 'list' ? (
        <div className="luxury-panel rounded-2xl overflow-hidden">
          {loadError && <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{loadError}</div>}
          <div className="table-shell">
            <table className="table-premium text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/90 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-4 font-medium">Booking ID</th>
                  <th className="px-6 py-4 font-medium">Guest</th>
                  <th className="px-6 py-4 font-medium">Room</th>
                  <th className="px-6 py-4 font-medium">Dates</th>
                  <th className="px-6 py-4 font-medium">Channel</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {isLoading ? (
                  <tr><td className="px-6 py-8 text-slate-500" colSpan={8}>Loading reservations…</td></tr>
                ) : visible.length === 0 ? (
                  <tr><td className="px-6 py-8 text-slate-500" colSpan={8}>No reservations found.</td></tr>
                ) : visible.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-400 text-xs font-mono"><div className="table-truncate">{booking.id}</div></td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 table-truncate">{booking.guest}</div>
                      <div className="text-xs text-gray-500 table-truncate">{booking.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 table-truncate">{booking.room}</div>
                      <div className="text-xs text-gray-500">Room {booking.roomNo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{booking.checkIn}</div>
                      <div className="text-xs text-gray-500">to {booking.checkOut}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{booking.channel}</td>
                    <td className="px-6 py-4"><StatusBadge status={booking.status} /></td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{booking.amount}</td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === booking.id ? null : booking.id)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuOpen === booking.id && (
                        <div ref={menuRef} className="absolute right-6 top-10 z-20 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[160px] text-left">
                          {STATUS_TRANSITIONS[booking.status]?.filter((s) => s !== 'Cancelled').map((s) => (
                            <button
                              key={s}
                              onClick={() => { setPendingStatus({ id: booking.id, status: s }); setMenuOpen(null); }}
                              className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                            >
                              Mark as {s}
                            </button>
                          ))}
                          {booking.status !== 'Cancelled' && booking.status !== 'Checked-out' && (
                            <button
                              onClick={() => { setCancelTarget(booking.id); setMenuOpen(null); }}
                              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left border-t border-slate-100"
                            >
                              Cancel Booking
                            </button>
                          )}
                          {!STATUS_TRANSITIONS[booking.status]?.length && booking.status !== 'Cancelled' && (
                            <div className="px-4 py-2 text-xs text-slate-400">No actions available</div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-sm text-slate-500">
            <div>Showing {visible.length} of {reservations.length} entries</div>
          </div>
        </div>
      ) : (
        <RoomCalendar />
      )}

      {/* ── New Booking Modal ───────────────────────────────────── */}
      {showNew && (
        <Modal
          title="Quick Booking"
          onClose={() => setShowNew(false)}
          size="lg"
          footer={
            <>
              <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">Cancel</button>
              <button onClick={handleCreate} disabled={submitting} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50">
                {submitting ? 'Creating…' : 'Create Booking'}
              </button>
            </>
          }
        >
          {formError && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

          <div className="mb-4 rounded-xl border border-slate-200 p-3 bg-slate-50">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Booking Type</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'confirm', label: 'Confirm' },
                { key: 'inquiry', label: 'Inquiry' },
                { key: 'hold', label: 'Hold' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setBookingType(item.key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    bookingType === item.key
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-slate-500">Rooms: 1</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 rounded-xl border border-slate-200 p-3 bg-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Guest Information</p>
              <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden mb-3">
                <button
                  type="button"
                  onClick={() => setGuestMode('returning')}
                  className={`px-3 py-1.5 text-sm font-medium ${guestMode === 'returning' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}
                >
                  Returning
                </button>
                <button
                  type="button"
                  onClick={() => { setGuestMode('new'); setFormData((p) => ({ ...p, guestId: '' })); }}
                  className={`px-3 py-1.5 text-sm font-medium border-l border-slate-200 ${guestMode === 'new' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}
                >
                  New
                </button>
              </div>

              {guestMode === 'returning' ? (
                field('Guest', (
                  <select value={formData.guestId} onChange={(e) => setFormData({ ...formData, guestId: e.target.value })} className={inputCls}>
                    <option value="">Select guest…</option>
                    {guests.map((g) => <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>)}
                  </select>
                ), true)
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {field('First Name', (
                    <input type="text" value={newGuest.firstName} onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })} className={inputCls} placeholder="Guest first name" />
                  ), true)}
                  {field('Last Name', (
                    <input type="text" value={newGuest.lastName} onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })} className={inputCls} placeholder="Guest last name" />
                  ), true)}
                  {field('Email', (
                    <input type="email" value={newGuest.email} onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })} className={inputCls} placeholder="guest@email.com" />
                  ), true)}
                  {field('Phone', (
                    <input type="tel" value={newGuest.phone} onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })} className={inputCls} placeholder="+2507..." />
                  ), true)}
                </div>
              )}
            </div>

            {field('Room', (
              <select value={formData.roomId} onChange={(e) => updateForm({ roomId: e.target.value })} className={inputCls}>
                <option value="">Select room…</option>
                {rooms.filter((r) => r.status === 'Available').map((r) => (
                  <option key={r.id} value={r.id}>Room {r.roomNumber} – {r.roomType} (${r.baseRate}/night)</option>
                ))}
              </select>
            ), true)}
            {field('Rate Plan', (
              <select value={formData.ratePlanId} onChange={(e) => setFormData({ ...formData, ratePlanId: e.target.value })} className={inputCls}>
                <option value="">Select rate plan…</option>
                {ratePlans.filter((rp) => rp.isActive).map((rp) => <option key={rp.id} value={rp.id}>{rp.name}</option>)}
              </select>
            ), true)}
            {field('Channel', (
              <select value={formData.channel} onChange={(e) => setFormData({ ...formData, channel: e.target.value })} className={inputCls}>
                {CHANNELS.map((c) => <option key={c}>{c}</option>)}
              </select>
            ))}
            {field('Check-in Date', (
              <input type="date" value={formData.checkInDate} onChange={(e) => updateForm({ checkInDate: e.target.value, checkOutDate: formData.checkOutDate && e.target.value >= formData.checkOutDate ? '' : formData.checkOutDate })} className={inputCls} />
            ), true)}
            {field('Check-out Date', (
              <input type="date" value={formData.checkOutDate} min={formData.checkInDate || undefined} onChange={(e) => updateForm({ checkOutDate: e.target.value })} className={inputCls} />
            ), true)}
            {field('Adults', (
              <input type="number" min={1} max={10} value={formData.adults} placeholder="1" onChange={(e) => setFormData({ ...formData, adults: e.target.value === '' ? '' : Number(e.target.value) })} className={inputCls} />
            ))}
            {field('Children', (
              <input type="number" min={0} max={10} value={formData.children} placeholder="0" onChange={(e) => setFormData({ ...formData, children: e.target.value === '' ? '' : Number(e.target.value) })} className={inputCls} />
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Total Amount (USD)</label>
              {(() => {
                const selectedRoom = rooms.find((r) => r.id === formData.roomId);
                const nights = formData.checkInDate && formData.checkOutDate
                  ? Math.round((new Date(formData.checkOutDate).getTime() - new Date(formData.checkInDate).getTime()) / 86_400_000)
                  : 0;
                const hasCalc = selectedRoom && nights > 0;
                return (
                  <div className="relative">
                    <input
                      type="number" min={0} step="0.01"
                      value={formData.totalAmount}
                      readOnly={hasCalc}
                      placeholder="0.00"
                      onChange={(e) => !hasCalc && setFormData({ ...formData, totalAmount: e.target.value === '' ? '' : Number(e.target.value) })}
                      className={`${inputCls} ${hasCalc ? 'bg-amber-50 text-amber-900 font-semibold cursor-default' : ''}`}
                    />
                    {hasCalc && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600 font-medium pointer-events-none">
                        ${selectedRoom.baseRate}/night × {nights} night{nights !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Status Change Confirm ───────────────────────────────── */}
      {pendingStatus && (
        <ConfirmDialog
          title="Change Booking Status"
          message={`Mark booking ${pendingStatus.id} as "${pendingStatus.status}"?`}
          confirmLabel="Confirm"
          confirmClassName="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50"
          onConfirm={handleStatusChange}
          onCancel={() => setPendingStatus(null)}
          isLoading={submitting}
        />
      )}

      {/* ── Cancel Confirm ──────────────────────────────────────── */}
      {cancelTarget && (
        <ConfirmDialog
          title="Cancel Booking"
          message={`Are you sure you want to cancel booking ${cancelTarget}? This cannot be undone.`}
          confirmLabel="Cancel Booking"
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
          isLoading={submitting}
        />
      )}
    </motion.div>
  );
}
