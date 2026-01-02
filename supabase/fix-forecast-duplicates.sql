-- Fix: Forecast Duplicates Problem
-- Run in Supabase SQL Editor

-- 1. Delete old forecasts (keep only latest per place)
DELETE FROM weather_forecast
WHERE id IN (
  SELECT f1.id
  FROM weather_forecast f1
  WHERE EXISTS (
    SELECT 1
    FROM weather_forecast f2
    WHERE f2.place_id = f1.place_id
      AND f2.fetched_at > f1.fetched_at
  )
);

-- 2. Change UNIQUE constraint
-- Drop old constraint
ALTER TABLE weather_forecast 
  DROP CONSTRAINT IF EXISTS weather_forecast_place_id_forecast_timestamp_fetched_at_key;

-- Add new constraint (without fetched_at)
ALTER TABLE weather_forecast 
  ADD CONSTRAINT weather_forecast_place_forecast_unique 
  UNIQUE (place_id, forecast_timestamp);

-- Now UPSERT will replace old forecasts instead of creating duplicates!

-- Verify
SELECT 
  place_id, 
  COUNT(*) as forecast_rows,
  MAX(fetched_at) as latest_fetch
FROM weather_forecast
GROUP BY place_id
ORDER BY forecast_rows DESC
LIMIT 10;

