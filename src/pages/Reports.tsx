import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, Banknote, Calendar, BedDouble, Clock } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { PageHeader } from '../components/PageHeader';
import { StatsCard } from '../components/StatsCard';
import { api } from '../lib/api';

const COMMISSIONS: Record<string, number> = {
  'Booking.com': 0.15, Airbnb: 0.03, Expedia: 0.18, Agoda: 0.15, Triply: 0.10, Direct: 0,
};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_COLORS: Record<string, string> = {
  Confirmed:    '#d97706',
  'Checked-in': '#10b981',
  'Checked-out':'#64748b',
  Pending:      '#3b82f6',
  Cancelled:    '#ef4444',
};

interface ApiRes {
  id: string; channel: string; totalAmount: number; createdAt: string;
  status: string; checkInDate: string; checkOutDate: string;
  guest?: { id: string; firstName: string; lastName: string } | null;
}
interface ApiRoom { id: string; status: string; }

type Range = '6m' | '12m' | 'ytd';

function startOf(range: Range): Date {
  const now = new Date();
  if (range === '6m')  { const d = new Date(now); d.setMonth(d.getMonth() - 5); d.setDate(1); return d; }
  if (range === '12m') { const d = new Date(now); d.setMonth(d.getMonth() - 11); d.setDate(1); return d; }
  return new Date(now.getFullYear(), 0, 1);
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const TOOLTIP_STYLE = { borderRadius: '10px', border: '1px solid #f3f4f6', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.1)', fontSize: 13 };

export function Reports() {
  const [reservations, setReservations] = useState<ApiRes[]>([]);
  const [rooms,        setRooms]        = useState<ApiRoom[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [range,        setRange]        = useState<Range>('6m');

  useEffect(() => {
    Promise.all([
      api.get<ApiRes[]>('/api/reservations'),
      api.get<ApiRoom[]>('/api/rooms'),
    ])
      .then(([r, rm]) => { setReservations(r); setRooms(rm); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cutoff      = startOf(range);
  const totalRooms  = rooms.length;
  const filtered    = reservations.filter((r) => r.status !== 'Cancelled' && new Date(r.createdAt) >= cutoff);

  // ── Monthly trend data ──────────────────────────────────────────────────────
  const monthsToShow = range === '6m' ? 6 : range === 'ytd' ? new Date().getMonth() + 1 : 12;
  const now = new Date();
  const trendData = Array.from({ length: monthsToShow }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsToShow - 1 - idx), 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const monthStart = new Date(y, m, 1);
    const monthEnd   = new Date(y, m + 1, 1);
    const key        = `${y}-${String(m + 1).padStart(2, '0')}`;

    const revenue = reservations
      .filter((r) => r.status !== 'Cancelled' && new Date(r.createdAt) >= monthStart && new Date(r.createdAt) < monthEnd)
      .reduce((s, r) => s + (r.totalAmount ?? 0), 0);

    const stayCount = reservations.filter((r) => {
      if (!['Checked-in','Checked-out','Confirmed'].includes(r.status)) return false;
      return r.checkInDate < key + '-32' && r.checkOutDate > key + '-01';
    }).length;

    const occupancy = totalRooms > 0 ? Math.min(Math.round((stayCount / totalRooms) * 100), 100) : 0;

    return { month: MONTH_LABELS[m], revenue, occupancy };
  });

  // ── Channel breakdown ───────────────────────────────────────────────────────
  const channelMap: Record<string, { bookings: number; revenue: number }> = {};
  filtered.forEach((r) => {
    if (!channelMap[r.channel]) channelMap[r.channel] = { bookings: 0, revenue: 0 };
    channelMap[r.channel].bookings += 1;
    channelMap[r.channel].revenue  += r.totalAmount ?? 0;
  });
  const channelPerformance = Object.entries(channelMap)
    .map(([name, { bookings, revenue }]) => ({
      name, bookings, revenue,
      commission: Math.round(revenue * (COMMISSIONS[name] ?? 0)),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Booking status donut ────────────────────────────────────────────────────
  const statusMap: Record<string, number> = {};
  reservations.forEach((r) => { statusMap[r.status] = (statusMap[r.status] ?? 0) + 1; });
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalRevenue     = filtered.reduce((s, r) => s + (r.totalAmount ?? 0), 0);
  const adr              = filtered.length ? totalRevenue / filtered.length : 0;
  const revpar           = totalRooms > 0 ? totalRevenue / totalRooms : 0;
  const liveOccupancy    = totalRooms > 0
    ? Math.round((rooms.filter((r) => r.status === 'Occupied').length / totalRooms) * 100)
    : 0;
  const avgLos = filtered.length
    ? filtered.reduce((s, r) => {
        const nights = Math.max(1, (new Date(r.checkOutDate).getTime() - new Date(r.checkInDate).getTime()) / 86400000);
        return s + nights;
      }, 0) / filtered.length
    : 0;

  const totalCommission = channelPerformance.reduce((s, c) => s + c.commission, 0);
  const totalNet        = channelPerformance.reduce((s, c) => s + c.revenue - c.commission, 0);

  function exportCSV() {
    const rows = [
      ['ID','Channel','Amount','Status','Check-in','Check-out','Created'],
      ...reservations.map((r) => [r.id, r.channel, r.totalAmount, r.status, r.checkInDate, r.checkOutDate, r.createdAt]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `reports-${new Date().toISOString().split('T')[0]}.csv`;
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
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm"
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

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatsCard title="Total Revenue"      value={loading ? '—' : usd.format(totalRevenue)} icon={Banknote}   color="emerald" />
        <StatsCard title="ADR"                value={loading ? '—' : usd.format(adr)}           icon={TrendingUp} color="amber"   />
        <StatsCard title="RevPAR"             value={loading ? '—' : usd.format(revpar)}        icon={Banknote}   color="purple"  />
        <StatsCard title="Occupancy (Live)"   value={loading ? '—' : `${liveOccupancy}%`}       icon={BedDouble}  color="amber"   />
        <StatsCard title="Total Bookings"     value={loading ? '—' : String(filtered.length)}   icon={Calendar}   color="purple"  />
        <StatsCard title="Avg Stay (nights)"  value={loading ? '—' : avgLos.toFixed(1)}         icon={Clock}      color="emerald" />
      </div>

      {/* ── Trend charts ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="luxury-panel p-6 rounded-2xl">
          <h3 className="text-base font-semibold text-gray-900 mb-5">Revenue Trend</h3>
          <div className="h-60">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={42} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [usd.format(v), 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="luxury-panel p-6 rounded-2xl">
          <h3 className="text-base font-semibold text-gray-900 mb-5">Occupancy Trend</h3>
          <div className="h-60">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#d97706" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `${v}%`} width={42} domain={[0, 100]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, 'Occupancy']} />
                  <Area type="monotone" dataKey="occupancy" stroke="#d97706" strokeWidth={2} fill="url(#occGrad)" dot={false} activeDot={{ r: 4, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Channel bar + Status donut ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="luxury-panel p-6 rounded-2xl lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-900 mb-5">Revenue by Channel</h3>
          <div className="h-60">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading…</div>
            ) : channelPerformance.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data for this range</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelPerformance} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={42} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [usd.format(v), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="luxury-panel p-6 rounded-2xl">
          <h3 className="text-base font-semibold text-gray-900 mb-5">Booking Status</h3>
          <div className="h-60">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading…</div>
            ) : statusData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No bookings yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="42%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    verticalAlign="bottom" height={30} iconType="circle" iconSize={7}
                    formatter={(v) => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Channel performance table ───────────────────────────────────────── */}
      <div className="luxury-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Channel Performance</h3>
          <span className="text-sm text-gray-400">{filtered.length} bookings in period</span>
        </div>
        <div className="table-shell">
          <table className="table-premium text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">Channel</th>
                <th className="px-6 py-4 font-medium">Bookings</th>
                <th className="px-6 py-4 font-medium">Gross Revenue</th>
                <th className="px-6 py-4 font-medium">Commission</th>
                <th className="px-6 py-4 font-medium">Net Revenue</th>
                <th className="px-6 py-4 font-medium">Avg Booking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-gray-400 text-sm">Loading…</td></tr>
              ) : channelPerformance.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-gray-400 text-sm">No data for selected range.</td></tr>
              ) : channelPerformance.map((ch) => (
                <tr key={ch.name} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{ch.name}</td>
                  <td className="px-6 py-4 text-gray-600">{ch.bookings}</td>
                  <td className="px-6 py-4 font-medium text-emerald-600">{usd.format(ch.revenue)}</td>
                  <td className="px-6 py-4 text-red-400">{ch.commission > 0 ? usd.format(ch.commission) : '—'}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{usd.format(ch.revenue - ch.commission)}</td>
                  <td className="px-6 py-4 text-gray-500">{usd.format(ch.bookings > 0 ? Math.round(ch.revenue / ch.bookings) : 0)}</td>
                </tr>
              ))}
            </tbody>
            {channelPerformance.length > 0 && (
              <tfoot className="bg-gray-50/80 border-t border-gray-200">
                <tr>
                  <td className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</td>
                  <td className="px-6 py-3 font-semibold text-gray-700">{filtered.length}</td>
                  <td className="px-6 py-3 font-semibold text-emerald-600">{usd.format(totalRevenue)}</td>
                  <td className="px-6 py-3 font-semibold text-red-400">{usd.format(totalCommission)}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900">{usd.format(totalNet)}</td>
                  <td className="px-6 py-3 text-gray-400">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </motion.div>
  );
}
