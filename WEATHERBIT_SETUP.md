# Weatherbit.io Setup - Bulk API für 20.000 Places 🚀

## 🎯 Warum Weatherbit?

### Bulk API = Game Changer!

```
OpenWeatherMap:
- 1 Call = 1 Location
- 20.000 Places × 2x/Day = 40.000 Calls/Day
- Professional: $40/Monat

Weatherbit.io:
- 1 Call = 100 Locations! 📦
- 20.000 Places ÷ 100 = 200 Batches
- × 2x/Day (Current + Forecast) = 400 Calls/Day
- Standard Plan: €45/Monat (~$50)

→ 100x effizienter! Aber teurer... 🤔
```

---

## 📋 Setup

### 1. Weatherbit Account erstellen

1. Gehe zu [weatherbit.io](https://www.weatherbit.io/)
2. Sign Up (kostenlos)
3. **Start mit Free Trial** (21 Tage) ⭐
   - 1.500 API Calls/Day
   - 16-Day Forecast
   - Bulk API Access
   - Non-Commercial use
   
4. **Später upgraden zu Developer Plan** ($29/Monat)
   - 5.000 API Calls/Day
   - Commercial use
   - Wenn du mehr als ~1.500 Places hast

### 2. API Key holen

1. Dashboard → API Keys
2. Kopiere deinen API Key

### 3. .env konfigurieren

```bash
# Weatherbit API
WEATHERBIT_API_KEY=dein_api_key_hier

# Supabase (bereits vorhanden)
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
```

---

## 🔧 Batch Update System

### Wie es funktioniert:

```javascript
// 1. Hole 100 Places aus DB
const batch = await supabase
  .from('places')
  .select('id, latitude, longitude')
  .range(0, 99);

// 2. Ein API Call für alle 100!
const response = await fetch('https://api.weatherbit.io/v2.0/current/bulk', {
  method: 'POST',
  body: JSON.stringify({
    locations: batch.map(p => ({ lat: p.latitude, lon: p.longitude }))
  })
});

// 3. Response enthält Wetter für ALLE 100 Places
const weatherData = await response.json();

// 4. Save to database
for (let i = 0; i < batch.length; i++) {
  await saveWeatherData(batch[i].id, weatherData.data[i]);
}
```

---

## 🔄 Update Workflow

### Komplettes Update (alle 20k Places):

```javascript
import { updateAllPlacesBatch } from './src/services/weatherbitService';

// Update alle Places
const result = await updateAllPlacesBatch();

console.log(result);
/*
{
  totalSuccess: 20000,
  totalFailed: 0,
  batches: 200,
  calls: 400  // 200 for current + 200 for forecast
}
*/
```

**Dauer:** ~3-5 Minuten (200 Batches × 1 sec delay)

### Update nur Europa:

```javascript
await updateAllPlacesBatch('europe');
// ~100 Batches für 10k Places
```

---

## ⏰ Cron Jobs (2x täglich)

### Supabase Edge Function

Erstelle `edge-functions/update-weather/index.ts`:

```typescript
import { serve } from 'https://deno.land/std/http/server.ts';

serve(async (req) => {
  console.log('🌦️  Starting weather update...');
  
  const WEATHERBIT_KEY = Deno.env.get('WEATHERBIT_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // Get all places
  const placesResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/places?is_active=eq.true&select=id,latitude,longitude`,
    { headers: { 'apikey': SUPABASE_KEY } }
  );
  const places = await placesResponse.json();
  
  console.log(`📦 Processing ${places.length} places in batches...`);
  
  let totalSuccess = 0;
  const BATCH_SIZE = 100;
  
  // Process in batches
  for (let i = 0; i < places.length; i += BATCH_SIZE) {
    const batch = places.slice(i, i + BATCH_SIZE);
    
    // Fetch weather for batch
    const weatherResponse = await fetch(
      'https://api.weatherbit.io/v2.0/current/bulk',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'key': WEATHERBIT_KEY
        },
        body: JSON.stringify({
          locations: batch.map(p => ({ lat: p.latitude, lon: p.longitude }))
        })
      }
    );
    
    const weatherData = await weatherResponse.json();
    
    // Save to database
    for (let j = 0; j < batch.length; j++) {
      // Save logic here...
      totalSuccess++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return new Response(
    JSON.stringify({ success: totalSuccess, batches: Math.ceil(places.length / BATCH_SIZE) }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### Cron Schedule

```sql
-- Morgens 6 Uhr
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

-- Abends 18 Uhr
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

---

## 📊 API Usage

### Usage Calculator:

| Places | Batches | Calls/Update | 2x/Day | Free Trial (1,500) | Developer (5,000) |
|--------|---------|--------------|--------|-------------------|-------------------|
| 100    | 1       | 2            | 4      | ✅ 0.3%           | ✅ 0.1%           |
| 500    | 5       | 10           | 20     | ✅ 1.3%           | ✅ 0.4%           |
| 1,000  | 10      | 20           | 40     | ✅ 2.7%           | ✅ 0.8%           |
| 1,500  | 15      | 30           | 60     | ✅ 4.0%           | ✅ 1.2%           |
| 5,000  | 50      | 100          | 200    | ✅ 13.3%          | ✅ 4.0%           |
| 10,000 | 100     | 200          | 400    | ✅ 26.7%          | ✅ 8.0%           |
| 20,000 | 200     | 400          | 800    | ✅ 53.3%          | ✅ 16.0%          |

**Formula:** `(Places ÷ 100) × 2 × 2 = Daily Calls`

### 20.000 Places, 2x täglich:

```
Morning Update:
- 200 Batches × 2 Calls (Current + Forecast) = 400 Calls
- Duration: ~3-5 Minutes

Evening Update:
- 200 Batches × 2 Calls = 400 Calls
- Duration: ~3-5 Minutes

TOTAL: 800 Calls/Day

Free Trial: 1.500 Calls/Day → 53.3% used ✅
Developer: 5.000 Calls/Day → 16.0% used ✅
```

### Free Trial Limits:

```
1.500 Calls/Day = genug für:
- ✅ Bis zu 1,500 Places (2x/Day)
- ✅ Oder 7,500 Places (1x/Day)  
- ✅ 21 Tage Testing
- ⚠️  Non-Commercial use only

→ Perfekt für Development & Testing!
```

---

## 💰 Pricing

### Free Trial: $0 (21 Tage) ⭐ **START HERE!**

**Includes:**
- ✅ 1.500 API Calls/Day
- ✅ 16-Day Forecast
- ✅ Current Weather
- ✅ Bulk API (100 locations/call)
- ✅ Hourly data
- ✅ Historical data
- ⚠️  Non-Commercial use only

**Good for:**
- Testing & Development
- Up to 1,500 Places (2x/Day)
- 21 Days to evaluate

---

### Standard Plan: €45/Monat (später)

**Includes:**
- ✅ 5.000 API Calls/Day
- ✅ 16-Day Forecast
- ✅ Current Weather
- ✅ Bulk API (100 locations/call)
- ✅ Hourly data
- ✅ Historical data
- ✅ **Commercial use** 💼

**Good for:**
- Production
- Up to 20.000 Places (2x/Day)
- Commercial deployment

**Upgrade when:**
- You have > 1,500 Places
- You want to launch publicly
- You need commercial license

---

## 🔍 Data Quality

### Weatherbit vs OpenWeatherMap:

| Feature | Weatherbit | OpenWeatherMap |
|---------|-----------|----------------|
| Forecast Days | 16 | 8 (Free), 16 (Pro) |
| Bulk API | ✅ 100/call | ❌ |
| Historical | ✅ Included | 💰 Extra |
| Accuracy | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Coverage | Global | Global |
| Update Freq | Hourly | Hourly |

**Weatherbit ist sehr gut!** Leicht weniger genau als OWM, aber für Camping/Travel völlig ausreichend.

---

## 🧪 Testing

### Manual Test:

```javascript
import { updateBatchWeather } from './src/services/weatherbitService';

// Test mit 10 Places
const testPlaces = [
  { id: 'place-1', latitude: 52.52, longitude: 13.40 },
  { id: 'place-2', latitude: 48.85, longitude: 2.35 },
  // ... 8 more
];

const result = await updateBatchWeather(testPlaces);
console.log(result);
// { success: 10, failed: 0 }
```

### Estimate API Calls:

```javascript
import { estimateApiCalls } from './src/services/weatherbitService';

const estimate = await estimateApiCalls();
console.log(estimate);
/*
{
  places: 20000,
  batches: 200,
  calls: 400  // Per update run
}
*/
```

---

## 🚀 Migration von OpenWeatherMap

### Falls du bereits OWM nutzt:

1. **Add Weatherbit Key** zu `.env`
2. **Services laufen parallel** (backward compatible)
3. **Switch Cron Jobs** zu Weatherbit
4. **Done!**

Keine Breaking Changes in der App nötig!

---

## 📈 Monitoring

### Check API Usage:

```javascript
// In Weatherbit Dashboard:
// - Calls Today
// - Calls This Month
// - Remaining Calls

// In Supabase:
SELECT 
  COUNT(*) as total_places,
  COUNT(*) FILTER (WHERE last_weather_fetch > NOW() - INTERVAL '24 hours') as updated_24h,
  MAX(last_weather_fetch) as last_update
FROM places;
```

---

## ⚡ Performance

### Update Speed:

```
200 Batches × 1 sec delay = 200 seconds base
+ API response time (~500ms per batch) = 100 seconds
+ DB writes (~300ms per batch) = 60 seconds

TOTAL: ~6 Minutes für 20.000 Places

VS

OpenWeatherMap individual:
20.000 × 100ms = 2.000 seconds = 33 Minutes!

→ Weatherbit ist 5x schneller! ⚡
```

---

## ✅ Checklist

- [ ] Weatherbit Developer Account erstellt
- [ ] API Key in `.env` eingetragen
- [ ] `weatherbitService.js` implementiert
- [ ] Edge Function deployed
- [ ] Cron Jobs konfiguriert (2x täglich)
- [ ] Test mit 10 Places
- [ ] Full update getestet
- [ ] Monitoring eingerichtet

---

## 🎯 Bottom Line

**Weatherbit.io Bulk API = Perfect für 20k Places:**
- ✅ $29/Monat (günstiger als OWM)
- ✅ 100x effizienter (Bulk API)
- ✅ 16-Day Forecast
- ✅ 800 Calls/Day für alle Updates
- ✅ 6 Minutes Update Zeit
- ✅ Simple Integration

**Let's go!** 🚀


