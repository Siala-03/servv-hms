-- ============================================================
-- SERVV HMS – Seed Data  (matches src/data/hmsSeed.ts)
-- Run AFTER 001_initial_schema.sql
-- Safe to re-run: ON CONFLICT DO NOTHING skips existing rows.
-- ============================================================

-- ── Guests ───────────────────────────────────────────────────
INSERT INTO guests (id, first_name, last_name, email, phone, loyalty_tier, created_at) VALUES
  ('gst-1001', 'Eleanor', 'Shellstrop',     'eleanor@example.com', '+1-555-1201', 'Gold',     '2024-02-01T09:30:00Z'),
  ('gst-1002', 'Chidi',   'Anagonye',       'chidi@example.com',   '+1-555-1202', 'Silver',   '2024-03-11T11:10:00Z'),
  ('gst-1003', 'Tahani',  'Al-Jamil',       'tahani@example.com',  '+1-555-1203', 'Platinum', '2024-01-08T14:20:00Z'),
  ('gst-1004', 'Jason',   'Mendoza',        'jason@example.com',   '+1-555-1204', NULL,       '2024-06-06T08:55:00Z'),
  ('gst-1005', 'Michael', 'Realman',        'michael@example.com', '+1-555-1205', 'Gold',     '2024-04-21T10:45:00Z'),
  ('gst-1006', 'Janet',   'Della-Denunzio', 'janet@example.com',   '+1-555-1206', 'Silver',   '2024-04-05T12:12:00Z'),
  ('gst-1007', 'Shawn',   'Demon',          'shawn@example.com',   '+1-555-1207', NULL,       '2024-07-13T16:40:00Z'),
  ('gst-1008', 'Mindy',   'St. Claire',     'mindy@example.com',   '+1-555-1208', NULL,       '2024-08-30T09:01:00Z')
ON CONFLICT (id) DO NOTHING;

-- ── Rooms ────────────────────────────────────────────────────
INSERT INTO rooms (id, room_number, room_type, floor, base_rate, status, max_occupancy) VALUES
  ('rm-304', '304', 'Deluxe King',        3, 285, 'Reserved',  2),
  ('rm-215', '215', 'Standard Queen',     2, 185, 'Occupied',  2),
  ('rm-501', '501', 'Presidential Suite', 5, 700, 'Reserved',  4),
  ('rm-112', '112', 'Double Twin',        1, 150, 'Reserved',  2),
  ('rm-405', '405', 'Executive Suite',    4, 420, 'Reserved',  3),
  ('rm-218', '218', 'Standard Queen',     2, 175, 'Available', 2),
  ('rm-305', '305', 'Deluxe King',        3, 250, 'Available', 2),
  ('rm-220', '220', 'Standard Queen',     2, 175, 'Reserved',  2)
ON CONFLICT (id) DO NOTHING;

-- ── Rate Plans ───────────────────────────────────────────────
INSERT INTO rate_plans (id, code, name, cancellation_policy, meal_plan, is_active) VALUES
  ('rp-flex', 'FLEX', 'Flexible Rate',     'Free cancellation up to 24 hours before check-in.', 'Room Only',       true),
  ('rp-bb',   'BB',   'Bed and Breakfast', 'Free cancellation up to 48 hours before check-in.', 'Bed & Breakfast', true)
ON CONFLICT (id) DO NOTHING;

-- ── Reservations ─────────────────────────────────────────────
INSERT INTO reservations (id, guest_id, room_id, rate_plan_id, channel, status, check_in_date, check_out_date, adults, children, total_amount, currency, created_at) VALUES
  ('BK-2024-1042', 'gst-1001', 'rm-304', 'rp-bb',   'Booking.com', 'Confirmed',   '2024-10-25', '2024-10-28', 2, 0, 850,  'USD', '2024-09-10T12:00:00Z'),
  ('BK-2024-1043', 'gst-1002', 'rm-215', 'rp-flex', 'Direct',      'Checked-in',  '2024-10-25', '2024-10-26', 1, 0, 185,  'USD', '2024-09-11T09:20:00Z'),
  ('BK-2024-1044', 'gst-1003', 'rm-501', 'rp-bb',   'Airbnb',      'Pending',     '2024-10-26', '2024-11-02', 2, 1, 4200, 'USD', '2024-09-15T10:10:00Z'),
  ('BK-2024-1045', 'gst-1004', 'rm-112', 'rp-flex', 'Expedia',     'Confirmed',   '2024-10-27', '2024-10-30', 2, 0, 450,  'USD', '2024-09-18T14:05:00Z'),
  ('BK-2024-1046', 'gst-1005', 'rm-405', 'rp-bb',   'Triply',      'Confirmed',   '2024-10-28', '2024-11-05', 2, 0, 2800, 'USD', '2024-09-20T08:42:00Z'),
  ('BK-2024-1047', 'gst-1006', 'rm-218', 'rp-flex', 'Direct',      'Checked-out', '2024-10-24', '2024-10-25', 1, 0, 175,  'USD', '2024-09-12T15:26:00Z'),
  ('BK-2024-1048', 'gst-1007', 'rm-305', 'rp-flex', 'Booking.com', 'Cancelled',   '2024-10-29', '2024-10-31', 2, 0, 0,    'USD', '2024-09-22T11:33:00Z'),
  ('BK-2024-1049', 'gst-1008', 'rm-220', 'rp-flex', 'Agoda',       'Confirmed',   '2024-10-30', '2024-11-01', 1, 0, 350,  'USD', '2024-09-25T07:18:00Z')
ON CONFLICT (id) DO NOTHING;

-- ── Folios ───────────────────────────────────────────────────
INSERT INTO folios (id, reservation_id, is_closed, currency) VALUES
  ('fol-2001', 'BK-2024-1043', false, 'USD')
ON CONFLICT (id) DO NOTHING;

INSERT INTO folio_line_items (id, folio_id, description, quantity, unit_price, posted_at) VALUES
  ('line-1', 'fol-2001', 'Room Charge', 1, 185, '2024-10-25T07:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ── Staff Members ────────────────────────────────────────────
INSERT INTO staff_members (id, first_name, last_name, email, role, shift, is_active) VALUES
  ('stf-4001', 'Ariana', 'Vega', 'ariana.vega@servv.local', 'Housekeeping', 'Morning', true),
  ('stf-4002', 'Lucas',  'Shah', 'lucas.shah@servv.local',  'Housekeeping', 'Evening', true),
  ('stf-4003', 'John',   'Doe',  'john.doe@servv.local',    'Manager',      'Morning', true)
ON CONFLICT (id) DO NOTHING;

-- ── Housekeeping Tasks ───────────────────────────────────────
INSERT INTO housekeeping_tasks (id, room_id, assigned_staff_id, priority, status, due_at, notes) VALUES
  ('hk-3001', 'rm-304', 'stf-4002', 'High',   'Open',     '2024-10-25T16:00:00Z', 'Deep clean requested before 4 PM check-in.'),
  ('hk-3002', 'rm-218', 'stf-4001', 'Normal', 'Resolved', '2024-10-25T12:00:00Z', NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Service Orders ───────────────────────────────────────────
INSERT INTO service_orders (id, reservation_id, requested_by_guest_id, department, items, status, amount, currency, requested_at) VALUES
  ('ord-5001', 'BK-2024-1043', 'gst-1002', 'Room Service', ARRAY['Club Sandwich', 'Sparkling Water'], 'Preparing', 28, 'USD', '2024-10-25T19:10:00Z')
ON CONFLICT (id) DO NOTHING;

-- ── Channel Sync Results ──────────────────────────────────────
INSERT INTO channel_sync_results (id, channel, inventory_updated, rates_updated, status, synced_at) VALUES
  ('chn-6001', 'Booking.com', 34, 12, 'Connected', '2024-10-25T10:15:00Z'),
  ('chn-6002', 'Airbnb',      34,  8, 'Syncing',   '2024-10-25T10:14:00Z')
ON CONFLICT (id) DO NOTHING;
