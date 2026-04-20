-- ============================================================
-- Migration 002: Add WhatsApp / check-in fields
-- Run this in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- Staff phone (needed so "reply DONE" can be linked back to a staff member)
ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Guest ID capture (used by the online pre-check-in page)
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS id_type       TEXT,
  ADD COLUMN IF NOT EXISTS id_number     TEXT,
  ADD COLUMN IF NOT EXISTS id_verified   BOOLEAN NOT NULL DEFAULT false;

-- Pre-check-in notes on reservations
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS special_requests TEXT;
