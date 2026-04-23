import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Network, ConciergeBell,
  Users, UserCircle, UtensilsCrossed, Sparkles, BarChart3, BedDouble,
  LogOut, ShieldCheck, UserCog, Brain, Menu, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS, UserRole, canAccess } from '../lib/rbac';
import { BrandLogo } from './BrandLogo';

const NAV_ITEMS = [
  { name: 'Dashboard',       path: '/dashboard',    icon: LayoutDashboard },
  { name: 'Reservations',    path: '/reservations', icon: CalendarDays    },
  { name: 'Channel Manager', path: '/channels',     icon: Network         },
  { name: 'Front Desk',      path: '/front-desk',   icon: ConciergeBell   },
  { name: 'Rooms',           path: '/rooms',        icon: BedDouble       },
  { name: 'Guests',          path: '/guests',       icon: Users           },
  { name: 'Orders',          path: '/orders',       icon: UtensilsCrossed },
  { name: 'Housekeeping',    path: '/housekeeping', icon: Sparkles        },
  { name: 'Staff',           path: '/staff',        icon: UserCircle      },
  { name: 'Reports',         path: '/reports',      icon: BarChart3       },
  { name: 'Intelligence',    path: '/intelligence', icon: Brain           },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const visible = NAV_ITEMS.filter((item) => canAccess(user?.role, item.path));

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '?';

  const panelContent = (
    <aside className="w-72 bg-slate-950/95 text-slate-300 flex flex-col h-full border-r border-slate-800/80 shadow-[10px_0_35px_-28px_rgba(2,6,23,0.95)] backdrop-blur-xl">

      <div className="relative px-6 pt-6 pb-4 flex flex-col items-start gap-3 border-b border-slate-800/80">
        {/* Close button — mobile only */}
        <button
          className="lg:hidden absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1"
          onClick={() => setMobileOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>

        <BrandLogo variant="light" className="h-7" />
        <div className="w-full pr-6 lg:pr-0">
          <span className="text-white font-semibold text-sm leading-snug block break-words">
            {user?.hotelName ?? 'SERVV HMS'}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 block mt-0.5">Property</span>
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
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500/10 text-white border border-amber-500/25'
                    : 'border border-transparent hover:bg-white/5 hover:text-white hover:border-white/8'
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
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold text-xs shrink-0">
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

  return (
    <>
      {/* ── Mobile hamburger button ── */}
      <button
        className="lg:hidden fixed top-3.5 left-4 z-40 w-9 h-9 flex items-center justify-center bg-slate-900 text-white rounded-lg shadow-lg border border-slate-700"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile slide-in drawer ── */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {panelContent}
      </div>

      {/* ── Desktop sidebar (always visible) ── */}
      <div className="hidden lg:block sticky top-0 h-screen shrink-0 w-72">
        {panelContent}
      </div>
    </>
  );
}
