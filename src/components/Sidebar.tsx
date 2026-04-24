import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Network, ConciergeBell,
  Users, UserCircle, UtensilsCrossed, Sparkles, BarChart3, BedDouble,
  LogOut, ShieldCheck, UserCog, Brain, Bell, Menu, X, ChevronDown, Blocks,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS, UserRole, canAccess } from '../lib/rbac';
import { BrandLogo } from './BrandLogo';

type NavItem = {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

const TOP_LEVEL_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
];

const NAV_GROUPS: NavGroup[] = [
  {
    name: 'Operations',
    icon: ConciergeBell,
    items: [
      { name: 'Front Desk', path: '/front-desk', icon: ConciergeBell },
      { name: 'Rooms', path: '/rooms', icon: BedDouble },
      { name: 'Housekeeping', path: '/housekeeping', icon: Sparkles },
      { name: 'Orders', path: '/orders', icon: UtensilsCrossed },
    ],
  },
  {
    name: 'Bookings',
    icon: CalendarDays,
    items: [
      { name: 'Reservations', path: '/reservations', icon: CalendarDays },
      { name: 'Channel Manager', path: '/channels', icon: Network },
      { name: 'Guests', path: '/guests', icon: Users },
    ],
  },
  {
    name: 'Insights',
    icon: BarChart3,
    items: [
      { name: 'Notifications', path: '/notifications', icon: Bell },
      { name: 'Reports', path: '/reports', icon: BarChart3 },
      { name: 'Intelligence', path: '/intelligence', icon: Brain },
    ],
  },
  {
    name: 'Administration',
    icon: Blocks,
    items: [
      { name: 'Staff', path: '/staff', icon: UserCircle },
      { name: 'User Accounts', path: '/users', icon: UserCog },
      { name: 'Hotels', path: '/superadmin', icon: ShieldCheck },
    ],
  },
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
  const location         = useLocation();
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const visibleTopLevel = TOP_LEVEL_ITEMS.filter((item) => canAccess(user?.role, item.path));
  const visibleGroups   = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccess(user?.role, item.path)),
    }))
    .filter((group) => group.items.length > 0);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '?';

  const panelContent = (
    <aside className="w-64 bg-[#0E0E16] text-zinc-400 flex flex-col h-full border-r border-white/[0.06]">

      {/* ── Header ── */}
      <div className="relative px-4 pt-5 pb-4 flex flex-col items-start gap-2.5 border-b border-white/[0.06]">
        <button
          className="lg:hidden absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
          onClick={() => setMobileOpen(false)}
        >
          <X className="w-4 h-4" />
        </button>
        <BrandLogo variant="light" className="h-6" />
        <div className="w-full pr-6 lg:pr-0">
          <span className="text-white font-semibold text-[13px] leading-snug block">
            {user?.hotelName ?? 'SERVV HMS'}
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600 block mt-0.5">Property</span>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">

        {/* Top-level items */}
        {visibleTopLevel.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/dashboard'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13px] font-medium transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'hover:bg-white/[0.05] hover:text-zinc-200'
                }`
              }
            >
              <Icon className="w-[15px] h-[15px] shrink-0" />
              {item.name}
            </NavLink>
          );
        })}

        {/* Group sections */}
        {visibleGroups.map((group) => {
          const groupActive = group.items.some((item) => location.pathname.startsWith(item.path));
          const isExpanded  = expandedGroups[group.name] ?? groupActive;

          return (
            <div key={group.name} className="mt-5">
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                  {group.name}
                </span>
                <button
                  onClick={() => setExpandedGroups((prev) => ({ ...prev, [group.name]: !isExpanded }))}
                  className="text-zinc-700 hover:text-zinc-400 transition-colors p-0.5 -mr-0.5"
                  aria-label={`Toggle ${group.name}`}
                >
                  <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {isExpanded && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13px] font-medium transition-colors ${
                            isActive
                              ? 'bg-white/[0.08] text-white'
                              : 'text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200'
                          }`
                        }
                      >
                        <Icon className="w-[15px] h-[15px] shrink-0" />
                        {item.name}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── User profile ── */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-white/[0.04] border border-white/[0.05]">
          <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/25 flex items-center justify-center text-amber-400 font-semibold text-[11px] shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white truncate leading-snug">
              {user ? `${user.firstName} ${user.lastName}` : '—'}
            </p>
            <p className={`text-[10px] truncate leading-snug ${ROLE_BADGE[user?.role ?? 'manager']}`}>
              {user ? ROLE_LABELS[user.role] : ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Mobile hamburger ── */}
      <button
        className="lg:hidden fixed top-3.5 left-4 z-40 w-9 h-9 flex items-center justify-center bg-[#0E0E16] text-white rounded-lg shadow-lg border border-white/[0.1]"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {panelContent}
      </div>

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:block sticky top-0 h-screen shrink-0 w-64">
        {panelContent}
      </div>
    </>
  );
}
