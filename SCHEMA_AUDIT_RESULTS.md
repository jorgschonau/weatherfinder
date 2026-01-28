# Schema Audit Results - Open-Meteo Migration

## Executive Summary

**Status**: ✅ Good foundation in place, needs cleanup and migration
**API Efficiency**: ✅ Already using 1 call per location (good!)
**Service**: ✅ `openMeteoService.js` already exists and is well-structured

---

## Current Tables

### 1. `weather_data` (Main Weather Storage)
- **Purpose**: Current weather + historical data (last 14-20 days)
- **Used By**: Map screen, badges, analytics
- **Data Source**: Open-Meteo API

### 2. `weather_forecast` (16-day Forecasts)
- **Purpose**: Daily forecasts for badges (Sunny Streak, Weather Miracle, etc.)
- **Used By**: Detail screen, badge calculations
- **Data Source**: Open-Meteo API

### 3. `places` (Locations)
- **Purpose**: Store location metadata
- **Status**: ✅ Good structure

### 4. `daily_weather_summary`
- **Status**: ❌ Already dropped (not needed)

### 5. `weather_history`
- **Status**: ❌ Doesn't exist (uses `weather_data` for history)

---

## Column Analysis

### weather_data - KEEP (Used by app)
```sql
✅ temperature, feels_like, temp_min, temp_max
✅ humidity, pressure (DECIMAL after migration)
✅ wind_speed, wind_deg, wind_gust
✅ clouds (accessed as cloud_cover in view)
✅ rain_1h, rain_3h, snow_1h, snow_3h, snow_24h
✅ weather_main, weather_description, weather_icon
✅ weather_timestamp, data_source
✅ stability_score (calculated by app)
```

### weather_data - DROP (Not used)
```sql
❌ dew_point (Open-Meteo doesn't provide)
❌ pressure_sea_level, pressure_ground_level (redundant with pressure)
❌ rain_24h (not from Open-Meteo)
❌ precipitation_probability (this is forecast-only)
❌ sunrise, sunset (not used by app currently)
❌ uv_index (not used, but Open-Meteo provides it)
❌ visibility (not used, but Open-Meteo provides it)
❌ comfort_score (not used)
```

### weather_forecast - KEEP
```sql
✅ forecast_timestamp, fetched_at
✅ temp_min, temp_max
✅ weather_main, weather_description, weather_icon
✅ wind_speed (wind_speed_max from Open-Meteo)
✅ rain_probability, rain_volume, snow_volume
✅ precipitation_probability (for badges)
```

### weather_forecast - DROP (Not used)
```sql
❌ temperature, feels_like (redundant - we have min/max)
❌ humidity, pressure (not used in forecasts)
❌ wind_deg, wind_gust (not critical for forecasts)
❌ clouds, visibility (not used)
❌ uv_index (not used)
```

### weather_forecast - ADD (Missing from Open-Meteo)
```sql
✨ precipitation_sum (Open-Meteo provides, app expects)
✨ sunrise, sunset (Open-Meteo provides in daily forecasts)
```

---

## Open-Meteo API Mapping

### Current Weather (✅ Already mapped)
```
Open-Meteo Field               → DB Column
-------------------------------------------
temperature_2m                 → temperature
apparent_temperature           → feels_like
relative_humidity_2m           → humidity
pressure_msl                   → pressure
wind_speed_10m                 → wind_speed
wind_direction_10m             → wind_deg
wind_gusts_10m                 → wind_gust
cloud_cover                    → clouds
rain                           → rain_1h
snowfall                       → snow_1h
weather_code                   → weather_main/description/icon
```

### Daily Forecast (✅ Already mapped)
```
Open-Meteo Field               → DB Column
-------------------------------------------
temperature_2m_max/min         → temp_max, temp_min
weather_code                   → weather_main/description/icon
precipitation_sum              → precipitation_sum (NEW)
rain_sum                       → rain_volume
snowfall_sum                   → snow_volume
precipitation_probability_max  → precipitation_probability, rain_probability
wind_speed_10m_max             → wind_speed
sunrise, sunset                → sunrise, sunset (NEW)
```

---

## Badge Data Requirements ✅

All badge calculations need:

1. **Current Weather** ✅
   - Temperature, feels_like, humidity, wind_speed
   - Clouds, precipitation, snow (1h, 3h, 24h)
   - Weather condition (main/description/icon)

2. **Forecast Data** (for multi-day badges) ✅
   - Daily temp min/max
   - Daily condition
   - Precipitation probability
   - Wind speed

3. **Historical Data** (for stability/analytics) ✅
   - Last 7-20 days of weather_data
   - For calculating: stability score, trends, recent rain

**Result**: ✅ All badge requirements are met with current schema!

---

## API Call Efficiency ✅

**Current Implementation** (`openMeteoService.js`):
```javascript
// ✅ ONE API call per location gets:
//    - Current weather (all fields)
//    - 16-day daily forecast
//    
// api.open-meteo.com/v1/forecast?
//   lat=X&lon=Y&forecast_days=16&
//   current=temp,humidity,wind,...&
//   daily=temp_max,temp_min,precip,...
```

**Efficiency**: ✅ Perfect! 1 call per location, not 14 calls.

---

## Migration Strategy

### Phase 1: Schema Cleanup (Safe - drops unused columns)
1. Drop unused columns from `weather_data`:
   - dew_point, pressure_sea_level, pressure_ground_level
   - rain_24h, precipitation_probability
   - sunrise, sunset, uv_index, visibility
   - comfort_score

2. Drop unused columns from `weather_forecast`:
   - temperature, feels_like, humidity, pressure
   - wind_deg, wind_gust, clouds, visibility, uv_index

3. Add missing columns to `weather_forecast`:
   - precipitation_sum (DECIMAL)
   - sunrise, sunset (TIMESTAMP)

### Phase 2: Update Views
- Recreate `places_with_latest_weather` (if it breaks)
- Update any queries that reference dropped columns

### Phase 3: Test
- Test with 10 locations
- Verify data saves correctly
- Check badges calculate properly

### Phase 4: Full Refresh
- Run `updateAllPlaces()` from `openMeteoService.js`
- Should be ~2000 API calls for all locations
- Monitor for errors

---

## Historical Data Strategy (Simple)

**Keep it pragmatic:**
- Recent data (last 14 days + next 16 days) in main tables
- App needs last 7-14 days for badge calculations anyway
- No archiving yet - implement later if table gets slow
- Clean old data with function: `clean_old_weather_data()` (keeps 20 days)

---

## Next Steps

1. ✅ Create migration SQL
2. Run migration in Supabase
3. Test with 10 locations
4. Full refresh (2000 locations)
5. Monitor & verify badges work

**Estimated Time**: Migration (5 min) + Test (10 min) + Full refresh (20 min) = 35 min total
