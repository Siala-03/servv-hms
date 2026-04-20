import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Reservations } from './pages/Reservations';
import { ChannelManager } from './pages/ChannelManager';
import { FrontDesk } from './pages/FrontDesk';
import { Guests } from './pages/Guests';
import { Staff } from './pages/Staff';
import { Orders } from './pages/Orders';
import { Housekeeping } from './pages/Housekeeping';
import { Reports } from './pages/Reports';
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="channels" element={<ChannelManager />} />
          <Route path="front-desk" element={<FrontDesk />} />
          <Route path="guests" element={<Guests />} />
          <Route path="staff" element={<Staff />} />
          <Route path="orders" element={<Orders />} />
          <Route path="housekeeping" element={<Housekeeping />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>);

}