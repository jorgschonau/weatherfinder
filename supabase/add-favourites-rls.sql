-- ============================================================================
-- Favourites RLS (Row Level Security) Migration
-- ============================================================================
-- Run this if your favourites table was created without RLS policies.
-- This ensures:
--   1. user_id column exists and references auth.users
--   2. RLS is enabled
--   3. Users can only see/insert/delete their own favourites
--
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE where possible)
-- ============================================================================

-- Step 1: Add user_id column if it doesn't exist
-- (The main schema already includes it, but this handles older setups)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'favourites' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE favourites
      ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Step 2: Enable RLS (safe to call even if already enabled)
ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies (drop first if they exist for idempotency)

-- SELECT policy: Users can only see their own favourites
DROP POLICY IF EXISTS "Users can view their own favourites" ON favourites;
CREATE POLICY "Users can view their own favourites"
  ON favourites FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT policy: Users can only insert favourites for themselves
DROP POLICY IF EXISTS "Users can insert their own favourites" ON favourites;
CREATE POLICY "Users can insert their own favourites"
  ON favourites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy: Users can only delete their own favourites
DROP POLICY IF EXISTS "Users can delete their own favourites" ON favourites;
CREATE POLICY "Users can delete their own favourites"
  ON favourites FOR DELETE
  USING (auth.uid() = user_id);

-- UPDATE policy: Users can only update their own favourites (notes, tags)
DROP POLICY IF EXISTS "Users can update their own favourites" ON favourites;
CREATE POLICY "Users can update their own favourites"
  ON favourites FOR UPDATE
  USING (auth.uid() = user_id);

-- Step 4: Ensure index on user_id for performance
CREATE INDEX IF NOT EXISTS favourites_user_id_idx ON favourites(user_id);
