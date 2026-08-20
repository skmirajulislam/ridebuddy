-- Migration: 006_user_profiles
-- Adds unique system-generated handle, avatar_url, bio, and hobbies to users table.
-- Safe to run multiple times (idempotent).

-- 1. Add new profile columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS handle TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hobbies TEXT[] DEFAULT '{}';

-- 2. Create unique index on handle
CREATE UNIQUE INDEX IF NOT EXISTS users_handle_idx ON users (handle)
  WHERE handle IS NOT NULL;

-- 3. Backfill any existing users that have NULL handle with a clean unique handle
DO $$
DECLARE
  r RECORD;
  clean_name TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR r IN SELECT id, name, email FROM users WHERE handle IS NULL LOOP
    -- Extract clean alphanumeric base from name or email
    clean_name := LOWER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(r.name), ''), SPLIT_PART(COALESCE(r.email, 'user'), '@', 1)), '[^a-zA-Z0-9]', '', 'g'));
    IF clean_name = '' THEN
      clean_name := 'rider';
    END IF;

    -- Append unique suffix based on user id and random offset
    suffix := 1000 + (r.id * 17) % 9000;
    candidate := clean_name || '_' || suffix::text;

    -- Ensure candidate is unique
    WHILE EXISTS (SELECT 1 FROM users WHERE handle = candidate) LOOP
      suffix := suffix + 1;
      candidate := clean_name || '_' || suffix::text;
    END LOOP;

    UPDATE users SET handle = candidate WHERE id = r.id;
  END LOOP;
END $$;
