-- ============================================================
-- SERVV HMS – Full Setup (schema + seed in one file)
-- Paste this into the Supabase SQL editor and run it once.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enum Types ───────────────────────────────────────────────
CREATE TYPE reservation_status AS ENUM (
  'Confirmed', 'Pending', 'Cancelled', 'Checked-in', 'Checked-out'
);

CREATE TYPE room_status AS ENUM (
  'Available', 'Occupied', 'Cleaning', 'Maintenance', 'Reserved'
);

CREATE TYPE task_priority AS ENUM ('Urgent', 'High', 'Normal', 'Low');

CREATE TYPE task_status AS ENUM ('Open', 'In Progress', 'Resolved');

CREATE TYPE order_status AS ENUM ('New', 'Preparing', 'Delivered');

CREATE TYPE channel_connection_status AS ENUM (
  'Connected', 'Disconnected', 'Syncing'
);

CREATE TYPE loyalty_tier AS ENUM ('Bronze', 'Silver', 'Gold', 'Platinum');

CREATE TYPE meal_plan AS ENUM (
  'Room Only', 'Bed & Breakfast', 'Half Board', 'Full Board'
);

CREATE TYPE staff_role AS ENUM (
  'Front Desk', 'Housekeeping', 'Manager', 'F&B'
);

CREATE TYPE staff_shift AS ENUM ('Morning', 'Evening', 'Night');

CREATE TYPE service_department AS ENUM ('Kitchen', 'Room Service', 'Laundry');

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE guests (
  id            TEXT          PRIMARY KEY DEFAULT 'gst-' || encode(gen_random_bytes(4), 'hex'),
  first_name    TEXT          NOT NULL,
  last_name     TEXT          NOT NULL,
  email         TEXT          UNIQUE NOT NULL,
  phone         TEXT          NOT NULL,
  loyalty_tier  loyalty_tier,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE rooms (
  id             TEXT          PRIMARY KEY DEFAULT 'rm-' || encode(gen_random_bytes(3), 'hex'),
  room_number    TEXT          UNIQUE NOT NULL,
  room_type      TEXT          NOT NULL,
  floor          INTEGER       NOT NULL,
  base_rate      NUMERIC(10,2) NOT NULL,
  status         room_status   NOT NULL DEFAULT 'Available',
  max_occupancy  INTEGER       NOT NULL
);

CREATE TABLE rate_plans (
  id                   TEXT      PRIMARY KEY DEFAULT 'rp-' || encode(gen_random_bytes(3), 'hex'),
  code                 TEXT      UNIQUE NOT NULL,
  name                 TEXT      NOT NULL,
  cancellation_policy  TEXT      NOT NULL,
  meal_plan            meal_plan NOT NULL DEFAULT 'Room Only',
  is_active            BOOLEAN   NOT NULL DEFAULT true
);

CREATE TABLE reservations (
  id              TEXT               PRIMARY KEY DEFAULT 'BK-' || to_char(now(), 'YYYY') || '-' || encode(gen_random_bytes(2), 'hex'),
  guest_id        TEXT               NOT NULL REFERENCES guests(id),
  room_id         TEXT               NOT NULL REFERENCES rooms(id),
  rate_plan_id    TEXT               NOT NULL REFERENCES rate_plans(id),
  channel         TEXT               NOT NULL,
  status          reservation_status NOT NULL DEFAULT 'Pending',
  check_in_date   DATE               NOT NULL,
  check_out_date  DATE               NOT NULL,
  adults          INTEGER            NOT NULL DEFAULT 1,
  children        INTEGER            NOT NULL DEFAULT 0,
  total_amount    NUMERIC(10,2)      NOT NULL DEFAULT 0,
  currency        TEXT               NOT NULL DEFAULT 'USD',
  created_at      TIMESTAMPTZ        NOT NULL DEFAULT now(),
  CONSTRAINT chk_dates CHECK (check_out_date > check_in_date)
);

CREATE TABLE folios (
  id              TEXT    PRIMARY KEY DEFAULT 'fol-' || encode(gen_random_bytes(3), 'hex'),
  reservation_id  TEXT    NOT NULL UNIQUE REFERENCES reservations(id),
  is_closed       BOOLEAN NOT NULL DEFAULT false,
  currency        TEXT    NOT NULL DEFAULT 'USD'
);

CREATE TABLE folio_line_items (
  id           TEXT          PRIMARY KEY DEFAULT 'line-' || encode(gen_random_bytes(4), 'hex'),
  folio_id     TEXT          NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
  description  TEXT          NOT NULL,
  quantity     INTEGER       NOT NULL DEFAULT 1,
  unit_price   NUMERIC(10,2) NOT NULL,
  posted_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE staff_members (
  id          TEXT        PRIMARY KEY DEFAULT 'stf-' || encode(gen_random_bytes(3), 'hex'),
  first_name  TEXT        NOT NULL,
  last_name   TEXT        NOT NULL,
  email       TEXT        UNIQUE NOT NULL,
  role        staff_role  NOT NULL,
  shift       staff_shift NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true
);

CREATE TABLE housekeeping_tasks (
  id                TEXT          PRIMARY KEY DEFAULT 'hk-' || encode(gen_random_bytes(3), 'hex'),
  room_id           TEXT          NOT NULL REFERENCES rooms(id),
  assigned_staff_id TEXT          REFERENCES staff_members(id),
  priority          task_priority NOT NULL DEFAULT 'Normal',
  status            task_status   NOT NULL DEFAULT 'Open',
  due_at            TIMESTAMPTZ,
  notes             TEXT
);

CREATE TABLE service_orders (
  id                    TEXT               PRIMARY KEY DEFAULT 'ord-' || encode(gen_random_bytes(3), 'hex'),
  reservation_id        TEXT               NOT NULL REFERENCES reservations(id),
  requested_by_guest_id TEXT               NOT NULL REFERENCES guests(id),
  department            service_department NOT NULL,
  items                 TEXT[]             NOT NULL DEFAULT '{}',
  status                order_status       NOT NULL DEFAULT 'New',
  amount                NUMERIC(10,2)      NOT NULL DEFAULT 0,
  currency              TEXT               NOT NULL DEFAULT 'USD',
  requested_at          TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE TABLE channel_sync_results (
  id                 TEXT                      PRIMARY KEY DEFAULT 'chn-' || encode(gen_random_bytes(3), 'hex'),
  channel            TEXT                      NOT NULL,
  inventory_updated  INTEGER                   NOT NULL DEFAULT 0,
  rates_updated      INTEGER                   NOT NULL DEFAULT 0,
  status             channel_connection_status NOT NULL DEFAULT 'Connected',
  synced_at          TIMESTAMPTZ               NOT NULL DEFAULT now(),
  error_message      TEXT
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_reservations_guest_id  ON reservations(guest_id);
CREATE INDEX idx_reservations_room_id   ON reservations(room_id);
CREATE INDEX idx_reservations_status    ON reservations(status);
CREATE INDEX idx_reservations_check_in  ON reservations(check_in_date);
CREATE INDEX idx_hk_tasks_room          ON housekeeping_tasks(room_id);
CREATE INDEX idx_hk_tasks_staff         ON housekeeping_tasks(assigned_staff_id);
CREATE INDEX idx_orders_reservation     ON service_orders(reservation_id);
CREATE INDEX idx_folio_items_folio      ON folio_line_items(folio_id);
CREATE INDEX idx_channel_sync_channel   ON channel_sync_results(channel);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE guests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms               ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE folios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE folio_line_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_sync_results ENABLE ROW LEVEL SECURITY;

-- ── Seed Data ─────────────────────────────────────────────────

INSERT INTO guests (id, first_name, last_name, email, phone, loyalty_tier, created_at) VALUES
  ('gst-1001', 'Eleanor', 'Shellstrop',     'eleanor@example.com', '+1-555-1201', 'Gold',     '2024-02-01T09:30:00Z'),
  ('gst-1002', 'Chidi',   'Anagonye',       'chidi@example.com',   '+1-555-1202', 'Silver',   '2024-03-11T11:10:00Z'),
  ('gst-1003', 'Tahani',  'Al-Jamil',       'tahani@example.com',  '+1-555-1203', 'Platinum', '2024-01-08T14:20:00Z'),
  ('gst-1004', 'Jason',   'Mendoza',        'jason@example.com',   '+1-555-1204', NULL,       '2024-06-06T08:55:00Z'),
  ('gst-1005', 'Michael', 'Realman',        'michael@example.com', '+1-555-1205', 'Gold',     '2024-04-21T10:45:00Z'),
  ('gst-1006', 'Janet',   'Della-Denunzio', 'janet@example.com',   '+1-555-1206', 'Silver',   '2024-04-05T12:12:00Z'),
  ('gst-1007', 'Shawn',   'Demon',          'shawn@example.com',   '+1-555-1207', NULL,       '2024-07-13T16:40:00Z'),
  ('gst-1008', 'Mindy',   'St. Claire',     'mindy@example.com',   '+1-555-1208', NULL,       '2024-08-30T09:01:00Z');

INSERT INTO rooms (id, room_number, room_type, floor, base_rate, status, max_occupancy) VALUES
  ('rm-304', '304', 'Deluxe King',        3, 285, 'Reserved',  2),
  ('rm-215', '215', 'Standard Queen',     2, 185, 'Occupied',  2),
  ('rm-501', '501', 'Presidential Suite', 5, 700, 'Reserved',  4),
  ('rm-112', '112', 'Double Twin',        1, 150, 'Reserved',  2),
  ('rm-405', '405', 'Executive Suite',    4, 420, 'Reserved',  3),
  ('rm-218', '218', 'Standard Queen',     2, 175, 'Available', 2),
  ('rm-305', '305', 'Deluxe King',        3, 250, 'Available', 2),
  ('rm-220', '220', 'Standard Queen',     2, 175, 'Reserved',  2);

INSERT INTO rate_plans (id, code, name, cancellation_policy, meal_plan, is_active) VALUES
  ('rp-flex', 'FLEX', 'Flexible Rate',     'Free cancellation up to 24 hours before check-in.', 'Room Only',       true),
  ('rp-bb',   'BB',   'Bed and Breakfast', 'Free cancellation up to 48 hours before check-in.', 'Bed & Breakfast', true);

INSERT INTO reservations (id, guest_id, room_id, rate_plan_id, channel, status, check_in_date, check_out_date, adults, children, total_amount, currency, created_at) VALUES
  ('BK-2024-1042', 'gst-1001', 'rm-304', 'rp-bb',   'Booking.com', 'Confirmed',   '2024-10-25', '2024-10-28', 2, 0, 850,  'USD', '2024-09-10T12:00:00Z'),
  ('BK-2024-1043', 'gst-1002', 'rm-215', 'rp-flex', 'Direct',      'Checked-in',  '2024-10-25', '2024-10-26', 1, 0, 185,  'USD', '2024-09-11T09:20:00Z'),
  ('BK-2024-1044', 'gst-1003', 'rm-501', 'rp-bb',   'Airbnb',      'Pending',     '2024-10-26', '2024-11-02', 2, 1, 4200, 'USD', '2024-09-15T10:10:00Z'),
  ('BK-2024-1045', 'gst-1004', 'rm-112', 'rp-flex', 'Expedia',     'Confirmed',   '2024-10-27', '2024-10-30', 2, 0, 450,  'USD', '2024-09-18T14:05:00Z'),
  ('BK-2024-1046', 'gst-1005', 'rm-405', 'rp-bb',   'Triply',      'Confirmed',   '2024-10-28', '2024-11-05', 2, 0, 2800, 'USD', '2024-09-20T08:42:00Z'),
  ('BK-2024-1047', 'gst-1006', 'rm-218', 'rp-flex', 'Direct',      'Checked-out', '2024-10-24', '2024-10-25', 1, 0, 175,  'USD', '2024-09-12T15:26:00Z'),
  ('BK-2024-1048', 'gst-1007', 'rm-305', 'rp-flex', 'Booking.com', 'Cancelled',   '2024-10-29', '2024-10-31', 2, 0, 0,    'USD', '2024-09-22T11:33:00Z'),
  ('BK-2024-1049', 'gst-1008', 'rm-220', 'rp-flex', 'Agoda',       'Confirmed',   '2024-10-30', '2024-11-01', 1, 0, 350,  'USD', '2024-09-25T07:18:00Z');

INSERT INTO folios (id, reservation_id, is_closed, currency) VALUES
  ('fol-2001', 'BK-2024-1043', false, 'USD');

INSERT INTO folio_line_items (id, folio_id, description, quantity, unit_price, posted_at) VALUES
  ('line-1', 'fol-2001', 'Room Charge', 1, 185, '2024-10-25T07:00:00Z');

INSERT INTO staff_members (id, first_name, last_name, email, role, shift, is_active) VALUES
  ('stf-4001', 'Ariana', 'Vega', 'ariana.vega@servv.local', 'Housekeeping', 'Morning', true),
  ('stf-4002', 'Lucas',  'Shah', 'lucas.shah@servv.local',  'Housekeeping', 'Evening', true),
  ('stf-4003', 'John',   'Doe',  'john.doe@servv.local',    'Manager',      'Morning', true);

INSERT INTO housekeeping_tasks (id, room_id, assigned_staff_id, priority, status, due_at, notes) VALUES
  ('hk-3001', 'rm-304', 'stf-4002', 'High',   'Open',     '2024-10-25T16:00:00Z', 'Deep clean requested before 4 PM check-in.'),
  ('hk-3002', 'rm-218', 'stf-4001', 'Normal', 'Resolved', '2024-10-25T12:00:00Z', NULL);

INSERT INTO service_orders (id, reservation_id, requested_by_guest_id, department, items, status, amount, currency, requested_at) VALUES
  ('ord-5001', 'BK-2024-1043', 'gst-1002', 'Room Service', ARRAY['Club Sandwich', 'Sparkling Water'], 'Preparing', 28, 'USD', '2024-10-25T19:10:00Z');

INSERT INTO channel_sync_results (id, channel, inventory_updated, rates_updated, status, synced_at) VALUES
  ('chn-6001', 'Booking.com', 34, 12, 'Connected', '2024-10-25T10:15:00Z'),
  ('chn-6002', 'Airbnb',      34,  8, 'Syncing',   '2024-10-25T10:14:00Z');
