import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, Plus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { listHousekeepingTasks, updateTaskStatus, createHousekeepingTask } from '../services/housekeepingService';
import { listRooms } from '../services/roomsService';
import { listStaff } from '../services/staffService';
import { HousekeepingTask, TaskStatus, TaskPriority } from '../domain/models';
import { Room, StaffMember } from '../domain/models';

interface TaskRow extends HousekeepingTask {
  room?:  { id: string; roomNumber: string; roomType: string; floor: number; status: string } | null;
  staff?: { id: string; firstName: string; lastName: string } | null;
}

interface NewTaskForm { roomId: string; assignedStaffId: string; priority: TaskPriority; dueAt: string; notes: string; }
const emptyTaskForm = (): NewTaskForm => ({ roomId: '', assignedStaffId: '', priority: 'Normal', dueAt: '', notes: '' });

const INVENTORY = [
  { item: 'Bath Towels',   stock: 450, min: 200, level: 'Good' },
  { item: 'Hand Towels',   stock: 120, min: 150, level: 'Low' },
  { item: 'Shampoo (Mini)', stock: 50, min: 100, level: 'Critical' },
  { item: 'Soap Bars',     stock: 300, min: 100, level: 'Good' },
];

const taskStatusCycle: Record<TaskStatus, TaskStatus> = {
  Open:          'In Progress',
  'In Progress': 'Resolved',
  Resolved:      'Open',
};

const cardBg: Record<string, string> = {
  Open:          'bg-amber-50 border-amber-100',
  'In Progress': 'bg-blue-50 border-blue-100',
  Resolved:      'bg-emerald-50 border-emerald-100',
};

export function Housekeeping() {
  const [tasks, setTasks]           = useState<TaskRow[]>([]);
  const [rooms, setRooms]           = useState<Room[]>([]);
  const [staffList, setStaffList]   = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [showNew, setShowNew]       = useState(false);
  const [form, setForm]             = useState<NewTaskForm>(emptyTaskForm());
  const [formError, setFormError]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reload() {
    setIsLoading(true);
    listHousekeepingTasks()
      .then((d) => setTasks(d as TaskRow[]))
      .catch(() => setTasks([]))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    if (!showNew) return;
    Promise.all([listRooms(), listStaff()])
      .then(([r, s]) => { setRooms(r); setStaffList(s); })
      .catch(() => {});
  }, [showNew]);

  async function handleStatusCycle(task: TaskRow) {
    const next = taskStatusCycle[task.status];
    try { await updateTaskStatus(task.id, next); reload(); } catch { /* ignore */ }
  }

  async function handleCreate() {
    if (!form.roomId) { setFormError('Room is required.'); return; }
    setSubmitting(true); setFormError('');
    try {
      await createHousekeepingTask({
        roomId:           form.roomId,
        assignedStaffId:  form.assignedStaffId || ('' as string),
        priority:         form.priority,
        status:           'Open',
        dueAt:            form.dueAt || ('' as string),
        notes:            form.notes || undefined,
      });
      setShowNew(false); setForm(emptyTaskForm()); reload();
    } catch (e) {
      setFormError((e as Error).message ?? 'Failed to create task.');
    } finally { setSubmitting(false); }
  }

  const open      = tasks.filter((t) => t.status === 'Open').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const resolved  = tasks.filter((t) => t.status === 'Resolved').length;

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Housekeeping"
        subtitle="Manage room cleaning status, schedules, and inventory."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => { setForm(emptyTaskForm()); setFormError(''); setShowNew(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Task
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm">
              <Sparkles className="w-4 h-4" /> Auto-Assign
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Task Board */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Tasks</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Open ({open})</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> In Progress ({inProgress})</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Done ({resolved})</span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading tasks…</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No tasks yet. Click "New Task" to create one.</div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <div key={task.id} className={`p-3 rounded-xl border ${cardBg[task.status] ?? 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-lg text-gray-900">
                      {task.room?.roomNumber ?? task.roomId}
                    </span>
                    {task.priority === 'Urgent' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="text-xs text-gray-600 mb-1">{task.room?.roomType ?? ''}</div>
                  {task.notes && <div className="text-xs text-gray-500 mb-2 italic truncate">{task.notes}</div>}
                  <div className="flex justify-between items-center">
                    <StatusBadge status={task.status} />
                    <span className="text-xs font-medium text-gray-500">
                      {task.staff ? `${task.staff.firstName} ${task.staff.lastName}` : 'Unassigned'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleStatusCycle(task)}
                    className="mt-3 w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    → {taskStatusCycle[task.status]}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Today's Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Tasks Resolved</span>
                  <span className="font-medium text-gray-900">{resolved} / {tasks.length}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: tasks.length ? `${(resolved / tasks.length) * 100}%` : '0%' }}></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="text-xs text-amber-600 font-medium mb-1">Open</div>
                  <div className="text-lg font-bold text-amber-900">{open}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs text-blue-600 font-medium mb-1">In Progress</div>
                  <div className="text-lg font-bold text-blue-900">{inProgress}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Inventory Alerts</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {INVENTORY.map((item) => (
                <div key={item.item} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.item}</p>
                    <p className="text-xs text-gray-500">Stock: {item.stock} (Min: {item.min})</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-md ${item.level === 'Critical' ? 'bg-red-100 text-red-700' : item.level === 'Low' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {item.level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── New Task Modal ──────────────────────────────────────── */}
      {showNew && (
        <Modal
          title="New Housekeeping Task"
          onClose={() => setShowNew(false)}
          size="md"
          footer={
            <>
              <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">Cancel</button>
              <button onClick={handleCreate} disabled={submitting} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50">
                {submitting ? 'Creating…' : 'Create Task'}
              </button>
            </>
          }
        >
          {formError && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Room <span className="text-red-500">*</span></label>
              <select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} className={inputCls}>
                <option value="">Select room…</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.roomNumber} – {r.roomType} ({r.status})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Assign To</label>
              <select value={form.assignedStaffId} onChange={(e) => setForm({ ...form, assignedStaffId: e.target.value })} className={inputCls}>
                <option value="">Unassigned</option>
                {staffList.filter((s) => s.isActive && s.role === 'Housekeeping').map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })} className={inputCls}>
                  <option>Normal</option><option>High</option><option>Urgent</option><option>Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Due By</label>
                <input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} placeholder="Optional instructions…" />
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
