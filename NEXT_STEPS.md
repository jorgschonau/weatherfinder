# Next Steps 🚀

## Status: Weatherbit Bulk API implementiert ✅

Du hast jetzt ein **effizientes Backend-System** für 20.000+ Places mit Weatherbit.io!

---

## 🎯 Was jetzt zu tun ist:

### 1. Open-Meteo testen (PRIORITY) ⭐

```bash
# KEINE REGISTRIERUNG NÖTIG!
# Open-Meteo ist komplett frei und offen

# Einfach testen:
node scripts/test-open-meteo.js

# Expected Output:
# ✅ Current weather: 5 locations
# ✅ 16-day forecast
# ✅ Batch performance test
# 📊 Usage estimates
```

**Vorteile:**
- ✅ Kein API Key nötig
- ✅ Komplett kostenlos (Fair-Use 10k+ calls/day)
- ✅ 16-Day Forecast
- ✅ Sofort loslegen!

---

### 2. Supabase Setup (falls noch nicht geschehen)

```bash
# 1. Supabase Project erstellen
# Gehe zu: https://app.supabase.com

# 2. SQL Schema ausführen
# - Öffne SQL Editor in Supabase
# - Copy/Paste: supabase/schema.sql
# - Run

# 3. Supabase Keys in .env
# - Finde Keys in: Project Settings → API
echo "SUPABASE_URL=https://your-project.supabase.co" >> .env
echo "SUPABASE_ANON_KEY=eyJhbG..." >> .env
```

**Detailed Guide:** [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)

---

### 3. Erste Places importieren

**Option A: Quick Test (10 Places)**
```sql
-- In Supabase SQL Editor:
INSERT INTO places (name, latitude, longitude, country_code, region) VALUES
  ('Berlin', 52.52, 13.40, 'DE', 'europe'),
  ('Paris', 48.85, 2.35, 'FR', 'europe'),
  ('London', 51.51, -0.13, 'GB', 'europe'),
  ('Rome', 41.90, 12.50, 'IT', 'europe'),
  ('Madrid', 40.42, -3.70, 'ES', 'europe'),
  ('New York', 40.71, -74.01, 'US', 'north_america'),
  ('Los Angeles', 34.05, -118.24, 'US', 'north_america'),
  ('Toronto', 43.65, -79.38, 'CA', 'north_america'),
  ('Vancouver', 49.28, -123.12, 'CA', 'north_america'),
  ('Montreal', 45.50, -73.57, 'CA', 'north_america');
```

**Option B: Import from CSV/GeoNames**
- Siehe `PLACES_DATA_SOURCES.md`
- Kommt später!

---

### 4. Places Data importieren

**Option A: Starter Set (100 Places)**
```javascript
// scripts/import-starter-places.js
const STARTER_PLACES = [
  // Europa Top 50
  { name: 'Berlin', lat: 52.52, lon: 13.40, country_code: 'DE' },
  { name: 'Paris', lat: 48.85, lon: 2.35, country_code: 'FR' },
  // ... mehr
  
  // Nordamerika Top 50
  { name: 'New York', lat: 40.71, lon: -74.01, country_code: 'US' },
  { name: 'Toronto', lat: 43.65, lon: -79.38, country_code: 'CA' },
  // ... mehr
];

// Import to Supabase
await supabase.from('places').insert(STARTER_PLACES);
```

**Option B: Full Set (20k Places)**
- GeoNames Import (siehe `PLACES_DATA_SOURCES.md`)
- Kommt später, erstmal mit Starter Set testen!

---

### 5. Ersten Bulk Update durchführen

```javascript
// In einer Node.js Umgebung oder Edge Function:
import { updateAllPlacesBatch } from './src/services/weatherbitService';

// Update alle Places
const result = await updateAllPlacesBatch();

console.log(result);
// {
//   totalSuccess: 100,
//   totalFailed: 0,
//   batches: 1,
//   calls: 2
// }
```

**Expected:**
- Duration: ~10 seconds für 100 places
- API Calls: 2 (1 batch × 2 calls)
- Success: All places updated

---

### 6. Cron Jobs einrichten (2x täglich)

**Supabase Edge Function erstellen:**

```bash
# Create edge function
supabase functions new update-weather

# Deploy
supabase functions deploy update-weather
```

**Cron Schedule in Supabase SQL:**

```sql
-- Morning update (6 AM)
SELECT cron.schedule(
  'weather-update-morning',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/update-weather',
      headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    );
  $$
);

-- Evening update (6 PM)
SELECT cron.schedule(
  'weather-update-evening',
  '0 18 * * *',
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/update-weather',
      headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    );
  $$
);
```

**Detailed Guide:** [`WEATHERBIT_SETUP.md`](./WEATHERBIT_SETUP.md)

---

### 7. App testen

```bash
# Start App
npm start

# 1. Login/Register
# 2. Map öffnen
# 3. Place suchen → Weather sollte angezeigt werden
# 4. Favoriten speichern
```

**Expected:**
- ✅ Weather data from database (wenn vorhanden)
- ✅ Fallback zu OpenWeatherMap (wenn nicht in DB)
- ✅ Favorites speichern funktioniert

---

## 📋 Checklist

**Setup:**
- [ ] Weatherbit Account + Developer Plan
- [ ] API Key in `.env`
- [ ] Test Script erfolgreich (`node scripts/test-weatherbit.js`)
- [ ] Supabase Project erstellt
- [ ] Schema deployed (`supabase/schema.sql`)
- [ ] Supabase Keys in `.env`

**Data:**
- [ ] Starter Places importiert (100)
- [ ] Ersten Bulk Update durchgeführt
- [ ] Weather data in DB sichtbar

**Automation:**
- [ ] Edge Function erstellt
- [ ] Cron Jobs konfiguriert
- [ ] Morning update getestet
- [ ] Evening update getestet

**App:**
- [ ] App startet ohne Fehler
- [ ] Login funktioniert
- [ ] Weather wird angezeigt
- [ ] Favorites funktionieren

---

## 🎯 Später (nach Basic Setup):

### Phase 2: Rich Place Data
- GeoNames Import (Ortsgröße, Höhe, Typ)
- Natural Earth (Küsten-Distanz)
- OSM Campsite Data
- **Guide:** [`PLACES_DATA_SOURCES.md`](./PLACES_DATA_SOURCES.md)

### Phase 3: UI/UX Improvements
- Weather trends (7-day stability)
- Historical comparison
- Better filters (terrain, coast, camping)

### Phase 4: Scale to 20k Places
- Bulk GeoNames import
- Full EU + NA coverage
- Optimized queries

---

## 🆘 Troubleshooting

### "Weatherbit API Error 403"
→ API Key falsch oder Plan nicht aktiv

### "Supabase connection failed"
→ Check `.env`: SUPABASE_URL und SUPABASE_ANON_KEY

### "RLS policy error"
→ Schema korrekt deployed? RLS policies vorhanden?

### "No weather data shown"
→ Bulk update durchgeführt? Places in DB?

---

## 📚 Documentation

- [`WEATHERBIT_SETUP.md`](./WEATHERBIT_SETUP.md) - Weatherbit Bulk API Details
- [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) - Supabase Database Setup
- [`PLACES_DATA_SOURCES.md`](./PLACES_DATA_SOURCES.md) - Rich Place Data (später)
- [`README.md`](./README.md) - App Overview

---

## 💬 Questions?

1. Check documentation first
2. Review error messages
3. Test mit `test-weatherbit.js`
4. Check Supabase logs

---

**Status:** 🚀 Ready to start!

**First Step:** Get Weatherbit API Key and run test!

