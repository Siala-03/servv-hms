import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
export function Layout() {
  return (
    <div className="relative flex min-h-screen bg-transparent">
      <Sidebar />
      <main className="relative flex-1 min-w-0 overflow-x-hidden">
        <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>);

}