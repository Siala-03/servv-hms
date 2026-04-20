import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Network,
  ConciergeBell,
  Users,
  UserCircle,
  UtensilsCrossed,
  Sparkles,
  BarChart3,
  LogOut } from
'lucide-react';
const navItems = [
{
  name: 'Dashboard',
  path: '/',
  icon: LayoutDashboard
},
{
  name: 'Reservations',
  path: '/reservations',
  icon: CalendarDays
},
{
  name: 'Channel Manager',
  path: '/channels',
  icon: Network
},
{
  name: 'Front Desk',
  path: '/front-desk',
  icon: ConciergeBell
},
{
  name: 'Guests',
  path: '/guests',
  icon: Users
},
{
  name: 'Staff',
  path: '/staff',
  icon: UserCircle
},
{
  name: 'Orders',
  path: '/orders',
  icon: UtensilsCrossed
},
{
  name: 'Housekeeping',
  path: '/housekeeping',
  icon: Sparkles
},
{
  name: 'Reports',
  path: '/reports',
  icon: BarChart3
}];

export function Sidebar() {
  return (
    <aside className="w-72 bg-slate-950/95 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800/80 shadow-[10px_0_35px_-28px_rgba(2,6,23,0.95)] backdrop-blur-xl">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_0%,rgba(245,158,11,0.20),transparent_38%)]" />

      <div className="relative p-6 pb-4 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-lg shadow-amber-900/45">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <div>
          <span className="text-white font-bold text-xl tracking-tight block">StaySync</span>
          <span className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Servv HMS</span>
        </div>
      </div>

      <nav className="relative flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-slate-800/90 text-white border border-amber-500/35 shadow-[0_10px_25px_-20px_rgba(245,158,11,0.95)]' : 'border border-transparent hover:bg-slate-800/55 hover:text-white hover:border-slate-700/80'}`
              }>

              <span className="w-8 h-8 rounded-lg bg-slate-900/70 border border-slate-700/70 flex items-center justify-center group-hover:border-slate-600 transition-colors">
                <Icon className="w-4.5 h-4.5" />
              </span>
              <span className="font-medium text-[13px] tracking-[0.01em]">{item.name}</span>
            </NavLink>);

        })}
      </nav>

      <div className="relative p-4 border-t border-slate-800/80">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900/55 border border-slate-800 hover:bg-slate-800/60 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold text-sm">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate tracking-[0.01em]">John Doe</p>
            <p className="text-xs text-slate-400 truncate">General Manager</p>
          </div>
          <LogOut className="w-4 h-4 text-slate-400 hover:text-white transition-colors" />
        </div>
      </div>
    </aside>);

}