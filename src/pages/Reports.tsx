import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, Banknote, Users, Calendar } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { PageHeader } from '../components/PageHeader';
import { StatsCard } from '../components/StatsCard';
import { api } from '../lib/api';

const COMMISSIONS: Record<string, number> = {
  'Booking.com': 0.15, Airbnb: 0.03, Expedia: 0.18, Agoda: 0.15, Triply: 0.10, Direct: 0,
};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface ApiRes {
  id: string; channel: string; totalAmount: number; createdAt: string; status: string;
  guest?: { firstName: string; lastName: string } | null;
}

type Range = '6m' | '12m' | 'ytd';

function startOf(range: Range): Date {
  const now = new Date();
  if (range === '6m')  { const d = new Date(now); d.setMonth(d.getMonth() - 5); d.setDate(1); return d; }
  if (range === '12m') { const d = new Date(now); d.setMonth(d.getMonth() - 11); d.setDate(1); return d; }
  return new Date(now.getFullYear(), 0, 1);
}

const rwf = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 });

export function Reports() {
  const [reservations, setReservations] = useState<ApiRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('6m');

  useEffect(() => {
    api.get<ApiRes[]>('/api/reservations')
      .then(setReservations)
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }, []);

  const cutoff = startOf(range);
  const filtered = reservations.filter((r) => {
    if (r.status === 'Cancelled') return false;
    return new Date(r.createdAt) >= cutoff;
  });

  // Monthly revenue chart
  const monthMap: Record<string, number> = {};
  const monthsToShow = range === '6m' ? 6 : range === 'ytd' ? new Date().getMonth() + 1 : 12;
  const now = new Date();
  for (let i = monthsToShow - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = 0;
  }
  filtered.forEach((r) => {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key in monthMap) monthMap[key] += r.totalAmount ?? 0;
  });
  const revenueData = Object.entries(monthMap).map(([key, revenue]) => ({
    month: MONTH_LABELS[parseInt(key.split('-')[1]) - 1],
    revenue,
  }));

  // Channel performance
  const channelMap: Record<string, { bookings: number; revenue: number }> = {};
  filtered.forEach((r) => {
    if (!channelMap[r.channel]) channelMap[r.channel] = { bookings: 0, revenue: 0 };
    channelMap[r.channel].bookings += 1;
    channelMap[r.channel].revenue += r.totalAmount ?? 0;
  });
  const channelPerformance = Object.entries(channelMap).map(([name, { bookings, revenue }]) => ({
    name, bookings, revenue,
    commission: Math.round(revenue * (COMMISSIONS[name] ?? 0)),
  })).sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = filtered.reduce((s, r) => s + (r.totalAmount ?? 0), 0);
  const totalGuests = new Set(filtered.map((r) => r.id)).size;
  const adr = filtered.length ? totalRevenue / filtered.length : 0;

  function exportCSV() {
    const rows = [
      ['ID', 'Channel', 'Amount', 'Status', 'Created'],
      ...reservations.map((r) => [r.id, r.channel, r.totalAmount, r.status, r.createdAt]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `reservations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Financial performance, occupancy trends, and channel insights."
        actions={
          <>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as Range)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            >
              <option value="6m">Last 6 Months</option>
              <option value="12m">Last 12 Months</option>
              <option value="ytd">Year to Date</option>
            </select>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Total Revenue"  value={loading ? '—' : rwf.format(totalRevenue)} icon={Banknote}   color="emerald" />
        <StatsCard title="ADR"            value={loading ? '—' : rwf.format(adr)}           icon={TrendingUp} color="amber" />
        <StatsCard title="Total Bookings" value={loading ? '—' : String(filtered.length)}   icon={Calendar}   color="purple" />
        <StatsCard title="Total Guests"   value={loading ? '—' : String(totalGuests)}        icon={Users}      color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Trend</h3>
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Bookings by Channel</h3>
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading…</div>
            ) : channelPerformance.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data for selected range</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelPerformance} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="bookings" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Channel Performance</h3>
        </div>
        <div className="table-shell">
          <table className="table-premium text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-medium">Channel</th>
                <th className="px-6 py-4 font-medium">Bookings</th>
                <th className="px-6 py-4 font-medium">Gross Revenue</th>
                <th className="px-6 py-4 font-medium">Est. Commission</th>
                <th className="px-6 py-4 font-medium">Net Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-gray-400 text-sm">Loading…</td></tr>
              ) : channelPerformance.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-gray-400 text-sm">No data for selected range.</td></tr>
              ) : channelPerformance.map((ch) => (
                <tr key={ch.name} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{ch.name}</td>
                  <td className="px-6 py-4 text-gray-600">{ch.bookings}</td>
                  <td className="px-6 py-4 font-medium text-emerald-600">{rwf.format(ch.revenue)}</td>
                  <td className="px-6 py-4 text-red-500">{rwf.format(ch.commission)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{rwf.format(ch.revenue - ch.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
