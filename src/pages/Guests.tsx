import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  MessageSquare,
  Star,
  Clock,
  AlertCircle,
  CheckCircle2 } from
'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
// Mock Data
const guests = [
{
  id: 'G-101',
  name: 'Eleanor Shellstrop',
  email: 'eleanor@example.com',
  phone: '+1 (555) 123-4567',
  stays: 4,
  vip: true,
  lastVisit: 'Oct 25, 2024'
},
{
  id: 'G-102',
  name: 'Chidi Anagonye',
  email: 'chidi@example.com',
  phone: '+1 (555) 234-5678',
  stays: 1,
  vip: false,
  lastVisit: 'Oct 25, 2024'
},
{
  id: 'G-103',
  name: 'Tahani Al-Jamil',
  email: 'tahani@example.com',
  phone: '+1 (555) 345-6789',
  stays: 12,
  vip: true,
  lastVisit: 'Sep 15, 2024'
},
{
  id: 'G-104',
  name: 'Jason Mendoza',
  email: 'jason@example.com',
  phone: '+1 (555) 456-7890',
  stays: 2,
  vip: false,
  lastVisit: 'Aug 10, 2024'
},
{
  id: 'G-105',
  name: 'Michael Realman',
  email: 'michael@example.com',
  phone: '+1 (555) 567-8901',
  stays: 8,
  vip: true,
  lastVisit: 'Oct 28, 2024'
}];

const guestRequests = [
{
  id: 'REQ-001',
  room: '304',
  guest: 'Eleanor Shellstrop',
  type: 'Housekeeping',
  desc: 'Extra towels and pillows please',
  priority: 'Normal',
  status: 'Open',
  time: '10 mins ago',
  assignee: 'Unassigned'
},
{
  id: 'REQ-002',
  room: '215',
  guest: 'Chidi Anagonye',
  type: 'Maintenance',
  desc: 'AC is making a weird noise',
  priority: 'High',
  status: 'In Progress',
  time: '45 mins ago',
  assignee: 'Bob (Maint)'
},
{
  id: 'REQ-003',
  room: '501',
  guest: 'Tahani Al-Jamil',
  type: 'Concierge',
  desc: 'Dinner reservations for 4 at Dorsia',
  priority: 'Normal',
  status: 'Resolved',
  time: '2 hours ago',
  assignee: 'Sarah (Concierge)'
},
{
  id: 'REQ-004',
  room: '112',
  guest: 'Jason Mendoza',
  type: 'Room Service',
  desc: 'Late night menu request',
  priority: 'Normal',
  status: 'Open',
  time: '5 mins ago',
  assignee: 'Unassigned'
}];

export function Guests() {
  const [activeTab, setActiveTab] = useState<'directory' | 'requests'>(
    'requests'
  );
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
        title="Guest Services"
        subtitle="Manage guest profiles, preferences, and active requests."
        actions={
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            
              Active Requests
            </button>
            <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'directory' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            
              Guest Directory
            </button>
          </div>
        } />
      

      {activeTab === 'requests' ?
      <div className="space-y-6">
          {/* Request Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Open</p>
                <p className="text-xl font-bold text-gray-900">12</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">In Progress</p>
                <p className="text-xl font-bold text-gray-900">5</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Resolved Today
                </p>
                <p className="text-xl font-bold text-gray-900">28</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Avg Resolution
                </p>
                <p className="text-xl font-bold text-gray-900">14m</p>
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option>All Types</option>
                  <option>Housekeeping</option>
                  <option>Maintenance</option>
                  <option>Concierge</option>
                  <option>Room Service</option>
                </select>
                <select className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option>All Statuses</option>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                </select>
              </div>
              <button className="text-sm font-medium text-amber-600 hover:text-amber-700">
                New Request
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {guestRequests.map((req) =>
            <div
              key={req.id}
              className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs text-gray-500 font-medium">
                        Room
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {req.room}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {req.type}
                        </span>
                        <StatusBadge status={req.priority} />
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{req.desc}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{req.guest}</span>
                        <span>•</span>
                        <span>{req.time}</span>
                        <span>•</span>
                        <span>Assignee: {req.assignee}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {req.status === 'Open' &&
                <button className="px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-sm font-medium transition-colors">
                        Assign
                      </button>
                }
                    {req.status === 'In Progress' &&
                <button className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors">
                        Resolve
                      </button>
                }
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
            )}
            </div>
          </div>
        </div> :

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
              type="text"
              placeholder="Search guests by name, email, phone..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
          <div className="table-shell">
            <table className="table-premium text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Guest</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium">Total Stays</th>
                  <th className="px-6 py-4 font-medium">Last Visit</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guests.map((guest) =>
              <tr
                key={guest.id}
                className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">
                          {guest.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {guest.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {guest.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{guest.email}</div>
                      <div className="text-xs text-gray-500">{guest.phone}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {guest.stays}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {guest.lastVisit}
                    </td>
                    <td className="px-6 py-4">
                      {guest.vip ?
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                          <Star className="w-3 h-3 fill-current" /> VIP
                        </span> :

                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          Standard
                        </span>
                  }
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-amber-600 hover:text-amber-800 font-medium text-sm">
                        View Profile
                      </button>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        </div>
      }
    </motion.div>);

}