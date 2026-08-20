-- Migration: 005_gov_fields
-- Adds hazard status tracking + user role for gov dashboard.
-- All changes are additive (DEFAULT values) — zero downtime.

-- ── Hazards: status lifecycle ──────────────────────────────────────────────
ALTER TABLE hazards ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE hazards ADD COLUMN IF NOT EXISTS resolved_at    TIMESTAMPTZ;
ALTER TABLE hazards ADD COLUMN IF NOT EXISTS resolved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Fast filtering by status in the gov dashboard
CREATE INDEX IF NOT EXISTS hazards_status_idx ON hazards (status);

-- ── Users: role for access control ─────────────────────────────────────────
-- Values: 'user' (default), 'official' (gov access)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
