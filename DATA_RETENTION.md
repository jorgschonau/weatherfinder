# Data Retention Policy - SunNomad (Minimal Setup)

**Fokus:** Aktuelles Wetter + Forecast. **KEINE** historischen Daten!

## 📅 Aufbewahrungsfristen (Option 1: Minimal)

### `weather_data` - Aktuelles Wetter
**Aufbewahrung: 7 Tage**

**Warum?**
- Weather Cache (< 3h = frisch)
- Stabilität-Check ("War Wetter letzte Woche stabil?")
- Offline-Support (zeige alte Daten wenn keine Connection)

**Warum nur 7 Tage?**
- ✅ Reicht für Stabilität-Analysen
- ✅ Kleine DB, schnelle Queries
- ❌ Mehr braucht man nicht für Wettervorhersage!

**Was wird gespeichert:**
- Alle 1-3 Stunden ein Datenpunkt
- Vollständige Details (Temp, Wind, Regen, UV, etc.)
- ~56 Records pro Ort (7 Tage × 8 Datenpunkte/Tag)

---

### `weather_forecast` - Wettervorhersage
**Aufbewahrung: 7 Tage**

**Warum?**
- Alte Forecasts sind nutzlos
- Nur aktuelle Vorhersagen relevant
- Wird ständig neu geholt

**Warum so kurz?**
- Forecast älter als 7 Tage ist veraltet
- Kein Grund alte Prognosen zu speichern
- Spart massiv Speicherplatz

---

## 🎯 Use Cases (Minimal Setup)

### "Wetter jetzt" → `weather_data` (aktuellster Eintrag)
- Freshness Check: < 3 Stunden
- Zeige Cache oder hole neu

### "War Wetter stabil?" → `weather_data` (letzte 7 Tage)
- Temperatur-Schwankungen
- Niederschlag-Häufigkeit
- Für Reise-Entscheidung

### "Forecast 3-7 Tage" → `weather_forecast`
- Zeige kommende Tage
- Cache < 6 Stunden
- Sonst neu holen

### ❌ NICHT möglich:
- "Wetter letzte 30 Tage" → Braucht man nicht!
- "Beste Zeit zum Campen basierend auf Historie" → Nicht mit 7 Tagen
- Trend-Analysen → Für Wettervorhersage irrelevant

---

## 💾 Speicherplatz-Rechnung

Angenommen **100 Places** in der DB:

### Option 1: Minimal (7 Tage) ✅ **AKTUELL**
```
weather_data: 100 Places × 7 Tage × 8 Records/Tag = ~5.600 Records
forecast:     100 Places × 40 Forecasts = ~4.000 Records
places:       100 Records
favourites:   ~1.000 Records

TOTAL: ~11.000 Records → ~3-5 MB
```

**Extrem klein! Perfekt für Start.** ✅

### Zum Vergleich: Mit 90 Tagen (wenn man es brauchen würde):
```
weather_data: 100 × 90 × 8 = ~72.000 Records
forecast:     100 × 40 = ~4.000 Records
TOTAL: ~76.000 Records → ~20 MB
```

**Aber:** Für Wettervorhersage unnötig! Stick to 7 Tage.

---

## 🔧 Automatisches Cleanup

Einrichten in Supabase Dashboard → Cron Jobs:

```sql
-- Täglich um 3 Uhr: Alte Daten löschen
SELECT cron.schedule(
  'clean-old-weather',
  '0 3 * * *',
  'SELECT clean_old_weather_data()'
);
```

Läuft automatisch und hält die DB schlank!

---

## 🤔 FAQ

### "Was wenn User historische Daten von letztem Jahr will?"
→ Braucht man nicht für eine Wetter-App für Camper
→ 30-90 Tage Trends reichen völlig
→ Bei Bedarf kann man immer noch von API nachladen

### "Aber saisonale Vergleiche (Sommer vs. Winter)?"
→ Dafür reichen 90 Tage
→ Du vergleichst z.B. "Juli 2024" mit "Juni 2024"
→ Nicht "Juli 2024" mit "Juli 2023"

### "Was wenn ich doch längere Historie will?"
→ Erhöhe in `clean_old_weather_data()`:
```sql
WHERE date < CURRENT_DATE - INTERVAL '180 days'  -- 6 Monate
```

### "Kostet das was?"
→ Nein! Supabase Free Tier: 500 MB Datenbank
→ Mit 90-Tage Policy bleibst du easy unter 50-100 MB

---

## 📊 Empfohlene Fristen nach Use Case

| Use Case | Tabelle | Frist | Grund |
|----------|---------|-------|-------|
| Aktuelle Wetter | weather_data | 3h Cache | Echtzeit |
| 7-Tage Trend | daily_summary | 7 Tage | Kurzfrist |
| 30-Tage Trend | daily_summary | 30 Tage | Standard |
| Saisonvergleich | daily_summary | 90 Tage | Maximum sinnvoll |
| Forecast | weather_forecast | 7 Tage | Nur Aktuelle |

---

## ✅ Bottom Line

**7 Tage** ist perfekt für eine Wettervorhersage-App:
- ✅ Aktuelles Wetter + Stabilität
- ✅ Forecast für nächste Woche
- ✅ Minimal DB Footprint (~3-5 MB)
- ✅ Schnellste Queries
- ✅ Kein unnötiges Archiv

**Focus:** Wettervorhersage, nicht Historie! 🎯

Wenn du später doch Trends willst → Einfach Retention erhöhen!

