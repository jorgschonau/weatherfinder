# Place Images - Quellen & Integration 📸

## 🎯 Ziel

Schöne Bilder für alle Places:
- Für Map Markers
- Für Detail-Ansicht
- Für Favoriten-Liste
- Optional: Gallery mit mehreren Bildern

**KEINE User-Uploads** (jetzt nicht), sondern aus externen Quellen!

---

## 📊 Database Schema

### Option 1: Single Image (Einfach, für den Start) ✅

```sql
-- Bereits in places table:
places (
  id,
  name,
  ...
  primary_image_url TEXT,        -- URL zum Bild
  image_source TEXT,             -- 'wikimedia', 'unsplash', etc.
  image_attribution TEXT         -- Credit
)
```

**Vorteil:** Einfach, schnell, kein JOIN nötig

---

### Option 2: Multiple Images (Später, für Gallery)

```sql
-- Separate table (bereits im Schema!):
place_images (
  id UUID,
  place_id UUID,
  image_url TEXT,
  thumbnail_url TEXT,
  image_source TEXT,
  image_attribution TEXT,
  display_order INTEGER,
  is_primary BOOLEAN              -- Haupt-Bild für Karte
)
```

**Vorteil:** Mehrere Bilder pro Place, Gallery möglich

---

## 🌐 Bild-Quellen (kostenlos & legal)

### 1. **Wikimedia Commons** ⭐ BESTE OPTION!

**API:** https://commons.wikimedia.org/wiki/Commons:API

**Warum gut:**
- ✅ Riesige Sammlung (80+ Millionen Bilder)
- ✅ Kostenlos & Open Source
- ✅ Gute Qualität
- ✅ Geotags (Bilder nach Koordinaten suchen!)
- ✅ Legal (Creative Commons)

**Query:**
```javascript
// Suche Bilder in der Nähe von Koordinaten
const url = `https://commons.wikimedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=1000&gslimit=10&format=json`;

// Oder via Wikidata (Stadt → Bild)
const wikidataUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q64&props=claims&format=json`; // Q64 = Berlin
```

**Example Result:**
- Berlin: Multiple city photos
- Rothenburg: Historic town photos
- Alps: Mountain landscapes

---

### 2. **Unsplash API** 🎨

**API:** https://unsplash.com/developers

**Pricing:** FREE
- 50 requests/hour
- 5.000 requests/month

**Warum gut:**
- ✅ Professionelle Photos
- ✅ Hohe Qualität
- ✅ Search by keywords
- ✅ Legal (Unsplash License)

**Query:**
```javascript
const url = `https://api.unsplash.com/search/photos?query=${placeName}&client_id=YOUR_KEY`;
```

**Nachteil:** Kein Geo-Search, nur Keyword-basiert

---

### 3. **Pexels API** 📷

**API:** https://www.pexels.com/api/

**Pricing:** FREE (unlimited)

**Warum gut:**
- ✅ Unlimited Requests!
- ✅ Gute Qualität
- ✅ Search by keywords
- ✅ Free to use

**Query:**
```javascript
const url = `https://api.pexels.com/v1/search?query=${placeName}`;
```

---

### 4. **GeoNames (Flickr Wrapper)** 

**API:** http://api.geonames.org/wikipediaSearch

**Warum gut:**
- ✅ Direkter Link zu Place
- ✅ Wikipedia Bilder
- ✅ Schon Geo-kodiert

**Query:**
```javascript
const url = `http://api.geonames.org/findNearbyWikipedia?lat=${lat}&lng=${lon}&username=YOUR_USERNAME`;
```

---

### 5. **Mapillary / OpenStreetMap** 🗺️

**API:** https://www.mapillary.com/developer

**Warum gut:**
- ✅ Street-level imagery
- ✅ Community-driven
- ✅ Geo-tagged

**Nachteil:** Mehr Street-View, weniger "schöne" Bilder

---

## 🔧 Integration Strategy

### Phase 1: Single Image (jetzt)

```javascript
// Script: scripts/import-place-images.js

import { supabase } from '../src/config/supabase';

async function fetchImageForPlace(place) {
  // 1. Try Wikimedia Commons (Geo-Search)
  const wikimediaImage = await searchWikimedia(place.latitude, place.longitude);
  
  if (wikimediaImage) {
    return {
      url: wikimediaImage.url,
      source: 'wikimedia',
      attribution: wikimediaImage.attribution,
    };
  }
  
  // 2. Fallback: Unsplash (Keyword)
  const unsplashImage = await searchUnsplash(place.name);
  
  if (unsplashImage) {
    return {
      url: unsplashImage.urls.regular,
      source: 'unsplash',
      attribution: `Photo by ${unsplashImage.user.name} on Unsplash`,
    };
  }
  
  // 3. Fallback: Pexels
  const pexelsImage = await searchPexels(place.name);
  
  if (pexelsImage) {
    return {
      url: pexelsImage.src.large,
      source: 'pexels',
      attribution: `Photo by ${pexelsImage.photographer}`,
    };
  }
  
  return null;
}

// Update all places with images
async function updatePlaceImages() {
  const { data: places } = await supabase
    .from('places')
    .select('*')
    .is('primary_image_url', null); // Only places without image
  
  for (const place of places) {
    const image = await fetchImageForPlace(place);
    
    if (image) {
      await supabase
        .from('places')
        .update({
          primary_image_url: image.url,
          image_source: image.source,
          image_attribution: image.attribution,
        })
        .eq('id', place.id);
      
      console.log(`✅ ${place.name}: ${image.source}`);
    } else {
      console.log(`⚠️  ${place.name}: No image found`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

---

### Phase 2: Multiple Images (später)

```javascript
// Fetch 5-10 images per place
async function fetchMultipleImages(place) {
  const images = [];
  
  // Wikimedia
  const wikimediaImages = await searchWikimedia(place.latitude, place.longitude, 5);
  images.push(...wikimediaImages);
  
  // Unsplash
  const unsplashImages = await searchUnsplash(place.name, 3);
  images.push(...unsplashImages);
  
  return images;
}

// Save to place_images table
await supabase.from('place_images').insert(
  images.map((img, i) => ({
    place_id: place.id,
    image_url: img.url,
    image_source: img.source,
    image_attribution: img.attribution,
    display_order: i,
    is_primary: i === 0, // First image = primary
  }))
);
```

---

## 📱 UI Integration

### Map View:
```javascript
// Show primary image in marker popup
<Marker>
  <Callout>
    <Image source={{ uri: place.primary_image_url }} />
    <Text>{place.name}</Text>
  </Callout>
</Marker>
```

### Detail View:
```javascript
// Show image at top
<ScrollView>
  <Image 
    source={{ uri: place.primary_image_url }}
    style={{ width: '100%', height: 300 }}
  />
  <Text style={styles.attribution}>
    {place.image_attribution}
  </Text>
  
  {/* Weather, etc. */}
</ScrollView>
```

### Gallery (später):
```javascript
// Show all images
const { data: images } = await supabase
  .from('place_images')
  .select('*')
  .eq('place_id', placeId)
  .order('display_order');

<ScrollView horizontal>
  {images.map(img => (
    <Image key={img.id} source={{ uri: img.image_url }} />
  ))}
</ScrollView>
```

---

## 🔒 Legal / Attribution

### Wichtig: Immer Attribution zeigen!

```javascript
// In UI:
<Text style={styles.attribution}>
  {place.image_attribution}
</Text>

// Example:
"Photo by John Doe on Unsplash"
"Image from Wikimedia Commons (CC-BY-SA)"
"Photo by Jane Smith (Pexels)"
```

---

## 💰 Cost & Limits

| Source | Cost | Limit | Geo-Search | Quality |
|--------|------|-------|------------|---------|
| **Wikimedia** | FREE | Unlimited | ✅ Yes | ⭐⭐⭐⭐ |
| **Unsplash** | FREE | 5k/month | ❌ No | ⭐⭐⭐⭐⭐ |
| **Pexels** | FREE | Unlimited | ❌ No | ⭐⭐⭐⭐ |
| **GeoNames** | FREE | Fair-Use | ✅ Yes | ⭐⭐⭐ |

**Empfehlung:** 
1. **Wikimedia** (Primary) - Geo-Search!
2. **Pexels** (Fallback) - Unlimited!
3. **Unsplash** (Fallback) - Highest Quality

---

## ⏰ Update Schedule

```sql
-- Monthly update (Cron Job)
SELECT cron.schedule(
  'place-images-update',
  '0 0 1 * *', -- 1st of month, midnight
  $$
    -- Call Edge Function to update images
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/update-images',
      headers := '{"Authorization": "Bearer YOUR_KEY"}'::jsonb
    );
  $$
);
```

**Häufigkeit:**
- Neue Places: Sofort Image suchen
- Bestehende Places: 1x/Monat update (bessere Bilder)
- Places ohne Image: 1x/Woche retry

---

## 📋 Implementation Checklist (für später)

- [ ] Unsplash API Key holen (optional)
- [ ] `place_images` Table bereits im Schema ✅
- [ ] `scripts/import-place-images.js` erstellen
- [ ] Wikimedia API testen
- [ ] Pexels API testen
- [ ] Image Import für 100 Places testen
- [ ] UI: Image in Map Marker
- [ ] UI: Image in Detail View
- [ ] Attribution anzeigen
- [ ] Cron Job für monthly updates

---

## 🎯 Bottom Line

**Bilder sind vorbereitet!** 🎨

- ✅ Schema ready (`primary_image_url` + `place_images` table)
- ✅ Quellen identifiziert (Wikimedia, Pexels, Unsplash)
- ✅ Alle kostenlos & legal
- ✅ Geo-Search möglich (Wikimedia)
- ✅ Integration Plan ready

**Wann starten?**
→ Nach Weather-Integration (Phase 2)
→ Zusammen mit GeoNames Import (gleicher Workflow)

**Simple:** Ein Script, holt für alle Places Bilder, speichert URLs in DB!

