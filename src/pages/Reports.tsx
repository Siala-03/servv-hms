import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download, TrendingUp, Banknote, Calendar, BedDouble,
  Clock, Users, Percent, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line,
} from 'recharts';
import { PageHeader } from '../components/PageHeader';
import { StatsCard } from '../components/StatsCard';
import { api } from '../lib/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const COMMISSIONS: Record<string, number> = {
  'Booking.com': 0.15, Airbnb: 0.03, Expedia: 0.18, Agoda: 0.15, Triply: 0.10, Direct: 0,
};
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_COLORS: Record<string, string> = {
  Confirmed: '#d97706', 'Checked-in': '#10b981',
  'Checked-out': '#64748b', Pending: '#3b82f6', Cancelled: '#ef4444',
};
const CHANNEL_COLORS: Record<string, string> = {
  'Booking.com': '#003580', Airbnb: '#FF5A5F', Direct: '#10b981',
  Expedia: '#000080', Agoda: '#d97706', Triply: '#8b5cf6',
};
const DEPT_COLORS: Record<string, string> = {
  'Room Service': '#d97706', Kitchen: '#10b981', Laundry: '#3b82f6',
};
const ROOM_STATUS_COLORS: Record<string, string> = {
  Available: '#10b981', Occupied: '#d97706', Cleaning: '#3b82f6',
  Maintenance: '#ef4444', Reserved: '#8b5cf6',
};
const TASK_COLORS: Record<string, string> = {
  Open: '#d97706', 'In Progress': '#3b82f6', Resolved: '#10b981',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiRes {
  id: string; channel: string; totalAmount: number; createdAt: string;
  status: string; checkInDate: string; checkOutDate: string;
  adults: number; children: number;
  guest?:   { id: string; firstName: string; lastName: string } | null;
  room?:    { id: string; roomNumber: string; roomType: string }  | null;
  ratePlan?: { id: string; name: string } | null;
}
interface ApiRoom {
  id: string; roomNumber: string; roomType: string;
  floor: number; baseRate: number; status: string; maxOccupancy: number;
}
interface ApiTask {
  id: string; status: string; priority: string; dueAt?: string | null;
  room?: { roomNumber: string; roomType: string } | null;
}
interface ApiOrder {
  id: string; department: string; items: string[];
  status: string; amount: number; requestedAt: string;
  guest?: { id: string; firstName: string; lastName: string } | null;
}
interface ForecastDay {
  date: string; occupied: number; totalRooms: number;
  occupancyRate: number; isWeekend: boolean;
}
interface PricingRec {
  type: string; baseRate: number; recommended: number;
  change: number; occupancy7d: number; signal: string; rationale: string;
}

type Range = '6m' | '12m' | 'ytd';

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOf(range: Range): Date {
  const now = new Date();
  if (range === '6m')  { const d = new Date(now); d.setMonth(d.getMonth() - 5); d.setDate(1); return d; }
  if (range === '12m') { const d = new Date(now); d.setMonth(d.getMonth() - 11); d.setDate(1); return d; }
  return new Date(now.getFullYear(), 0, 1);
}

function pd(s?: string | null): Date {
  if (!s) return new Date(0);
  return new Date(s.slice(0, 10));
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const TT  = { borderRadius: '10px', border: '1px solid #f3f4f6', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.1)', fontSize: 12 };

function Placeholder() {
  return <div className="h-full flex items-center justify-center text-gray-300 text-sm">Loading…</div>;
}
function Empty({ text = 'No data for this period' }: { text?: string }) {
  return <div className="h-full flex items-center justify-center text-gray-300 text-sm">{text}</div>;
}
function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Reports() {
  const [reservations, setReservations] = useState<ApiRes[]>([]);
  const [rooms,        setRooms]        = useState<ApiRoom[]>([]);
  const [tasks,        setTasks]        = useState<ApiTask[]>([]);
  const [orders,       setOrders]       = useState<ApiOrder[]>([]);
  const [forecast,     setForecast]     = useState<ForecastDay[]>([]);
  const [pricing,      setPricing]      = useState<PricingRec[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [range,        setRange]        = useState<Range>('6m');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get<ApiRes[]>('/api/reservations'),
      api.get<ApiRoom[]>('/api/rooms'),
      api.get<ApiTask[]>('/api/housekeeping'),
      api.get<ApiOrder[]>('/api/orders'),
      api.get<ForecastDay[]>('/api/intelligence/forecast').catch(() => [] as ForecastDay[]),
      api.get<PricingRec[]>('/api/intelligence/pricing').catch(() => [] as PricingRec[]),
    ])
      .then(([r, rm, t, o, f, p]) => {
        setReservations(r); setRooms(rm); setTasks(t);
        setOrders(o); setForecast(f); setPricing(p);
      })
      .catch((e) => setError(e?.message ?? 'Failed to load analytics data.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const cutoff     = startOf(range);
  const totalRooms = rooms.length;

  const filtered   = reservations.filter((r) =>
    r.status !== 'Cancelled' && pd(r.checkInDate) >= cutoff
  );
  const allInRange = reservations.filter((r) => pd(r.checkInDate) >= cutoff);

  // KPIs
  const totalRevenue    = filtered.reduce((s, r) => s + (r.totalAmount ?? 0), 0);
  const totalCommission = filtered.reduce((s, r) =>
    s + Math.round((r.totalAmount ?? 0) * (COMMISSIONS[r.channel] ?? 0)), 0
  );
  const netRevenue      = totalRevenue - totalCommission;
  const adr             = filtered.length ? totalRevenue / filtered.length : 0;
  const revpar          = totalRooms > 0 ? totalRevenue / totalRooms : 0;
  const cancelled       = allInRange.filter((r) => r.status === 'Cancelled').length;
  const cancellationRate = allInRange.length ? Math.round((cancelled / allInRange.length) * 100) : 0;
  const liveOccupancy   = totalRooms > 0
    ? Math.round((rooms.filter((r) => r.status === 'Occupied').length / totalRooms) * 100)
    : 0;
  const avgLos = filtered.length
    ? filtered.reduce((s, r) => s + Math.max(1, (pd(r.checkOutDate).getTime() - pd(r.checkInDate).getTime()) / 86400000), 0) / filtered.length
    : 0;
  const uniqueGuests = new Set(filtered.map((r) => r.guest?.id).filter(Boolean)).size;
  const orderRevenue = orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + (o.amount ?? 0), 0);

  // Monthly trend
  const monthsToShow = range === '6m' ? 6 : range === 'ytd' ? new Date().getMonth() + 1 : 12;
  const now = new Date();
  const trendData = Array.from({ length: monthsToShow }, (_, idx) => {
    const d  = new Date(now.getFullYear(), now.getMonth() - (monthsToShow - 1 - idx), 1);
    const y  = d.getFullYear();
    const m  = d.getMonth();
    const ms = new Date(y, m, 1);
    const me = new Date(y, m + 1, 1);

    const monthRes = reservations.filter((r) =>
      r.status !== 'Cancelled' && pd(r.checkInDate) >= ms && pd(r.checkInDate) < me
    );
    const revenue  = monthRes.reduce((s, r) => s + (r.totalAmount ?? 0), 0);
    const bookings = monthRes.length;
    const stayCount = reservations.filter((r) => {
      if (!['Checked-in','Checked-out','Confirmed'].includes(r.status)) return false;
      return pd(r.checkInDate) < me && pd(r.checkOutDate) > ms;
    }).length;
    const occupancy = totalRooms > 0 ? Math.min(Math.round((stayCount / totalRooms) * 100), 100) : 0;

    return { month: MONTH_LABELS[m], revenue, bookings, occupancy };
  });

  // Channel breakdown
  const channelMap: Record<string, { bookings: number; revenue: number }> = {};
  filtered.forEach((r) => {
    if (!channelMap[r.channel]) channelMap[r.channel] = { bookings: 0, revenue: 0 };
    channelMap[r.channel].bookings += 1;
    channelMap[r.channel].revenue  += r.totalAmount ?? 0;
  });
  const channelPerf = Object.entries(channelMap)
    .map(([name, { bookings, revenue }]) => ({
      name, bookings, revenue,
      commission: Math.round(revenue * (COMMISSIONS[name] ?? 0)),
      color: CHANNEL_COLORS[name] ?? '#94a3b8',
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Room type breakdown
  const roomTypeMap: Record<string, { bookings: number; revenue: number; nights: number }> = {};
  filtered.forEach((r) => {
    const rt = r.room?.roomType ?? 'Unknown';
    if (!roomTypeMap[rt]) roomTypeMap[rt] = { bookings: 0, revenue: 0, nights: 0 };
    roomTypeMap[rt].bookings += 1;
    roomTypeMap[rt].revenue  += r.totalAmount ?? 0;
    roomTypeMap[rt].nights   += Math.max(1, (pd(r.checkOutDate).getTime() - pd(r.checkInDate).getTime()) / 86400000);
  });
  const roomTypePerf = Object.entries(roomTypeMap)
    .map(([type, { bookings, revenue, nights }]) => ({
      type, bookings, revenue, nights: Math.round(nights),
      adr: bookings > 0 ? Math.round(revenue / bookings) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Donuts
  const statusData     = Object.entries(
    reservations.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {})
  ).map(([name, value]) => ({ name, value }));

  const roomStatusData = Object.entries(
    rooms.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {})
  ).map(([name, value]) => ({ name, value }));

  // Housekeeping
  const taskMap: Record<string, number> = {};
  tasks.forEach((t) => { taskMap[t.status] = (taskMap[t.status] ?? 0) + 1; });
  const taskData       = Object.entries(taskMap).map(([name, value]) => ({ name, value, fill: TASK_COLORS[name] ?? '#94a3b8' }));
  const resolvedTasks  = taskMap['Resolved'] ?? 0;
  const completionRate = tasks.length > 0 ? Math.round((resolvedTasks / tasks.length) * 100) : 0;

  // Orders
  const deptMap: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((o) => {
    if (!deptMap[o.department]) deptMap[o.department] = { count: 0, revenue: 0 };
    deptMap[o.department].count   += 1;
    deptMap[o.department].revenue += o.amount ?? 0;
  });
  const deptData = Object.entries(deptMap)
    .map(([name, { count, revenue }]) => ({ name, count, revenue, fill: DEPT_COLORS[name] ?? '#94a3b8' }))
    .sort((a, b) => b.revenue - a.revenue);

  // Top guests
  const guestSpend: Record<string, { name: string; bookings: number; revenue: number }> = {};
  filtered.forEach((r) => {
    if (!r.guest?.id) return;
    const k = r.guest.id;
    if (!guestSpend[k]) guestSpend[k] = { name: `${r.guest.firstName} ${r.guest.lastName}`, bookings: 0, revenue: 0 };
    guestSpend[k].bookings += 1;
    guestSpend[k].revenue  += r.totalAmount ?? 0;
  });
  const topGuests = Object.values(guestSpend).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  // Forecast (next 14 days)
  const forecastData = forecast.slice(0, 14).map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    rate: d.occupancyRate,
    isWeekend: d.isWeekend,
  }));

  function exportCSV() {
    const rows = [
      ['ID','Guest','Channel','Room Type','Amount','Status','Check-in','Check-out','LOS','Created'],
      ...reservations.map((r) => {
        const los = Math.max(1, (pd(r.checkOutDate).getTime() - pd(r.checkInDate).getTime()) / 86400000);
        return [
          r.id,
          r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : '',
          r.channel, r.room?.roomType ?? '', r.totalAmount, r.status,
          r.checkInDate?.slice(0, 10), r.checkOutDate?.slice(0, 10),
          los.toFixed(1), r.createdAt?.slice(0, 10),
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a   = document.createElement('a');
    a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Financial performance, occupancy, operations, and channel insights."
        actions={
          <>
            <select value={range} onChange={(e) => setRange(e.target.value as Range)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm">
              <option value="6m">Last 6 Months</option>
              <option value="12m">Last 12 Months</option>
              <option value="ytd">Year to Date</option>
            </select>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </>
        }
      />

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
      )}

      {/* ── 1. KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Revenue"      value={loading ? '—' : usd.format(totalRevenue)}            icon={Banknote}   color="emerald" />
        <StatsCard title="Net Revenue"        value={loading ? '—' : usd.format(netRevenue)}              icon={TrendingUp} color="emerald" />
        <StatsCard title="ADR"                value={loading ? '—' : usd.format(adr)}                     icon={Banknote}   color="amber"   />
        <StatsCard title="RevPAR"             value={loading ? '—' : usd.format(revpar)}                  icon={BarChart3}  color="purple"  />
        <StatsCard title="Occupancy (Live)"   value={loading ? '—' : `${liveOccupancy}%`}                 icon={BedDouble}  color="amber"   />
        <StatsCard title="Avg Stay"           value={loading ? '—' : `${avgLos.toFixed(1)} nts`}          icon={Clock}      color="purple"  />
        <StatsCard title="Unique Guests"      value={loading ? '—' : String(uniqueGuests)}                icon={Users}      color="emerald" />
        <StatsCard title="Cancellation Rate"  value={loading ? '—' : `${cancellationRate}%`}              icon={Percent}    color="red"     />
      </div>

      {/* ── 2. Revenue & Booking Trends ───────────────────────────────────── */}
      <div className="mb-6">
        <SectionTitle title="Revenue & Booking Trends" sub="Monthly breakdown for the selected period" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="luxury-panel p-6 rounded-2xl">
            <p className="text-sm font-semibold text-gray-700 mb-4">Revenue</p>
            <div className="h-52">
              {loading ? <Placeholder /> : (
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
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
                    <Tooltip contentStyle={TT} formatter={(v: number) => [usd.format(v), 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)"
                      dot={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="luxury-panel p-6 rounded-2xl">
            <p className="text-sm font-semibold text-gray-700 mb-4">Bookings & Occupancy</p>
            <div className="h-52">
              {loading ? <Placeholder /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} dy={8} />
                    <YAxis yAxisId="left"  axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={28} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `${v}%`} width={38} domain={[0, 100]} />
                    <Tooltip contentStyle={TT} />
                    <Bar yAxisId="left" dataKey="bookings" fill="#d97706" fillOpacity={0.85} radius={[3, 3, 0, 0]} name="Bookings" />
                    <Line yAxisId="right" type="monotone" dataKey="occupancy" stroke="#0f172a"
                      strokeWidth={2} dot={false} name="Occupancy %" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Channel Distribution ───────────────────────────────────────── */}
      <div className="mb-6">
        <SectionTitle title="Booking Distribution" sub="Channels, status mix, and room inventory" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="luxury-panel p-6 rounded-2xl lg:col-span-2">
            <p className="text-sm font-semibold text-gray-700 mb-4">Revenue by Channel</p>
            <div className="h-52">
              {loading ? <Placeholder /> : channelPerf.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelPerf} layout="vertical" margin={{ top: 0, right: 80, bottom: 0, left: 0 }}>
                    <XAxis type="number" axisLine={false} tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }} width={82} />
                    <Tooltip contentStyle={TT} formatter={(v: number) => [usd.format(v), 'Revenue']} />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}
                      label={{ position: 'right', fontSize: 11, fill: '#9ca3af', formatter: (v: number) => usd.format(v) }}>
                      {channelPerf.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="luxury-panel p-5 rounded-2xl">
              <p className="text-sm font-semibold text-gray-700 mb-3">Booking Status</p>
              <div className="h-40">
                {loading ? <Placeholder /> : statusData.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="44%" innerRadius={44} outerRadius={58} paddingAngle={3} dataKey="value">
                        {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />)}
                      </Pie>
                      <Tooltip contentStyle={TT} />
                      <Legend verticalAlign="bottom" height={26} iconType="circle" iconSize={7}
                        formatter={(v) => <span style={{ fontSize: 10, color: '#6b7280' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="luxury-panel p-5 rounded-2xl">
              <p className="text-sm font-semibold text-gray-700 mb-3">Live Room Status</p>
              <div className="h-40">
                {loading ? <Placeholder /> : roomStatusData.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roomStatusData} cx="50%" cy="44%" innerRadius={44} outerRadius={58} paddingAngle={3} dataKey="value">
                        {roomStatusData.map((entry, i) => <Cell key={i} fill={ROOM_STATUS_COLORS[entry.name] ?? '#94a3b8'} />)}
                      </Pie>
                      <Tooltip contentStyle={TT} />
                      <Legend verticalAlign="bottom" height={26} iconType="circle" iconSize={7}
                        formatter={(v) => <span style={{ fontSize: 10, color: '#6b7280' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Forecast + Housekeeping + Orders ──────────────────────────── */}
      <div className="mb-6">
        <SectionTitle title="Operations & Forecast" sub="14-day occupancy outlook, housekeeping tasks, and F&B orders" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          <div className="luxury-panel p-6 rounded-2xl lg:col-span-2">
            <p className="text-sm font-semibold text-gray-700 mb-4">14-Day Occupancy Forecast</p>
            <div className="h-52">
              {loading ? <Placeholder /> : forecastData.length === 0
                ? <Empty text="Forecast unavailable" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="fcastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#d97706" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 10 }} dy={8} interval={1} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`} width={38} domain={[0, 100]} />
                    <Tooltip contentStyle={TT} formatter={(v: number) => [`${v}%`, 'Forecast Occupancy']} />
                    <Area type="monotone" dataKey="rate" stroke="#d97706" strokeWidth={2}
                      fill="url(#fcastGrad)" dot={false}
                      activeDot={{ r: 4, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="luxury-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-700">Housekeeping</p>
              <span className="text-xs font-semibold text-emerald-600">{completionRate}% done</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">{tasks.length} total tasks</p>
            <div className="h-32">
              {loading ? <Placeholder /> : taskData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={24} />
                    <Tooltip contentStyle={TT} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Tasks">
                      {taskData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-3 space-y-1.5 pt-3 border-t border-gray-100">
              {taskData.map((t) => (
                <div key={t.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <span className="w-2 h-2 rounded-full" style={{ background: t.fill }} />
                    {t.name}
                  </span>
                  <span className="font-semibold text-gray-900">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Orders row */}
        {deptData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="luxury-panel p-6 rounded-2xl lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-700">Orders by Department</p>
                <span className="text-xs font-semibold text-gray-400">{usd.format(orderRevenue)} total</span>
              </div>
              <div className="space-y-4">
                {deptData.map((d) => {
                  const pct = orderRevenue > 0 ? Math.round((d.revenue / orderRevenue) * 100) : 0;
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-gray-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                          {d.name}
                        </span>
                        <span className="text-gray-400">{d.count} orders · {usd.format(d.revenue)} · {pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: d.fill }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="luxury-panel p-6 rounded-2xl">
              <p className="text-sm font-semibold text-gray-700 mb-4">Order Mix</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deptData} cx="50%" cy="42%" innerRadius={46} outerRadius={62} paddingAngle={3} dataKey="count">
                      {deptData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={TT} />
                    <Legend verticalAlign="bottom" height={28} iconType="circle" iconSize={7}
                      formatter={(v) => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Pricing Intelligence ───────────────────────────────────────── */}
      {pricing.length > 0 && (
        <div className="mb-6">
          <SectionTitle title="Dynamic Pricing Recommendations" sub="AI-powered rate suggestions based on current demand signals" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pricing.map((p) => {
              const sc =
                p.signal === 'surge'    ? 'text-red-600    bg-red-50    border-red-200'    :
                p.signal === 'high'     ? 'text-amber-700  bg-amber-50  border-amber-200'  :
                p.signal === 'discount' ? 'text-purple-700 bg-purple-50 border-purple-200' :
                p.signal === 'low'      ? 'text-blue-700   bg-blue-50   border-blue-200'   :
                'text-gray-600 bg-gray-50 border-gray-200';
              return (
                <div key={p.type} className="luxury-panel rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-semibold text-gray-900 text-sm">{p.type}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${sc}`}>
                      {p.signal}
                    </span>
                  </div>
                  <div className="flex items-end gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">Recommended</p>
                      <p className="text-xl font-bold text-gray-900">{usd.format(p.recommended)}</p>
                    </div>
                    <div className="mb-0.5">
                      <p className="text-[10px] text-gray-400 mb-0.5">Base</p>
                      <p className="text-sm text-gray-400 line-through">{usd.format(p.baseRate)}</p>
                    </div>
                    <span className={`mb-0.5 text-sm font-semibold ${p.change > 0 ? 'text-emerald-600' : p.change < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {p.change > 0 ? '+' : ''}{p.change}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${p.occupancy7d}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{p.occupancy7d}% occ. 7d</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">{p.rationale}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 6. Tables ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Channel performance */}
        <div className="luxury-panel rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Channel Performance</p>
            <span className="text-xs text-gray-400">{filtered.length} bookings in period</span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Channel</th>
                <th className="px-5 py-3 text-right font-medium">Bkgs</th>
                <th className="px-5 py-3 text-right font-medium">Gross</th>
                <th className="px-5 py-3 text-right font-medium">Comm.</th>
                <th className="px-5 py-3 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-6 text-gray-300 text-xs">Loading…</td></tr>
              ) : channelPerf.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-6 text-gray-300 text-xs">No data</td></tr>
              ) : channelPerf.map((ch) => (
                <tr key={ch.name} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ch.color }} />
                      <span className="font-medium text-gray-800">{ch.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-500">{ch.bookings}</td>
                  <td className="px-5 py-3.5 text-right text-gray-600">{usd.format(ch.revenue)}</td>
                  <td className="px-5 py-3.5 text-right text-red-400 text-xs">
                    {ch.commission > 0 ? usd.format(ch.commission) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                    {usd.format(ch.revenue - ch.commission)}
                  </td>
                </tr>
              ))}
            </tbody>
            {channelPerf.length > 0 && (
              <tfoot className="bg-gray-50/80 border-t border-gray-200">
                <tr>
                  <td className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Total</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-600">{filtered.length}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-600">{usd.format(totalRevenue)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-red-400">{usd.format(totalCommission)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">{usd.format(netRevenue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Top guests */}
        <div className="luxury-panel rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Top Guests by Revenue</p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Guest</th>
                <th className="px-5 py-3 text-right font-medium">Stays</th>
                <th className="px-5 py-3 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={3} className="px-5 py-6 text-gray-300 text-xs">Loading…</td></tr>
              ) : topGuests.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-6 text-gray-300 text-xs">No guest data</td></tr>
              ) : topGuests.map((g, i) => (
                <tr key={g.name} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-medium text-gray-800">{g.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-500">{g.bookings}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{usd.format(g.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Room type table */}
      {roomTypePerf.length > 0 && (
        <div className="luxury-panel rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Room Type Breakdown</p>
          </div>
          <div className="table-shell">
            <table className="table-premium text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 font-medium">Room Type</th>
                  <th className="px-5 py-3 font-medium text-right">Bookings</th>
                  <th className="px-5 py-3 font-medium text-right">Revenue</th>
                  <th className="px-5 py-3 font-medium text-right">ADR</th>
                  <th className="px-5 py-3 font-medium text-right">Total Nights</th>
                  <th className="px-5 py-3 font-medium text-right">Rev Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roomTypePerf.map((rt) => {
                  const share = totalRevenue > 0 ? Math.round((rt.revenue / totalRevenue) * 100) : 0;
                  return (
                    <tr key={rt.type} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-800">{rt.type}</td>
                      <td className="px-5 py-3.5 text-right text-gray-500">{rt.bookings}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">{usd.format(rt.revenue)}</td>
                      <td className="px-5 py-3.5 text-right text-gray-600">{usd.format(rt.adr)}</td>
                      <td className="px-5 py-3.5 text-right text-gray-500">{rt.nights}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
