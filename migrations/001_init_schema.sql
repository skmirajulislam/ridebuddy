-- ==============================================================================
-- RideBuddy Consolidated Database Schema
-- ==============================================================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id                   SERIAL PRIMARY KEY,
  name                 TEXT,
  email                TEXT UNIQUE,
  password_hash        TEXT,
  firebase_uid         TEXT UNIQUE,
  role                 TEXT NOT NULL DEFAULT 'user', -- 'user' or 'official'
  hazard_reports_count INTEGER NOT NULL DEFAULT 0,
  phone                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_idx ON users (firebase_uid) WHERE firebase_uid IS NOT NULL;

-- 2. Hazards table
CREATE TABLE IF NOT EXISTS hazards (
  id                  SERIAL PRIMARY KEY,
  type                TEXT NOT NULL,
  lat                 DOUBLE PRECISION NOT NULL,
  lng                 DOUBLE PRECISION NOT NULL,
  severity            INTEGER NOT NULL DEFAULT 1,
  status              TEXT NOT NULL DEFAULT 'active', -- 'active', 'in_progress', 'resolved'
  confidence          FLOAT,
  verified            BOOLEAN NOT NULL DEFAULT false,
  user_id             INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_at         TIMESTAMPTZ,
  resolved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for fast geospatial lookups, bounding boxes, user stats, and status filters
CREATE INDEX IF NOT EXISTS hazards_lat_lng_idx ON hazards (lat, lng);
CREATE INDEX IF NOT EXISTS hazards_status_idx ON hazards (status);
CREATE INDEX IF NOT EXISTS hazards_user_id_idx ON hazards (user_id);
CREATE INDEX IF NOT EXISTS hazards_type_idx ON hazards (type);
