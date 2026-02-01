# Performance Debug

## Check 1: Wurde Migration ausgeführt?

In Supabase SQL Editor:

```sql
-- Check if to_remove column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'places' AND column_name = 'to_remove';

-- Check if VIEW is updated (should show weather_forecast, not weather_data)
SELECT pg_get_viewdef('places_with_latest_weather', true);
```

## Check 2: Wie viele Places haben to_remove = true?

```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE to_remove = true) as marked_for_removal,
  COUNT(*) FILTER (WHERE to_remove = false) as keep,
  COUNT(*) FILTER (WHERE to_remove IS NULL) as null_values
FROM places;
```

## Check 3: Query Performance testen

```sql
-- Test current VIEW performance
EXPLAIN ANALYZE
SELECT * FROM places_with_latest_weather
WHERE latitude BETWEEN 48 AND 52
  AND longitude BETWEEN 5 AND 15
LIMIT 100;
```

## Potentielle Probleme:

### Problem 1: Migration nicht ausgeführt
- VIEW zeigt noch alte `weather_data` Tabelle
- Fix: Migration ausführen

### Problem 2: Fehlende Indexes
```sql
-- Weather forecast index für JOIN
CREATE INDEX IF NOT EXISTS weather_forecast_place_date_idx 
  ON weather_forecast(place_id, forecast_date);

-- Places geo index
CREATE INDEX IF NOT EXISTS places_lat_lon_idx 
  ON places(latitude, longitude);

-- Composite index für is_active + to_remove
CREATE INDEX IF NOT EXISTS places_active_filter_idx 
  ON places(is_active, to_remove)
  WHERE is_active = true;
```

### Problem 3: LATERAL JOIN zu langsam

Alternative - keine LATERAL, sondern window function:

```sql
CREATE OR REPLACE VIEW places_with_latest_weather_fast AS
SELECT DISTINCT ON (p.id)
  p.id,
  p.name,
  p.latitude,
  p.longitude,
  p.country_code,
  p.region,
  p.place_type AS place_category,
  p.attractiveness_score,
  p.population,
  p.clustering_radius_m,
  
  w.forecast_date,
  w.forecast_timestamp,
  ROUND((w.temp_min + w.temp_max) / 2.0, 1) AS temperature,
  w.temp_min,
  w.temp_max,
  w.weather_main,
  w.weather_description,
  w.weather_icon,
  w.wind_speed,
  w.precipitation_sum,
  w.precipitation_probability,
  w.sunrise,
  w.sunset,
  w.rain_volume AS rain_1h,
  w.snow_volume AS snow_1h,
  w.fetched_at AS weather_timestamp,
  w.data_source,
  
  NULL::decimal AS feels_like,
  NULL::integer AS humidity,
  NULL::integer AS cloud_cover,
  NULL::decimal AS rain_3h,
  NULL::decimal AS snow_3h,
  NULL::decimal AS snow_24h,
  NULL::decimal AS wind_gust,
  NULL::integer AS stability_score,
  NULL::text AS weather_trend
  
FROM places p
LEFT JOIN weather_forecast w 
  ON w.place_id = p.id 
  AND w.forecast_date = CURRENT_DATE
WHERE p.is_active = true
  AND COALESCE(p.to_remove, false) = false
ORDER BY p.id, w.fetched_at DESC NULLS LAST;
```

## Schnellster Fix:

Wenn 99% der Places `to_remove = false`, dann Filter umdrehen:

```sql
-- Statt:
WHERE COALESCE(p.to_remove, false) = false

-- Besser:
WHERE (p.to_remove IS NULL OR p.to_remove = false)

-- Oder noch besser - NUR excluden wenn true:
WHERE NOT COALESCE(p.to_remove, false)
```
