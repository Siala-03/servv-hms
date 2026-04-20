import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Network, ConciergeBell,
  Users, UserCircle, UtensilsCrossed, Sparkles, BarChart3,
  LogOut, ShieldCheck, UserCog, Brain,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS, UserRole, canAccess } from '../lib/rbac';
import { BrandLogo } from './BrandLogo';

const NAV_ITEMS = [
  { name: 'Dashboard',       path: '/dashboard',    icon: LayoutDashboard },
  { name: 'Reservations',    path: '/reservations', icon: CalendarDays    },
  { name: 'Channel Manager', path: '/channels',     icon: Network         },
  { name: 'Front Desk',      path: '/front-desk',   icon: ConciergeBell   },
  { name: 'Guests',          path: '/guests',       icon: Users           },
  { name: 'Orders',          path: '/orders',       icon: UtensilsCrossed },
  { name: 'Housekeeping',    path: '/housekeeping', icon: Sparkles        },
  { name: 'Staff',           path: '/staff',        icon: UserCircle      },
  { name: 'Reports',         path: '/reports',      icon: BarChart3       },
  { name: 'Intelligence',   path: '/intelligence', icon: Brain           },
  { name: 'User Accounts',   path: '/users',        icon: UserCog         },
  { name: 'Hotels',          path: '/superadmin',   icon: ShieldCheck     },
];

const ROLE_BADGE: Record<UserRole, string> = {
  superadmin:   'text-purple-400',
  manager:      'text-amber-400',
  front_desk:   'text-blue-400',
  housekeeping: 'text-emerald-400',
  fnb:          'text-orange-400',
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const visible = NAV_ITEMS.filter((item) => canAccess(user?.role, item.path));

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <aside className="w-72 bg-slate-950/95 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800/80 shadow-[10px_0_35px_-28px_rgba(2,6,23,0.95)] backdrop-blur-xl">
      <div className="absolute inset-0 pointer-events-none bg-amber-500/5" />

      <div className="relative p-6 pb-4 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-24 sm:w-28 shrink-0 flex items-center">
          <BrandLogo variant="light" className="h-7 sm:h-8" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-white font-bold text-base sm:text-lg tracking-tight block truncate leading-tight">
            {user?.hotelName ?? 'SERVV HMS'}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400 truncate block mt-0.5">Servv HMS</span>
        </div>
      </div>

      <nav className="relative flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-800/90 text-white border border-amber-500/35 shadow-[0_10px_25px_-20px_rgba(245,158,11,0.95)]'
                    : 'border border-transparent hover:bg-slate-800/55 hover:text-white hover:border-slate-700/80'
                }`
              }
            >
              <span className="w-8 h-8 rounded-lg bg-slate-900/70 border border-slate-700/70 flex items-center justify-center group-hover:border-slate-600 transition-colors">
                <Icon className="w-4 h-4" />
              </span>
              <span className="font-medium text-[13px] tracking-[0.01em]">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="relative p-4 border-t border-slate-800/80">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900/55 border border-slate-800">
          <div className="w-8 h-8 rounded-full bg-amber-700/80 flex items-center justify-center text-white font-semibold text-xs shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user ? `${user.firstName} ${user.lastName}` : '—'}
            </p>
            <p className={`text-xs truncate font-medium ${ROLE_BADGE[user?.role ?? 'manager']}`}>
              {user ? ROLE_LABELS[user.role] : ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="shrink-0 text-slate-400 hover:text-white transition-colors p-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
