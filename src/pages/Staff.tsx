import React from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MoreVertical } from
'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
// Mock Data
const staff = [
{
  id: 'S-001',
  name: 'Sarah Connor',
  role: 'Front Desk Manager',
  dept: 'Front Office',
  status: 'On Duty',
  shift: 'Morning (07:00 - 15:00)',
  phone: '555-0101'
},
{
  id: 'S-002',
  name: 'John Smith',
  role: 'Receptionist',
  dept: 'Front Office',
  status: 'On Duty',
  shift: 'Morning (07:00 - 15:00)',
  phone: '555-0102'
},
{
  id: 'S-003',
  name: 'Maria Garcia',
  role: 'Housekeeping Sup.',
  dept: 'Housekeeping',
  status: 'On Duty',
  shift: 'Morning (08:00 - 16:00)',
  phone: '555-0103'
},
{
  id: 'S-004',
  name: 'David Chen',
  role: 'Maintenance Tech',
  dept: 'Maintenance',
  status: 'Off Duty',
  shift: 'Afternoon (15:00 - 23:00)',
  phone: '555-0104'
},
{
  id: 'S-005',
  name: 'Lisa Wong',
  role: 'Concierge',
  dept: 'Guest Services',
  status: 'On Leave',
  shift: '-',
  phone: '555-0105'
},
{
  id: 'S-006',
  name: 'James Wilson',
  role: 'Night Auditor',
  dept: 'Front Office',
  status: 'Off Duty',
  shift: 'Night (23:00 - 07:00)',
  phone: '555-0106'
}];

const tasks = [
{
  id: 'T-101',
  title: 'Check pool chemical levels',
  assignee: 'David Chen',
  due: '14:00',
  status: 'To Do',
  priority: 'High'
},
{
  id: 'T-102',
  title: 'Prepare VIP welcome basket (Room 501)',
  assignee: 'Lisa Wong',
  due: '15:00',
  status: 'In Progress',
  priority: 'Normal'
},
{
  id: 'T-103',
  title: 'Audit yesterday receipts',
  assignee: 'Sarah Connor',
  due: '12:00',
  status: 'Done',
  priority: 'High'
}];

export function Staff() {
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
        title="Staff Management"
        subtitle="Manage employee directory, schedules, and task assignments."
        actions={
        <>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm">
              <Calendar className="w-4 h-4" />
              View Schedule
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm">
              <Plus className="w-4 h-4" />
              Add Staff
            </button>
          </>
        } />
      

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Staff Directory */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              
            </div>
            <div className="flex items-center gap-2">
              <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option>All Departments</option>
                <option>Front Office</option>
                <option>Housekeeping</option>
                <option>Maintenance</option>
              </select>
            </div>
          </div>
          <div className="table-shell">
            <table className="table-premium text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Employee</th>
                  <th className="px-6 py-4 font-medium">Role & Dept</th>
                  <th className="px-6 py-4 font-medium">Current Shift</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((person) =>
                <tr
                  key={person.id}
                  className="hover:bg-gray-50/50 transition-colors">
                  
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs">
                          {person.name.
                        split(' ').
                        map((n) => n[0]).
                        join('')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {person.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {person.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">
                        {person.role}
                      </div>
                      <div className="text-xs text-gray-500">{person.dept}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Clock className="w-3.5 h-3.5" />
                        {person.shift}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${person.status === 'On Duty' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : person.status === 'Off Duty' ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      
                        {person.status === 'On Duty' &&
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                      }
                        {person.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Task Board */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Today's Tasks</h3>
            <button className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
          <div className="p-4 flex-1 bg-gray-50/50">
            <div className="space-y-3">
              {tasks.map((task) =>
              <div
                key={task.id}
                className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                
                  <div className="flex justify-between items-start mb-2">
                    <StatusBadge status={task.status} />
                    <StatusBadge status={task.priority} />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {task.title}
                  </h4>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
                        {task.assignee.
                      split(' ').
                      map((n) => n[0]).
                      join('')}
                      </div>
                      {task.assignee}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {task.due}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>);

}