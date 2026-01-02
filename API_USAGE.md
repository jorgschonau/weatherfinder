# OpenWeatherMap API Usage - Optimiert für 2x täglich

## 🎯 Strategie: Cache > API Calls

**Ziel:** Minimale API Calls bei maximaler Datenqualität

---

## ⏰ Update-Frequenz: 2x täglich

### Warum 2x täglich perfekt ist:

✅ **Wetter ändert sich nicht stündlich**
- Vorhersagen bleiben 6-12h relativ stabil
- Für Reiseplanung reicht 2x/Tag völlig

✅ **Spart API Calls**
- Statt 8-24x täglich: Nur 2x
- 12x weniger Calls! 💰

✅ **User Experience bleibt gut**
- Cache < 12h ist "frisch genug"
- Niemand braucht Echtzeit-Wetter für Camping-Planung

---

## 📊 API Call Berechnung

### Szenario: 100 Places in der DB

**Mit 2x täglich Update:**
```
100 Places × 2 Updates/Tag = 200 Calls/Tag
× 30 Tage = 6.000 Calls/Monat
```

**OpenWeatherMap Limits:**
- Free Tier: 1.000 Calls/Tag = ✅ **Reicht locker!**
- Pro Tier ($40/Monat): 60 Calls/Min = ✅ **Mega Overkill**

**Mit 8x täglich Update (alle 3h):**
```
100 Places × 8 Updates/Tag = 800 Calls/Tag
× 30 Tage = 24.000 Calls/Monat
```
→ Nah am Free Tier Limit! Unnötig! ❌

---

## 🕐 Optimale Update-Zeiten

### Empfehlung:

**Morgens: 6-8 Uhr**
- User checkt Wetter für heute
- Plant den Tag

**Abends: 18-20 Uhr**  
- User plant nächste Reise
- Checkt Forecast für Wochenende

### Im Code:

```javascript
// In weatherProvider.js
async function fetchWeatherForPlace(placeId) {
  // 1. Check Cache
  const { isFresh, weather } = await weatherDataService.isWeatherFresh(placeId);
  
  if (isFresh) {
    console.log('✅ Using cache (< 12h old)');
    return weather;
  }
  
  // 2. Cache zu alt → API Call
  console.log('🌐 Fetching fresh data from API');
  const apiData = await fetchFromOpenWeatherMap(lat, lon);
  
  // 3. Speichern
  await weatherDataService.saveWeatherData(placeId, apiData.current);
  await weatherDataService.saveWeatherForecast(placeId, apiData.daily);
  
  return apiData.current;
}
```

---

## 🚀 Proaktives Caching (Optional)

Für populäre Orte kannst du proaktiv updaten:

### Supabase Edge Function

```javascript
// edge-functions/update-popular-weather.js

import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // Hole Top 50 favorisierte Orte
  const { data: places } = await supabase
    .from('places')
    .select('*')
    .order('favourite_count', { ascending: false })
    .limit(50);
  
  for (const place of places) {
    // Fetch von OpenWeatherMap
    const response = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?` +
      `lat=${place.latitude}&lon=${place.longitude}&appid=${OWM_KEY}`
    );
    const data = await response.json();
    
    // Speichere in DB
    await saveWeatherData(place.id, data);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return new Response('OK - Updated 50 places');
});
```

### Cron Schedule

```sql
-- Morgens um 6 Uhr
SELECT cron.schedule(
  'update-popular-weather-morning',
  '0 6 * * *',
  'SELECT net.http_post(url := ''https://your-function.supabase.co/update-popular-weather'')'
);

-- Abends um 18 Uhr
SELECT cron.schedule(
  'update-popular-weather-evening',
  '0 18 * * *',
  'SELECT net.http_post(url := ''https://your-function.supabase.co/update-popular-weather'')'
);
```

**API Calls:** 50 Places × 2x/Tag = 100 Calls/Tag (nur populäre Orte)

---

## 💡 Smart Strategies

### 1. Priorität für Favoriten

```javascript
// User öffnet App → Update zuerst seine Favoriten
async function updateUserFavourites(userId) {
  const { favourites } = await getFavourites(userId);
  
  for (const fav of favourites) {
    const { isFresh } = await isWeatherFresh(fav.place_id);
    if (!isFresh) {
      await fetchWeatherForPlace(fav.place_id);
    }
  }
}
```

### 2. Lazy Loading

```javascript
// Nur updaten wenn User den Ort wirklich anschaut
onPlaceClick(place) {
  const { isFresh, weather } = await isWeatherFresh(place.id);
  
  if (isFresh) {
    showWeather(weather); // Instant!
  } else {
    showLoadingSpinner();
    const freshWeather = await fetchWeatherForPlace(place.id);
    showWeather(freshWeather);
  }
}
```

### 3. Background Sync (Optional)

```javascript
// React Native Background Fetch
import BackgroundFetch from 'react-native-background-fetch';

BackgroundFetch.configure({
  minimumFetchInterval: 720, // 12 Stunden
  stopOnTerminate: false,
}, async (taskId) => {
  console.log('🔄 Background weather update');
  await updateUserFavourites(currentUserId);
  BackgroundFetch.finish(taskId);
});
```

---

## 📈 Monitoring

### API Usage tracken

```javascript
// In weatherDataService.js
let apiCallCount = 0;

export async function trackApiCall() {
  apiCallCount++;
  
  // Log to Supabase
  await supabase.from('api_usage').insert({
    timestamp: new Date(),
    service: 'openweathermap',
    endpoint: 'onecall',
  });
  
  console.log(`📊 API Calls today: ${apiCallCount}`);
}
```

### Supabase Dashboard Query

```sql
-- API Calls heute
SELECT COUNT(*) 
FROM api_usage 
WHERE timestamp >= CURRENT_DATE;

-- API Calls pro Tag (letzte 30 Tage)
SELECT DATE(timestamp) as date, COUNT(*) as calls
FROM api_usage
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

---

## 🎯 Empfohlene Limits

### Für verschiedene App-Größen:

| Places in DB | Updates/Tag | Calls/Tag | Plan |
|--------------|-------------|-----------|------|
| 50 | 2x | 100 | Free ✅ |
| 100 | 2x | 200 | Free ✅ |
| 500 | 2x | 1.000 | Free ✅ |
| 1.000 | 2x | 2.000 | Pro ($40) |
| 5.000 | 2x | 10.000 | Pro ($40) |

**Bottom Line:** Mit 2x täglich kommst du **sehr weit** mit Free Tier!

---

## ⚡ Performance

### Cache Hit Rate

Mit 2x täglich (12h Cache):

```
User Request am:
- 07:00 → Fresh API Call ✅
- 10:00 → Cache Hit ✅ (3h alt)
- 14:00 → Cache Hit ✅ (7h alt)
- 19:00 → Fresh API Call ✅ (>12h alt)
- 21:00 → Cache Hit ✅ (2h alt)

Cache Hit Rate: 60% 🎯
API Savings: 60% weniger Calls!
```

---

## 🔮 Future: Forecast Updates

Forecast ändert sich noch seltener:

```javascript
// Forecast nur 1x täglich updaten (morgens)
const FORECAST_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h

export const isForecastFresh = async (placeId) => {
  const { forecast } = await getLatestForecast(placeId);
  if (!forecast) return { isFresh: false };
  
  const age = Date.now() - new Date(forecast.fetched_at).getTime();
  return {
    isFresh: age < FORECAST_CACHE_DURATION,
    forecast,
  };
};
```

**API Savings:** 50% weniger Calls für Forecast!

---

## ✅ Zusammenfassung

**2x täglich = Sweet Spot:**
- ✅ Genug Updates für gute UX
- ✅ Minimal API Calls (kosteneffizient)
- ✅ Einfach zu implementieren
- ✅ Skaliert bis 500+ Places im Free Tier

**Start simple, optimize later!** 🚀


