-- Migration: 003_hazard_extend
-- Extends hazards with auth + AI validation columns.
-- All columns are nullable — existing rows are untouched, zero-downtime.

ALTER TABLE hazards
  ADD COLUMN IF NOT EXISTS user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence FLOAT,
  ADD COLUMN IF NOT EXISTS verified   BOOLEAN NOT NULL DEFAULT false;

-- Optional: index for per-user report queries (dashboard)
CREATE INDEX IF NOT EXISTS hazards_user_id_idx ON hazards (user_id);
