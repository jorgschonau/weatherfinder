# ✅ Migration Checklist - Ready to Execute!

All migration files are ready. Follow this checklist step-by-step.

---

## 📋 Files Created

✅ **Migration SQL**
- `supabase/openmeteo-migration.sql` - Database schema cleanup

✅ **Test Scripts**
- `scripts/test-openmeteo.js` - Test with 10 locations
- `scripts/refresh-all-weather.js` - Full refresh for all locations

✅ **Documentation**
- `SCHEMA_AUDIT_RESULTS.md` - Complete audit findings
- `MIGRATION_GUIDE.md` - Step-by-step migration guide
- `MIGRATION_COMPLETE_CHECKLIST.md` - This file!

---

## 🎯 Execute Migration (30 minutes total)

### Step 1: Run Migration SQL (5 min)

**Location:** Supabase Dashboard → SQL Editor

1. Open `supabase/openmeteo-migration.sql`
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click "Run"

**Expected:** `Success. No rows returned`

**What it does:**
- Drops unused columns (dew_point, visibility, etc.)
- Adds Open-Meteo columns (precipitation_sum, sunrise, sunset)
- Recreates views
- Updates cleanup function

**Rollback:** If issues occur, restore from backup

✅ **Done?** → Continue to Step 2

---

### Step 2: Test with 10 Locations (2 min)

**Command:**
```bash
node scripts/test-openmeteo.js
```

**Expected output:**
```
📍 Fetching 10 test places...
✅ Found 10 places to test

🌤️  Fetching: Berlin (DE)...
✅ Berlin:
   Current: 5°C, Partly cloudy
   Forecast: 7 days saved
   Tomorrow: 3°C - 7°C, Clear sky

... (9 more places) ...

╔═══════════════════════════════════════════════════╗
║   Test Summary                                    ║
╚═══════════════════════════════════════════════════╝

  ✅ Success: 10/10 locations
  ❌ Failed:  0/10 locations

🎉 Test successful! Open-Meteo API is working.
```

**If tests fail:**
- Check `.env` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Check Supabase RLS policies allow inserts
- Check internet connection

**Verify in Supabase:**
1. Go to Table Editor → `weather_data`
2. Check for new rows with `data_source = 'open-meteo'`
3. Go to Table Editor → `weather_forecast`
4. Check for forecast rows (should be ~70 rows = 10 places × 7 days)

✅ **Done?** → Continue to Step 3

---

### Step 3: Full Refresh - All Locations (10-20 min)

**Command:**
```bash
node scripts/refresh-all-weather.js
```

**Expected output:**
```
📍 Fetching all active places...
✅ Found 2000 places
📊 Expected API calls: 2000 (1 per location)
⏱️  Estimated time: ~600s

📦 Batch 1/100 (20 places)...
  ✅ Amsterdam: 8°C
  ✅ Barcelona: 15°C
  ✅ Berlin: 5°C
  📊 Success: 20/20

... (99 more batches) ...

╔═══════════════════════════════════════════════════╗
║   Summary                                         ║
╚═══════════════════════════════════════════════════╝

  ✅ Success:  2000/2000 locations
  ❌ Failed:   0/2000 locations
  📊 API Calls: 2000 (1 per location)
  ⏱️  Duration: 600s (3.3 locations/sec)

🎉 Weather refresh complete!
```

**Performance expectations:**
- 100 locations: ~30 seconds
- 500 locations: ~2 minutes
- 1000 locations: ~5 minutes
- 2000 locations: ~10 minutes

**Verify in Supabase:**
1. Check `weather_data` row count increased
2. Check `weather_forecast` row count (should be ~28,000 = 2000 × 14 days)
3. Spot-check a few locations have data

✅ **Done?** → Continue to Step 4

---

### Step 4: Verify in App (5 min)

1. **Restart app** to clear cache
2. **Open map screen**
   - [ ] Locations show weather data
   - [ ] Temperature displayed correctly
   - [ ] Weather icons match conditions
3. **Check badges**
   - [ ] Worth the Drive 🚗 (if any qualify)
   - [ ] Warm & Dry ☀️ (if any qualify)
   - [ ] Sunny Streak 🌞 (if any qualify)
   - [ ] Snow King ⛄ (if applicable)
4. **Open detail screen**
   - [ ] 14-day forecast displays
   - [ ] Daily min/max temps shown
   - [ ] Precipitation data visible

✅ **Done?** → Migration complete! 🎉

---

## 🔧 Post-Migration Setup

### Optional: Set up Daily Auto-Updates

**Option A: Manual** (run when needed)
```bash
node scripts/refresh-all-weather.js
```

**Option B: Cron Job** (automated daily)

Supabase Dashboard → Database → Cron Jobs:
```sql
SELECT cron.schedule(
  'refresh-weather-daily',
  '0 6 * * *',  -- Every day at 6 AM
  $$
  -- Call your edge function or backend service
  SELECT net.http_post(
    url := 'https://your-backend.com/refresh-weather'
  );
  $$
);
```

### Optional: Cleanup Old Data (Weekly)

```sql
SELECT clean_old_weather_data();
```

This keeps:
- Last 20 days of weather_data
- Last 2 days of weather_forecast

---

## 📊 What Changed? (Summary)

### Before Migration
- 30+ columns in `weather_data` (bloated)
- Missing Open-Meteo fields
- No structured migration
- Some OpenWeatherMap-specific columns

### After Migration
- 19 essential columns in `weather_data` (lean)
- All Open-Meteo fields mapped
- 14-day forecasts working
- All badges functional

### API Efficiency
- ✅ 1 API call per location (not 14!)
- ✅ Gets current + 14-day forecast in single call
- ✅ 2000 locations = 2000 API calls (efficient!)

---

## 🐛 Troubleshooting

### "No places found"
→ **Fix:** Import places first or check if places exist:
```sql
SELECT COUNT(*) FROM places WHERE is_active = true;
```

### "API error: 429 Too Many Requests"
→ **Fix:** Rate limited. Increase `RATE_LIMIT_DELAY` in script from 100ms to 200ms

### "Error: duplicate key value violates unique constraint"
→ **Fix:** Normal - means data already exists. Script will update it.

### "RLS policy violation"
→ **Fix:** Migration SQL should fix this. Re-run migration SQL Step 1.

### "Badges not calculating"
→ **Check:**
1. Forecast data exists: `SELECT COUNT(*) FROM weather_forecast`
2. Current weather data exists: `SELECT COUNT(*) FROM weather_data WHERE data_source = 'open-meteo'`
3. May need 24 hours of data for some badges (run refresh again tomorrow)

---

## 📈 Success Metrics

After migration, you should see:

**Database:**
- [ ] 2000+ rows in `weather_data` (1 per location)
- [ ] 28,000+ rows in `weather_forecast` (2000 × 14 days)
- [ ] All rows have `data_source = 'open-meteo'`
- [ ] Recent `weather_timestamp` (today's date)

**App:**
- [ ] Map loads with weather data on all locations
- [ ] Weather icons display correctly
- [ ] Temperatures accurate to Open-Meteo API
- [ ] Badges appear on qualifying locations
- [ ] Detail screen shows 14-day forecasts

**Performance:**
- [ ] API calls = number of locations (1:1 ratio)
- [ ] Refresh completes in reasonable time
- [ ] No rate limiting errors

---

## 🎉 You're Done!

Migration complete! Your weather app now uses:

✅ Clean Open-Meteo API integration
✅ Efficient 1-call-per-location approach
✅ 14-day forecasts for badges
✅ Lean database schema

**Next steps:**
- Set up daily auto-refresh
- Monitor API usage (should be <2000 calls/day)
- Enjoy your working weather app!

**Questions?** Check `MIGRATION_GUIDE.md` for detailed info.
