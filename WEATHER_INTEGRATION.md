# Weather Data Integration Guide

Dieser Guide erklärt, wie du die OpenWeatherMap Wetterdaten mit dem Supabase Backend integrierst.

## 🎯 Ziel

Aktuell holt die App Wetterdaten **live** von OpenWeatherMap bei jeder Suche. Das ist:
- ❌ Langsam
- ❌ Verschwendet API Calls
- ❌ Keine Historie/Trends

**Mit Backend**:
- ✅ Wetterdaten werden gecacht (< 3 Stunden = frisch)
- ✅ Historische Daten für Trends
- ✅ Weniger API Calls
- ✅ Schnellere App

## 📁 Relevante Dateien

### Services (bereits erstellt)
- `src/services/weatherDataService.js` - Wetterdaten CRUD
- `src/services/placesService.js` - Places Management

### Provider (muss angepasst werden)
- `src/providers/weatherProvider.js` - Aktuell nur OpenWeatherMap API

## 🔧 Integration Steps

### 1. Weather Provider erweitern

Füge in `weatherProvider.js` Caching-Logik hinzu:

```javascript
import * as weatherDataService from '../services/weatherDataService';
import * as placesService from '../services/placesService';

// Beim Abrufen von Wetterdaten:
async function fetchWeatherForLocation(lat, lon) {
  // 1. Place in DB finden/erstellen
  const { place } = await placesService.createOrGetPlace({
    name: `Location ${lat},${lon}`, // Oder von OpenWeatherMap Name
    latitude: lat,
    longitude: lon,
  });
  
  if (!place) {
    // Fallback: Direct API call
    return fetchFromOpenWeatherMap(lat, lon);
  }
  
  // 2. Check if cached weather is fresh
  const { isFresh, weather } = await weatherDataService.isWeatherFresh(place.id);
  
  if (isFresh) {
    // Use cached data
    return weather;
  }
  
  // 3. Fetch new data from API
  const apiData = await fetchFromOpenWeatherMap(lat, lon);
  
  // 4. Save to cache
  await weatherDataService.saveWeatherData(place.id, apiData);
  
  return apiData;
}
```

### 2. Forecast Caching

```javascript
async function fetchForecastForLocation(lat, lon) {
  const { place } = await placesService.createOrGetPlace({
    latitude: lat,
    longitude: lon,
    name: 'Location Name',
  });
  
  if (!place) {
    return fetchForecastFromAPI(lat, lon);
  }
  
  // Check if we have recent forecast (< 6 hours old)
  const { forecast } = await weatherDataService.getWeatherForecast(place.id, 3);
  
  if (forecast && forecast.length > 0) {
    const lastFetch = new Date(forecast[0].fetched_at);
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    
    if (lastFetch > sixHoursAgo) {
      return forecast; // Use cached
    }
  }
  
  // Fetch new forecast
  const apiForecast = await fetchForecastFromAPI(lat, lon);
  
  // Save to DB
  await weatherDataService.saveWeatherForecast(place.id, apiForecast.list);
  
  return apiForecast;
}
```

### 3. Favourites mit Weather Integration

In `FavouritesScreen.js`:

```javascript
import * as favouritesService from '../services/favouritesService';
import { useAuth } from '../contexts/AuthContext';

// Statt AsyncStorage:
const { isAuthenticated } = useAuth();

useEffect(() => {
  loadFavourites();
}, [isAuthenticated]);

const loadFavourites = async () => {
  if (isAuthenticated) {
    // Load from Supabase (mit aktuellen Wetterdaten!)
    const { favourites } = await favouritesService.getFavourites();
    setFavourites(favourites);
  } else {
    // Fallback: Local storage
    const local = await loadFavouritesFromAsyncStorage();
    setFavourites(local);
  }
};

const addToFavourites = async (destination) => {
  if (isAuthenticated) {
    // 1. Create/get place
    const { place } = await placesService.createOrGetPlace({
      name: destination.name,
      latitude: destination.lat,
      longitude: destination.lon,
    });
    
    // 2. Add to favourites
    await favouritesService.addFavourite(place.id);
  } else {
    // Local storage fallback
    await addToLocalFavourites(destination);
  }
};
```

## 📊 Views nutzen

Die Datenbank hat praktische Views:

### `places_with_latest_weather`
Zeigt Places mit aktuellsten Wetterdaten:

```javascript
const { data } = await supabase
  .from('places_with_latest_weather')
  .select('*')
  .eq('country_code', 'DE');

// data enthält Place + aktuelles Wetter in einem Object!
```

### `user_favourites_with_weather`
Zeigt User Favoriten mit Wetter:

```javascript
const { data } = await supabase
  .from('user_favourites_with_weather')
  .select('*')
  .eq('user_id', userId);

// Perfekt für FavouritesScreen!
```

## 🔄 Migration Strategy

### Phase 1: Parallel Running
- Backend läuft parallel
- App nutzt weiter OpenWeatherMap direkt
- Aber speichert Daten zusätzlich in DB

### Phase 2: Cache First
- App prüft erst DB Cache
- Nur bei Cache Miss: API Call

### Phase 3: Offline Support
- App zeigt gecachte Daten auch ohne Internet
- Background sync wenn online

## 🧹 Maintenance

### Alte Daten löschen

In Supabase Dashboard → Database → Cron Jobs:

```sql
-- Täglich um 3 Uhr alte Daten löschen
SELECT cron.schedule(
  'clean-old-weather',
  '0 3 * * *',
  'SELECT clean_old_weather_data()'
);
```

### Weather Refresh für populäre Orte

Edge Function die regelmäßig (z.B. alle 3h) populäre Orte aktualisiert:

```javascript
// Supabase Edge Function
import { serve } from 'https://deno.land/std/http/server.ts';

serve(async (req) => {
  // Get popular places
  const { data: places } = await supabase
    .from('places')
    .select('*')
    .order('favourite_count', { ascending: false })
    .limit(100);
  
  // Fetch weather for each
  for (const place of places) {
    const weather = await fetch(`https://api.openweathermap.org/...`);
    const data = await weather.json();
    
    await supabase
      .from('weather_data')
      .upsert({
        place_id: place.id,
        weather_timestamp: new Date(),
        temperature: data.main.temp,
        // ... more fields
      });
  }
  
  return new Response('OK');
});
```

Schedule via Cron:
```sql
SELECT cron.schedule(
  'refresh-popular-weather',
  '0 */3 * * *', -- Every 3 hours
  'SELECT net.http_post(url := ''https://your-edge-function.supabase.co'')'
);
```

## 💡 Best Practices

### 1. Cache Freshness
- **Current Weather**: 3 Stunden Cache OK
- **Forecast**: 6 Stunden Cache OK
- **Historical**: Never expire (für Trends)

### 2. Error Handling
```javascript
try {
  const { weather } = await weatherDataService.getLatestWeather(placeId);
  
  if (!weather) {
    // No cache → fetch from API
    return await fetchFromAPI();
  }
  
  return weather;
} catch (error) {
  // DB error → fallback to API
  console.error('DB error, using API fallback:', error);
  return await fetchFromAPI();
}
```

### 3. Batching
Wenn du viele Orte auf einmal brauchst:

```javascript
// Gut: Ein DB Call
const { weatherData } = await weatherDataService.getLatestWeatherForPlaces(
  placeIds
);

// Schlecht: N DB Calls
for (const placeId of placeIds) {
  await weatherDataService.getLatestWeather(placeId);
}
```

## 🎨 UI Improvements

Mit Backend kannst du coole Features bauen:

### Weather Trends
```javascript
const { history } = await weatherDataService.getWeatherHistory(placeId, 30);

// Zeige Chart: Temperatur letzte 30 Tage
```

### Best Time to Visit
```javascript
// Analysiere historische Daten
const bestMonths = analyzeHistoricalWeather(history);
// "This place is usually sunny in July-August"
```

### Weather Warnings
```javascript
// Wenn aktuelle Temp deutlich von Historie abweicht
if (currentTemp < historicalAvg - 10) {
  showWarning("Unusually cold for this time of year!");
}
```

## 📈 Performance

### Before (ohne Cache)
- API Call bei jeder Suche: ~500-1000ms
- 100 Orte = 100 API Calls = lange Wartezeit

### After (mit Cache)
- DB Query: ~50-100ms
- 100 Orte = 1 DB Query = schnell!
- API nur bei Cache Miss

## ❓ FAQ

**Q: Wann soll ich Places erstellen?**
A: Wenn User einen Ort als Favorit speichert ODER beim ersten Weather Fetch für diese Koordinaten.

**Q: Was wenn OpenWeatherMap API down ist?**
A: App zeigt gecachte Daten mit Hinweis "Last updated X hours ago".

**Q: Kostet das extra API Calls?**
A: Nein! Im Gegenteil - durch Caching **sparst** du API Calls.

**Q: Wie migriere ich bestehende Favourites?**
A: Beim ersten Login: Lese AsyncStorage, erstelle Places, speichere in DB.

---

Happy Coding! 🌞


