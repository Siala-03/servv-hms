import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Search } from
'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
// Mock Data
const rooms = [
{
  number: '101',
  type: 'Standard',
  status: 'Clean',
  priority: 'Normal',
  assignee: 'Maria G.'
},
{
  number: '102',
  type: 'Standard',
  status: 'Clean',
  priority: 'Normal',
  assignee: 'Maria G.'
},
{
  number: '103',
  type: 'Double Twin',
  status: 'Cleaning',
  priority: 'High',
  assignee: 'Elena R.'
},
{
  number: '104',
  type: 'Double Twin',
  status: 'Maintenance',
  priority: 'Urgent',
  assignee: 'David C.'
},
{
  number: '201',
  type: 'Standard Queen',
  status: 'Dirty',
  priority: 'High',
  assignee: 'Unassigned'
},
{
  number: '202',
  type: 'Standard Queen',
  status: 'Clean',
  priority: 'Normal',
  assignee: 'Maria G.'
},
{
  number: '301',
  type: 'Deluxe King',
  status: 'Dirty',
  priority: 'Urgent',
  assignee: 'Elena R.'
},
{
  number: '302',
  type: 'Deluxe King',
  status: 'Cleaning',
  priority: 'Normal',
  assignee: 'Elena R.'
}];

const inventory = [
{
  item: 'Bath Towels',
  stock: 450,
  min: 200,
  status: 'Good'
},
{
  item: 'Hand Towels',
  stock: 120,
  min: 150,
  status: 'Low'
},
{
  item: 'Shampoo (Mini)',
  stock: 50,
  min: 100,
  status: 'Critical'
},
{
  item: 'Soap Bars',
  stock: 300,
  min: 100,
  status: 'Good'
}];

export function Housekeeping() {
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
        title="Housekeeping"
        subtitle="Manage room cleaning status, schedules, and inventory."
        actions={
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm">
            <Sparkles className="w-4 h-4" />
            Auto-Assign Tasks
          </button>
        } />
      

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Room Status Board */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-gray-900">Room Status</h3>
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>{' '}
                  Clean (4)
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>{' '}
                  Cleaning (2)
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div> Dirty
                  (2)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Room..."
                  className="w-24 pl-8 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                
              </div>
              <button className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 bg-white">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {rooms.map((room) =>
            <div
              key={room.number}
              className={`p-3 rounded-xl border ${room.status === 'Clean' ? 'bg-emerald-50 border-emerald-100' : room.status === 'Cleaning' ? 'bg-amber-50 border-amber-100' : room.status === 'Maintenance' ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-100'}`}>
              
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-lg text-gray-900">
                    {room.number}
                  </span>
                  {room.priority === 'Urgent' &&
                <AlertTriangle className="w-4 h-4 text-red-500" />
                }
                </div>
                <div className="text-xs text-gray-600 mb-2">{room.type}</div>
                <div className="flex justify-between items-center">
                  <StatusBadge status={room.status} />
                  <span className="text-xs font-medium text-gray-500">
                    {room.assignee}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Today's Stats */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              Today's Progress
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Rooms Cleaned</span>
                  <span className="font-medium text-gray-900">4 / 8</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{
                      width: '50%'
                    }}>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="text-xs text-amber-600 font-medium mb-1">
                    Avg Time
                  </div>
                  <div className="text-lg font-bold text-amber-900">24m</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-xs text-purple-600 font-medium mb-1">
                    Inspections
                  </div>
                  <div className="text-lg font-bold text-purple-900">3/4</div>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Alerts */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Inventory Alerts</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {inventory.map((item, idx) =>
              <div
                key={idx}
                className="p-4 flex items-center justify-between">
                
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.item}
                    </p>
                    <p className="text-xs text-gray-500">
                      Stock: {item.stock} (Min: {item.min})
                    </p>
                  </div>
                  {item.status === 'Critical' ?
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-md">
                      Critical
                    </span> :
                item.status === 'Low' ?
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-md">
                      Low
                    </span> :

                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-md">
                      Good
                    </span>
                }
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>);

}