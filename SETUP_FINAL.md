# SunNomad - Final Setup: Maximum Weather Data 🌦️

## 🎯 Was du bekommst:

```
✅ 16 Tage Forecast (OpenWeatherMap One Call API 3.0)
✅ 60 Tage historische Wetterdaten
✅ 30-60 Tage Trend-Analysen
✅ Tägliche Zusammenfassungen
✅ Vergleiche zwischen Orten
✅ User Accounts & Favoriten
```

---

## 📊 Datenbank Schema

### Wetterdaten
- **weather_data**: 60 Tage detaillierte Daten (alle 1-3h)
- **daily_weather_summary**: 60 Tage Tages-Zusammenfassungen
- **weather_forecast**: 16 Tage Vorhersage

### User Data
- **profiles**: User Accounts
- **places**: Orte/Städte
- **favourites**: Gespeicherte Favoriten

---

## 🚀 Setup

### 1. Supabase Projekt erstellen

1. Gehe zu [app.supabase.com](https://app.supabase.com)
2. Erstelle neues Projekt "SunNomad"
3. Warte 2 Minuten

### 2. SQL Schema importieren

1. Gehe zu **SQL Editor**
2. Kopiere `supabase/schema.sql`
3. **RUN** → Fertig!

### 3. API Keys

**OpenWeatherMap:**
- Gehe zu [openweathermap.org](https://openweathermap.org/api)
- Benötigt: **One Call API 3.0** (für 16-Tage Forecast)
- Plan: Professional ($40/Monat) ODER Daily (~1.000 Calls/Tag Free)

**Supabase:**
- Settings → API → Kopiere:
  - Project URL
  - anon/public key

### 4. .env Datei

```bash
# OpenWeatherMap
OPENWEATHERMAP_API_KEY=dein_key_hier

# Supabase
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
```

### 5. Cron Jobs einrichten (optional)

In Supabase Dashboard → Database → Cron Jobs:

```sql
-- 1. Cleanup alte Daten (täglich 3 Uhr nachts)
SELECT cron.schedule(
  'clean-old-weather',
  '0 3 * * *',
  'SELECT clean_old_weather_data()'
);

-- 2. Daily Summaries (täglich 1 Uhr nachts)
SELECT cron.schedule(
  'aggregate-daily-weather',
  '0 1 * * *',
  $$
    SELECT aggregate_daily_weather(place_id, CURRENT_DATE - 1)
    FROM places WHERE is_active = true;
  $$
);
```

**Weather Updates passieren automatisch on-demand** (2x täglich wenn User die App nutzt).
Cron Jobs nur für Cleanup & Aggregation!

---

## 📡 OpenWeatherMap One Call API 3.0

### Was du bekommst:

```javascript
// EINE API Call = ALLES:
{
  current: { /* Aktuelles Wetter */ },
  minutely: [ /* 60 Min Forecast */ ],
  hourly: [ /* 48h Forecast */ ],
  daily: [ /* 8-16 Tage Forecast */ ],
  alerts: [ /* Wetter-Warnungen */ ]
}
```

### API Call:

```javascript
const response = await fetch(
  `https://api.openweathermap.org/data/3.0/onecall?` +
  `lat=${lat}&lon=${lon}` +
  `&appid=${API_KEY}` +
  `&units=metric` +
  `&lang=de`
);

const data = await response.json();

// Current Weather → weather_data
await weatherDataService.saveWeatherData(placeId, data.current);

// 16-day Forecast → weather_forecast  
await weatherDataService.saveWeatherForecast(placeId, data.daily);
```

### Limits:

- **Free**: 1.000 Calls/Tag (One Call Daily)
- **Professional**: $40/Monat, 60 Calls/Min

---

## 💾 Speicherplatz (100 Places)

```
weather_data:        100 × 60 Tage × 8/Tag = ~48.000 Records
daily_summary:       100 × 60 Tage = ~6.000 Records
weather_forecast:    100 × 16 Tage = ~1.600 Records
places:              ~100 Records
favourites:          ~1.000 Records

TOTAL: ~57.000 Records ≈ 15-20 MB
```

**Supabase Free Tier: 500 MB** → Easy! ✅

---

## 🎨 Features die du bauen kannst

### 1. 16-Tage Forecast anzeigen
```javascript
const { forecast } = await weatherDataService.getWeatherForecast(placeId);
// Zeige nächste 2 Wochen
```

### 2. 30-Tage Trends
```javascript
const { trends } = await dailyWeatherService.get30DayTrends(placeId);
console.log(trends);
/*
{
  temp_30d_avg: 22.5,
  rainy_days_30d: 8,
  sunny_days_30d: 18,
  ...
}
*/
```

### 3. Orte vergleichen
```javascript
const { comparison } = await dailyWeatherService.comparePlaces(
  'berlin-id',
  'munich-id'
);
// "München ist 3.2°C wärmer"
// "Berlin hatte 5 Regentage mehr"
```

### 4. Temperatur-Chart (letzte 30 Tage)
```javascript
const { summaries } = await dailyWeatherService.getDailySummaries(placeId, 30);
// Render Chart mit min/max/avg pro Tag
```

### 5. "War Wetter stabil?"
```javascript
// Check Temperatur-Schwankungen
const stddev = calculateStdDev(summaries.map(s => s.temp_avg));
if (stddev < 3) {
  return "Sehr stabil! ✅";
}
```

---

## 🔄 Workflow

### User sucht Wetter für einen Ort:

```
1. App → weatherProvider.fetchWeather(lat, lon)
2. Check: weather_data < 12h alt? → Zeige Cache ✅
3. Nein? → OpenWeatherMap One Call API
4. Speichere current → weather_data
5. Speichere daily[0-15] → weather_forecast
6. Zeige User
```

**Cache-Strategie: 12 Stunden = 2x täglich Update**
- Morgens (6-8 Uhr): User checkt Wetter → Update
- Abends (18-20 Uhr): User plant Reise → Update
- Dazwischen: Cache verwenden (spart API Calls!)

**API Calls sparen:**
- 100 Places × 2 Updates/Tag = **200 Calls/Tag**
- OpenWeatherMap Free: 1.000 Calls/Tag → Easy! ✅

### Täglicher Aggregation Job (1 Uhr nachts):

```
1. Supabase Cron Job läuft
2. aggregate_daily_weather() für alle Places
3. Nimmt alle weather_data vom Vortag
4. Berechnet Min/Max/Avg
5. Speichert in daily_weather_summary
```

---

## 🎯 Was unterscheidet das von "Option 1 (Minimal)"?

| Feature | Option 1 (Minimal) | JETZT (Maximum) |
|---------|-------------------|-----------------|
| Forecast | 7 Tage | **16 Tage** ✨ |
| Historie | 7 Tage | **60 Tage** ✨ |
| Daily Summary | ❌ Keine | ✅ 60 Tage |
| Trends | ❌ | ✅ 30-60 Tage |
| Orts-Vergleich | ❌ | ✅ Ja |
| Charts | Sehr limitiert | ✅ Voll möglich |
| DB Size (100 Places) | ~3-5 MB | ~15-20 MB |

---

## 💡 Pro Tipps

### 1. Batch API Calls
Nicht für jeden Ort einzeln callen:
```javascript
// Priorität: User's Favoriten zuerst
const favPlaces = await getFavouritePlaces();
for (const place of favPlaces) {
  await fetchAndCacheWeather(place.id);
  await sleep(100); // Rate limiting
}
```

### 2. Smart Caching (12h = 2x täglich)
```javascript
const { isFresh, weather } = await weatherDataService.isWeatherFresh(placeId);
if (isFresh) {
  return weather; // Spare API Call! Cache < 12h
}
// Nur wenn Cache > 12h alt: Neuer API Call
```

### 3. Forecast auch 2x täglich
```javascript
// Forecast Cache: 12h
const lastFetch = await getLastForecastFetch(placeId);
if (Date.now() - lastFetch < 12 * 60 * 60 * 1000) { // 12h
  return cachedForecast; // Spare API Call
}
```

---

## 🔮 Optional: Historische Daten importieren

Falls du sofort 30-60 Tage Historie willst:

### OpenWeatherMap History API
```javascript
// Für jeden der letzten 60 Tage:
for (let i = 0; i < 60; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const timestamp = Math.floor(date.getTime() / 1000);
  
  const response = await fetch(
    `https://api.openweathermap.org/data/3.0/onecall/timemachine?` +
    `lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${key}`
  );
  
  const data = await response.json();
  await weatherDataService.saveWeatherData(placeId, data.data[0]);
}

// Dann aggregieren
for (let i = 0; i < 60; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  await dailyWeatherService.aggregateDailyWeather(placeId, date);
}
```

**Achtung:** History API kostet extra oder begrenzte Free Calls!

---

## 📝 Checklist

- [ ] Supabase Projekt erstellt
- [ ] SQL Schema importiert
- [ ] OpenWeatherMap One Call API Key
- [ ] .env Datei konfiguriert
- [ ] Cron Jobs eingerichtet
- [ ] App gestartet & getestet
- [ ] Erste Weather Daten gespeichert
- [ ] Daily Summary generiert

---

**Du hast jetzt MAXIMUM WETTERDATEN!** 🌞🌧️⛈️❄️

16 Tage Forecast + 60 Tage Historie = Perfekt für Reiseplanung! 🚐


