-- Migration: 007_repair_verification
-- Adds repair proof tracking columns and citizen repair verification table.
-- All changes are additive — zero downtime, safe to run multiple times.

-- ── Hazards: repair proof lifecycle ──────────────────────────────────────
ALTER TABLE hazards ADD COLUMN IF NOT EXISTS repair_image_url TEXT;
ALTER TABLE hazards ADD COLUMN IF NOT EXISTS repair_verified BOOLEAN DEFAULT false;
ALTER TABLE hazards ADD COLUMN IF NOT EXISTS repair_verified_at TIMESTAMPTZ;
ALTER TABLE hazards ADD COLUMN IF NOT EXISTS repair_verify_count INTEGER DEFAULT 0;

-- ── Repair Verifications: citizen confirmation of municipal repairs ─────
CREATE TABLE IF NOT EXISTS repair_verifications (
  id         SERIAL PRIMARY KEY,
  hazard_id  INTEGER NOT NULL REFERENCES hazards(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote       TEXT NOT NULL CHECK (vote IN ('confirmed', 'still_broken')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hazard_id, user_id)
);

-- Fast lookup index for resolved-but-unverified hazards near rider
CREATE INDEX IF NOT EXISTS hazards_resolved_unverified_idx
  ON hazards (status, repair_verified)
  WHERE status = 'resolved' AND repair_verified = false;
