import React from 'react';
import { motion } from 'framer-motion';
import {
  Key,
  LogOut,
  UserPlus,
  Search,
  Filter,
  MoreHorizontal } from
'lucide-react';
import { PageHeader } from '../components/PageHeader';
// Mock Data
const floors = [
{
  level: 1,
  rooms: [
  {
    number: '101',
    type: 'Standard',
    status: 'Occupied',
    guest: 'John Smith',
    outToday: false
  },
  {
    number: '102',
    type: 'Standard',
    status: 'Available',
    guest: null,
    outToday: false
  },
  {
    number: '103',
    type: 'Double Twin',
    status: 'Cleaning',
    guest: null,
    outToday: false
  },
  {
    number: '104',
    type: 'Double Twin',
    status: 'Maintenance',
    guest: null,
    outToday: false
  },
  {
    number: '105',
    type: 'Standard',
    status: 'Reserved',
    guest: 'Alice Brown',
    outToday: false
  }]

},
{
  level: 2,
  rooms: [
  {
    number: '201',
    type: 'Standard Queen',
    status: 'Occupied',
    guest: 'Mike Johnson',
    outToday: true
  },
  {
    number: '202',
    type: 'Standard Queen',
    status: 'Occupied',
    guest: 'Sarah Davis',
    outToday: false
  },
  {
    number: '203',
    type: 'Standard Queen',
    status: 'Available',
    guest: null,
    outToday: false
  },
  {
    number: '204',
    type: 'Deluxe King',
    status: 'Available',
    guest: null,
    outToday: false
  },
  {
    number: '205',
    type: 'Deluxe King',
    status: 'Reserved',
    guest: 'Tom Wilson',
    outToday: false
  }]

},
{
  level: 3,
  rooms: [
  {
    number: '301',
    type: 'Deluxe King',
    status: 'Occupied',
    guest: 'Emma White',
    outToday: true
  },
  {
    number: '302',
    type: 'Deluxe King',
    status: 'Cleaning',
    guest: null,
    outToday: false
  },
  {
    number: '303',
    type: 'Executive Suite',
    status: 'Occupied',
    guest: 'James Bond',
    outToday: false
  },
  {
    number: '304',
    type: 'Executive Suite',
    status: 'Available',
    guest: null,
    outToday: false
  },
  {
    number: '305',
    type: 'Presidential',
    status: 'Reserved',
    guest: 'Bruce Wayne',
    outToday: false
  }]

}];

const arrivals = [
{
  id: 'BK-1050',
  name: 'Alice Brown',
  room: '105',
  type: 'Standard',
  time: '14:00',
  status: 'Pending'
},
{
  id: 'BK-1051',
  name: 'Tom Wilson',
  room: '205',
  type: 'Deluxe King',
  time: '15:30',
  status: 'Pending'
},
{
  id: 'BK-1052',
  name: 'Bruce Wayne',
  room: '305',
  type: 'Presidential',
  time: '18:00',
  status: 'Pending'
}];

const departures = [
{
  id: 'BK-1030',
  name: 'Mike Johnson',
  room: '201',
  time: '11:00',
  status: 'Pending'
},
{
  id: 'BK-1035',
  name: 'Emma White',
  room: '301',
  time: '10:30',
  status: 'Checked-out'
}];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Available':
      return 'bg-emerald-100 border-emerald-200 text-emerald-800';
    case 'Occupied':
      return 'bg-amber-100 border-amber-200 text-amber-800';
    case 'Cleaning':
      return 'bg-amber-100 border-amber-200 text-amber-800';
    case 'Maintenance':
      return 'bg-red-100 border-red-200 text-red-800';
    case 'Reserved':
      return 'bg-purple-100 border-purple-200 text-purple-800';
    default:
      return 'bg-gray-100 border-gray-200 text-gray-800';
  }
};
export function FrontDesk() {
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
        title="Front Desk"
        subtitle="Manage daily operations, room status, and guest check-ins."
        actions={
        <>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm">
              <UserPlus className="w-4 h-4" />
              Walk-in
            </button>
          </>
        } />
      

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Room Grid */}
        <div className="xl:col-span-2 space-y-6">
          {/* Controls & Legend */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>{' '}
                Available
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>{' '}
                Occupied
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-purple-400"></div>{' '}
                Reserved
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>{' '}
                Cleaning
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>{' '}
                Maintenance
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search room..."
                  className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                
              </div>
              <button className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Floors */}
          {floors.map((floor) =>
          <div
            key={floor.level}
            className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Floor {floor.level}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {floor.rooms.map((room) =>
              <div
                key={room.number}
                className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${getStatusColor(room.status)}`}>
                
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-lg">{room.number}</span>
                      <button className="text-current opacity-50 hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs font-medium opacity-80 mb-1">
                      {room.type}
                    </div>
                    <div className="text-sm font-semibold truncate h-5">
                      {room.guest || room.status}
                    </div>
                    {room.outToday &&
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        OUT
                      </div>
                }
                  </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Arrivals & Departures */}
        <div className="space-y-6">
          {/* Arrivals */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                Today's Arrivals
              </h3>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                {arrivals.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {arrivals.map((guest) =>
              <div
                key={guest.id}
                className="p-4 hover:bg-gray-50 transition-colors">
                
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-900">
                      {guest.name}
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      {guest.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      Room {guest.room} • {guest.type}
                    </span>
                    <button className="text-amber-600 font-medium hover:text-amber-700 text-xs bg-amber-50 px-2 py-1 rounded">
                      Check-in
                    </button>
                  </div>
                </div>
              )}
              {arrivals.length === 0 &&
              <div className="p-8 text-center text-gray-500 text-sm">
                  No more arrivals today.
                </div>
              }
            </div>
          </div>

          {/* Departures */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <LogOut className="w-4 h-4 text-amber-600" />
                Today's Departures
              </h3>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                {departures.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {departures.map((guest) =>
              <div
                key={guest.id}
                className="p-4 hover:bg-gray-50 transition-colors">
                
                  <div className="flex justify-between items-start mb-1">
                    <span
                    className={`font-semibold ${guest.status === 'Checked-out' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    
                      {guest.name}
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      {guest.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Room {guest.room}</span>
                    {guest.status === 'Pending' ?
                  <button className="text-amber-600 font-medium hover:text-amber-700 text-xs bg-amber-50 px-2 py-1 rounded">
                        Check-out
                      </button> :

                  <span className="text-xs text-gray-400 font-medium">
                        Checked out
                      </span>
                  }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>);

}