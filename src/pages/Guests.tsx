import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, MessageSquare, Star, Clock, AlertCircle, CheckCircle2, Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { listGuests, createGuest, updateGuest, deleteGuest } from '../services/guestsService';
import { listHousekeepingTasks, updateTaskStatus, updateHousekeepingTask } from '../services/housekeepingService';
import { listStaff } from '../services/staffService';
import { GuestProfile, StaffMember } from '../domain/models';

type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | '';

interface GuestForm {
  firstName: string; lastName: string; email: string; phone: string; loyaltyTier: LoyaltyTier;
}

interface TaskRow {
  id: string; status: string; priority: string; notes?: string | null;
  roomId: string; assignedStaffId?: string | null; createdAt?: string;
  room?:  { id: string; roomNumber: string; roomType: string } | null;
  staff?: { id: string; firstName: string; lastName: string } | null;
  guest?: { firstName: string; lastName: string } | null;
}

const emptyForm = (): GuestForm => ({ firstName: '', lastName: '', email: '', phone: '', loyaltyTier: '' });

export function Guests() {
  const [activeTab, setActiveTab] = useState<'directory' | 'requests'>('requests');
  const [guests, setGuests]       = useState<GuestProfile[]>([]);
  const [search, setSearch]       = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Requests
  const [tasks, setTasks]               = useState<TaskRow[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [assignTarget, setAssignTarget] = useState<TaskRow | null>(null);
  const [staffList, setStaffList]       = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [actionBusy, setActionBusy]     = useState(false);

  // Notes modal
  const [noteTarget, setNoteTarget]       = useState<TaskRow | null>(null);
  const [noteText, setNoteText]           = useState('');
  const [noteSaving, setNoteSaving]       = useState(false);

  async function handleSaveNote() {
    if (!noteTarget) return;
    setNoteSaving(true);
    try {
      await updateHousekeepingTask(noteTarget.id, { notes: noteText.trim() || undefined });
      setNoteTarget(null);
      reloadTasks();
    } finally { setNoteSaving(false); }
  }

  // Guest form
  const [showForm, setShowForm]           = useState(false);
  const [editing, setEditing]             = useState<GuestProfile | null>(null);
  const [form, setForm]                   = useState<GuestForm>(emptyForm());
  const [formError, setFormError]         = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState<GuestProfile | null>(null);

  function reloadGuests() {
    setIsLoading(true);
    listGuests().then(setGuests).catch(() => setGuests([])).finally(() => setIsLoading(false));
  }

  function reloadTasks() {
    setTasksLoading(true);
    listHousekeepingTasks()
      .then((d) => setTasks(d as unknown as TaskRow[]))
      .catch(() => setTasks([]))
      .finally(() => setTasksLoading(false));
  }

  useEffect(() => { reloadGuests(); reloadTasks(); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm()); setFormError(''); setShowForm(true); }
  function openEdit(g: GuestProfile) {
    setEditing(g);
    setForm({ firstName: g.firstName, lastName: g.lastName, email: g.email, phone: g.phone, loyaltyTier: (g.loyaltyTier ?? '') as LoyaltyTier });
    setFormError(''); setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      setFormError('First name, last name, email, and phone are required.');
      return;
    }
    setSubmitting(true); setFormError('');
    const payload = { ...form, loyaltyTier: form.loyaltyTier || undefined } as Omit<GuestProfile, 'id' | 'createdAt'>;
    try {
      if (editing) await updateGuest(editing.id, payload);
      else await createGuest(payload);
      setShowForm(false); reloadGuests();
    } catch (e) {
      setFormError((e as Error).message ?? 'Failed to save guest.');
    } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try { await deleteGuest(deleteTarget.id); reloadGuests(); }
    finally { setSubmitting(false); setDeleteTarget(null); }
  }

  async function openAssign(task: TaskRow) {
    setAssignTarget(task); setSelectedStaff(task.assignedStaffId ?? '');
    if (staffList.length === 0) {
      const s = await listStaff().catch(() => []);
      setStaffList(s);
    }
  }

  async function handleAssign() {
    if (!assignTarget) return;
    setActionBusy(true);
    try {
      await updateHousekeepingTask(assignTarget.id, { assignedStaffId: selectedStaff || undefined });
      setAssignTarget(null); reloadTasks();
    } finally { setActionBusy(false); }
  }

  async function handleResolve(task: TaskRow) {
    setActionBusy(true);
    try { await updateTaskStatus(task.id, 'Resolved'); reloadTasks(); }
    finally { setActionBusy(false); }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';
  const visible = search
    ? guests.filter((g) => `${g.firstName} ${g.lastName} ${g.email}`.toLowerCase().includes(search.toLowerCase()))
    : guests;

  const openTasks      = tasks.filter((t) => t.status === 'Open').length;
  const inProgTasks    = tasks.filter((t) => t.status === 'In Progress').length;
  const resolvedTasks  = tasks.filter((t) => t.status === 'Resolved').length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Guest Services"
        subtitle="Manage guest profiles, preferences, and active requests."
        actions={
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab('requests')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Active Requests</button>
              <button onClick={() => setActiveTab('directory')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'directory' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Guest Directory</button>
            </div>
            {activeTab === 'directory' && (
              <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm">
                <Plus className="w-4 h-4" /> Add Guest
              </button>
            )}
          </div>
        }
      />

      {activeTab === 'requests' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { icon: AlertCircle,  label: 'Open',           val: openTasks,     bg: 'bg-amber-50',   ic: 'text-amber-600' },
              { icon: Clock,        label: 'In Progress',     val: inProgTasks,   bg: 'bg-amber-50',   ic: 'text-amber-600' },
              { icon: CheckCircle2, label: 'Resolved Today',  val: resolvedTasks, bg: 'bg-emerald-50', ic: 'text-emerald-600' },
              { icon: Star,         label: 'Total Tasks',     val: tasks.length,  bg: 'bg-purple-50',  ic: 'text-purple-600' },
            ].map(({ icon: Icon, label, val, bg, ic }) => (
              <div key={label} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center ${ic}`}><Icon className="w-5 h-5" /></div>
                <div><p className="text-sm text-gray-500 font-medium">{label}</p><p className="text-xl font-bold text-gray-900">{val}</p></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Housekeeping Tasks</span>
            </div>
            <div className="divide-y divide-gray-100">
              {tasksLoading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading tasks…</div>
              ) : tasks.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No active requests.</div>
              ) : tasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs text-gray-500 font-medium">Room</span>
                      <span className="text-sm font-bold text-gray-900">{task.room?.roomNumber ?? '—'}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{task.room?.roomType ?? 'Housekeeping'}</span>
                        <StatusBadge status={task.priority} /><StatusBadge status={task.status} />
                      </div>
                      {task.notes && <p className="text-sm text-gray-600 mb-1">{task.notes}</p>}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Assignee: {task.staff ? `${task.staff.firstName} ${task.staff.lastName}` : 'Unassigned'}</span>
                        <span>•</span>
                        {task.createdAt && <span>{new Date(task.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === 'Open' && (
                      <button
                        onClick={() => openAssign(task)}
                        disabled={actionBusy}
                        className="px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >Assign</button>
                    )}
                    {task.status === 'In Progress' && (
                      <button
                        onClick={() => handleResolve(task)}
                        disabled={actionBusy}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >Resolve</button>
                    )}
                    <button
                      onClick={() => { setNoteTarget(task); setNoteText(task.notes ?? ''); }}
                      title="Add / view note"
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search guests…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"><Filter className="w-4 h-4" /> Filters</button>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading guests…</div>
          ) : (
            <div className="table-shell">
              <table className="table-premium text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-medium">Guest</th>
                    <th className="px-6 py-4 font-medium">Contact</th>
                    <th className="px-6 py-4 font-medium">Loyalty</th>
                    <th className="px-6 py-4 font-medium">Member Since</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.map((guest) => (
                    <tr key={guest.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">{guest.firstName.charAt(0)}</div>
                          <div>
                            <div className="font-medium text-gray-900">{guest.firstName} {guest.lastName}</div>
                            <div className="text-xs text-gray-500">{guest.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900">{guest.email}</div>
                        <div className="text-xs text-gray-500">{guest.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        {guest.loyaltyTier ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                            <Star className="w-3 h-3 fill-current" /> {guest.loyaltyTier}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">Standard</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{new Date(guest.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(guest)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteTarget(guest)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No guests found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Assign Staff Modal ──────────────────────────────────── */}
      {assignTarget && (
        <Modal
          title="Assign Staff"
          onClose={() => setAssignTarget(null)}
          size="sm"
          footer={
            <>
              <button onClick={() => setAssignTarget(null)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">Cancel</button>
              <button onClick={handleAssign} disabled={actionBusy} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50">
                {actionBusy ? 'Saving…' : 'Assign'}
              </button>
            </>
          }
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Staff Member</label>
            <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className={inputCls}>
              <option value="">Unassigned</option>
              {staffList.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</option>
              ))}
            </select>
          </div>
        </Modal>
      )}

      {/* ── Guest Form Modal ────────────────────────────────────── */}
      {showForm && (
        <Modal
          title={editing ? 'Edit Guest' : 'New Guest'}
          onClose={() => setShowForm(false)}
          size="md"
          footer={
            <>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50">
                {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Guest'}
              </button>
            </>
          }
        >
          {formError && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-2 gap-4">
            {[['First Name', 'firstName'], ['Last Name', 'lastName']].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label} <span className="text-red-500">*</span></label>
                <input type="text" value={(form as unknown as Record<string, string>)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputCls} />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone <span className="text-red-500">*</span></label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Loyalty Tier</label>
              <select value={form.loyaltyTier} onChange={(e) => setForm({ ...form, loyaltyTier: e.target.value as LoyaltyTier })} className={inputCls}>
                <option value="">None</option>
                <option>Bronze</option><option>Silver</option><option>Gold</option><option>Platinum</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Notes Modal ────────────────────────────────────────── */}
      {noteTarget && (
        <Modal
          title={`Note — Room ${noteTarget.room?.roomNumber ?? noteTarget.roomId}`}
          onClose={() => setNoteTarget(null)}
          size="sm"
          footer={
            <>
              <button onClick={() => setNoteTarget(null)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">Cancel</button>
              <button onClick={handleSaveNote} disabled={noteSaving} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50">
                {noteSaving ? 'Saving…' : 'Save Note'}
              </button>
            </>
          }
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Note / Instructions</label>
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note for this task…"
              className={inputCls + ' resize-none'}
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1.5">
              {noteTarget.room?.roomType ?? 'Housekeeping'} · {noteTarget.status} · {noteTarget.priority}
            </p>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm ──────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Guest"
          message={`Permanently delete ${deleteTarget.firstName} ${deleteTarget.lastName}? This will also remove linked reservations.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={submitting}
        />
      )}
    </motion.div>
  );
}
