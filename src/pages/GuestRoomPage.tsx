import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2, UtensilsCrossed, Wrench, Info, CheckCircle2,
  Phone, Mail, MapPin, Send, ChevronRight,
} from 'lucide-react';
import { API_BASE } from '../lib/api';
import { BrandLogo } from '../components/BrandLogo';

const API = API_BASE;

type Tab = 'order' | 'request' | 'info';

interface RoomInfo {
  room:  { id: string; roomNumber: string; roomType: string; floor: number };
  hotel: { id: string; name: string; phone: string; email: string; address: string };
}

// ── Room Service categories ───────────────────────────────────────────────────
const ORDER_CATEGORIES = [
  { label: 'Food & Beverage', icon: '🍽️', suggestions: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Room service menu'] },
  { label: 'Drinks', icon: '🥤', suggestions: ['Water bottles', 'Coffee/Tea', 'Juice', 'Soda', 'Alcoholic beverages'] },
  { label: 'Amenities', icon: '🛁', suggestions: ['Extra towels', 'Toiletries kit', 'Slippers', 'Bathrobe', 'Pillow'] },
  { label: 'Other', icon: '📦', suggestions: [] },
];

const QUICK_REQUESTS = [
  { label: 'Extra Towels',      type: 'Housekeeping', icon: '🛁' },
  { label: 'Room Cleaning',     type: 'Housekeeping', icon: '🧹' },
  { label: 'Turn-down Service', type: 'Housekeeping', icon: '🛏️' },
  { label: 'Maintenance Issue', type: 'Maintenance',  icon: '🔧' },
  { label: 'Late Checkout',     type: 'Concierge',    icon: '🕐' },
  { label: 'Extra Blanket',     type: 'Housekeeping', icon: '🫙' },
];

export function GuestRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();

  const [info, setInfo]     = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<Tab>('order');

  // Order state
  const [category, setCategory]   = useState(ORDER_CATEGORIES[0].label);
  const [orderText, setOrderText] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [ordering, setOrdering]   = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Request state
  const [reqNotes, setReqNotes]   = useState('');
  const [requesting, setRequesting] = useState(false);
  const [reqDone, setReqDone]     = useState(false);
  const [reqType, setReqType]     = useState('');
  const [reqError, setReqError]   = useState('');

  useEffect(() => {
    fetch(`${API}/api/public/room/${roomId}`)
      .then((r) => r.json())
      .then((d) => { setInfo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [roomId]);

  // ── Order submit ────────────────────────────────────────────────────────────
  async function submitOrder() {
    const text = orderText.trim();
    if (!text) return;
    setOrdering(true);
    setOrderError('');
    try {
      const items = text.split('\n').map((s) => s.trim()).filter(Boolean);
      const r = await fetch(`${API}/api/public/room/${roomId}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, department: category, notes: orderNote.trim() || undefined }),
      });
      if (!r.ok) throw new Error('Failed');
      setOrderDone(true);
      setOrderText('');
      setOrderNote('');
    } catch {
      setOrderError('Could not submit order. Please call the front desk.');
    } finally {
      setOrdering(false);
    }
  }

  // ── Request submit ──────────────────────────────────────────────────────────
  async function submitRequest(type: string, notes?: string) {
    setRequesting(true);
    setReqType(type);
    setReqError('');
    try {
      const r = await fetch(`${API}/api/public/room/${roomId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, notes: notes?.trim() || undefined }),
      });
      if (!r.ok) throw new Error('Failed');
      setReqDone(true);
      setReqNotes('');
    } catch {
      setReqError('Could not submit request. Please call the front desk.');
    } finally {
      setRequesting(false);
    }
  }

  // ── Loading / not found ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }
  if (!info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 px-6 text-center">
        <p className="text-2xl font-bold text-white mb-2">Room not found</p>
        <p className="text-slate-400 text-sm">Please scan a valid QR code.</p>
      </div>
    );
  }

  const { room, hotel } = info;
  const catObj = ORDER_CATEGORIES.find((c) => c.label === category) ?? ORDER_CATEGORIES[0];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 pt-safe-top pb-3">
        <div className="flex items-center justify-between mb-1 pt-3">
          <BrandLogo variant="light" className="h-6" />
          <div className="text-right">
            <p className="text-white font-semibold text-sm leading-tight">{hotel.name}</p>
            <p className="text-amber-400 text-xs">Room {room.roomNumber} · {room.roomType}</p>
          </div>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav className="bg-slate-800 border-b border-slate-700 flex">
        {([
          { id: 'order',   icon: <UtensilsCrossed className="w-4 h-4" />, label: 'Room Service' },
          { id: 'request', icon: <Wrench className="w-4 h-4" />,          label: 'Requests' },
          { id: 'info',    icon: <Info className="w-4 h-4" />,            label: 'Hotel Info' },
        ] as { id: Tab; icon: React.ReactNode; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors
              ${tab === t.id
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 border-b-2 border-transparent'}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-lg mx-auto w-full">

        {/* ═══ ROOM SERVICE ══════════════════════════════════════════════════ */}
        {tab === 'order' && (
          <>
            {orderDone ? (
              <div className="bg-emerald-900/40 border border-emerald-600 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-white font-semibold text-lg mb-1">Order received!</p>
                <p className="text-slate-300 text-sm mb-4">Our team will bring it to Room {room.roomNumber} shortly.</p>
                <button
                  onClick={() => { setOrderDone(false); }}
                  className="text-amber-400 text-sm font-medium underline underline-offset-2"
                >
                  Place another order
                </button>
              </div>
            ) : (
              <>
                {/* Category pills */}
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {ORDER_CATEGORIES.map((c) => (
                      <button
                        key={c.label}
                        onClick={() => setCategory(c.label)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                          ${category === c.label
                            ? 'bg-amber-500 text-slate-900'
                            : 'bg-slate-700 text-slate-300'}`}
                      >
                        {c.icon} {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick suggestions */}
                {catObj.suggestions.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Quick pick</p>
                    <div className="flex flex-wrap gap-2">
                      {catObj.suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => setOrderText((prev) => prev ? `${prev}\n${s}` : s)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full text-sm transition-colors"
                        >
                          <ChevronRight className="w-3 h-3 text-amber-400" />
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text area */}
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Your order</p>
                  <textarea
                    value={orderText}
                    onChange={(e) => setOrderText(e.target.value)}
                    placeholder="Describe what you'd like…&#10;One item per line"
                    rows={4}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Special notes (optional)</p>
                  <input
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Allergies, preferences…"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                {orderError && (
                  <p className="text-red-400 text-sm text-center">{orderError}</p>
                )}

                <button
                  onClick={submitOrder}
                  disabled={!orderText.trim() || ordering}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-2xl py-4 text-sm transition-colors"
                >
                  {ordering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {ordering ? 'Sending…' : 'Send Order'}
                </button>
              </>
            )}
          </>
        )}

        {/* ═══ REQUESTS ══════════════════════════════════════════════════════ */}
        {tab === 'request' && (
          <>
            {reqDone ? (
              <div className="bg-emerald-900/40 border border-emerald-600 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-white font-semibold text-lg mb-1">Request submitted!</p>
                <p className="text-slate-300 text-sm mb-4">"{reqType}" — our team has been notified.</p>
                <button
                  onClick={() => { setReqDone(false); setReqType(''); }}
                  className="text-amber-400 text-sm font-medium underline underline-offset-2"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Quick requests</p>
                  <div className="grid grid-cols-2 gap-3">
                    {QUICK_REQUESTS.map((qr) => (
                      <button
                        key={qr.label}
                        onClick={() => submitRequest(qr.type, qr.label)}
                        disabled={requesting}
                        className="flex flex-col items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-2xl p-4 transition-colors text-center"
                      >
                        <span className="text-2xl">{qr.icon}</span>
                        <span className="text-slate-200 text-sm font-medium leading-tight">{qr.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Custom request</p>
                  <textarea
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    placeholder="Describe your request…"
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-amber-500 mb-3"
                  />
                  <button
                    onClick={() => submitRequest('Concierge', reqNotes)}
                    disabled={!reqNotes.trim() || requesting}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-2xl py-4 text-sm transition-colors"
                  >
                    {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {requesting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>

                {reqError && (
                  <p className="text-red-400 text-sm text-center">{reqError}</p>
                )}
              </>
            )}
          </>
        )}

        {/* ═══ HOTEL INFO ════════════════════════════════════════════════════ */}
        {tab === 'info' && (
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h2 className="text-white font-semibold text-base mb-4">{hotel.name}</h2>
              <div className="space-y-3">
                {hotel.phone && (
                  <a href={`tel:${hotel.phone}`} className="flex items-center gap-3 group">
                    <span className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-amber-400" />
                    </span>
                    <div>
                      <p className="text-slate-400 text-xs">Front Desk</p>
                      <p className="text-white text-sm group-hover:text-amber-400 transition-colors">{hotel.phone}</p>
                    </div>
                  </a>
                )}
                {hotel.email && (
                  <a href={`mailto:${hotel.email}`} className="flex items-center gap-3 group">
                    <span className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-amber-400" />
                    </span>
                    <div>
                      <p className="text-slate-400 text-xs">Email</p>
                      <p className="text-white text-sm group-hover:text-amber-400 transition-colors">{hotel.email}</p>
                    </div>
                  </a>
                )}
                {hotel.address && (
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-amber-400" />
                    </span>
                    <div>
                      <p className="text-slate-400 text-xs">Address</p>
                      <p className="text-white text-sm">{hotel.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3">Your Room</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                  <p className="text-amber-400 text-2xl font-bold">{room.roomNumber}</p>
                  <p className="text-slate-400 text-xs mt-0.5">Room Number</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                  <p className="text-white font-semibold text-sm">{room.roomType}</p>
                  <p className="text-slate-400 text-xs mt-0.5">Floor {room.floor}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3">Emergency Numbers</h3>
              <div className="space-y-2">
                {[
                  { label: 'Security', number: 'Ext. 0' },
                  { label: 'Medical', number: 'Ext. 1' },
                  { label: 'Fire', number: 'Ext. 2' },
                ].map((e) => (
                  <div key={e.label} className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">{e.label}</span>
                    <span className="text-amber-400 font-medium text-sm">{e.number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-3 text-center pb-safe-bottom">
        <p className="text-slate-500 text-xs">Powered by <span className="text-amber-400 font-medium">Servv HMS</span></p>
      </footer>
    </div>
  );
}
