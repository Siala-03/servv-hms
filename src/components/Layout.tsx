import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
export function Layout() {
  return (
    <div className="relative flex min-h-screen bg-transparent">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_-10%,rgba(245,158,11,0.10),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(15,23,42,0.06),transparent_44%)]" />
      <Sidebar />
      <main className="relative flex-1 min-w-0 overflow-x-hidden">
        <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>);

}