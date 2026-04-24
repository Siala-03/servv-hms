import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BedDouble, Banknote, TrendingUp, Bell, CalendarCheck, Plus, UserPlus, ArrowRight, Hotel, TimerReset, CalendarClock, ShieldAlert, ActivitySquare, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { PageHeader } from '../components/PageHeader';
import { StatsCard } from '../components/StatsCard';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

const CHANNEL_COLORS: Record<string, string> = {
  'Booking.com': '#003580', 'Airbnb': '#FF5A5F', 'Direct': '#10b981',
  'Expedia': '#000080', 'Triply': '#8b5cf6', 'Agoda': '#f59e0b',
};

interface ApiRes {
  id: string; status: string; channel: string; checkInDate: string;
  checkOutDate: string; totalAmount: number; currency: string; createdAt: string;
  guest?: { firstName: string; lastName: string; email: string } | null;
  room?:  { roomNumber: string; roomType: string } | null;
}
interface ApiRoom { id: string; status: string; }
interface ApiTask { id: string; status: string; notes?: string; room?: { roomNumber: string } | null; createdAt: string; }
interface AnalyticsPayload {
  pickup: { last1: number; last3: number; last7: number; previous7: number; paceChangePct: number };
  cancellation: { last30Rate: number; upcomingAtRisk: number; upcomingTracked: number };
  netRevenue: { grossRevenue: number; commissionCost: number; netRevenue: number; otaSharePct: number };
  outOfOrder: {
    roomCount: number;
    estimatedDailyLoss: number;
    estimated7dLoss: number;
    avgUnavailableRate: number;
    byType: Array<{ roomType: string; count: number; estimatedDailyLoss: number; estimated7dLoss: number }>;
  };
  channels: Array<{ channel: string; bookings: number; revenue: number; netRevenue: number; commissionRate: number; commissionCost: number; adr: number; netAdr: number; cancellationRate: number; efficiencyScore: number }>;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

function isoToday() { return new Date().toISOString().split('T')[0]; }

function startOfDay(dateLike: string | Date) {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffDays(start: string | Date, end: string | Date) {
  const a = startOfDay(start).getTime();
  const b = startOfDay(end).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reservations, setReservations] = useState<ApiRes[]>([]);
  const [rooms,        setRooms]        = useState<ApiRoom[]>([]);
  const [tasks,        setTasks]        = useState<ApiTask[]>([]);
  const [analytics,    setAnalytics]    = useState<AnalyticsPayload | null>(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ApiRes[]>('/api/reservations'),
      api.get<ApiRoom[]>('/api/rooms'),
      api.get<ApiTask[]>('/api/housekeeping'),
      api.get<AnalyticsPayload>('/api/intelligence/analytics'),
    ]).then(([r, rm, t, analyticsData]) => {
      setReservations(r);
      setRooms(rm);
      setTasks(t);
      setAnalytics(analyticsData);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const today = isoToday();
  const checkedIn     = reservations.filter((r) => r.status === 'Checked-in');
  const arrivalsToday = reservations.filter((r) => r.status === 'Confirmed' && r.checkInDate?.startsWith(today));
  const departuresToday = reservations.filter((r) => r.status === 'Checked-in' && r.checkOutDate?.startsWith(today));
  const occupancy     = rooms.length ? Math.round((checkedIn.length / rooms.length) * 100) : 0;
  const todayRevenue  = checkedIn.reduce((s, r) => s + (r.totalAmount ?? 0), 0);
  const adr           = checkedIn.length ? todayRevenue / checkedIn.length : 0;
  const pendingCI     = arrivalsToday.length;

  const nonCancelled = reservations.filter((r) => !['Cancelled'].includes(String(r.status)));

  const avgLos = nonCancelled.length
    ? nonCancelled.reduce((sum, r) => sum + Math.max(1, diffDays(r.checkInDate, r.checkOutDate)), 0) / nonCancelled.length
    : 0;

  const avgLeadTime = nonCancelled.length
    ? nonCancelled.reduce((sum, r) => sum + diffDays(r.createdAt, r.checkInDate), 0) / nonCancelled.length
    : 0;

  // Approximate daily room revenue by spreading reservation total evenly across stay nights.
  const dailyRoomRevenue = (dayIso: string) => nonCancelled.reduce((sum, r) => {
    const nights = Math.max(1, diffDays(r.checkInDate, r.checkOutDate));
    const activeThatDay = r.checkInDate <= dayIso && r.checkOutDate > dayIso;
    return sum + (activeThatDay ? (Number(r.totalAmount ?? 0) / nights) : 0);
  }, 0);

  const todayRoomRevenue = dailyRoomRevenue(today);
  const revPar = rooms.length ? todayRoomRevenue / rooms.length : 0;

  const avgAdrForWindow = (offsetStart: number, days: number) => {
    let revenue = 0;
    let occupied = 0;
    for (let i = offsetStart; i < offsetStart + days; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      revenue += dailyRoomRevenue(iso);
      occupied += reservations.filter((r) => r.checkInDate <= iso && r.checkOutDate > iso && r.status !== 'Cancelled').length;
    }
    return occupied ? revenue / occupied : 0;
  };

  const adrLast7 = avgAdrForWindow(-6, 7);
  const adrPrev7 = avgAdrForWindow(-13, 7);
  const adrTrendPct = adrPrev7 > 0 ? ((adrLast7 - adrPrev7) / adrPrev7) * 100 : 0;

  const statusBuckets = ['Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance'];
  const inventoryBars = statusBuckets.map((status) => {
    const count = rooms.filter((r) => String(r.status) === status).length;
    const percent = rooms.length ? Math.round((count / rooms.length) * 100) : 0;
    return { status, count, percent };
  });
  const topChannel = analytics?.channels?.[0] ?? null;

  // 7-day occupancy chart
  const occupancyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    const iso = d.toISOString().split('T')[0];
    const occupied = reservations.filter((r) =>
      r.checkInDate <= iso && r.checkOutDate > iso &&
      ['Checked-in', 'Checked-out', 'Confirmed'].includes(r.status)
    ).length;
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      rate: rooms.length ? Math.round((occupied / rooms.length) * 100) : 0,
    };
  });

  // Channel pie
  const channelTotals: Record<string, number> = {};
  reservations.forEach((r) => { channelTotals[r.channel] = (channelTotals[r.channel] ?? 0) + (r.totalAmount ?? 0); });
  const total = Object.values(channelTotals).reduce((a, b) => a + b, 0);
  const channelData = Object.entries(channelTotals).map(([name, value]) => ({
    name, value: total ? Math.round((value / total) * 100) : 0,
    color: CHANNEL_COLORS[name] ?? '#94a3b8',
  })).filter((c) => c.value > 0);

  // Recent bookings
  const recentBookings = [...reservations]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 5);

  // Activity feed: recent tasks + today check-ins
  const activity = [
    ...checkedIn.filter((r) => r.checkInDate?.startsWith(today)).slice(0, 2).map((r) => ({
      id: r.id, type: 'check-in',
      message: `${r.guest?.firstName ?? 'Guest'} ${r.guest?.lastName ?? ''} checked into Room ${r.room?.roomNumber ?? '—'}`,
      time: 'Today',
    })),
    ...tasks.slice(0, 3).map((t) => ({
      id: t.id, type: 'request',
      message: `Housekeeping task — Room ${t.room?.roomNumber ?? '—'}${t.notes ? `: ${t.notes}` : ''}`,
      time: 'Recent',
    })),
    ...departuresToday.slice(0, 2).map((r) => ({
      id: `co-${r.id}`, type: 'check-out',
      message: `${r.guest?.firstName ?? 'Guest'} ${r.guest?.lastName ?? ''} checked out of Room ${r.room?.roomNumber ?? '—'}`,
      time: 'Today',
    })),
  ].slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.firstName ?? ''}. Here's what's happening today.`}
        actions={
          <>
            <button
              onClick={() => navigate('/front-desk')}
              className="focus-ring brand-btn flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm">
              <UserPlus className="w-4 h-4" /> Walk-in
            </button>
            <button
              onClick={() => navigate('/reservations?new=1')}
              className="focus-ring brand-btn flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm">
              <Plus className="w-4 h-4" /> New Booking
            </button>
          </>
        }
      />

      <section className="hero-banner p-6 sm:p-7 mb-8 text-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold mb-2">Today at a Glance</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] mb-2">{user?.hotelName ?? 'Your hotel'} — live status</h2>
            <p className="text-sm text-slate-300 max-w-2xl">{loading ? 'Loading today\'s data…' : `${arrivalsToday.length} arrival${arrivalsToday.length !== 1 ? 's' : ''} expected today, ${departuresToday.length} departure${departuresToday.length !== 1 ? 's' : ''} scheduled.`}</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 min-w-[300px]">
            <div className="hero-chip rounded-xl px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Arrivals</p>
              <p className="text-lg font-semibold">{loading ? '—' : arrivalsToday.length}</p>
            </div>
            <div className="hero-chip rounded-xl px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Departures</p>
              <p className="text-lg font-semibold">{loading ? '—' : departuresToday.length}</p>
            </div>
            <div className="hero-chip rounded-xl px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Tasks</p>
              <p className="text-lg font-semibold">{loading ? '—' : tasks.filter((t) => t.status === 'Open').length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Occupancy Rate"       value={loading ? '—' : `${occupancy}%`}        icon={BedDouble}    color="amber" />
        <StatsCard title="Revenue (Checked-in)" value={loading ? '—' : usd.format(todayRevenue)} icon={Banknote}    color="emerald" />
        <StatsCard title="Average Daily Rate"   value={loading ? '—' : usd.format(adr)}          icon={TrendingUp}   color="purple" />
        <StatsCard title="Pending Check-ins"    value={loading ? '—' : String(pendingCI)}         icon={CalendarCheck} color="amber" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="RevPAR"
          value={loading ? '—' : usd2.format(revPar)}
          icon={Hotel}
          color="emerald"
        />
        <StatsCard
          title="ADR Trend (7d)"
          value={loading ? '—' : usd2.format(adrLast7)}
          icon={TrendingUp}
          color="purple"
          trend={loading ? undefined : Number(adrTrendPct.toFixed(1))}
          trendLabel="vs previous 7 days"
        />
        <StatsCard
          title="Average LOS"
          value={loading ? '—' : `${avgLos.toFixed(1)} nights`}
          icon={TimerReset}
          color="amber"
        />
        <StatsCard
          title="Lead Time"
          value={loading ? '—' : `${avgLeadTime.toFixed(1)} days`}
          icon={CalendarClock}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
        <StatsCard
          title="Pickup Pace (7d)"
          value={loading ? '—' : `${analytics?.pickup.last7 ?? 0} bookings`}
          icon={ActivitySquare}
          color="emerald"
          trend={loading ? undefined : analytics?.pickup.paceChangePct}
          trendLabel="vs previous 7 days"
        />
        <StatsCard
          title="Cancellation Risk"
          value={loading ? '—' : `${analytics?.cancellation.last30Rate ?? 0}%`}
          icon={ShieldAlert}
          color="red"
        />
        <StatsCard
          title="Net Revenue (30d)"
          value={loading ? '—' : usd.format(analytics?.netRevenue.netRevenue ?? 0)}
          icon={Banknote}
          color="emerald"
          trend={loading || !analytics?.netRevenue.grossRevenue ? undefined : Number((((analytics.netRevenue.netRevenue / analytics.netRevenue.grossRevenue) - 1) * 100).toFixed(1))}
          trendLabel={loading ? undefined : `${usd.format(analytics?.netRevenue.commissionCost ?? 0)} commissions`}
        />
        <StatsCard
          title="Out-of-Order Loss (7d)"
          value={loading ? '—' : usd.format(analytics?.outOfOrder.estimated7dLoss ?? 0)}
          icon={AlertTriangle}
          color="red"
          trend={loading ? undefined : -Math.max(0, analytics?.outOfOrder.roomCount ?? 0)}
          trendLabel={loading ? undefined : `${analytics?.outOfOrder.roomCount ?? 0} room(s) unavailable`}
        />
        <StatsCard
          title="Best Channel"
          value={loading ? '—' : (topChannel?.channel ?? '—')}
          icon={TrendingUp}
          color="purple"
          trend={loading || !topChannel ? undefined : topChannel.efficiencyScore - 50}
          trendLabel={loading || !topChannel ? undefined : `ADR ${usd.format(topChannel.adr)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="luxury-panel luxury-panel-spotlight p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Booking Pace</h3>
            <span className="text-xs uppercase tracking-wide text-slate-500">Recent pickup</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: '24h', value: analytics?.pickup.last1 ?? 0 },
              { label: '3 days', value: analytics?.pickup.last3 ?? 0 },
              { label: '7 days', value: analytics?.pickup.last7 ?? 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{loading ? '—' : item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            {loading
              ? 'Loading booking pace…'
              : `Pickup is ${analytics?.pickup.paceChangePct ?? 0}% ${Number(analytics?.pickup.paceChangePct ?? 0) >= 0 ? 'ahead of' : 'behind'} the previous 7-day window.`}
          </p>
        </div>

        <div className="luxury-panel luxury-panel-spotlight p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Net Revenue Snapshot</h3>
            <span className="text-xs uppercase tracking-wide text-slate-500">Estimated after OTA commissions</span>
          </div>
          {loading || !analytics ? (
            <p className="text-sm text-slate-400">Loading revenue analytics…</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Gross</p>
                  <p className="text-xl font-semibold text-slate-900 mt-1">{usd.format(analytics.netRevenue.grossRevenue)}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-red-600">Commission</p>
                  <p className="text-xl font-semibold text-red-700 mt-1">{usd.format(analytics.netRevenue.commissionCost)}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-600">Net</p>
                  <p className="text-xl font-semibold text-emerald-700 mt-1">{usd.format(analytics.netRevenue.netRevenue)}</p>
                </div>
              </div>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{topChannel?.channel ?? '—'}</p>
                  <p className="text-sm text-slate-500 mt-1">Top channel by current efficiency</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-slate-900">{analytics.netRevenue.otaSharePct}%</p>
                  <p className="text-xs text-slate-500">OTA revenue share</p>
                </div>
              </div>
              {topChannel && (
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between"><span>Gross Revenue</span><span className="font-medium text-slate-900">{usd.format(topChannel.revenue)}</span></div>
                  <div className="flex justify-between"><span>Commission Cost</span><span className="font-medium text-slate-900">{usd.format(topChannel.commissionCost)}</span></div>
                  <div className="flex justify-between"><span>Net ADR</span><span className="font-medium text-slate-900">{usd.format(topChannel.netAdr)}</span></div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="luxury-panel luxury-panel-spotlight p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Out-of-Order Impact</h3>
            <span className="text-xs uppercase tracking-wide text-slate-500">Lost inventory revenue</span>
          </div>
          {loading || !analytics ? (
            <p className="text-sm text-slate-400">Loading out-of-order analytics…</p>
          ) : analytics.outOfOrder.roomCount === 0 ? (
            <p className="text-sm text-emerald-600 font-medium">No out-of-order rooms currently impacting revenue.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Rooms</p>
                  <p className="text-xl font-semibold text-slate-900 mt-1">{analytics.outOfOrder.roomCount}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-red-600">Daily Loss</p>
                  <p className="text-xl font-semibold text-red-700 mt-1">{usd.format(analytics.outOfOrder.estimatedDailyLoss)}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-red-600">7d Loss</p>
                  <p className="text-xl font-semibold text-red-700 mt-1">{usd.format(analytics.outOfOrder.estimated7dLoss)}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                {analytics.outOfOrder.byType.slice(0, 3).map((item) => (
                  <div key={item.roomType} className="flex justify-between">
                    <span>{item.roomType} ({item.count})</span>
                    <span className="font-medium text-slate-900">{usd.format(item.estimatedDailyLoss)}/day</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="luxury-panel luxury-panel-spotlight p-6 rounded-2xl mb-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-900">Inventory Mix</h3>
          <p className="text-xs uppercase tracking-wide text-slate-500">Live room status bars</p>
        </div>

        <div className="space-y-3">
          {inventoryBars.map((bar) => (
            <div key={bar.status}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">{bar.status}</span>
                <span className="text-slate-500">{bar.count} rooms ({bar.percent}%)</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    bar.status === 'Occupied' ? 'bg-emerald-500' :
                    bar.status === 'Available' ? 'bg-blue-500' :
                    bar.status === 'Reserved' ? 'bg-amber-500' :
                    bar.status === 'Cleaning' ? 'bg-violet-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${bar.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="luxury-panel luxury-panel-spotlight p-6 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Occupancy Trend (7 days)</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={occupancyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => [`${v}%`, 'Occupancy']} />
                <Area type="monotone" dataKey="rate" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="#f1f5f9" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="luxury-panel luxury-panel-spotlight p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Revenue by Channel</h3>
          {channelData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No revenue data yet</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {channelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="luxury-panel luxury-panel-spotlight rounded-2xl lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-slate-200/80 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Recent Bookings</h3>
            <button onClick={() => navigate('/reservations')} className="text-sm text-slate-600 font-medium hover:text-slate-900 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="table-shell">
            <table className="table-premium text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/90">
                <tr>
                  <th className="px-6 py-3 font-medium">Guest</th>
                  <th className="px-6 py-3 font-medium">Room</th>
                  <th className="px-6 py-3 font-medium">Check-in</th>
                  <th className="px-6 py-3 font-medium">Channel</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-slate-400 text-sm">Loading…</td></tr>
                ) : recentBookings.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-slate-400 text-sm">No bookings yet.</td></tr>
                ) : recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{b.guest?.firstName} {b.guest?.lastName}</div>
                      <div className="text-xs text-gray-500">{b.id}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{b.room?.roomType} — {b.room?.roomNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(b.checkInDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-6 py-4 text-slate-600">{b.channel}</td>
                    <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="luxury-panel luxury-panel-spotlight rounded-2xl">
          <div className="p-6 border-b border-slate-200/80">
            <h3 className="text-lg font-semibold text-slate-900">Today's Activity</h3>
          </div>
          <div className="p-6">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet today.</p>
            ) : (
              <div className="space-y-6">
                {activity.map((a, i) => (
                  <div key={a.id} className="flex gap-4 relative">
                    {i !== activity.length - 1 && <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-slate-200" />}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${a.type === 'check-in' ? 'bg-emerald-100 text-emerald-600' : a.type === 'check-out' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-900">{a.message}</p>
                      <p className="text-xs text-slate-500 mt-1">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => navigate('/housekeeping')} className="focus-ring w-full mt-6 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
              View All Activity
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
