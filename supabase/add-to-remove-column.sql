-- Add to_remove column to places table
-- This allows marking places for cleanup without deleting them immediately

-- Add column if not exists
ALTER TABLE places 
  ADD COLUMN IF NOT EXISTS to_remove BOOLEAN DEFAULT false;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS places_to_remove_idx ON places(to_remove) WHERE to_remove = true;

-- Set default for existing rows
UPDATE places 
SET to_remove = false 
WHERE to_remove IS NULL;

-- Verify
SELECT 
  COUNT(*) as total_places,
  COUNT(*) FILTER (WHERE to_remove = true) as marked_for_removal,
  COUNT(*) FILTER (WHERE to_remove = false) as keep_places,
  COUNT(*) FILTER (WHERE to_remove IS NULL) as null_places
FROM places;
