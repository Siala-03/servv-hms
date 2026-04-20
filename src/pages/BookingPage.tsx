import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar, Users, BedDouble, ChevronRight, CheckCircle2,
  AlertCircle, Loader2, ArrowLeft, Star,
} from 'lucide-react';
import { API_BASE } from '../lib/api';
import { BrandLogo } from '../components/BrandLogo';

const API = API_BASE;

type Step = 'dates' | 'rooms' | 'details' | 'submitting' | 'success' | 'error';

interface AvailRoom {
  id: string; roomNumber: string; roomType: string;
  floor: number; baseRate: number; maxOccupancy: number; totalPrice: number;
}

interface AvailResponse {
  hotel: { id: string; name: string };
  nights: number;
  available: AvailRoom[];
}

interface GuestForm {
  firstName: string; lastName: string; email: string; phone: string;
}

const TYPE_ICONS: Record<string, string> = {
  'Standard': '🛏️', 'Deluxe': '✨', 'Suite': '👑', 'Family': '👨‍👩‍👧', 'Twin': '🛏️',
};

const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function minCheckout(checkIn: string) {
  const d = new Date(checkIn);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function BookingPage() {
  const { hotelId } = useParams<{ hotelId: string }>();
  const [step, setStep]               = useState<Step>('dates');
  const [error, setError]             = useState('');

  // Step 1 — dates
  const [checkIn,   setCheckIn]   = useState('');
  const [checkOut,  setCheckOut]  = useState('');
  const [adults,    setAdults]    = useState(1);
  const [children,  setChildren]  = useState(0);

  // Step 2 — room search result
  const [avail, setAvail]     = useState<AvailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AvailRoom | null>(null);

  // Step 3 — guest details
  const [form, setForm] = useState<GuestForm>({ firstName: '', lastName: '', email: '', phone: '' });

  // Step 4 — success
  const [bookingId, setBookingId] = useState('');

  async function searchRooms() {
    if (!checkIn || !checkOut) return;
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/public/book/${hotelId}/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=${adults + children}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Failed to fetch availability');
      setAvail(data as AvailResponse);
      setStep('rooms');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }

  async function confirmBooking() {
    if (!selected || !avail) return;
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      setError('All fields are required.'); return;
    }
    setStep('submitting'); setError('');
    try {
      const r = await fetch(`${API}/api/public/book/${hotelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          roomId:      selected.id,
          checkIn,
          checkOut,
          adults,
          children,
          totalAmount: selected.totalPrice,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Booking failed');
      setBookingId(data.bookingId);
      setStep('success');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
      setStep('details');
    }
  }

  const hotelName = avail?.hotel.name ?? 'SERVV Hotel';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-10 font-sans">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <BrandLogo variant="dark" className="h-11 mb-3" />
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{hotelName}</h1>
        <p className="text-sm text-slate-500 mt-1">Book your stay directly — no OTA fees</p>
      </div>

      {/* Progress bar */}
      {step !== 'success' && step !== 'error' && (
        <div className="w-full max-w-lg mb-6 flex items-center gap-2">
          {(['dates', 'rooms', 'details'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                step === s ? 'bg-amber-600 text-white' :
                ['rooms','details','submitting'].indexOf(step) > i ? 'bg-emerald-500 text-white' :
                'bg-slate-200 text-slate-400'
              }`}>{i + 1}</div>
              <span className={`text-xs font-medium hidden sm:block ${step === s ? 'text-slate-900' : 'text-slate-400'}`}>
                {s === 'dates' ? 'Dates' : s === 'rooms' ? 'Choose Room' : 'Your Details'}
              </span>
              {i < 2 && <div className="flex-1 h-px bg-slate-200 mx-1" />}
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-lg">

        {/* ── Step 1: Dates ─────────────────────────────────── */}
        {step === 'dates' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">When are you staying?</h2>
              <p className="text-xs text-slate-400">Select your dates to see available rooms and live rates.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Check-in</label>
                <input type="date" min={today()} value={checkIn}
                  onChange={(e) => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(''); }}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Check-out</label>
                <input type="date" min={checkIn ? minCheckout(checkIn) : today()} value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Adults</label>
                <select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className={inputCls}>
                  {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n} adult{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Children</label>
                <select value={children} onChange={(e) => setChildren(Number(e.target.value))} className={inputCls}>
                  {[0,1,2,3,4].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'child' : 'children'}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <button
              onClick={searchRooms}
              disabled={!checkIn || !checkOut || loading}
              className="w-full py-3.5 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking availability…</> : <><span>Search Available Rooms</span><ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* ── Step 2: Rooms ─────────────────────────────────── */}
        {step === 'rooms' && avail && (
          <div className="flex flex-col gap-4">
            {/* Summary bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-amber-500" />{fmtDate(checkIn)} → {fmtDate(checkOut)}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-amber-500" />{adults + children} guest{adults + children > 1 ? 's' : ''}</span>
                <span className="font-medium text-slate-800">{avail.nights} night{avail.nights !== 1 ? 's' : ''}</span>
              </div>
              <button onClick={() => setStep('dates')} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
                <ArrowLeft className="w-3.5 h-3.5" /> Change
              </button>
            </div>

            {avail.available.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                <BedDouble className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <p className="font-semibold text-amber-800 mb-1">No rooms available</p>
                <p className="text-sm text-amber-700">Try different dates or contact the hotel directly.</p>
                <button onClick={() => setStep('dates')} className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">Try Different Dates</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-500">{avail.available.length} room{avail.available.length !== 1 ? 's' : ''} available</p>
                {avail.available.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => { setSelected(room); setStep('details'); }}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:border-amber-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl shrink-0">
                          {TYPE_ICONS[room.roomType] ?? '🏨'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">{room.roomType}</p>
                          <p className="text-xs text-slate-400">Room {room.roomNumber} · Floor {room.floor} · Up to {room.maxOccupancy} guests</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-900 text-lg">RWF {room.totalPrice.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">RWF {room.baseRate.toLocaleString()}/night · {avail.nights} nights</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <Star className="w-3 h-3 fill-current" /> Best available rate — no OTA markup
                      </div>
                      <span className="text-xs text-amber-600 font-semibold group-hover:underline">Select →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Guest Details ──────────────────────────── */}
        {(step === 'details' || step === 'submitting') && selected && avail && (
          <div className="flex flex-col gap-4">
            {/* Selected room summary */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-0.5">Selected Room</p>
                <p className="font-semibold text-amber-900">{selected.roomType} — Room {selected.roomNumber}</p>
                <p className="text-xs text-amber-700">{fmtDate(checkIn)} → {fmtDate(checkOut)} · {avail.nights} night{avail.nights !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-900">${selected.totalPrice}</p>
                <button onClick={() => setStep('rooms')} className="text-xs text-amber-600 hover:text-amber-700 font-medium">Change room</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Your contact details</h2>
                <p className="text-xs text-slate-400">Your confirmation will be sent to this email.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">First name</label>
                  <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputCls} placeholder="Jean" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Last name</label>
                  <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputCls} placeholder="Baptiste" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="you@example.com" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Phone / WhatsApp</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+250 7XX XXX XXX" />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button
                onClick={confirmBooking}
                disabled={step === 'submitting'}
                className="w-full py-3.5 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {step === 'submitting' ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming booking…</> : <>Confirm Booking — ${selected.totalPrice}</>}
              </button>

              <p className="text-xs text-slate-400 text-center">No payment required now · Free cancellation subject to hotel policy</p>
            </div>
          </div>
        )}

        {/* ── Success ────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="flex flex-col gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="w-14 h-14 text-emerald-500" />
              <h2 className="text-2xl font-bold text-emerald-900">Booking Confirmed!</h2>
              <p className="text-emerald-700 text-sm max-w-xs">
                Your room is reserved. Check your email for the confirmation details.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Booking ID</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{bookingId}</span>
              </div>
              {selected && avail && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Room</span>
                    <span className="text-sm font-medium text-slate-900">{selected.roomType} — Room {selected.roomNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Dates</span>
                    <span className="text-sm text-slate-900">{fmtDate(checkIn)} → {fmtDate(checkOut)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total</span>
                    <span className="text-lg font-bold text-slate-900">${selected.totalPrice}</span>
                  </div>
                </>
              )}
            </div>

            <a
              href={`/checkin/${bookingId}`}
              className="block w-full py-3.5 rounded-xl bg-slate-900 text-white font-semibold text-sm text-center hover:bg-slate-800 transition-colors"
            >
              Complete Online Pre-Check-In →
            </a>
            <p className="text-xs text-slate-400 text-center">Pre-check-in saves time at the front desk on arrival.</p>
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────── */}
        {step === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-red-800 font-medium">{error}</p>
            <button onClick={() => { setStep('dates'); setError(''); }} className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Start Over</button>
          </div>
        )}
      </div>

      <p className="mt-10 text-xs text-slate-400">Powered by <span className="font-semibold text-amber-600">SERVV HMS</span></p>
    </div>
  );
}
