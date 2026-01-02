-- Remove country_name column (redundant, we have country_code)
-- Run in Supabase SQL Editor

ALTER TABLE places DROP COLUMN IF EXISTS country_name;

-- Done! Now use country_code + lookup table in app
