import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Utensils, Coffee, Wine, ShoppingBag, Plus, Clock } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { listOrders, updateOrderStatus, createOrder } from '../services/ordersService';
import { api } from '../lib/api';
import { OrderStatus } from '../domain/models';

const DEPT_ICONS: Record<string, React.ElementType> = {
  'Room Service': Utensils,
  'Kitchen':      Coffee,
  'Laundry':      ShoppingBag,
};

interface OrderRow {
  id: string;
  reservationId: string;
  requestedByGuestId: string;
  department: string;
  items: string[];
  status: OrderStatus;
  amount: number;
  currency: string;
  requestedAt: string;
  guest?: { id: string; firstName: string; lastName: string } | null;
  roomNumber?: string | null;
}

interface NewOrderForm {
  reservationId: string;
  requestedByGuestId: string;
  department: string;
  itemsRaw: string;
  amount: number | '';
}

const emptyForm = (): NewOrderForm => ({
  reservationId: '', requestedByGuestId: '', department: 'Room Service', itemsRaw: '', amount: '',
});

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function Orders() {
  const [orders, setOrders]       = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [form, setForm]           = useState<NewOrderForm>(emptyForm());
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reference data
  const [reservations, setReservations] = useState<{ id: string; guest?: { firstName: string; lastName: string } | null }[]>([]);

  function reload() {
    setIsLoading(true);
    listOrders()
      .then((d) => setOrders(d as OrderRow[]))
      .catch(() => setOrders([]))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    if (!showNew) return;
    api.get<{ id: string; guest?: { firstName: string; lastName: string } | null }[]>('/api/reservations')
      .then(setReservations).catch(() => {});
  }, [showNew]);

  async function handleStatusChange(id: string, status: OrderStatus) {
    try {
      await updateOrderStatus(id, status);
      reload();
    } catch { /* ignore */ }
  }

  async function handleCreate() {
    if (!form.reservationId || !form.requestedByGuestId || !form.itemsRaw.trim()) {
      setFormError('Reservation, guest, and at least one item are required.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await createOrder({
        reservationId:       form.reservationId,
        requestedByGuestId:  form.requestedByGuestId,
        department:          form.department as 'Kitchen' | 'Room Service' | 'Laundry',
        items:               form.itemsRaw.split('\n').map((s) => s.trim()).filter(Boolean),
        status:              'New',
        amount:              Number(form.amount) || 0,
        currency:            'RWF',
      });
      setShowNew(false);
      setForm(emptyForm());
      reload();
    } catch (e) {
      setFormError((e as Error).message ?? 'Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';

  const cols: { label: string; status: OrderStatus; dot: string; count: number }[] = [
    { label: 'New Orders',      status: 'New',       dot: 'bg-amber-500',   count: orders.filter((o) => o.status === 'New').length },
    { label: 'Preparing',       status: 'Preparing', dot: 'bg-amber-500',   count: orders.filter((o) => o.status === 'Preparing').length },
    { label: 'Delivered Today', status: 'Delivered', dot: 'bg-emerald-500', count: orders.filter((o) => o.status === 'Delivered').length },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Order Management"
        subtitle="Manage room service, F&B, and amenity requests."
        actions={
          <button
            onClick={() => { setForm(emptyForm()); setFormError(''); setShowNew(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Order
          </button>
        }
      />

      {isLoading ? (
        <div className="text-center py-16 text-slate-500 text-sm">Loading orders…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {cols.map(({ label, status, dot, count }) => (
            <div key={status} className={`bg-gray-50 rounded-xl p-4 border border-gray-200 ${status === 'Delivered' ? 'opacity-70' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dot}`}></span>{label}
                </h3>
                <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">{count}</span>
              </div>
              <div className="space-y-3">
                {orders.filter((o) => o.status === status).map((order) => (
                  <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                ))}
                {count === 0 && <p className="text-xs text-gray-400 text-center py-4">No orders</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── New Order Modal ─────────────────────────────────────── */}
      {showNew && (
        <Modal
          title="New Order"
          onClose={() => setShowNew(false)}
          size="md"
          footer={
            <>
              <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">Cancel</button>
              <button onClick={handleCreate} disabled={submitting} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50">
                {submitting ? 'Creating…' : 'Create Order'}
              </button>
            </>
          }
        >
          {formError && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Reservation <span className="text-red-500">*</span></label>
              <select
                value={form.reservationId}
                onChange={(e) => {
                  const res = reservations.find((r) => r.id === e.target.value);
                  setForm({ ...form, reservationId: e.target.value, requestedByGuestId: '' });
                  void res;
                }}
                className={inputCls}
              >
                <option value="">Select reservation…</option>
                {reservations.map((r) => (
                  <option key={r.id} value={r.id}>{r.id}{r.guest ? ` – ${r.guest.firstName} ${r.guest.lastName}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Guest ID <span className="text-red-500">*</span></label>
              <input type="text" placeholder="gst-XXXX" value={form.requestedByGuestId} onChange={(e) => setForm({ ...form, requestedByGuestId: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputCls}>
                <option>Room Service</option>
                <option>Kitchen</option>
                <option>Laundry</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Items <span className="text-red-500">*</span> <span className="font-normal text-slate-400">(one per line)</span></label>
              <textarea rows={3} value={form.itemsRaw} onChange={(e) => setForm({ ...form, itemsRaw: e.target.value })} placeholder={"Club Sandwich\nSparkling Water"} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Amount (RWF)</label>
              <input type="number" min={0} step="1" value={form.amount} placeholder="0" onChange={(e) => setForm({ ...form, amount: e.target.value === '' ? '' : Number(e.target.value) })} className={inputCls} />
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}

function OrderCard({ order, onStatusChange }: { order: OrderRow; onStatusChange: (id: string, s: OrderStatus) => void }) {
  const Icon = DEPT_ICONS[order.department] ?? Utensils;
  const guestName = order.guest ? `${order.guest.firstName} ${order.guest.lastName}` : order.requestedByGuestId;
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gray-100 rounded-md text-gray-600"><Icon className="w-4 h-4" /></div>
          <div>
            <span className="font-bold text-gray-900">{order.roomNumber ? `Room ${order.roomNumber}` : order.reservationId}</span>
            <p className="text-xs text-gray-500">{guestName}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {timeAgo(order.requestedAt)}
        </span>
      </div>
      <ul className="text-sm text-gray-700 space-y-1 mb-3">
        {order.items.map((item, i) => <li key={i} className="flex items-start gap-2"><span className="text-gray-400 mt-1">•</span>{item}</li>)}
      </ul>
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <span className="font-semibold text-gray-900">RWF {order.amount.toLocaleString()}</span>
        {order.status === 'New' && (
          <button onClick={() => onStatusChange(order.id, 'Preparing')} className="px-3 py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded text-xs font-medium transition-colors">
            Accept
          </button>
        )}
        {order.status === 'Preparing' && (
          <button onClick={() => onStatusChange(order.id, 'Delivered')} className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-xs font-medium transition-colors">
            Mark Ready
          </button>
        )}
      </div>
    </div>
  );
}
