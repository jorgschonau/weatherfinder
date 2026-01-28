-- Add UNIQUE constraint for duplicate detection
-- This allows upsert with onConflict: 'latitude,longitude,name'

-- Create unique constraint on (latitude, longitude, name)
-- This prevents duplicate places at same location with same name
CREATE UNIQUE INDEX IF NOT EXISTS places_location_name_unique 
ON places (
  ROUND(latitude::numeric, 6), 
  ROUND(longitude::numeric, 6), 
  name
);

-- Note: We round lat/lon to 6 decimals (~0.11m precision) to handle floating point differences
