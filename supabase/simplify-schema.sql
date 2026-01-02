-- SCHEMA CLEANUP - Fokus auf das Wesentliche!
-- Run this in Supabase SQL Editor

-- 1. DROP unnötige Tables
DROP TABLE IF EXISTS daily_weather_summary CASCADE;

-- 2. Alte Daten löschen (behalten nur Fresh Data)
DELETE FROM weather_data WHERE weather_timestamp < NOW() - INTERVAL '2 days';
DELETE FROM weather_forecast WHERE fetched_at < NOW() - INTERVAL '2 days';

-- 3. Cleanup Function - 20 Tage Historie
CREATE OR REPLACE FUNCTION clean_old_weather_data()
RETURNS void AS $$
BEGIN
  -- Wetterdaten: 20 Tage Historie (für Stabilität, Trends, Bodennässe)
  DELETE FROM weather_data
  WHERE weather_timestamp < NOW() - INTERVAL '20 days';
  
  -- Forecasts: Nur aktuelle behalten (2 Tage alt = veraltet)
  DELETE FROM weather_forecast
  WHERE fetched_at < NOW() - INTERVAL '2 days';
END;
$$ LANGUAGE plpgsql;

-- 4. Aggregate Function RAUS (nicht mehr nötig)
DROP FUNCTION IF EXISTS aggregate_daily_weather(UUID, DATE);

-- Done! Schema ist jetzt EINFACH:
-- - weather_data: Nur aktuelles Wetter (max 2 Tage alt)
-- - weather_forecast: Nur aktuelle 16-day Forecasts
-- - Keine Analytics, keine Historie, keine Komplexität!

