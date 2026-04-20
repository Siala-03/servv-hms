-- ============================================================
-- Migration 003: Auth — hotel accounts + system user logins
-- Run in Supabase SQL Editor after 002_whatsapp_fields.sql
-- ============================================================

CREATE TYPE user_role AS ENUM ('superadmin', 'manager', 'front_desk', 'housekeeping', 'fnb');

-- One row per hotel property
CREATE TABLE hotel_accounts (
  id             TEXT        PRIMARY KEY DEFAULT 'htl-' || encode(gen_random_bytes(4), 'hex'),
  name           TEXT        NOT NULL,
  address        TEXT,
  country        TEXT        NOT NULL DEFAULT 'Rwanda',
  phone          TEXT,
  email          TEXT,
  has_restaurant BOOLEAN     NOT NULL DEFAULT false,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System login accounts (people who log into the HMS dashboard)
-- Separate from staff_members (operational staff who receive WhatsApp tasks)
CREATE TABLE hotel_users (
  id         TEXT        PRIMARY KEY DEFAULT 'usr-' || encode(gen_random_bytes(4), 'hex'),
  hotel_id   TEXT        REFERENCES hotel_accounts(id) ON DELETE CASCADE,  -- NULL for superadmin
  first_name TEXT        NOT NULL,
  last_name  TEXT        NOT NULL,
  email      TEXT,
  phone      TEXT,
  role       user_role   NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Credentials — separate table so password hashes never leak through user queries
CREATE TABLE hotel_user_credentials (
  user_id       TEXT NOT NULL PRIMARY KEY REFERENCES hotel_users(id) ON DELETE CASCADE,
  hotel_id      TEXT,                    -- denormalized: NULL for superadmin
  username      TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

-- username unique per hotel
CREATE UNIQUE INDEX idx_creds_username_hotel
  ON hotel_user_credentials(username, hotel_id)
  WHERE hotel_id IS NOT NULL;

-- superadmin username globally unique
CREATE UNIQUE INDEX idx_creds_username_superadmin
  ON hotel_user_credentials(username)
  WHERE hotel_id IS NULL;

CREATE INDEX idx_hotel_users_hotel  ON hotel_users(hotel_id);
CREATE INDEX idx_hotel_users_role   ON hotel_users(role);

ALTER TABLE hotel_accounts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_user_credentials   ENABLE ROW LEVEL SECURITY;
