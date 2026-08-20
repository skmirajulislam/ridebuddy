-- Migration: 002_users
-- Creates the users table. Firebase UID is the natural key.
-- Safe to run multiple times (idempotent).

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  name        TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast UID lookups on every authenticated request
CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_idx ON users (firebase_uid);
