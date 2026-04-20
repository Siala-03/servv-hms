import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Plus,
  Calendar as CalendarIcon,
  List,
  MoreVertical } from
'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import {
  listReservationChannels,
  listReservationItems,
  ReservationListItem,
  listReservationStatuses,
} from '../services/reservationsService';

export function Reservations() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('All Statuses');
  const [selectedChannel, setSelectedChannel] = useState<string>('All Channels');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const statuses = listReservationStatuses();

  useEffect(() => {
    let isMounted = true;

    async function loadChannels() {
      try {
        const data = await listReservationChannels();
        if (isMounted) {
          setChannels(data);
        }
      } catch {
        if (isMounted) {
          setChannels([]);
        }
      }
    }

    loadChannels();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadReservations() {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await listReservationItems({
          status: selectedStatus === 'All Statuses' ? undefined : selectedStatus,
          channel: selectedChannel === 'All Channels' ? undefined : selectedChannel,
        });

        if (isMounted) {
          setReservations(data);
        }
      } catch {
        if (isMounted) {
          setReservations([]);
          setLoadError('Unable to load reservations right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadReservations();

    return () => {
      isMounted = false;
    };
  }, [selectedStatus, selectedChannel]);
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
        title="Reservations"
        subtitle="Manage all your bookings across channels in one place."
        actions={
        <>
            <div className="flex bg-white rounded-lg border border-gray-200 p-1 mr-2">
              <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
              
                <List className="w-4 h-4" />
              </button>
              <button
              onClick={() => setView('calendar')}
              className={`p-1.5 rounded-md transition-colors ${view === 'calendar' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
              
                <CalendarIcon className="w-4 h-4" />
              </button>
            </div>
            <button className="focus-ring flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="focus-ring flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm shadow-amber-900/25">
              <Plus className="w-4 h-4" />
              New Booking
            </button>
          </>
        } />
      

      {/* Filters Bar */}
      <div className="luxury-panel p-4 rounded-2xl mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search guest name, booking ID..."
            className="focus-ring w-full pl-9 pr-4 py-2 bg-white/70 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white transition-colors" />
          
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="focus-ring px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700">
            <option>All Statuses</option>
            {statuses.map((status) =>
            <option key={status}>{status}</option>
            )}
          </select>
          <select
            value={selectedChannel}
            onChange={(event) => setSelectedChannel(event.target.value)}
            className="focus-ring px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700">
            <option>All Channels</option>
            {channels.map((channel) =>
            <option key={channel}>{channel}</option>
            )}
          </select>
          <button className="focus-ring flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {view === 'list' ?
      <div className="luxury-panel rounded-2xl overflow-hidden">
          {loadError &&
        <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">
              {loadError}
            </div>
        }
          <div className="table-shell">
            <table className="table-premium text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/90 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-4 font-medium">Booking ID</th>
                  <th className="px-6 py-4 font-medium">Guest</th>
                  <th className="px-6 py-4 font-medium">Room Details</th>
                  <th className="px-6 py-4 font-medium">Dates</th>
                  <th className="px-6 py-4 font-medium">Channel</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {isLoading ?
              <tr>
                    <td className="px-6 py-8 text-slate-500" colSpan={8}>
                      Loading reservations...
                    </td>
                  </tr> :
              reservations.length === 0 ?
              <tr>
                    <td className="px-6 py-8 text-slate-500" colSpan={8}>
                      No reservations found for the selected filters.
                    </td>
                  </tr> :
                reservations.map((booking) =>
              <tr
                key={booking.id}
                className="hover:bg-slate-50/70 transition-colors cursor-pointer">
                
                    <td className="px-6 py-4 font-medium text-amber-600">
                      <div className="table-truncate">{booking.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 table-truncate">
                        {booking.guest}
                      </div>
                      <div className="text-xs text-gray-500 table-truncate">
                        {booking.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 table-truncate">{booking.room}</div>
                      <div className="text-xs text-gray-500 table-truncate">
                        Room {booking.roomNo}
                      </div>
                    </td>
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
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {booking.amount}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
              )}
              
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-sm text-slate-500">
            <div>Showing 1 to {reservations.length} of {reservations.length} entries</div>
            <div className="flex gap-1">
              <button className="focus-ring px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50">
                Prev
              </button>
              <button className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-semibold">
                1
              </button>
              <button className="focus-ring px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50">
                2
              </button>
              <button className="focus-ring px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50">
                3
              </button>
              <button className="focus-ring px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50">
                Next
              </button>
            </div>
          </div>
        </div> :

      <div className="luxury-panel rounded-2xl p-8 flex flex-col items-center justify-center text-center h-96">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4 text-amber-600">
            <CalendarIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Calendar View
          </h3>
          <p className="text-gray-500 max-w-md">
            The interactive calendar view allows you to drag and drop bookings,
            see availability at a glance, and manage room assignments visually.
          </p>
          <button
          onClick={() => setView('list')}
          className="focus-ring mt-6 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium border border-slate-200">
          
            Switch back to List View
          </button>
        </div>
      }
    </motion.div>);

}