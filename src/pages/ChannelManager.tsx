import React from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Settings,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
  Globe } from
'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
const channels = [
{
  id: 'booking',
  name: 'Booking.com',
  status: 'Connected',
  lastSync: '2 mins ago',
  bookings: 142,
  commission: '15%',
  color: 'bg-[#003580]'
},
{
  id: 'airbnb',
  name: 'Airbnb',
  status: 'Connected',
  lastSync: '5 mins ago',
  bookings: 86,
  commission: '3%',
  color: 'bg-[#FF5A5F]'
},
{
  id: 'expedia',
  name: 'Expedia',
  status: 'Connected',
  lastSync: '12 mins ago',
  bookings: 45,
  commission: '18%',
  color: 'bg-[#000080]'
},
{
  id: 'triply',
  name: 'Triply',
  status: 'Syncing',
  lastSync: 'Syncing now...',
  bookings: 24,
  commission: '10%',
  color: 'bg-[#8b5cf6]'
},
{
  id: 'agoda',
  name: 'Agoda',
  status: 'Disconnected',
  lastSync: '2 days ago',
  bookings: 0,
  commission: '15%',
  color: 'bg-[#f59e0b]'
}];

const rateData = [
{
  room: 'Standard Queen',
  baseRate: '$150',
  booking: '$165',
  airbnb: '$160',
  expedia: '$165',
  direct: '$140'
},
{
  room: 'Deluxe King',
  baseRate: '$220',
  booking: '$240',
  airbnb: '$235',
  expedia: '$240',
  direct: '$200'
},
{
  room: 'Executive Suite',
  baseRate: '$450',
  booking: '$495',
  airbnb: '$480',
  expedia: '$495',
  direct: '$420'
},
{
  room: 'Presidential Suite',
  baseRate: '$800',
  booking: '$880',
  airbnb: '$850',
  expedia: '$880',
  direct: '$750'
}];

export function ChannelManager() {
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
        title="Channel Manager"
        subtitle="Manage OTA connections, sync rates, and prevent overbooking."
        actions={
        <>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm">
              <RefreshCw className="w-4 h-4" />
              Sync All Channels
            </button>
          </>
        } />
      

      {/* Alert Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-amber-800">
            Agoda connection requires attention
          </h4>
          <p className="text-sm text-amber-700 mt-1">
            The connection to Agoda was lost 2 days ago. Please re-authenticate
            to resume syncing rates and availability.
          </p>
          <button className="mt-2 text-sm font-medium text-amber-800 hover:text-amber-900 underline">
            Reconnect Agoda
          </button>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Connected Platforms
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {channels.map((channel) =>
        <div
          key={channel.id}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
          
            <div className="flex items-center justify-between mb-4">
              <div
              className={`w-10 h-10 rounded-lg ${channel.color} flex items-center justify-center text-white font-bold text-xl shadow-sm`}>
              
                {channel.name.charAt(0)}
              </div>
              <StatusBadge status={channel.status} />
            </div>
            <h4 className="font-semibold text-gray-900">{channel.name}</h4>
            <div className="mt-4 space-y-2 flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last Sync</span>
                <span className="font-medium text-gray-900 flex items-center gap-1">
                  {channel.status === 'Syncing' &&
                <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                }
                  {channel.lastSync}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Active Bookings</span>
                <span className="font-medium text-gray-900">
                  {channel.bookings}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Commission</span>
                <span className="font-medium text-gray-900">
                  {channel.commission}
                </span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700">
                  Enable Sync
                </span>
                <div
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${channel.status === 'Disconnected' ? 'bg-gray-200' : 'bg-amber-600'}`}>
                
                  <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${channel.status === 'Disconnected' ? 'translate-x-1' : 'translate-x-4'}`} />
                
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rate Management */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Rate Management
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Manage base rates and channel-specific markups.
              </p>
            </div>
            <button className="text-sm font-medium text-amber-600 hover:text-amber-700">
              Bulk Update
            </button>
          </div>
          <div className="table-shell">
            <table className="table-premium text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Room Type</th>
                  <th className="px-6 py-4 font-medium">Base Rate</th>
                  <th className="px-6 py-4 font-medium">Direct</th>
                  <th className="px-6 py-4 font-medium">Booking.com</th>
                  <th className="px-6 py-4 font-medium">Airbnb</th>
                  <th className="px-6 py-4 font-medium">Expedia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rateData.map((rate, idx) =>
                <tr
                  key={idx}
                  className="hover:bg-gray-50/50 transition-colors">
                  
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {rate.room}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {rate.baseRate}
                    </td>
                    <td className="px-6 py-4 text-emerald-600 font-medium">
                      {rate.direct}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{rate.booking}</td>
                    <td className="px-6 py-4 text-gray-600">{rate.airbnb}</td>
                    <td className="px-6 py-4 text-gray-600">{rate.expedia}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sync Log */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Sync Logs
            </h3>
          </div>
          <div className="p-0">
            <div className="divide-y divide-gray-100">
              {[
              {
                platform: 'Booking.com',
                action: 'Rates updated',
                time: '2 mins ago',
                status: 'success'
              },
              {
                platform: 'Airbnb',
                action: 'Availability synced',
                time: '5 mins ago',
                status: 'success'
              },
              {
                platform: 'Expedia',
                action: 'New booking received',
                time: '12 mins ago',
                status: 'success'
              },
              {
                platform: 'Agoda',
                action: 'Connection failed',
                time: '2 hours ago',
                status: 'error'
              },
              {
                platform: 'All Channels',
                action: 'Bulk rate update',
                time: '5 hours ago',
                status: 'success'
              }].
              map((log, idx) =>
              <div
                key={idx}
                className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                
                  {log.status === 'success' ?
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> :

                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                }
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {log.platform}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{log.action}</p>
                  </div>
                  <span className="text-xs text-gray-400 ml-auto">
                    {log.time}
                  </span>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button className="w-full py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                View Full Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>);

}