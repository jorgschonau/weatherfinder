# Places Data Sources & Integration Plan 🗺️

## 🎯 Ziel

Rich destination data für 20.000+ Places in Europa & Nordamerika:
- Ortsgröße & Typ
- Entfernung zur Küste
- Höhe (Gebirge/Flachland)
- Camping-Plätze in der Nähe

**Update-Frequenz:** ~1x/Monat (statische Daten)

---

## 📊 Datenquellen

### 1. GeoNames (PRIMARY SOURCE) ⭐

**URL:** [https://download.geonames.org/export/dump/](https://download.geonames.org/export/dump/)

**Was wir bekommen:**
- ✅ Ortsgröße: `population` (bigint)
- ✅ Ort-Typ: `feature_class` + `feature_code`
- ✅ Höhe: `elevation` + `dem` (Digital Elevation Model)
- ✅ Admin-Hierarchie: Country, Region, etc.
- ✅ Timezone, Namen in allen Sprachen
- ✅ Koordinaten (natürlich)

**Files für uns:**
```bash
# Europa
wget https://download.geonames.org/export/dump/EU.zip

# Nordamerika  
wget https://download.geonames.org/export/dump/NA.zip

# Oder einzelne Länder:
wget https://download.geonames.org/export/dump/DE.zip  # Deutschland
wget https://download.geonames.org/export/dump/FR.zip  # Frankreich
wget https://download.geonames.org/export/dump/US.zip  # USA
wget https://download.geonames.org/export/dump/CA.zip  # Kanada
```

**Feature Codes (relevant für Camping):**
- `P.PPL` - Populated Place (Stadt/Dorf)
- `P.PPLC` - Capital
- `P.PPLA` - Seat of first-order admin division
- `H.LK` - Lake
- `H.BAY` - Bay
- `T.MT` - Mountain
- `T.PK` - Peak
- `L.PRK` - Park
- `L.RESN` - Nature Reserve
- `V.FRST` - Forest

**License:** Creative Commons Attribution 4.0 ✅

---

### 2. Natural Earth Data (Küsten-Entfernung)

**URL:** [https://www.naturalearthdata.com/](https://www.naturalearthdata.com/)

**Was wir bekommen:**
- ✅ Coastline Polygone (10m, 50m, 110m resolution)
- ✅ Ocean Polygone
- ✅ Lakes, Rivers

**Files:**
```bash
# High resolution coastlines
https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/physical/ne_10m_coastline.zip

# Oder als Shapefile:
https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/physical/ne_10m_ocean.zip
```

**Berechnung:**
```sql
-- PostGIS extension in Supabase
-- Calculate distance to nearest coastline
SELECT ST_Distance(
  place_location::geography,
  (SELECT geom FROM coastlines ORDER BY place_location <-> geom LIMIT 1)
) / 1000 AS distance_to_coast_km
```

**License:** Public Domain ✅

---

### 3. Copernicus Digital Elevation Model

**URL:** [https://dataspace.copernicus.eu/](https://dataspace.copernicus.eu/)

**Was wir bekommen:**
- ✅ DEM GLO-30 (30m resolution)
- ✅ Höhe, Topographie
- ✅ Terrain Ruggedness

**Alternative:** GeoNames DEM ist oft ausreichend! 💡
- `elevation`: in meters
- `dem`: average elevation of 90m×90m area

**Terrain Classification:**
```javascript
function classifyTerrain(elevation, dem) {
  if (elevation < 200) return 'flatland';
  if (elevation < 500) return 'hills';
  if (elevation < 1500) return 'mountains';
  return 'high_mountains';
}
```

**License:** Free and open ✅

---

### 4. OpenStreetMap / OpenCampingMap

**URLs:**
- [https://www.openstreetmap.org/](https://www.openstreetmap.org/)
- [https://opencampingmap.org/](https://opencampingmap.org/)
- Overpass API: [https://overpass-api.de/](https://overpass-api.de/)

**Was wir bekommen:**
- ✅ Campingplätze (`tourism=camp_site`)
- ✅ Stellplätze (`tourism=caravan_site`)
- ✅ Amenities (Restaurant, Shop, etc.)

**Overpass Query:**
```javascript
// Find all campsites within 50km of a location
const query = `
  [out:json];
  (
    node["tourism"="camp_site"](around:50000,${lat},${lon});
    way["tourism"="camp_site"](around:50000,${lat},${lon});
  );
  out body;
`;

const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
```

**License:** ODbL (Open Database License) ✅

---

## 🗄️ Database Schema Extensions

### Extended `places` table:

```sql
-- Add to existing places table
ALTER TABLE places ADD COLUMN IF NOT EXISTS
  -- From GeoNames
  geonames_id INTEGER UNIQUE,
  feature_class VARCHAR(1),  -- P, H, L, T, V, etc.
  feature_code VARCHAR(10),   -- PPL, LK, MT, etc.
  population BIGINT,
  elevation INTEGER,          -- meters above sea level
  dem INTEGER,                -- digital elevation model
  timezone VARCHAR(40),
  
  -- Calculated
  distance_to_coast_km NUMERIC(8,2),
  terrain_type VARCHAR(20),   -- 'flatland', 'hills', 'mountains', 'high_mountains'
  
  -- Camping data
  nearest_campsite_id INTEGER,
  nearest_campsite_distance_km NUMERIC(8,2),
  campsites_within_50km INTEGER DEFAULT 0,
  
  -- Metadata
  geodata_last_updated TIMESTAMPTZ,
  camping_data_last_updated TIMESTAMPTZ;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_places_geonames ON places(geonames_id);
CREATE INDEX IF NOT EXISTS idx_places_feature ON places(feature_class, feature_code);
CREATE INDEX IF NOT EXISTS idx_places_terrain ON places(terrain_type);
CREATE INDEX IF NOT EXISTS idx_places_population ON places(population DESC);
```

### New `campsites` table:

```sql
CREATE TABLE IF NOT EXISTS campsites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- OSM Data
  osm_id BIGINT UNIQUE NOT NULL,
  osm_type VARCHAR(10),  -- 'node', 'way', 'relation'
  
  -- Basic Info
  name VARCHAR(200),
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  location GEOGRAPHY(POINT) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  
  -- Campsite Type
  camp_type VARCHAR(20),  -- 'camp_site', 'caravan_site', 'camp_pitch'
  
  -- Amenities (from OSM tags)
  has_toilets BOOLEAN DEFAULT false,
  has_showers BOOLEAN DEFAULT false,
  has_electricity BOOLEAN DEFAULT false,
  has_water BOOLEAN DEFAULT false,
  has_wifi BOOLEAN DEFAULT false,
  accepts_caravans BOOLEAN DEFAULT true,
  accepts_tents BOOLEAN DEFAULT true,
  
  -- Contact
  website VARCHAR(500),
  phone VARCHAR(50),
  
  -- Metadata
  data_source VARCHAR(20) DEFAULT 'osm',
  last_osm_update TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campsites_location ON campsites USING GIST(location);
CREATE INDEX idx_campsites_osm ON campsites(osm_id);
CREATE INDEX idx_campsites_type ON campsites(camp_type);
```

### View: Places with full metadata

```sql
CREATE OR REPLACE VIEW places_with_metadata AS
SELECT 
  p.*,
  
  -- Terrain description
  CASE 
    WHEN p.elevation < 200 THEN 'Flachland'
    WHEN p.elevation < 500 THEN 'Hügelland'
    WHEN p.elevation < 1500 THEN 'Bergland'
    ELSE 'Hochgebirge'
  END as terrain_description_de,
  
  -- Coast proximity
  CASE 
    WHEN p.distance_to_coast_km < 5 THEN 'Küstennah'
    WHEN p.distance_to_coast_km < 50 THEN 'Küstenfern'
    ELSE 'Inland'
  END as coast_proximity_de,
  
  -- Place size
  CASE 
    WHEN p.population > 1000000 THEN 'Großstadt'
    WHEN p.population > 100000 THEN 'Stadt'
    WHEN p.population > 10000 THEN 'Kleinstadt'
    WHEN p.population > 1000 THEN 'Dorf'
    ELSE 'Siedlung'
  END as place_size_de,
  
  -- Nearest campsite info
  c.name as nearest_campsite_name,
  c.website as nearest_campsite_website,
  c.osm_id as nearest_campsite_osm_id
  
FROM places p
LEFT JOIN campsites c ON p.nearest_campsite_id = c.id;
```

---

## 🔄 Data Integration Workflow

### Phase 1: GeoNames Import (PRIORITY)

```bash
# 1. Download & Extract
wget https://download.geonames.org/export/dump/EU.zip
unzip EU.zip

# 2. Parse & Filter
# Keep only relevant feature codes for camping destinations
grep -E "^[0-9]+\t.+\t.+\t.+\t.+\t.+\t(P\.PPL|H\.LK|T\.MT|L\.PRK)" EU.txt > filtered_places.txt

# 3. Import to Supabase
# Use Supabase SQL or bulk insert
```

**Script:** `scripts/import_geonames.js`

```javascript
import { supabase } from '../src/config/supabase';
import fs from 'fs';
import readline from 'readline';

async function importGeoNames(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream });
  
  let batch = [];
  const BATCH_SIZE = 1000;
  
  for await (const line of rl) {
    const fields = line.split('\t');
    
    const place = {
      geonames_id: parseInt(fields[0]),
      name: fields[1],
      latitude: parseFloat(fields[4]),
      longitude: parseFloat(fields[5]),
      feature_class: fields[6],
      feature_code: fields[7],
      country_code: fields[8],
      population: parseInt(fields[14]) || 0,
      elevation: parseInt(fields[15]) || null,
      dem: parseInt(fields[16]) || null,
      timezone: fields[17],
      region: detectRegion(fields[8]),
      is_active: true,
    };
    
    batch.push(place);
    
    if (batch.length >= BATCH_SIZE) {
      await supabase.from('places').upsert(batch, {
        onConflict: 'geonames_id'
      });
      console.log(`Imported ${batch.length} places`);
      batch = [];
    }
  }
  
  // Insert remaining
  if (batch.length > 0) {
    await supabase.from('places').upsert(batch);
  }
}
```

---

### Phase 2: Coastline Distance Calculation

```sql
-- 1. Create coastlines table (import from Natural Earth)
CREATE TABLE coastlines (
  id SERIAL PRIMARY KEY,
  geom GEOGRAPHY(LINESTRING)
);

-- 2. Calculate distances
UPDATE places
SET distance_to_coast_km = (
  SELECT ST_Distance(
    ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
    c.geom
  ) / 1000
  FROM coastlines c
  ORDER BY ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography <-> c.geom
  LIMIT 1
)
FROM places p
WHERE places.id = p.id;

-- 3. Set terrain type
UPDATE places
SET terrain_type = CASE 
  WHEN elevation < 200 THEN 'flatland'
  WHEN elevation < 500 THEN 'hills'
  WHEN elevation < 1500 THEN 'mountains'
  ELSE 'high_mountains'
END;
```

---

### Phase 3: Campsite Data (OSM)

**Script:** `scripts/import_campsites.js`

```javascript
async function fetchCampsitesNearPlace(lat, lon, radius = 50000) {
  const query = `
    [out:json];
    (
      node["tourism"="camp_site"](around:${radius},${lat},${lon});
      way["tourism"="camp_site"](around:${radius},${lat},${lon});
      node["tourism"="caravan_site"](around:${radius},${lat},${lon});
      way["tourism"="caravan_site"](around:${radius},${lat},${lon});
    );
    out body;
  `;
  
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  const data = await response.json();
  
  return data.elements.map(el => ({
    osm_id: el.id,
    osm_type: el.type,
    name: el.tags?.name || 'Unnamed',
    latitude: el.lat || el.center?.lat,
    longitude: el.lon || el.center?.lon,
    camp_type: el.tags?.tourism,
    has_toilets: el.tags?.toilets === 'yes',
    has_showers: el.tags?.shower === 'yes',
    has_electricity: el.tags?.electricity === 'yes',
    has_water: el.tags?.drinking_water === 'yes',
    website: el.tags?.website,
    phone: el.tags?.phone,
  }));
}

// Update all places with campsite data
async function updateCampsiteData() {
  const { data: places } = await supabase
    .from('places')
    .select('id, latitude, longitude');
  
  for (const place of places) {
    const campsites = await fetchCampsitesNearPlace(place.latitude, place.longitude);
    
    // Save campsites
    if (campsites.length > 0) {
      await supabase.from('campsites').upsert(campsites, {
        onConflict: 'osm_id'
      });
      
      // Find nearest
      const nearest = campsites[0]; // Already sorted by Overpass API
      
      await supabase.from('places')
        .update({
          campsites_within_50km: campsites.length,
          nearest_campsite_id: nearest.id,
          camping_data_last_updated: new Date().toISOString()
        })
        .eq('id', place.id);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

---

## 📅 Update Schedule

### Monthly Update (Cron):

```sql
-- Run on 1st of each month at 3 AM
SELECT cron.schedule(
  'geodata-monthly-update',
  '0 3 1 * *',
  $$
    -- Re-import GeoNames data
    -- Re-calculate coastline distances
    -- Update campsite data from OSM
    
    UPDATE places SET geodata_last_updated = NOW();
  $$
);
```

---

## 🎯 Usage in App

### Filter by terrain:

```javascript
const { data: mountainPlaces } = await supabase
  .from('places_with_metadata')
  .select('*')
  .eq('terrain_type', 'mountains')
  .gte('elevation', 1000)
  .limit(20);
```

### Find coastal destinations:

```javascript
const { data: coastalPlaces } = await supabase
  .from('places_with_metadata')
  .select('*')
  .lte('distance_to_coast_km', 10)
  .order('distance_to_coast_km', { ascending: true });
```

### Find places with nearby camping:

```javascript
const { data: campingPlaces } = await supabase
  .from('places_with_metadata')
  .select('*')
  .gte('campsites_within_50km', 5)
  .lte('nearest_campsite_distance_km', 10);
```

---

## ✅ Implementation Checklist (für später)

**Geo Data:**
- [ ] GeoNames Account & API Key
- [ ] Download EU + NA datasets
- [ ] `import_geonames.js` Script erstellen
- [ ] PostGIS Extension in Supabase aktivieren
- [ ] Natural Earth coastline data importieren
- [ ] Coastline distance calculation
- [ ] `import_campsites.js` Script erstellen
- [ ] OSM Overpass API testen
- [ ] Campsite data für alle Places
- [ ] Monthly update Cron Job
- [ ] UI Filters für Terrain, Coast, Camping

**Images:**
- [ ] Image sources integration (siehe `IMAGE_SOURCES.md`)
- [ ] Wikimedia API für Geo-basierte Bilder
- [ ] Pexels/Unsplash als Fallback
- [ ] `import-place-images.js` Script

---

## 💡 Smart Prioritization

**Welche Places zuerst?**

1. **Favorited places** (von Usern gespeichert)
2. **High-population places** (große Städte)
3. **Natural features** (Seen, Berge, Parks)
4. **Regions with lots of campgrounds**

**SQL:**
```sql
-- Prioritize places for data enrichment
SELECT id, name, 
  (COALESCE(favourite_count, 0) * 10 + 
   COALESCE(population, 0) / 10000 + 
   CASE WHEN feature_class IN ('H', 'L', 'T') THEN 50 ELSE 0 END
  ) as priority_score
FROM places
ORDER BY priority_score DESC;
```

---

## 🚀 Benefits

**Mit diesen Daten kann die App:**
- ✅ "Zeige mir Berge über 1500m mit Camping in der Nähe"
- ✅ "Finde Küstenorte mit gutem Wetter"
- ✅ "Flachland-Destinationen für Fahrrad-Camping"
- ✅ "Kleine Dörfer in den Alpen mit Stellplätzen"
- ✅ Rich destination cards mit Höhe, Größe, Camping-Info

**All das ohne API Calls!** Alles in der DB! 💪

---

**Status:** 📋 Geplant für nach Weatherbit-Integration

