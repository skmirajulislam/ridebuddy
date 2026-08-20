-- Migration: 004_custom_auth
-- Converts users table from Firebase-UID-based to email/password auth.
-- Adds email + password_hash; makes firebase_uid optional (backward-compatible).
-- Safe to run multiple times (idempotent).

-- Allow firebase_uid to be NULL (existing rows unaffected)
ALTER TABLE users ALTER COLUMN firebase_uid DROP NOT NULL;

-- Add email column (unique, required for new registrations)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Unique index on email for fast login lookups
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)
  WHERE email IS NOT NULL;
