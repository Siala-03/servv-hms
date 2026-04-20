import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Clock, MoreVertical, Pencil } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { listStaff, createStaffMember, updateStaffMember } from '../services/staffService';
import { StaffMember } from '../domain/models';

type Role  = 'Front Desk' | 'Housekeeping' | 'Manager' | 'F&B';
type Shift = 'Morning' | 'Evening' | 'Night';

interface StaffForm { firstName: string; lastName: string; email: string; role: Role; shift: Shift; isActive: boolean; }
const emptyForm = (): StaffForm => ({ firstName: '', lastName: '', email: '', role: 'Front Desk', shift: 'Morning', isActive: true });

// Static task board (not yet in API)
const TASKS = [
  { id: 'T-101', title: 'Check pool chemical levels', assignee: 'David Chen', due: '14:00', status: 'To Do', priority: 'High' },
  { id: 'T-102', title: 'Prepare VIP welcome basket (Room 501)', assignee: 'Lucas Shah', due: '15:00', status: 'In Progress', priority: 'Normal' },
  { id: 'T-103', title: 'Audit yesterday receipts', assignee: 'John Doe', due: '12:00', status: 'Done', priority: 'High' },
];

const STATUS_COLOR: Record<string, string> = {
  'On Duty':   'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Off Duty':  'bg-gray-100 text-gray-700 border-gray-200',
  'On Leave':  'bg-amber-50 text-amber-700 border-amber-200',
};

export function Staff() {
  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [search, setSearch]       = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<StaffMember | null>(null);
  const [form, setForm]             = useState<StaffForm>(emptyForm());
  const [formError, setFormError]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(null);
  const [menuOpen, setMenuOpen]     = useState<string | null>(null);

  function reload() {
    setIsLoading(true);
    listStaff().then(setStaff).catch(() => setStaff([])).finally(() => setIsLoading(false));
  }
  useEffect(() => { reload(); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm()); setFormError(''); setShowForm(true); }
  function openEdit(s: StaffMember) { setEditing(s); setForm({ firstName: s.firstName, lastName: s.lastName, email: s.email, role: s.role as Role, shift: s.shift as Shift, isActive: s.isActive }); setFormError(''); setShowForm(true); }

  async function handleSubmit() {
    if (!form.firstName || !form.lastName || !form.email) { setFormError('First name, last name, and email are required.'); return; }
    setSubmitting(true); setFormError('');
    try {
      if (editing) await updateStaffMember(editing.id, form);
      else await createStaffMember(form);
      setShowForm(false); reload();
    } catch (e) {
      setFormError((e as Error).message ?? 'Failed to save.');
    } finally { setSubmitting(false); }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setSubmitting(true);
    try { await updateStaffMember(deactivateTarget.id, { isActive: !deactivateTarget.isActive }); reload(); }
    finally { setSubmitting(false); setDeactivateTarget(null); }
  }

  const ROLES: Role[]  = ['Front Desk', 'Housekeeping', 'Manager', 'F&B'];
  const SHIFTS: Shift[] = ['Morning', 'Evening', 'Night'];
  const DEPTS = ['All', 'Front Desk', 'Housekeeping', 'Manager', 'F&B'];

  const visible = staff.filter((s) => {
    const matchSearch = !search || `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'All' || s.role === deptFilter;
    return matchSearch && matchDept;
  });

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Staff Management"
        subtitle="Manage employee directory, schedules, and task assignments."
        actions={
          <>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm">
              <Plus className="w-4 h-4" /> Add Staff
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Directory */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search staff…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              {DEPTS.map((d) => <option key={d}>{d === 'All' ? 'All Roles' : d}</option>)}
            </select>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading staff…</div>
          ) : (
            <div className="table-shell">
              <table className="table-premium text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-medium">Employee</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Shift</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.map((person) => {
                    const dutyStatus = person.isActive ? 'On Duty' : 'Off Duty';
                    return (
                      <tr key={person.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs">
                              {person.firstName[0]}{person.lastName[0]}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{person.firstName} {person.lastName}</div>
                              <div className="text-xs text-gray-500">{person.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-medium">{person.role}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-gray-600"><Clock className="w-3.5 h-3.5" /> {person.shift}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLOR[dutyStatus]}`}>
                            {person.isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>}
                            {dutyStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <button onClick={() => setMenuOpen(menuOpen === person.id ? null : person.id)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {menuOpen === person.id && (
                            <div className="absolute right-6 top-10 z-20 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[140px] text-left">
                              <button onClick={() => { openEdit(person); setMenuOpen(null); }} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                              <button onClick={() => { setDeactivateTarget(person); setMenuOpen(null); }} className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-slate-100">
                                {person.isActive ? 'Deactivate' : 'Reactivate'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {visible.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No staff found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Task Board */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Today's Tasks</h3>
          </div>
          <div className="p-4 flex-1 bg-gray-50/50">
            <div className="space-y-3">
              {TASKS.map((task) => (
                <div key={task.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <StatusBadge status={task.status} /><StatusBadge status={task.priority} />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">{task.title}</h4>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
                        {task.assignee.split(' ').map((n) => n[0]).join('')}
                      </div>
                      {task.assignee}
                    </div>
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.due}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Staff Form Modal ────────────────────────────────────── */}
      {showForm && (
        <Modal
          title={editing ? 'Edit Staff Member' : 'Add Staff Member'}
          onClose={() => setShowForm(false)}
          size="md"
          footer={
            <>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50">
                {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Member'}
              </button>
            </>
          }
        >
          {formError && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-2 gap-4">
            {[['First Name', 'firstName'], ['Last Name', 'lastName']].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label} <span className="text-red-500">*</span></label>
                <input type="text" value={(form as Record<string, unknown>)[key] as string} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputCls} />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={inputCls}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Shift</label>
              <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value as Shift })} className={inputCls}>
                {SHIFTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Deactivate Confirm ──────────────────────────────────── */}
      {deactivateTarget && (
        <ConfirmDialog
          title={deactivateTarget.isActive ? 'Deactivate Staff Member' : 'Reactivate Staff Member'}
          message={`${deactivateTarget.isActive ? 'Deactivate' : 'Reactivate'} ${deactivateTarget.firstName} ${deactivateTarget.lastName}?`}
          confirmLabel={deactivateTarget.isActive ? 'Deactivate' : 'Reactivate'}
          confirmClassName={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${deactivateTarget.isActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivateTarget(null)}
          isLoading={submitting}
        />
      )}
    </motion.div>
  );
}
