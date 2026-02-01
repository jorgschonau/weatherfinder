-- =====================================================
-- CLEANUP: Remove forecast_timestamp column
-- Keep only forecast_date (simpler, less redundant)
-- =====================================================

-- Step 1: Remove duplicates (keep newest entry per place_id + forecast_date)
DELETE FROM weather_forecast a
USING weather_forecast b
WHERE a.place_id = b.place_id 
  AND a.forecast_date = b.forecast_date
  AND a.ctid < b.ctid;

-- Step 2: Check how many remain
-- SELECT COUNT(*) FROM weather_forecast;

-- Step 3: Drop old indexes
DROP INDEX IF EXISTS idx_weather_forecast_timestamp;
DROP INDEX IF EXISTS weather_forecast_place_timestamp_idx;

-- Step 4: Create unique constraint on place_id + forecast_date
ALTER TABLE weather_forecast 
  DROP CONSTRAINT IF EXISTS weather_forecast_place_id_forecast_date_key;

ALTER TABLE weather_forecast 
  ADD CONSTRAINT weather_forecast_place_id_forecast_date_key 
  UNIQUE (place_id, forecast_date);

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_weather_forecast_date 
  ON weather_forecast(forecast_date);

CREATE INDEX IF NOT EXISTS idx_weather_forecast_place_date 
  ON weather_forecast(place_id, forecast_date);

-- Step 5: Drop the forecast_timestamp column
-- WICHTIG: Nur ausführen wenn alles andere funktioniert!
ALTER TABLE weather_forecast DROP COLUMN IF EXISTS forecast_timestamp;

-- Step 6: Verify
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'weather_forecast' ORDER BY ordinal_position;

-- =====================================================
-- DONE! forecast_timestamp is now removed.
-- Only forecast_date remains (DATE type, simpler)
-- =====================================================
