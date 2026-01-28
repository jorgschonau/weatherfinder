# Future Weather Features - To Add Later

## Additional Open-Meteo Fields (Requested)

### 1. UV Index ☀️
**Use Case:** Sonnenbrand-Warnung, wichtig für Camping/Beach
**API Field:** `uv_index` (current) / `uv_index_max` (daily)
**DB Column:** `weather_data.uv_index` (DECIMAL 4,2) - ALREADY EXISTS, just re-add
**Badge Ideas:** 
- "UV Alert" 🔆 - UV > 8 (sehr hoch)
- "Perfect Tan Weather" 🌞 - UV 6-8 + sunny

---

### 2. Visibility 👁️
**Use Case:** Nebel-Warnung, wichtig für Autofahrt/Navigation
**API Field:** `visibility` (current, in meters)
**DB Column:** `weather_data.visibility` (INTEGER) - ALREADY EXISTS, just re-add
**Badge Ideas:**
- "Clear View" 👁️ - Visibility > 20km
- "Fog Warning" 🌫️ - Visibility < 1km

---

### 3. Soil Temperature & Moisture 🌱
**Use Case:** Camping (nasser Boden), Garten, Landwirtschaft
**API Fields:**
```javascript
// Current
'soil_temperature_0cm',      // Boden Temp 0cm
'soil_temperature_6cm',      // Boden Temp 6cm
'soil_moisture_0_to_1cm',    // Boden Feuchtigkeit 0-1cm
'soil_moisture_1_to_3cm',    // Boden Feuchtigkeit 1-3cm

// Daily
'soil_temperature_0_to_7cm_mean',
'soil_moisture_0_to_7cm_mean',
```

**DB Columns:** (NEW)
```sql
ALTER TABLE weather_data
  ADD COLUMN soil_temperature DECIMAL(5, 2),
  ADD COLUMN soil_moisture DECIMAL(5, 2);
```

**Badge Ideas:**
- "Dry Ground" ✅ - Soil moisture < 20% (gut für Camping)
- "Muddy Ground" 🌧️ - Soil moisture > 60% (schlecht für Camping)
- "Frozen Ground" ❄️ - Soil temp < 0°C

---

## How to Add Later

### Step 1: Update API Calls
In `openMeteoService.js`, add fields to current/daily arrays:

```javascript
current: [
  // ... existing fields ...
  'uv_index',
  'visibility',
  'soil_temperature_0cm',
  'soil_moisture_0_to_1cm',
]

daily: [
  // ... existing fields ...
  'uv_index_max',
  'soil_temperature_0_to_7cm_mean',
  'soil_moisture_0_to_7cm_mean',
]
```

### Step 2: Update DB Schema
```sql
-- Re-add dropped columns
ALTER TABLE weather_data
  ADD COLUMN IF NOT EXISTS uv_index DECIMAL(4, 2),
  ADD COLUMN IF NOT EXISTS visibility INTEGER;

-- Add new soil columns
ALTER TABLE weather_data
  ADD COLUMN IF NOT EXISTS soil_temperature DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS soil_moisture DECIMAL(5, 2);
```

### Step 3: Update Save Functions
In `openMeteoService.js` → `saveWeatherData()`:

```javascript
const record = {
  // ... existing fields ...
  uv_index: currentWeather.uv_index,
  visibility: currentWeather.visibility,
  soil_temperature: currentWeather.soil_temperature_0cm,
  soil_moisture: currentWeather.soil_moisture_0_to_1cm,
};
```

### Step 4: Add Badges
In `destinationBadge.js`:
- Create new badge types
- Add calculation functions
- Update BadgeMetadata with icons/colors

---

## Priority
- **High:** UV Index (sehr nützlich für User)
- **Medium:** Visibility (nützlich für Trips)
- **Low:** Soil data (nur für spezielle Use Cases)

---

## Notes
- Open-Meteo provides all these fields for FREE ✅
- No API key needed ✅
- Just add to request parameters ✅
- DB columns: uv_index & visibility already exist (were dropped in migration)
- Soil columns: need to be added (NEW)

---

**Status:** Marked for future implementation
**Estimated effort:** 1-2 hours per feature
**Testing:** Add to test scripts after implementation
