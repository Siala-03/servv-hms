import React from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, DollarSign, Users, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line } from
'recharts';
import { PageHeader } from '../components/PageHeader';
import { StatsCard } from '../components/StatsCard';
// Mock Data
const revenueData = [
{
  month: 'Jan',
  revenue: 45000
},
{
  month: 'Feb',
  revenue: 52000
},
{
  month: 'Mar',
  revenue: 48000
},
{
  month: 'Apr',
  revenue: 61000
},
{
  month: 'May',
  revenue: 59000
},
{
  month: 'Jun',
  revenue: 75000
}];

const channelPerformance = [
{
  name: 'Booking.com',
  bookings: 145,
  revenue: '$42,500',
  commission: '$6,375'
},
{
  name: 'Direct',
  bookings: 86,
  revenue: '$28,400',
  commission: '$0'
},
{
  name: 'Airbnb',
  bookings: 64,
  revenue: '$18,200',
  commission: '$546'
},
{
  name: 'Expedia',
  bookings: 42,
  revenue: '$12,600',
  commission: '$2,268'
}];

export function Reports() {
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
        title="Reports & Analytics"
        subtitle="Financial performance, occupancy trends, and channel insights."
        actions={
        <>
            <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm">
              <option>Last 6 Months</option>
              <option>This Year</option>
              <option>Last Year</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm">
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </>
        } />
      

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Revenue"
          value="$300,600"
          icon={DollarSign}
          trend={15.3}
          color="emerald" />
        
        <StatsCard
          title="RevPAR"
          value="$142.50"
          icon={TrendingUp}
          trend={8.2}
          color="amber" />
        
        <StatsCard
          title="ADR"
          value="$185.00"
          icon={DollarSign}
          trend={4.1}
          color="purple" />
        
        <StatsCard
          title="Total Guests"
          value="1,248"
          icon={Users}
          trend={12.5}
          color="amber" />
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Revenue Trend
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={revenueData}
                margin={{
                  top: 5,
                  right: 20,
                  bottom: 5,
                  left: 0
                }}>
                
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f3f4f6" />
                
                <XAxis
                  dataKey="month"
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
                  tickFormatter={(val) => `$${val / 1000}k`} />
                
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  'Revenue']
                  } />
                
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: '#10b981',
                    strokeWidth: 2,
                    stroke: '#fff'
                  }}
                  activeDot={{
                    r: 6
                  }} />
                
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Performance Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Channel Performance
            </h3>
          </div>
          <div className="table-shell flex-1">
            <table className="table-premium text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-4 font-medium">Channel</th>
                  <th className="px-6 py-4 font-medium">Bookings</th>
                  <th className="px-6 py-4 font-medium">Gross Rev</th>
                  <th className="px-6 py-4 font-medium">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {channelPerformance.map((channel, idx) =>
                <tr
                  key={idx}
                  className="hover:bg-gray-50/50 transition-colors">
                  
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {channel.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {channel.bookings}
                    </td>
                    <td className="px-6 py-4 font-medium text-emerald-600">
                      {channel.revenue}
                    </td>
                    <td className="px-6 py-4 text-red-500">
                      {channel.commission}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>);

}