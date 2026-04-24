import React from 'react';

type StatusType =
  | 'Confirmed' | 'Pending' | 'Cancelled' | 'Checked-in' | 'Checked-out'
  | 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance' | 'Reserved'
  | 'Open' | 'In Progress' | 'Resolved' | 'New' | 'Preparing' | 'Delivered'
  | 'Urgent' | 'High' | 'Normal' | 'Low' | 'Connected' | 'Disconnected' | 'Syncing';

interface StatusBadgeProps {
  status: StatusType | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let colorClass = 'bg-zinc-100 text-zinc-600 border-zinc-200';

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
      colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'checked-in':
    case 'occupied':
    case 'new':
    case 'open':
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'reserved':
    case 'high':
      colorClass = 'bg-violet-50 text-violet-700 border-violet-200';
      break;
    case 'checked-out':
    case 'normal':
    case 'low':
      colorClass = 'bg-zinc-100 text-zinc-600 border-zinc-200';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium tracking-[0.03em] uppercase border ${colorClass}`}
    >
      {status}
    </span>
  );
}
