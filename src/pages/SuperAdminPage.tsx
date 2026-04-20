import React, { useEffect, useState } from 'react';
import { Plus, Hotel, Users, Utensils, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { API_BASE } from '../lib/api';

const API = API_BASE;

function authHeaders() {
  const id = localStorage.getItem('servv_user_id');
  return { 'Content-Type': 'application/json', ...(id ? { 'x-user-id': id } : {}) };
}

interface HotelAccount {
  id:            string;
  name:          string;
  country:       string;
  phone:         string;
  email:         string;
  hasRestaurant: boolean;
  isActive:      boolean;
  userCount:     number;
  createdAt:     string;
}

const EMPTY_HOTEL = { name: '', address: '', country: 'Rwanda', phone: '', email: '', hasRestaurant: false };
const EMPTY_MGR   = { firstName: '', lastName: '', email: '', phone: '', username: '', password: '' };

export function SuperAdminPage() {
  const { toast } = useToast();
  const [hotels,        setHotels]       = useState<HotelAccount[]>([]);
  const [loading,       setLoading]      = useState(true);
  const [hotelModal,    setHotelModal]   = useState(false);
  const [mgrModal,      setMgrModal]     = useState<string | null>(null); // hotelId
  const [hotelForm,     setHotelForm]    = useState(EMPTY_HOTEL);
  const [mgrForm,       setMgrForm]      = useState(EMPTY_MGR);
  const [saving,        setSaving]       = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/admin/hotels`, { headers: authHeaders() });
      const data = await r.json();
      setHotels(data.map((h: any) => ({
        id: h.id, name: h.name, country: h.country, phone: h.phone,
        email: h.email, hasRestaurant: h.has_restaurant, isActive: h.is_active,
        userCount: h.userCount ?? 0, createdAt: h.created_at,
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  async function createHotel() {
    if (!hotelForm.name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/admin/hotels`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ ...hotelForm, hasRestaurant: hotelForm.hasRestaurant }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast('Hotel created! Now create the manager account.', 'success');
      setHotelModal(false);
      setHotelForm(EMPTY_HOTEL);
      await load();
      setMgrModal(data.id); // open manager modal immediately
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function createManager() {
    if (!mgrForm.firstName || !mgrForm.username || !mgrForm.password) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/admin/hotels/${mgrModal}/manager`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(mgrForm),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast(`Manager account created for ${data.user.firstName}`, 'success');
      setMgrModal(null);
      setMgrForm(EMPTY_MGR);
      await load();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const selectedHotel = hotels.find((h) => h.id === mgrModal);

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hotel Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">{hotels.length} hotel{hotels.length !== 1 ? 's' : ''} on the platform</p>
        </div>
        <button
          onClick={() => setHotelModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Hotel
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
      ) : hotels.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Hotel className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hotels yet. Create the first one.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hotels.map((h) => (
            <div key={h.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900">{h.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{h.country}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {h.isActive
                    ? <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Active</span>
                    : <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Inactive</span>
                  }
                  {h.hasRestaurant && (
                    <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"><Utensils className="w-3 h-3" /> Restaurant</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {h.userCount} user{h.userCount !== 1 ? 's' : ''}</span>
                <span className="text-slate-300">|</span>
                <span className="font-mono text-[10px] text-slate-400">{h.id}</span>
              </div>

              <button
                onClick={() => { setMgrModal(h.id); setMgrForm(EMPTY_MGR); }}
                className="w-full py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
              >
                + Add Manager Account
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Hotel Modal */}
      <Modal
        title="Create Hotel"
        onClose={() => { setHotelModal(false); setHotelForm(EMPTY_HOTEL); }}
        open={hotelModal}
        footer={
          <button onClick={createHotel} disabled={saving || !hotelForm.name.trim()}
            className="px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Hotel
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          {[
            { label: 'Hotel name *', key: 'name', placeholder: 'e.g. Kigali Grand Hotel' },
            { label: 'Address', key: 'address', placeholder: 'KG 5 Ave, Kigali' },
            { label: 'Country', key: 'country', placeholder: 'Rwanda' },
            { label: 'Phone', key: 'phone', placeholder: '+250 788 000 000' },
            { label: 'Email', key: 'email', placeholder: 'info@hotel.com' },
          ].map(({ label, key, placeholder }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
              <input className={inputCls} placeholder={placeholder}
                value={(hotelForm as any)[key]}
                onChange={(e) => setHotelForm((f) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="accent-amber-600 w-4 h-4"
              checked={hotelForm.hasRestaurant}
              onChange={(e) => setHotelForm((f) => ({ ...f, hasRestaurant: e.target.checked }))} />
            <span className="text-sm text-slate-700">This hotel has an in-house restaurant (scanner POS integration)</span>
          </label>
        </div>
      </Modal>

      {/* Create Manager Modal */}
      <Modal
        title={`Create Manager — ${selectedHotel?.name ?? ''}`}
        onClose={() => { setMgrModal(null); setMgrForm(EMPTY_MGR); }}
        open={!!mgrModal}
        footer={
          <button onClick={createManager} disabled={saving || !mgrForm.firstName || !mgrForm.username || !mgrForm.password}
            className="px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Manager
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'First name *', key: 'firstName', placeholder: 'Jean' },
              { label: 'Last name *', key: 'lastName', placeholder: 'Baptiste' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
                <input className={inputCls} placeholder={placeholder}
                  value={(mgrForm as any)[key]}
                  onChange={(e) => setMgrForm((f) => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          {[
            { label: 'Email', key: 'email', placeholder: 'manager@hotel.com' },
            { label: 'Phone', key: 'phone', placeholder: '+250 788 000 000' },
            { label: 'Username *', key: 'username', placeholder: 'manager.john' },
            { label: 'Password * (min 6 chars)', key: 'password', placeholder: '••••••••', type: 'password' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
              <input className={inputCls} placeholder={placeholder} type={type ?? 'text'}
                value={(mgrForm as any)[key]}
                onChange={(e) => setMgrForm((f) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          {mgrModal && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
              Share this Hotel ID with the manager so staff can log in:<br />
              <span className="font-mono font-bold">{mgrModal}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
