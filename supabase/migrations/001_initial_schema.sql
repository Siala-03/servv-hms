-- ============================================================
-- SERVV HMS – Initial Schema
-- Run this against a fresh Supabase project (SQL editor or CLI)
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
  id            TEXT        PRIMARY KEY DEFAULT 'gst-' || encode(gen_random_bytes(4), 'hex'),
  first_name    TEXT        NOT NULL,
  last_name     TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  phone         TEXT        NOT NULL,
  loyalty_tier  loyalty_tier,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rooms (
  id             TEXT        PRIMARY KEY DEFAULT 'rm-' || encode(gen_random_bytes(3), 'hex'),
  room_number    TEXT        UNIQUE NOT NULL,
  room_type      TEXT        NOT NULL,
  floor          INTEGER     NOT NULL,
  base_rate      NUMERIC(10,2) NOT NULL,
  status         room_status NOT NULL DEFAULT 'Available',
  max_occupancy  INTEGER     NOT NULL
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
  id                 TEXT                     PRIMARY KEY DEFAULT 'chn-' || encode(gen_random_bytes(3), 'hex'),
  channel            TEXT                     NOT NULL,
  inventory_updated  INTEGER                  NOT NULL DEFAULT 0,
  rates_updated      INTEGER                  NOT NULL DEFAULT 0,
  status             channel_connection_status NOT NULL DEFAULT 'Connected',
  synced_at          TIMESTAMPTZ              NOT NULL DEFAULT now(),
  error_message      TEXT
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_reservations_guest_id   ON reservations(guest_id);
CREATE INDEX idx_reservations_room_id    ON reservations(room_id);
CREATE INDEX idx_reservations_status     ON reservations(status);
CREATE INDEX idx_reservations_check_in   ON reservations(check_in_date);
CREATE INDEX idx_hk_tasks_room           ON housekeeping_tasks(room_id);
CREATE INDEX idx_hk_tasks_staff          ON housekeeping_tasks(assigned_staff_id);
CREATE INDEX idx_orders_reservation      ON service_orders(reservation_id);
CREATE INDEX idx_folio_items_folio       ON folio_line_items(folio_id);
CREATE INDEX idx_channel_sync_channel    ON channel_sync_results(channel);

-- ── Row Level Security ────────────────────────────────────────
-- Backend uses the service-role key which bypasses RLS.
-- Enable RLS so the anon/authenticated roles cannot access data directly.
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
