import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Hotel, CheckCircle2, AlertCircle, Loader2, Calendar, Users, BedDouble } from 'lucide-react';

const API = (import.meta as any).env.VITE_API_URL ?? 'http://localhost:4000';

type Step = 'loading' | 'form' | 'submitting' | 'success' | 'error';

interface Reservation {
  id:           string;
  status:       string;
  checkInDate:  string;
  checkOutDate: string;
  adults:       number;
  children:     number;
  totalAmount:  number;
  currency:     string;
  guest:  { firstName: string; lastName: string; phone: string; email: string; idVerified: boolean };
  room:   { roomNumber: string; roomType: string; floor: number };
  ratePlan: { name: string; mealPlan: string };
}

const ID_TYPES = [
  'National ID',
  'Passport',
  "Driver's License",
  'Alien Card / Residence Permit',
  'Other Government ID',
];

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function CheckInPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [step, setStep]         = useState<Step>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [res, setRes]           = useState<Reservation | null>(null);

  const [idType,    setIdType]    = useState(ID_TYPES[0]);
  const [idNumber,  setIdNumber]  = useState('');
  const [fullName,  setFullName]  = useState('');
  const [agreed,    setAgreed]    = useState(false);

  useEffect(() => {
    if (!bookingId) { setErrorMsg('Invalid link — no booking ID.'); setStep('error'); return; }

    fetch(`${API}/api/public/checkin/${bookingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setErrorMsg(data.error); setStep('error'); return; }
        setRes(data as Reservation);
        setFullName(`${data.guest.firstName} ${data.guest.lastName}`);
        setStep(data.guest.idVerified ? 'success' : 'form');
      })
      .catch(() => { setErrorMsg('Could not load reservation. Please try again.'); setStep('error'); });
  }, [bookingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idNumber.trim() || !agreed) return;
    setStep('submitting');

    try {
      const r = await fetch(`${API}/api/public/checkin/${bookingId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ idType, idNumber: idNumber.trim(), fullName: fullName.trim() }),
      });
      const data = await r.json();
      if (!r.ok || !data.success) throw new Error(data.error ?? 'Submission failed');
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.');
      setStep('error');
    }
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex flex-col items-center justify-start px-4 py-10 font-sans">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center mb-3 shadow-lg">
          <Hotel className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {(import.meta as any).env.VITE_HOTEL_NAME ?? 'SERVV Hotel'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Online Pre-Check-In</p>
      </div>

      <div className="w-full max-w-md">

        {/* Loading */}
        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Loading your reservation…</span>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-red-800 font-medium">{errorMsg}</p>
            <p className="text-red-600 text-sm">Please contact the front desk for assistance.</p>
          </div>
        )}

        {/* Success */}
        {step === 'success' && res && (
          <div className="flex flex-col gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <h2 className="text-xl font-bold text-emerald-900">You're pre-registered!</h2>
              <p className="text-emerald-700 text-sm">
                Just show your ID at the front desk on arrival — no paperwork needed.
              </p>
            </div>

            {/* Reservation card */}
            <ReservationCard res={res} />

            <p className="text-center text-xs text-slate-400 mt-2">
              Questions? Reply to your WhatsApp confirmation or call reception.
            </p>
          </div>
        )}

        {/* Form */}
        {(step === 'form' || step === 'submitting') && res && (
          <div className="flex flex-col gap-4">
            <ReservationCard res={res} />

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900 mb-1">Your Identity Document</h2>
                <p className="text-xs text-slate-500">
                  This is collected once for your stay. Your information is kept secure.
                </p>
              </div>

              {/* Full name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Full name (as on ID)</label>
                <input
                  className={inputCls}
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jean Baptiste Uwimana"
                  required
                />
              </div>

              {/* ID type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">ID type</label>
                <select
                  className={inputCls}
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                >
                  {ID_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* ID number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">ID / Passport number</label>
                <input
                  className={inputCls}
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. 1199800012345678"
                  required
                />
              </div>

              {/* Consent */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-amber-600 w-4 h-4 shrink-0"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  required
                />
                <span className="text-xs text-slate-500 leading-relaxed">
                  I confirm that the information above is accurate and I consent to it being stored for the purpose of my hotel stay.
                </span>
              </label>

              <button
                type="submit"
                disabled={!idNumber.trim() || !agreed || step === 'submitting'}
                className="w-full py-3.5 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {step === 'submitting' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  'Complete Pre-Registration'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function ReservationCard({ res }: { res: Reservation }) {
  const nights = Math.round(
    (new Date(res.checkOutDate).getTime() - new Date(res.checkInDate).getTime()) / 86_400_000,
  );
  const guestCount = res.adults + (res.children ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5">Booking</p>
          <p className="font-bold text-slate-900 text-sm">{res.id}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">{res.status ?? 'Confirmed'}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Check-in" value={fmt(res.checkInDate)} />
        <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Check-out" value={fmt(res.checkOutDate)} />
        <InfoRow icon={<BedDouble className="w-3.5 h-3.5" />} label="Room" value={`${res.room.roomNumber} — ${res.room.roomType}`} />
        <InfoRow icon={<Users className="w-3.5 h-3.5" />} label="Guests" value={`${guestCount} guest${guestCount !== 1 ? 's' : ''} · ${nights} night${nights !== 1 ? 's' : ''}`} />
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500">{res.ratePlan.name} · {res.ratePlan.mealPlan}</span>
        <span className="font-bold text-slate-900 text-sm">
          {res.currency} {Number(res.totalAmount).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
        {icon} {label}
      </span>
      <span className="text-slate-800 font-medium text-xs">{value}</span>
    </div>
  );
}
