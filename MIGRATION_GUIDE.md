# Open-Meteo Migration Guide

**Simple, pragmatic migration to Open-Meteo API**

---

## What This Does

1. ✅ Cleans up unused columns (OpenWeatherMap leftovers)
2. ✅ Adds missing Open-Meteo columns
3. ✅ Keeps everything the app needs for badges
4. ✅ No overthinking - just makes it work

---

## Pre-Migration Checklist

- [ ] Read `SCHEMA_AUDIT_RESULTS.md` to understand what's changing
- [ ] Backup your database (Supabase Dashboard → Database → Backups)
- [ ] Check you have places in your database: `SELECT COUNT(*) FROM places`

---

## Step 1: Run Migration SQL

**Time: 2-5 minutes**

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/openmeteo-migration.sql`
3. Copy the entire file
4. Paste into SQL Editor
5. Click "Run"

**What it does:**
- Drops 10 unused columns from `weather_data`
- Drops 9 unused columns from `weather_forecast`
- Adds 3 missing columns for Open-Meteo (`precipitation_sum`, `sunrise`, `sunset`)
- Recreates views with new schema
- Updates cleanup function to keep 20 days of history

**Expected output:** `Success. No rows returned`

If you get errors about missing columns, that's OK - it means they were already dropped.

---

## Step 2: Test with 10 Locations

**Time: 1-2 minutes**

```bash
node scripts/test-openmeteo.js
```

This will:
- Fetch 10 random locations
- Get current weather + 7-day forecast
- Save to database
- Verify data saved correctly

**Expected output:**
```
✅ Success: 10/10 locations
🎉 Test successful! Open-Meteo API is working.
```

**If tests fail:**
- Check your `.env` file has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Check Supabase RLS policies allow inserts
- Check internet connection (Open-Meteo API is free, no key needed)

---

## Step 3: Full Refresh (All Locations, 14 Days)

**Time: Varies by location count**
- 100 locations: ~30 seconds
- 1000 locations: ~5 minutes
- 2000 locations: ~10 minutes

```bash
node scripts/refresh-all-weather.js
```

This will:
- Fetch ALL active places
- Get current weather + 14-day forecast for each
- Process in batches of 20 (parallel)
- Save to database
- Update `last_weather_fetch` timestamp

**Expected output:**
```
✅ Success: 2000/2000 locations
📊 API Calls: 2000 (1 per location)
⏱️  Duration: 600s (3.3 locations/sec)
🎉 Weather refresh complete!
```

**Performance:**
- 1 API call per location (not 14!)
- ~20 locations per second
- Total API calls = number of locations (efficient!)

---

## Step 4: Verify in App

**Time: 5 minutes**

1. **Restart your app** (to clear any cached data)
2. **Check map screen** - locations should have weather data
3. **Check badges** - should calculate correctly:
   - Worth the Drive 🚗
   - Warm & Dry ☀️
   - Sunny Streak 🌞
   - Snow King ⛄ (if applicable)
   - etc.
4. **Open detail screen** - should show 14-day forecast

**What to look for:**
- Temperature, wind, humidity displayed correctly
- Weather icons match conditions
- Forecasts show multiple days
- Badges appear on cards (if criteria met)

---

## Maintenance

### Daily Updates (Recommended)

**Option A: Manual** (when needed)
```bash
node scripts/refresh-all-weather.js
```

**Option B: Cron Job** (automated)

Set up in Supabase Dashboard → Database → Cron Jobs:

```sql
-- Update all places daily at 6 AM
SELECT cron.schedule(
  'refresh-weather-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-edge-function.supabase.co/refresh-weather',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

Or use your backend service to call `openMeteoService.updateAllPlaces()`.

### Cleanup Old Data (Recommended)

Run weekly to keep database lean:

```sql
SELECT clean_old_weather_data();
```

This keeps:
- Last 20 days of `weather_data` (for stability/trends)
- Last 2 days of `weather_forecast` (only recent forecasts)

---

## Troubleshooting

### "Error: No places found"
→ Import places first: Check if you have a places import script

### "API error: 429"
→ Rate limited. Increase `RATE_LIMIT_DELAY` in refresh script

### "Error: place_id not found"
→ RLS policies blocking inserts. Run migration SQL again to fix policies

### "Badges not showing"
→ Check forecast data exists: `SELECT COUNT(*) FROM weather_forecast`
→ May need historical data for some badges (run refresh, wait 24h, run again)

### "Temperature shows null"
→ Old data might still be there. Check `data_source = 'open-meteo'` in database

---

## API Limits (Open-Meteo)

**Free Tier:**
- 10,000 API calls per day
- No API key needed
- Fair use policy (be nice!)

**Our Usage:**
- 1 call per location per update
- 2000 locations = 2000 calls per update
- Daily updates = 2000 calls/day ✅ Well within limits!

**Rate Limiting:**
- Script uses 100ms delay between batches
- ~20 locations per second
- Respects free API (no hammering)

---

## What Changed?

### Before (OpenWeatherMap mess):
- 30+ columns in `weather_data`
- Many unused fields (dew_point, visibility, etc.)
- Missing Open-Meteo fields
- Multiple API calls per location (inefficient)

### After (Clean Open-Meteo):
- 19 essential columns in `weather_data`
- 11 essential columns in `weather_forecast`
- All badge requirements met
- 1 API call per location (efficient!)

---

## Summary

**Simple Weather App Needs:**
1. ✅ Current weather (temp, wind, condition)
2. ✅ 14-day forecasts (for badges)
3. ✅ Recent history (for stability/trends)
4. ✅ Efficient API usage (1 call per location)

**NASA-Level Complexity Not Needed:**
- ❌ Pressure at 3 different levels
- ❌ Dew point calculations
- ❌ UV index tracking
- ❌ Visibility measurements
- ❌ 60 days of daily summaries

**Result:** Clean, simple, working weather app. Good enough!

---

## Next Steps

1. Run migration SQL ✅
2. Test with 10 locations ✅
3. Full refresh (all locations) ✅
4. Verify in app ✅
5. Set up daily cron job (optional)
6. Done! 🎉

**Questions?** Check `SCHEMA_AUDIT_RESULTS.md` for technical details.
