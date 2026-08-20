-- Migration: 005_user_hazard_report_count
-- Adds a persisted hazard report counter to users and backfills from hazards.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS hazard_reports_count INTEGER NOT NULL DEFAULT 0;

-- Backfill counts from existing hazards
WITH report_counts AS (
  SELECT user_id, COUNT(*)::int AS total
  FROM hazards
  WHERE user_id IS NOT NULL
  GROUP BY user_id
)
UPDATE users u
SET hazard_reports_count = rc.total
FROM report_counts rc
WHERE u.id = rc.user_id;

