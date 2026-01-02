# SunNomad Architecture - Minimal Setup

## 🎯 Focus: Wettervorhersage für Camper

Die App ist **minimal und fokussiert** auf das Wesentliche:
1. **Aktuelles Wetter** finden
2. **Forecast** für die nächsten Tage
3. **Favoriten** speichern

**Keine** unnötige Historie, keine Trend-Analysen, kein Archiv!

---

## 📊 Datenbank-Schema (Minimal)

### Core Tables

```
┌──────────────┐
│   profiles   │  User Accounts
└──────────────┘
        │
        ├─────────────┐
        │             │
┌───────▼──────┐  ┌──▼───────────┐
│  favourites  │  │    places    │  Wetter-Spots
└──────────────┘  └──┬───────────┘
                     │
        ┌────────────┼─────────────┐
        │            │             │
┌───────▼──────┐ ┌──▼──────────────▼────┐
│weather_data  │ │  weather_forecast    │
│ (7 Tage)     │ │  (7 Tage aktuell)    │
└──────────────┘ └──────────────────────┘
```

### `places` - Orte
- Städte, Camping-Spots, POIs
- Koordinaten + Name
- Minimal: Nur was für Wetter nötig ist

### `weather_data` - Aktuelles Wetter
- **Aufbewahrung: 7 Tage**
- Alle 1-3h ein Datenpunkt
- Für: Cache + Stabilität-Check
- **Nicht** für historische Trends

### `weather_forecast` - Vorhersage
- **Aufbewahrung: 7 Tage (nur aktuelle)**
- 3-16 Tage in die Zukunft
- Cache < 6 Stunden

### `favourites` - User's gespeicherte Orte
- User ↔ Place Beziehung
- Mit Notes & Tags

---

## 🔄 Data Flow

### 1. User sucht Wetter
```
MapScreen
  ↓
weatherProvider (prüft Cache)
  ↓
weather_data (< 3h alt?) → JA: Zeige Cache
  ↓ NEIN
OpenWeatherMap API → Speichere in weather_data
```

### 2. User schaut Forecast
```
DestinationDetail
  ↓
weatherDataService.getWeatherForecast()
  ↓
weather_forecast (< 6h alt?) → JA: Zeige Cache
  ↓ NEIN
OpenWeatherMap API → Speichere in weather_forecast
```

### 3. User speichert Favorit
```
MapScreen/DetailScreen
  ↓
createOrGetPlace() → Place in DB
  ↓
addFavourite() → Favourites Tabelle
```

---

## 📦 Services

### `weatherDataService.js`
```javascript
getLatestWeather(placeId)       // Aktuelles Wetter (aus Cache)
saveWeatherData(placeId, data)  // Von API speichern
isWeatherFresh(placeId)         // < 3h alt?
getWeatherForecast(placeId)     // 3-7 Tage Forecast
saveWeatherForecast(...)        // Forecast cachen
```

### `placesService.js`
```javascript
createOrGetPlace(data)          // Place erstellen/finden
getPlace(id)                    // Mit aktuellem Wetter
searchPlaces(term)              // Suche
getPopularPlaces()              // Meist favorisiert
```

### `favouritesService.js`
```javascript
getFavourites()                 // User's Favoriten (mit Wetter)
addFavourite(placeId)           // Zu Favoriten
removeFavourite(placeId)        // Entfernen
```

### `authService.js`
```javascript
signUp()                        // Registrierung
signIn()                        // Login
signOut()                       // Logout
```

---

## ⚡ Performance

### Weather Cache
- **Fresh**: < 3 Stunden → Zeige Cache
- **Stale**: > 3 Stunden → Hole neu von API

### Forecast Cache
- **Fresh**: < 6 Stunden → Zeige Cache
- **Stale**: > 6 Stunden → Hole neu

### Vorteil
- Weniger API Calls
- Schnellere App
- Offline-Support (zeige alte Daten)

---

## 🧹 Data Cleanup

Automatisch täglich um 3 Uhr (Cron Job):

```sql
DELETE FROM weather_data 
WHERE weather_timestamp < NOW() - INTERVAL '7 days';

DELETE FROM weather_forecast 
WHERE fetched_at < NOW() - INTERVAL '7 days';
```

**Resultat:**
- Nur 7 Tage Daten pro Ort
- Kleine DB (~10-50 MB bei 100 Places)
- Schnelle Queries

---

## 🎨 UI Features

### Möglich mit diesem Setup

✅ **Aktuelles Wetter**
- Temperatur, Wind, Regen, Wolken
- UV Index, Sichtweite
- Für jeden Ort on demand

✅ **7-Tage Forecast**
- Vorhersage für nächste Woche
- Detailliert pro Tag

✅ **Stabilität-Check**
- "War das Wetter letzte Woche stabil?"
- Temperatur-Schwankungen (7 Tage)

✅ **Favoriten**
- Speichern mit Wetter
- Schnellzugriff
- Geräte-übergreifend (wenn eingeloggt)

✅ **Vergleichen**
- 2 Orte nebeneinander
- Aktuell + Forecast

### NICHT möglich (brauchst du nicht)

❌ 30-Tage Trends
❌ "Normalerweise ist es..."
❌ Historische Charts
❌ Saisonale Analysen
❌ "Letzter Monat war..."

---

## 💾 Storage Requirements

Bei **100 Places** in der DB:

```
weather_data:     100 × 7 Tage × 8 Records/Tag = ~5.600 Records
weather_forecast: 100 × 40 Forecasts = ~4.000 Records
places:           100 Records
favourites:       ~1.000 Records (10 Favs/User × 100 Users)

TOTAL: ~11.000 Records ≈ 3-5 MB
```

**Supabase Free Tier: 500 MB** → Easy! ✅

---

## 🚀 Deployment Checklist

### Supabase Setup
1. ✅ SQL Schema importieren (`supabase/schema.sql`)
2. ✅ Cron Job einrichten (cleanup)
3. ✅ API Keys in `.env`

### App Setup
1. ✅ `npm install`
2. ✅ `.env` mit Supabase + OpenWeatherMap Keys
3. ✅ `npm start`

### Optional
- Edge Function für auto-refresh populärer Orte
- Monitoring in Supabase Dashboard

---

## 🔮 Später erweitern?

Falls du doch Historie brauchst:

### Option: 30-Tage Trends (später)
```sql
-- Einfach Retention ändern:
DELETE FROM weather_data 
WHERE weather_timestamp < NOW() - INTERVAL '30 days';

-- Und daily_weather_summary Tabelle hinzufügen
-- (Siehe altes Schema)
```

### Option: Charts & Analysen
- Aggregiere weather_data Client-seitig
- Oder baue daily_summary wieder ein

**Aber:** Start minimal! Erweitern kannst du immer. 🎯

---

## 📝 Summary

**Was du hast:**
- Aktuelles Wetter + 7-Tage Forecast
- User Accounts & Favoriten
- Weather Caching (schnell!)
- Minimal & fokussiert

**Was du NICHT hast:**
- Historische Daten (> 7 Tage)
- Trend-Analysen
- Archiv

**Perfekt für:** Wetter-basierte Travel App! 🌞🚐



