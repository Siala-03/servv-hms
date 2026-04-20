import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Hotel, Users, TrendingUp, Edit2, Trash2,
  CheckCircle2, XCircle, Loader2, ChevronLeft, Utensils, KeyRound, LogOut,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { API_BASE } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

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
  address:       string;
  hasRestaurant: boolean;
  isActive:      boolean;
  userCount:     number;
  createdAt:     string;
}

interface HotelUser {
  id:         string;
  first_name: string;
  last_name:  string;
  role:       string;
  is_active:  boolean;
  username:   { username: string }[] | null;
}

const EMPTY_FORM = {
  name: '', address: '', country: 'Rwanda', phone: '', email: '',
  hasRestaurant: false,
  managerFirstName: '', managerLastName: '', managerEmail: '',
  managerPhone: '', managerUsername: '', managerPassword: '',
};

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent';

export function SuperAdminPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [hotels,       setHotels]      = useState<HotelAccount[]>([]);
  const [loading,      setLoading]     = useState(true);
  const [createModal,  setCreateModal] = useState(false);
  const [editTarget,   setEditTarget]  = useState<HotelAccount | null>(null);
  const [deleteTarget, setDeleteTarget]= useState<HotelAccount | null>(null);
  const [form,         setForm]        = useState(EMPTY_FORM);
  const [saving,       setSaving]      = useState(false);
  const [formError,    setFormError]   = useState('');
  const [createdHotel, setCreatedHotel]= useState<{ id: string; name: string; managerUsername?: string } | null>(null);
  const [viewHotel,    setViewHotel]   = useState<HotelAccount | null>(null);
  const [hotelUsers,   setHotelUsers]  = useState<HotelUser[]>([]);
  const [loadingUsers, setLoadingUsers]= useState(false);
  const [mgrModal,     setMgrModal]    = useState<HotelAccount | null>(null);
  const [mgrForm,      setMgrForm]     = useState({ firstName: '', lastName: '', email: '', phone: '', username: '', password: '' });
  const [resetPwUser,  setResetPwUser] = useState<HotelUser | null>(null);
  const [newPassword,  setNewPassword] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/admin/hotels`, { headers: authHeaders() });
      const data = await r.json();
      setHotels(data.map((h: any) => ({
        id: h.id, name: h.name, country: h.country, phone: h.phone,
        email: h.email, address: h.address ?? '',
        hasRestaurant: h.has_restaurant, isActive: h.is_active,
        userCount: h.userCount ?? 0, createdAt: h.created_at,
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadUsers = async (hotel: HotelAccount) => {
    setViewHotel(hotel);
    setLoadingUsers(true);
    try {
      const r = await fetch(`${API}/api/admin/hotels/${hotel.id}/users`, { headers: authHeaders() });
      setHotelUsers(await r.json());
    } finally {
      setLoadingUsers(false);
    }
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/admin/hotels`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setCreateModal(false);
      setForm(EMPTY_FORM);
      setCreatedHotel({ id: data.id, name: data.name, managerUsername: data.manager?.username });
      await load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setFormError('');
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/admin/hotels/${editTarget.id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({
          name: form.name, address: form.address, country: form.country,
          phone: form.phone, email: form.email, hasRestaurant: form.hasRestaurant,
          isActive: editTarget.isActive,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast('Hotel updated', 'success');
      setEditTarget(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(h: HotelAccount) {
    try {
      const r = await fetch(`${API}/api/admin/hotels/${h.id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ isActive: !h.isActive }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast(`${h.name} ${!h.isActive ? 'activated' : 'deactivated'}`, 'info');
      await load();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`${API}/api/admin/hotels/${deleteTarget.id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      if (!r.ok && r.status !== 204) { const d = await r.json(); throw new Error(d.error); }
      toast(`${deleteTarget.name} deleted`, 'info');
      setDeleteTarget(null);
      await load();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  }

  async function handleAddManager(e: React.FormEvent) {
    e.preventDefault();
    if (!mgrModal) return;
    setFormError('');
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/admin/hotels/${mgrModal.id}/manager`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(mgrForm),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast(`Manager created for ${mgrModal.name}`, 'success');
      setMgrModal(null);
      setMgrForm({ firstName: '', lastName: '', email: '', phone: '', username: '', password: '' });
      await load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPwUser || newPassword.length < 6) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/admin/users/${resetPwUser.id}/password`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ password: newPassword }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast('Password reset successfully', 'success');
      setResetPwUser(null);
      setNewPassword('');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(h: HotelAccount) {
    setForm({ ...EMPTY_FORM, name: h.name, address: h.address, country: h.country, phone: h.phone, email: h.email, hasRestaurant: h.hasRestaurant });
    setFormError('');
    setEditTarget(h);
  }

  const totalUsers   = hotels.reduce((s, h) => s + h.userCount, 0);
  const activeHotels = hotels.filter((h) => h.isActive).length;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hotel Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage properties and their staff access</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM); setFormError(''); setCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Hotel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Hotels',  value: hotels.length, icon: <Hotel      className="w-6 h-6 text-amber-500" /> },
          { label: 'Total Users',   value: totalUsers,    icon: <Users      className="w-6 h-6 text-blue-500" /> },
          { label: 'Active Hotels', value: activeHotels,  icon: <TrendingUp className="w-6 h-6 text-emerald-500" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            </div>
            {icon}
          </div>
        ))}
      </div>

      {/* Hotels table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : hotels.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Hotel className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hotels yet. Add the first one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Name', 'Country', 'Email', 'Users', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {hotels.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900">{h.name}</div>
                    {h.hasRestaurant && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full mt-0.5">
                        <Utensils className="w-2.5 h-2.5" /> Restaurant
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{h.country}</td>
                  <td className="px-5 py-3.5 text-slate-500">{h.email || '—'}</td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => loadUsers(h)} className="flex items-center gap-1 text-slate-600 hover:text-amber-700 transition-colors">
                      <Users className="w-3.5 h-3.5" /> {h.userCount}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => handleToggleActive(h)}>
                      {h.isActive
                        ? <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Active</span>
                        : <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Inactive</span>
                      }
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => { setMgrModal(h); setFormError(''); }}
                        className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-colors">
                        + Manager
                      </button>
                      <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(h)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users panel */}
      {viewHotel && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <button onClick={() => { setViewHotel(null); setHotelUsers([]); }}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-sm font-semibold text-slate-900">{viewHotel.name} — Staff Accounts</span>
          </div>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
          ) : hotelUsers.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">No staff accounts yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Name', 'Username', 'Role', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {hotelUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-900">{u.first_name} {u.last_name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {Array.isArray(u.username) && u.username[0] ? u.username[0].username : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 capitalize">{u.role.replace('_', ' ')}</span>
                    </td>
                    <td className="px-5 py-3">
                      {u.is_active
                        ? <span className="text-xs text-emerald-600 font-medium">Active</span>
                        : <span className="text-xs text-slate-400">Inactive</span>}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => { setResetPwUser(u); setNewPassword(''); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition-colors" title="Reset password">
                        <KeyRound className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Hotel Modal */}
      <Modal
        title="Add New Hotel"
        open={createModal}
        onClose={() => { setCreateModal(false); setForm(EMPTY_FORM); setFormError(''); }}
        footer={
          <button onClick={handleCreate as any} disabled={saving || !form.name.trim()}
            className="px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Hotel
          </button>
        }
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <HotelFields form={form} setForm={setForm} />
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Manager Account (optional)</p>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="First name" value={form.managerFirstName} onChange={(v) => setForm((f) => ({ ...f, managerFirstName: v }))} />
                <FieldInput label="Last name"  value={form.managerLastName}  onChange={(v) => setForm((f) => ({ ...f, managerLastName: v }))} />
              </div>
              <FieldInput label="Email"    value={form.managerEmail}    onChange={(v) => setForm((f) => ({ ...f, managerEmail: v }))} />
              <FieldInput label="Phone"    value={form.managerPhone}    onChange={(v) => setForm((f) => ({ ...f, managerPhone: v }))} />
              <FieldInput label="Username" value={form.managerUsername} onChange={(v) => setForm((f) => ({ ...f, managerUsername: v }))} />
              <FieldInput label="Password" value={form.managerPassword} onChange={(v) => setForm((f) => ({ ...f, managerPassword: v }))} type="password" />
            </div>
          </div>
          {formError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{formError}</p>}
        </form>
      </Modal>

      {/* Edit Hotel Modal */}
      <Modal
        title={`Edit — ${editTarget?.name}`}
        open={!!editTarget}
        onClose={() => { setEditTarget(null); setForm(EMPTY_FORM); setFormError(''); }}
        footer={
          <button onClick={handleEdit as any} disabled={saving || !form.name.trim()}
            className="px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Changes
          </button>
        }
      >
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <HotelFields form={form} setForm={setForm} />
          {formError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{formError}</p>}
        </form>
      </Modal>

      {/* Add Manager Modal */}
      <Modal
        title={`Add Manager — ${mgrModal?.name}`}
        open={!!mgrModal}
        onClose={() => { setMgrModal(null); setMgrForm({ firstName: '', lastName: '', email: '', phone: '', username: '', password: '' }); setFormError(''); }}
        footer={
          <button onClick={handleAddManager as any} disabled={saving || !mgrForm.firstName || !mgrForm.username || !mgrForm.password}
            className="px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Manager
          </button>
        }
      >
        <form onSubmit={handleAddManager} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="First name *" value={mgrForm.firstName} onChange={(v) => setMgrForm((f) => ({ ...f, firstName: v }))} />
            <FieldInput label="Last name"    value={mgrForm.lastName}  onChange={(v) => setMgrForm((f) => ({ ...f, lastName: v }))} />
          </div>
          <FieldInput label="Email"     value={mgrForm.email}    onChange={(v) => setMgrForm((f) => ({ ...f, email: v }))} />
          <FieldInput label="Phone"     value={mgrForm.phone}    onChange={(v) => setMgrForm((f) => ({ ...f, phone: v }))} />
          <FieldInput label="Username *" value={mgrForm.username} onChange={(v) => setMgrForm((f) => ({ ...f, username: v }))} />
          <FieldInput label="Password *" value={mgrForm.password} onChange={(v) => setMgrForm((f) => ({ ...f, password: v }))} type="password" />
          {mgrModal && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
              Share this Hotel ID with the manager: <span className="font-mono font-bold">{mgrModal.id}</span>
            </div>
          )}
          {formError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{formError}</p>}
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={`Reset Password — ${resetPwUser?.first_name ?? ''} ${resetPwUser?.last_name ?? ''}`}
        open={!!resetPwUser}
        onClose={() => { setResetPwUser(null); setNewPassword(''); }}
        footer={
          <button onClick={handleResetPassword as any} disabled={saving || newPassword.length < 6}
            className="px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Reset Password
          </button>
        }
      >
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <FieldInput label="New password (min 6 chars)" value={newPassword} onChange={setNewPassword} type="password" />
        </form>
      </Modal>

      {/* Hotel Created — show ID */}
      <Modal
        title="Hotel Created"
        open={!!createdHotel}
        onClose={() => setCreatedHotel(null)}
        footer={
          <button onClick={() => setCreatedHotel(null)}
            className="px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700">
            Done
          </button>
        }
      >
        {createdHotel && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm font-medium text-emerald-800"><strong>{createdHotel.name}</strong> created successfully.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-col gap-1">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Hotel ID</p>
              <p className="font-mono font-bold text-slate-900 text-sm break-all">{createdHotel.id}</p>
              <p className="text-xs text-slate-400 mt-1">Share this ID with the manager — they need it to log in.</p>
            </div>
            {createdHotel.managerUsername && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col gap-1">
                <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Manager Username</p>
                <p className="font-mono font-bold text-amber-900">{createdHotel.managerUsername}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Hotel"
        message={`Permanently delete "${deleteTarget?.name}" and all its accounts? This cannot be undone.`}
        confirmLabel="Delete"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function HotelFields({ form, setForm }: {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
}) {
  return (
    <>
      <FieldInput label="Hotel name *" value={form.name}    onChange={(v) => setForm((f) => ({ ...f, name: v }))}    placeholder="e.g. Kigali Grand Hotel" />
      <FieldInput label="Address"      value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} placeholder="KG 5 Ave, Kigali" />
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Country" value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} />
        <FieldInput label="Phone"   value={form.phone}   onChange={(v) => setForm((f) => ({ ...f, phone: v }))}   placeholder="+250 788 000 000" />
      </div>
      <FieldInput label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="info@hotel.com" />
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" className="accent-amber-600 w-4 h-4"
          checked={form.hasRestaurant}
          onChange={(e) => setForm((f) => ({ ...f, hasRestaurant: e.target.checked }))} />
        <span className="text-sm text-slate-700">This hotel has an in-house restaurant</span>
      </label>
    </>
  );
}

function FieldInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        className={inputCls}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
