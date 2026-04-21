import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ServvIQ } from './ServvIQ';

export function Layout() {
  return (
    <div className="relative flex min-h-screen bg-transparent">
      <Sidebar />
      <main className="relative flex-1 min-w-0 overflow-x-hidden">
        <div className="px-5 pt-16 pb-6 sm:px-8 sm:pt-16 sm:pb-8 lg:px-10 lg:pt-10 lg:pb-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <ServvIQ />
    </div>
  );
}