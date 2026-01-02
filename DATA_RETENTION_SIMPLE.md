# Data Retention - SIMPLE & CLEAN ⚡

## 🎯 Strategie: Nur frische Daten!

**Für Camping brauchst du:**
- ✅ Aktuelles Wetter (JETZT)
- ✅ 16-Tage Vorhersage (ZUKUNFT)
- ❌ KEINE Historie!

---

## 📊 Database Tables:

### 1. `weather_data` - Aktuelles Wetter

**Was:** Momentan gemessenes Wetter

```sql
place_id: Berlin
weather_timestamp: 2026-01-02 14:00
temperature: 2°C
clouds: 85%
wind_speed: 5 m/s
```

**Retention:** **20 Tage**
- Aktuelle Daten + Historie
- Alte (> 20 Tage) werden automatisch gelöscht

**Warum 20 Tage?**
- ✅ Wetter-Stabilität berechnen (letzten 7 Tage)
- ✅ Bodennässe durch Regen (letzten 3 Tage)
- ✅ Temperatur-Trends erkennen
- ✅ Camping-Conditions bewerten
- ❌ Nicht zu viel Storage (~60 MB statt 20 MB)

---

### 2. `weather_forecast` - 16-Tage Vorhersage

**Was:** Vorhersage für die nächsten 16 Tage

```sql
place_id: Berlin
forecast_timestamp: 2026-01-10  (Tag in Zukunft)
fetched_at: 2026-01-02 06:00    (wann erstellt)
temperature: 5°C
rain_probability: 0.30
```

**Retention:** **2 Tage** max
- Nur aktuellste Vorhersage
- Alte werden automatisch gelöscht

**Warum 2 Tage?**
- Forecast wird 2x/Tag aktualisiert
- Nach 2 Tagen ist Forecast veraltet

---

## 🗑️ Auto-Cleanup:

### Cron Job (täglich 3 AM):

```sql
SELECT cron.schedule(
  'clean-old-weather',
  '0 3 * * *',
  'SELECT clean_old_weather_data()'
);
```

### Cleanup Function:

```sql
CREATE OR REPLACE FUNCTION clean_old_weather_data()
RETURNS void AS $$
BEGIN
  -- Aktuelles Wetter: Nur 2 Tage
  DELETE FROM weather_data
  WHERE weather_timestamp < NOW() - INTERVAL '2 days';
  
  -- Forecasts: Nur 2 Tage
  DELETE FROM weather_forecast
  WHERE fetched_at < NOW() - INTERVAL '2 days';
END;
$$ LANGUAGE plpgsql;
```

---

## 💾 Storage Calculation:

### 20.000 Places:

**weather_data:**
- 20.000 places × 1 row = 20.000 rows
- ~1 KB per row = 20 MB
- Total: **~20 MB**

**weather_forecast:**
- 20.000 places × 16 days = 320.000 rows
- ~0.5 KB per row = 160 MB
- Total: **~160 MB**

**TOTAL: ~180 MB** (winzig!)

---

## 🔄 Update Cycle:

```
Morning (6 AM):
→ Fetch current weather → Overwrite weather_data
→ Fetch 16-day forecast → Overwrite weather_forecast

Evening (6 PM):
→ Fetch current weather → Overwrite weather_data
→ Fetch 16-day forecast → Overwrite weather_forecast

Night (3 AM):
→ Clean old data (> 2 days)
```

---

## 📱 App Usage:

### Aktuelles Wetter:
```javascript
// Hole neueste Wetterdaten
const { data } = await supabase
  .from('weather_data')
  .select('*')
  .eq('place_id', placeId)
  .order('weather_timestamp', { desc: true })
  .limit(1);

// → 1 row, aktuellste Daten
```

### 16-Tage Forecast:
```javascript
// Hole Vorhersage für nächste 16 Tage
const { data } = await supabase
  .from('weather_forecast')
  .select('*')
  .eq('place_id', placeId)
  .gte('forecast_timestamp', new Date())
  .order('forecast_timestamp')
  .limit(16);

// → 16 rows, ein Tag pro row
```

### "Last Updated":
```javascript
// Zeige wann Daten zuletzt aktualisiert wurden
const lastUpdate = weather_data[0].weather_timestamp;
const hoursAgo = (Date.now() - new Date(lastUpdate)) / 1000 / 60 / 60;

console.log(`Updated ${hoursAgo.toFixed(0)} hours ago`);
// "Updated 3 hours ago"
```

---

## ✅ Vorteile:

**vs alte Strategie (60 Tage Historie):**

| Feature | Old | New |
|---------|-----|-----|
| Storage | ~10 GB | **180 MB** |
| Complexity | High | **Simple** |
| Queries | Slow | **Fast** |
| Relevant | 10% | **100%** |
| Cleanup | Complex | **Auto** |

---

## 🎯 Bottom Line:

**Camping-App braucht:**
- ✅ Aktuell: "Wo ist jetzt gutes Wetter?"
- ✅ Vorhersage: "Wo wird nächste Woche gut?"
- ❌ Historie: "Wie war's vor 2 Monaten?" → EGAL!

**SIMPLE = BETTER!** 💪

