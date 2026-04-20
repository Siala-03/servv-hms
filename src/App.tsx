import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import { LoginPage }      from './pages/LoginPage';
import { CheckInPage }    from './pages/CheckInPage';
import { Dashboard }      from './pages/Dashboard';
import { Reservations }   from './pages/Reservations';
import { ChannelManager } from './pages/ChannelManager';
import { FrontDesk }      from './pages/FrontDesk';
import { Guests }         from './pages/Guests';
import { Staff }          from './pages/Staff';
import { Orders }         from './pages/Orders';
import { Housekeeping }   from './pages/Housekeeping';
import { Reports }        from './pages/Reports';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { UsersPage }      from './pages/UsersPage';

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
          <Routes>
            {/* Public */}
            <Route path="/login"                    element={<LoginPage />} />
            <Route path="/checkin/:bookingId"        element={<CheckInPage />} />
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
              <Route index                element={<Dashboard />} />
              <Route path="reservations"  element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
              <Route path="channels"      element={<ProtectedRoute><ChannelManager /></ProtectedRoute>} />
              <Route path="front-desk"    element={<ProtectedRoute><FrontDesk /></ProtectedRoute>} />
              <Route path="guests"        element={<ProtectedRoute><Guests /></ProtectedRoute>} />
              <Route path="staff"         element={<ProtectedRoute><Staff /></ProtectedRoute>} />
              <Route path="orders"        element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="housekeeping"  element={<ProtectedRoute><Housekeeping /></ProtectedRoute>} />
              <Route path="reports"       element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="users"         element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
