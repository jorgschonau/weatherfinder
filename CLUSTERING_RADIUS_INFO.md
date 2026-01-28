# Clustering Radius - Smart Geographic Filtering

## What it is

`clustering_radius_m` ist ein Feld in der `places` Tabelle, das definiert wie "wichtig" ein Ort ist.

## How it works

Je höher der Score/Population, desto **kleiner** der Radius → **höhere Priorität** → wird **überall** angezeigt!

### Radius Levels

| Score/Population | Radius | Meaning |
|-----------------|--------|---------|
| Score > 75 OR Pop > 500k | **20km** | Major cities - ALWAYS show |
| Score > 60 OR Pop > 200k | **50km** | Good places - show often |
| Score > 50 OR Pop > 50k | **80km** | Medium places - show sometimes |
| Default | **100km** | Small places - only when zoomed in |

## Examples

- **Vancouver** (pop 675k, score 65): 20km radius → **always visible**
- **Seattle** (pop 781k, score 80): 20km radius → **always visible**
- **Hamburg** (score 75): 20km radius → **always visible**
- **Rügen** (score 55, pop 70k): 50km radius → visible at medium zoom
- **Small town** (score 45, pop 5k): 100km radius → only when very zoomed in

## How to use it

### Step 1: Run Migration

```bash
# Copy the SQL from supabase/openmeteo-migration.sql (STEP 8)
# Paste into Supabase SQL Editor
# Run it
```

### Step 2: Use in Frontend

Instead of hardcoded 80km spacing, use the place's own `clustering_radius_m`:

```javascript
// In MapScreen.js - instead of fixed minDistanceKm:
const effectiveRadius = Math.max(
  (dest.clusteringRadiusM || 50000) / 1000, // Convert to km
  minDistanceKm // Minimum spacing
);
```

## Benefits

✅ Major cities (Vancouver, Seattle) **always visible** - small radius
✅ Small towns only visible when zoomed in - large radius  
✅ **No more blobs** - each place has its own exclusion zone
✅ **No manual tuning** - automatically based on importance

## Migration Status

- [x] SQL migration script created
- [ ] Run SQL in Supabase
- [ ] Update frontend to use `clustering_radius_m`
- [ ] Test with Vancouver/Seattle
