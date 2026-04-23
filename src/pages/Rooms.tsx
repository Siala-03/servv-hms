import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Building2, BedDouble, Layers, PencilLine, Trash2, Rows3 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Room, RoomStatus } from '../domain/models';
import { createRoom, createRoomsBulk, deleteRoom, listRooms, updateRoom } from '../services/roomsService';

interface RoomForm {
  roomNumber: string;
  roomType: string;
  floor: number | '';
  baseRate: number | '';
  status: RoomStatus;
  maxOccupancy: number | '';
}

interface BulkRoomForm {
  floor: number | '';
  startNumber: number | '';
  endNumber: number | '';
  padTo: number | '';
  prefix: string;
  roomType: string;
  baseRate: number | '';
  status: RoomStatus;
  maxOccupancy: number | '';
}

const ROOM_STATUSES: RoomStatus[] = ['Available', 'Occupied', 'Cleaning', 'Maintenance', 'Reserved'];

const emptyForm: RoomForm = {
  roomNumber: '',
  roomType: '',
  floor: '',
  baseRate: '',
  status: 'Available',
  maxOccupancy: '',
};

const emptyBulkForm: BulkRoomForm = {
  floor: '',
  startNumber: '',
  endNumber: '',
  padTo: 0,
  prefix: '',
  roomType: '',
  baseRate: '',
  status: 'Available',
  maxOccupancy: '',
};

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500';

export function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState<string>('all');

  const [openModal, setOpenModal] = useState(false);
  const [openBulkModal, setOpenBulkModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Room | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomForm>(emptyForm);
  const [bulkForm, setBulkForm] = useState<BulkRoomForm>(emptyBulkForm);
  const [formError, setFormError] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listRooms();
      setRooms(data);
    } catch {
      setRooms([]);
      setError('Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const floors = useMemo(() => Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b), [rooms]);

  const floorStats = useMemo(() => {
    return floors.map((floor) => {
      const onFloor = rooms.filter((r) => r.floor === floor);
      const occupied = onFloor.filter((r) => r.status === 'Occupied').length;
      const available = onFloor.filter((r) => r.status === 'Available').length;
      return {
        floor,
        count: onFloor.length,
        occupied,
        available,
        avgRate: onFloor.length ? Math.round(onFloor.reduce((s, r) => s + Number(r.baseRate || 0), 0) / onFloor.length) : 0,
      };
    });
  }, [rooms, floors]);

  const visibleRooms = useMemo(() => {
    return rooms
      .filter((r) => floorFilter === 'all' ? true : String(r.floor) === floorFilter)
      .filter((r) => {
        const q = search.toLowerCase().trim();
        if (!q) return true;
        return r.roomNumber.toLowerCase().includes(q) || r.roomType.toLowerCase().includes(q);
      });
  }, [rooms, floorFilter, search]);

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm);
    setFormError('');
    setOpenModal(true);
  }

  function openBulkCreate() {
    setBulkForm(emptyBulkForm);
    setBulkError('');
    setOpenBulkModal(true);
  }

  function openEdit(room: Room) {
    setEditTarget(room);
    setForm({
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      floor: room.floor,
      baseRate: room.baseRate,
      status: room.status,
      maxOccupancy: room.maxOccupancy,
    });
    setFormError('');
    setOpenModal(true);
  }

  async function submitForm() {
    if (!form.roomNumber.trim() || !form.roomType.trim() || form.floor === '' || form.maxOccupancy === '') {
      setFormError('Room number, room type, floor, and max occupancy are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        roomNumber: form.roomNumber.trim(),
        roomType: form.roomType.trim(),
        floor: Number(form.floor),
        baseRate: Number(form.baseRate) || 0,
        status: form.status,
        maxOccupancy: Number(form.maxOccupancy),
      };

      if (editTarget) {
        await updateRoom(editTarget.id, payload);
      } else {
        await createRoom(payload);
      }

      setOpenModal(false);
      setEditTarget(null);
      setForm(emptyForm);
      await reload();
    } catch (e) {
      setFormError((e as Error).message ?? 'Failed to save room.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteRoom(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function submitBulkForm() {
    if (
      bulkForm.floor === '' ||
      bulkForm.startNumber === '' ||
      bulkForm.endNumber === '' ||
      !bulkForm.roomType.trim() ||
      bulkForm.maxOccupancy === ''
    ) {
      setBulkError('Floor, start/end numbers, room type, and max occupancy are required.');
      return;
    }

    if (Number(bulkForm.endNumber) < Number(bulkForm.startNumber)) {
      setBulkError('End number must be greater than or equal to start number.');
      return;
    }

    setSubmitting(true);
    setBulkError('');
    try {
      await createRoomsBulk({
        floor: Number(bulkForm.floor),
        startNumber: Number(bulkForm.startNumber),
        endNumber: Number(bulkForm.endNumber),
        padTo: Number(bulkForm.padTo) || 0,
        prefix: bulkForm.prefix.trim(),
        roomType: bulkForm.roomType.trim(),
        baseRate: Number(bulkForm.baseRate) || 0,
        status: bulkForm.status,
        maxOccupancy: Number(bulkForm.maxOccupancy),
      });

      setOpenBulkModal(false);
      setBulkForm(emptyBulkForm);
      await reload();
    } catch (e) {
      setBulkError((e as Error).message ?? 'Failed to create rooms in bulk.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <PageHeader
        title="Rooms & Floors"
        subtitle="Manage room inventory, floor assignments, and room settings."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={openBulkCreate}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              <Rows3 className="w-4 h-4" /> Bulk Add
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Room
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Rooms</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{rooms.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Floors</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{floors.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Available</p>
          <p className="text-2xl font-semibold text-emerald-700 mt-1">{rooms.filter((r) => r.status === 'Available').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Occupied</p>
          <p className="text-2xl font-semibold text-amber-700 mt-1">{rooms.filter((r) => r.status === 'Occupied').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Layers className="w-4 h-4 text-amber-600" /> Floor Summary</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room number/type"
              className={`${inputCls} sm:w-56`}
            />
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className={inputCls}
            >
              <option value="all">All Floors</option>
              {floors.map((f) => <option key={f} value={String(f)}>Floor {f}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {floorStats.map((f) => (
            <div key={f.floor} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Building2 className="w-4 h-4 text-slate-500" /> Floor {f.floor}</p>
              <div className="mt-2 text-xs text-slate-600 space-y-1">
                <p>Rooms: <span className="font-medium text-slate-800">{f.count}</span></p>
                <p>Available: <span className="font-medium text-emerald-700">{f.available}</span> | Occupied: <span className="font-medium text-amber-700">{f.occupied}</span></p>
                <p>Avg rate: <span className="font-medium text-slate-800">${f.avgRate}</span></p>
              </div>
            </div>
          ))}
          {floorStats.length === 0 && <p className="text-sm text-slate-500">No floor data yet.</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {error && <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Floor</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Occupancy</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-slate-500">Loading rooms...</td></tr>
              ) : visibleRooms.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-slate-500">No rooms found.</td></tr>
              ) : visibleRooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">{room.roomNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{room.roomType}</td>
                  <td className="px-4 py-3 text-slate-700">Floor {room.floor}</td>
                  <td className="px-4 py-3 text-slate-700">${room.baseRate}</td>
                  <td className="px-4 py-3 text-slate-700">{room.maxOccupancy} pax</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600">{room.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openEdit(room)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700" title="Edit room">
                        <PencilLine className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(room)} className="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700" title="Delete room">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openModal && (
        <Modal
          title={editTarget ? `Edit Room ${editTarget.roomNumber}` : 'Add Room'}
          onClose={() => { setOpenModal(false); setEditTarget(null); setForm(emptyForm); }}
          size="lg"
          footer={
            <>
              <button
                onClick={() => { setOpenModal(false); setEditTarget(null); setForm(emptyForm); }}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitForm}
                disabled={submitting}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editTarget ? 'Update Room' : 'Create Room'}
              </button>
            </>
          }
        >
          {formError && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Room Number *</label>
              <input className={inputCls} value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Room Type *</label>
              <input className={inputCls} value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Floor *</label>
              <input type="number" min={1} className={inputCls} value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Base Rate (USD)</label>
              <input type="number" min={0} step="0.01" className={inputCls} value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Occupancy *</label>
              <input type="number" min={1} max={12} className={inputCls} value={form.maxOccupancy} onChange={(e) => setForm({ ...form, maxOccupancy: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RoomStatus })}>
                {ROOM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {openBulkModal && (
        <Modal
          title="Bulk Add Rooms"
          onClose={() => { setOpenBulkModal(false); setBulkForm(emptyBulkForm); }}
          size="lg"
          footer={
            <>
              <button
                onClick={() => { setOpenBulkModal(false); setBulkForm(emptyBulkForm); }}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitBulkForm}
                disabled={submitting}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Rooms'}
              </button>
            </>
          }
        >
          {bulkError && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{bulkError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Floor *</label>
              <input type="number" min={1} className={inputCls} value={bulkForm.floor} onChange={(e) => setBulkForm({ ...bulkForm, floor: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Room Type *</label>
              <input className={inputCls} value={bulkForm.roomType} onChange={(e) => setBulkForm({ ...bulkForm, roomType: e.target.value })} placeholder="Standard Queen" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Number *</label>
              <input type="number" min={0} className={inputCls} value={bulkForm.startNumber} onChange={(e) => setBulkForm({ ...bulkForm, startNumber: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="101" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Number *</label>
              <input type="number" min={0} className={inputCls} value={bulkForm.endNumber} onChange={(e) => setBulkForm({ ...bulkForm, endNumber: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="120" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prefix</label>
              <input className={inputCls} value={bulkForm.prefix} onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value })} placeholder="A-" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Pad Digits</label>
              <input type="number" min={0} max={6} className={inputCls} value={bulkForm.padTo} onChange={(e) => setBulkForm({ ...bulkForm, padTo: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="3" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Base Rate (USD)</label>
              <input type="number" min={0} step="0.01" className={inputCls} value={bulkForm.baseRate} onChange={(e) => setBulkForm({ ...bulkForm, baseRate: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Occupancy *</label>
              <input type="number" min={1} max={12} className={inputCls} value={bulkForm.maxOccupancy} onChange={(e) => setBulkForm({ ...bulkForm, maxOccupancy: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select className={inputCls} value={bulkForm.status} onChange={(e) => setBulkForm({ ...bulkForm, status: e.target.value as RoomStatus })}>
                {ROOM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Preview: creates room numbers from start to end using optional prefix/padding.
          </p>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Room"
          message={`Delete Room ${deleteTarget.roomNumber}? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={submitting}
        />
      )}
    </motion.div>
  );
}
