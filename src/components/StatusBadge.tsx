import React from 'react';
type StatusType =
'Confirmed' |
'Pending' |
'Cancelled' |
'Checked-in' |
'Checked-out' |
'Available' |
'Occupied' |
'Cleaning' |
'Maintenance' |
'Reserved' |
'Open' |
'In Progress' |
'Resolved' |
'New' |
'Preparing' |
'Delivered' |
'Urgent' |
'High' |
'Normal' |
'Low' |
'Connected' |
'Disconnected' |
'Syncing';
interface StatusBadgeProps {
  status: StatusType | string;
}
export function StatusBadge({ status }: StatusBadgeProps) {
  let colorClass = 'bg-gray-100 text-gray-700 border-gray-200';
  switch (status.toLowerCase()) {
    case 'confirmed':
    case 'available':
    case 'resolved':
    case 'delivered':
    case 'connected':
    case 'clean':
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'pending':
    case 'cleaning':
    case 'in progress':
    case 'preparing':
    case 'syncing':
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'cancelled':
    case 'maintenance':
    case 'disconnected':
    case 'urgent':
    case 'dirty':
      colorClass = 'bg-red-50 text-red-700 border-red-200';
      break;
    case 'checked-in':
    case 'occupied':
    case 'new':
    case 'open':
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'reserved':
    case 'high':
      colorClass = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'checked-out':
    case 'normal':
    case 'low':
      colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
      break;
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-[0.03em] uppercase border shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] ${colorClass}`}>
      
      {status}
    </span>);

}