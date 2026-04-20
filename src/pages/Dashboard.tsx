import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  BedDouble,
  DollarSign,
  TrendingUp,
  Bell,
  CalendarCheck,
  Plus,
  UserPlus,
  ArrowRight } from
'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend } from
'recharts';
import { PageHeader } from '../components/PageHeader';
import { StatsCard } from '../components/StatsCard';
import { StatusBadge } from '../components/StatusBadge';
// Mock Data
const occupancyData = [
{
  day: 'Mon',
  rate: 65
},
{
  day: 'Tue',
  rate: 72
},
{
  day: 'Wed',
  rate: 68
},
{
  day: 'Thu',
  rate: 85
},
{
  day: 'Fri',
  rate: 94
},
{
  day: 'Sat',
  rate: 98
},
{
  day: 'Sun',
  rate: 82
}];

const channelData = [
{
  name: 'Booking.com',
  value: 45,
  color: '#003580'
},
{
  name: 'Airbnb',
  value: 25,
  color: '#FF5A5F'
},
{
  name: 'Direct',
  value: 15,
  color: '#10b981'
},
{
  name: 'Expedia',
  value: 10,
  color: '#000080'
},
{
  name: 'Triply',
  value: 5,
  color: '#8b5cf6'
}];

const recentBookings = [
{
  id: 'BK-2024-1042',
  guest: 'Eleanor Shellstrop',
  room: 'Deluxe King - 304',
  checkIn: 'Today',
  checkOut: 'Oct 28',
  status: 'Confirmed',
  channel: 'Booking.com'
},
{
  id: 'BK-2024-1043',
  guest: 'Chidi Anagonye',
  room: 'Standard Queen - 215',
  checkIn: 'Today',
  checkOut: 'Oct 26',
  status: 'Checked-in',
  channel: 'Direct'
},
{
  id: 'BK-2024-1044',
  guest: 'Tahani Al-Jamil',
  room: 'Presidential Suite - 501',
  checkIn: 'Tomorrow',
  checkOut: 'Nov 02',
  status: 'Pending',
  channel: 'Airbnb'
},
{
  id: 'BK-2024-1045',
  guest: 'Jason Mendoza',
  room: 'Double Twin - 112',
  checkIn: 'Oct 27',
  checkOut: 'Oct 30',
  status: 'Confirmed',
  channel: 'Expedia'
},
{
  id: 'BK-2024-1046',
  guest: 'Michael Realman',
  room: 'Executive Suite - 405',
  checkIn: 'Oct 28',
  checkOut: 'Nov 05',
  status: 'Confirmed',
  channel: 'Triply'
}];

const activityFeed = [
{
  id: 1,
  type: 'check-in',
  message: 'Chidi Anagonye checked into Room 215',
  time: '10 mins ago'
},
{
  id: 2,
  type: 'request',
  message: 'New housekeeping request for Room 304',
  time: '25 mins ago'
},
{
  id: 3,
  type: 'booking',
  message: 'New direct booking received for Nov 12-15',
  time: '1 hour ago'
},
{
  id: 4,
  type: 'check-out',
  message: 'Sarah Connor checked out of Room 412',
  time: '2 hours ago'
}];

export function Dashboard() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        duration: 0.4
      }}>
      
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back, John. Here's what's happening today."
        actions={
        <>
            <button className="focus-ring brand-btn flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm">
              <UserPlus className="w-4 h-4" />
              Walk-in
            </button>
            <button className="focus-ring brand-btn flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm shadow-amber-900/25">
              <Plus className="w-4 h-4" />
              New Booking
            </button>
          </>
        } />

      <section className="hero-banner p-6 sm:p-7 mb-8 text-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/90 font-semibold mb-2">Today at a Glance</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] mb-2">Paramount Hotel Kigali is running at peak rhythm.</h2>
            <p className="text-sm text-slate-300 max-w-2xl">Front desk, housekeeping, and bookings are synced. Focus your team on late arrivals and premium upsells in the next two hours.</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 min-w-[300px]">
            <div className="hero-chip rounded-xl px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-amber-100/85">Arrivals</p>
              <p className="text-lg font-semibold">14</p>
            </div>
            <div className="hero-chip rounded-xl px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-amber-100/85">Turnovers</p>
              <p className="text-lg font-semibold">9</p>
            </div>
            <div className="hero-chip rounded-xl px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-amber-100/85">Upsell</p>
              <p className="text-lg font-semibold">$1.2k</p>
            </div>
          </div>
        </div>
      </section>
      

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Occupancy Rate"
          value="82%"
          icon={BedDouble}
          trend={4.5}
          trendLabel="vs last week"
          color="amber" />
        
        <StatsCard
          title="Total Revenue (Today)"
          value="$12,450"
          icon={DollarSign}
          trend={12.2}
          trendLabel="vs yesterday"
          color="emerald" />
        
        <StatsCard
          title="Average Daily Rate"
          value="$185"
          icon={TrendingUp}
          trend={-2.1}
          trendLabel="vs last week"
          color="purple" />
        
        <StatsCard
          title="Pending Check-ins"
          value="14"
          icon={CalendarCheck}
          color="amber" />
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Occupancy Chart */}
        <div className="luxury-panel luxury-panel-spotlight p-6 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Occupancy Trend
            </h3>
            <select className="focus-ring text-sm border border-slate-200 rounded-lg text-slate-600 bg-white px-3 py-1.5">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={occupancyData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0
                }}>
                
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f3f4f6" />
                
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: '#6b7280',
                    fontSize: 12
                  }}
                  dy={10} />
                
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: '#6b7280',
                    fontSize: 12
                  }}
                  tickFormatter={(val) => `${val}%`} />
                
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => [`${value}%`, 'Occupancy']} />
                
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRate)" />
                
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Mix */}
        <div className="luxury-panel luxury-panel-spotlight p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Revenue by Channel
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value">
                  
                  {channelData.map((entry, index) =>
                  <Cell key={`cell-${index}`} fill={entry.color} />
                  )}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Share']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }} />
                
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings Table */}
        <div className="luxury-panel luxury-panel-spotlight rounded-2xl lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-slate-200/80 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Recent Bookings
            </h3>
            <button className="text-sm text-amber-600 font-medium hover:text-amber-700 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="table-shell">
            <table className="table-premium text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/90">
                <tr>
                  <th className="px-6 py-3 font-medium">Guest</th>
                  <th className="px-6 py-3 font-medium">Room</th>
                  <th className="px-6 py-3 font-medium">Dates</th>
                  <th className="px-6 py-3 font-medium">Channel</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {recentBookings.map((booking) =>
                <tr
                  key={booking.id}
                  className="hover:bg-slate-50/70 transition-colors">
                  
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {booking.guest}
                      </div>
                      <div className="text-xs text-gray-500">{booking.id}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{booking.room}</td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{booking.checkIn}</div>
                      <div className="text-xs text-gray-500">
                        to {booking.checkOut}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {booking.channel}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={booking.status} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="luxury-panel luxury-panel-spotlight rounded-2xl">
          <div className="p-6 border-b border-slate-200/80">
            <h3 className="text-lg font-semibold text-slate-900">
              Today's Activity
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {activityFeed.map((activity, index) =>
                <div key={activity.id} className="flex gap-4 relative">
                  {index !== activityFeed.length - 1 &&
                <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-slate-200"></div>
                }
                  <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${activity.type === 'check-in' ? 'bg-amber-100 text-amber-600' : activity.type === 'request' ? 'bg-amber-100 text-amber-600' : activity.type === 'booking' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                  
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900">{activity.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <button className="focus-ring w-full mt-6 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
              View All Activity
            </button>
          </div>
        </div>
      </div>
    </motion.div>);

}