import React, { useEffect, useState } from 'react';
import { Plus, MoreVertical, UserCheck, UserX, KeyRound, Loader2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS, UserRole } from '../lib/rbac';
import { API_BASE } from '../lib/api';

const API = API_BASE;

function authHeaders() {
  const token = localStorage.getItem('servv_auth_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

interface SystemUser {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
  phone:     string;
  role:      UserRole;
  username:  string;
  isActive:  boolean;
}

const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', username: '', password: '', role: 'front_desk' as UserRole };
const EMPTY_PW   = { newPassword: '', confirm: '' };

const CREATABLE_ROLES: UserRole[] = ['front_desk', 'housekeeping', 'fnb'];

export function UsersPage() {
  const { toast }                             = useToast();
  const { user: me }                          = useAuth();
  const [users,       setUsers]               = useState<SystemUser[]>([]);
  const [loading,     setLoading]             = useState(true);
  const [createModal, setCreateModal]         = useState(false);
  const [pwModal,     setPwModal]             = useState<SystemUser | null>(null);
  const [deactivate,  setDeactivate]          = useState<SystemUser | null>(null);
  const [menu,        setMenu]                = useState<string | null>(null);
  const [form,        setForm]                = useState(EMPTY_FORM);
  const [pwForm,      setPwForm]              = useState(EMPTY_PW);
  const [saving,      setSaving]              = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/auth/users`, { headers: authHeaders() });
      const data = await r.json();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  async function createUser() {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/auth/users`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast(`${form.firstName} added successfully`, 'success');
      setCreateModal(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function doDeactivate() {
    if (!deactivate) return;
    try {
      const r = await fetch(`${API}/api/auth/users/${deactivate.id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast(`${deactivate.firstName} deactivated`, 'info');
      setDeactivate(null);
      await load();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  }

  async function changePassword() {
    if (!pwModal || pwForm.newPassword !== pwForm.confirm) {
      toast('Passwords do not match', 'error'); return;
    }
    if (pwForm.newPassword.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/auth/users/${pwModal.id}/password`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ newPassword: pwForm.newPassword }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast('Password updated', 'success');
      setPwModal(null);
      setPwForm(EMPTY_PW);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent';
  const roleBadgeCls: Record<UserRole, string> = {
    superadmin:   'bg-purple-50 text-purple-700 border-purple-200',
    manager:      'bg-amber-50 text-amber-700 border-amber-200',
    front_desk:   'bg-blue-50 text-blue-700 border-blue-200',
    housekeeping: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    fnb:          'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Staff who can log into the HMS dashboard</p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      {/* Hotel ID info box */}
      {me?.hotelId && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
          <span className="text-slate-500">Share your Hotel ID with new staff so they can log in:</span>
          <code className="font-mono font-bold text-slate-800 bg-white border border-slate-300 px-2.5 py-1 rounded-lg text-xs">{me.hotelId}</code>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Username</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-900">{u.firstName} {u.lastName}</div>
                    {u.email && <div className="text-xs text-slate-400">{u.email}</div>}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{u.username}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${roleBadgeCls[u.role] ?? ''}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.isActive
                      ? <span className="text-xs text-emerald-600 font-medium">Active</span>
                      : <span className="text-xs text-slate-400">Inactive</span>
                    }
                  </td>
                  <td className="px-5 py-3.5 relative">
                    <button onClick={() => setMenu(menu === u.id ? null : u.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menu === u.id && (
                      <div className="absolute right-8 top-8 z-10 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-44" onMouseLeave={() => setMenu(null)}>
                        <button onClick={() => { setPwModal(u); setMenu(null); }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <KeyRound className="w-3.5 h-3.5" /> Reset Password
                        </button>
                        {u.isActive && u.id !== me?.id && (
                          <button onClick={() => { setDeactivate(u); setMenu(null); }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                            <UserX className="w-3.5 h-3.5" /> Deactivate
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No staff accounts yet. Create the first one.</p>
            </div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      <Modal title="Create Staff Account" onClose={() => { setCreateModal(false); setForm(EMPTY_FORM); }} open={createModal}
        footer={
          <button onClick={createUser} disabled={saving || !form.firstName || !form.username || !form.password}
            className="px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Account
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {[{ l: 'First name *', k: 'firstName' }, { l: 'Last name', k: 'lastName' }].map(({ l, k }) => (
              <div key={k} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{l}</label>
                <input className={inputCls} value={(form as any)[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Role *</label>
            <select className={inputCls} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
              {CREATABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          {[
            { l: 'Username *', k: 'username', p: 'e.g. sarah.desk' },
            { l: 'Password * (min 6 chars)', k: 'password', p: '••••••••', t: 'password' },
            { l: 'Email', k: 'email', p: 'sarah@hotel.com' },
            { l: 'Phone', k: 'phone', p: '+250 788 000 000' },
          ].map(({ l, k, p, t }) => (
            <div key={k} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{l}</label>
              <input className={inputCls} type={t ?? 'text'} placeholder={p}
                value={(form as any)[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal title={`Reset Password — ${pwModal?.firstName ?? ''}`} onClose={() => setPwModal(null)} open={!!pwModal}
        footer={
          <button onClick={changePassword} disabled={saving || !pwForm.newPassword}
            className="px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Update Password
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          {[{ l: 'New password', k: 'newPassword' }, { l: 'Confirm password', k: 'confirm' }].map(({ l, k }) => (
            <div key={k} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{l}</label>
              <input className={inputCls} type="password" placeholder="••••••••"
                value={(pwForm as any)[k]} onChange={(e) => setPwForm((f) => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deactivate}
        title="Deactivate User"
        message={`${deactivate?.firstName} ${deactivate?.lastName} will no longer be able to log in. You can re-activate them later.`}
        confirmLabel="Deactivate"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={doDeactivate}
        onCancel={() => setDeactivate(null)}
      />
    </div>
  );
}
