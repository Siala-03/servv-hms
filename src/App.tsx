import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const CheckInPage = lazy(() => import('./pages/CheckInPage').then((m) => ({ default: m.CheckInPage })));
const BookingPage = lazy(() => import('./pages/BookingPage').then((m) => ({ default: m.BookingPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Reservations = lazy(() => import('./pages/Reservations').then((m) => ({ default: m.Reservations })));
const ChannelManager = lazy(() => import('./pages/ChannelManager').then((m) => ({ default: m.ChannelManager })));
const FrontDesk = lazy(() => import('./pages/FrontDesk').then((m) => ({ default: m.FrontDesk })));
const Guests = lazy(() => import('./pages/Guests').then((m) => ({ default: m.Guests })));
const Rooms = lazy(() => import('./pages/Rooms').then((m) => ({ default: m.Rooms })));
const Staff = lazy(() => import('./pages/Staff').then((m) => ({ default: m.Staff })));
const Orders = lazy(() => import('./pages/Orders').then((m) => ({ default: m.Orders })));
const Housekeeping = lazy(() => import('./pages/Housekeeping').then((m) => ({ default: m.Housekeeping })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage').then((m) => ({ default: m.SuperAdminPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const Intelligence = lazy(() => import('./pages/Intelligence').then((m) => ({ default: m.Intelligence })));
const GuestRoomPage = lazy(() => import('./pages/GuestRoomPage').then((m) => ({ default: m.GuestRoomPage })));
const Notifications = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.Notifications })));

function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-4xl font-bold text-slate-300 mb-2">403</p>
        <p className="text-slate-500">You don't have permission to view this page.</p>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <OfflineIndicator />
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login"                    element={<LoginPage />} />
              <Route path="/checkin/:bookingId"        element={<CheckInPage />} />
              <Route path="/book/:hotelId"             element={<BookingPage />} />
              <Route path="/room/:roomId"             element={<GuestRoomPage />} />
              <Route path="/unauthorized"             element={<Unauthorized />} />

              {/* Superadmin-only */}
              <Route path="/superadmin" element={
                <ProtectedRoute roles={['superadmin']}>
                  <div className="min-h-screen bg-slate-50 px-8 py-10 max-w-6xl mx-auto">
                    <SuperAdminPage />
                  </div>
                </ProtectedRoute>
              } />

              {/* Main app (with sidebar layout) */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index                element={<Navigate to="/login" replace />} />
                <Route path="dashboard"    element={<Dashboard />} />
                <Route path="reservations"  element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
                <Route path="channels"      element={<ProtectedRoute><ChannelManager /></ProtectedRoute>} />
                <Route path="front-desk"    element={<ProtectedRoute><FrontDesk /></ProtectedRoute>} />
                <Route path="rooms"         element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
                <Route path="guests"        element={<ProtectedRoute><Guests /></ProtectedRoute>} />
                <Route path="staff"         element={<ProtectedRoute><Staff /></ProtectedRoute>} />
                <Route path="orders"        element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="housekeeping"  element={<ProtectedRoute><Housekeeping /></ProtectedRoute>} />
                <Route path="reports"       element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="intelligence"  element={<ProtectedRoute><Intelligence /></ProtectedRoute>} />
                <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="users"         element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
