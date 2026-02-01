# Instructions for Cursor Claude

## Task: Replace existing marker filtering with improved version

### Current Problem:
- Too few markers at some zoom levels
- Too many markers at other zoom levels  
- Markers cluster unevenly (all in one area, empty in others)
- OR markers too evenly spread (ignores that south has better weather)
- Zoom + radius interaction is unpredictable

### New Solution:
**Target: Always show 100-200 markers with NATURAL clustering**
- More markers where weather is good (e.g., Mediterranean coast)
- Fewer markers where weather is bad (e.g., cold north)
- BUT: Max 30 markers per 100km region (prevents extreme clustering)
- AND: Minimum 5km between markers (prevents overlap)

### Implementation Steps:

1. **Find the current marker filtering logic**
   - Likely in MapScreen.js or similar
   - Look for functions with names like:
     - `getVisibleMarkers()`
     - `filterMarkers()`
     - `filterDestinations()`

2. **Replace with new logic from marker_filter_improved.js**
   - Copy the entire `getVisibleMarkers()` function
   - Copy all helper functions (distributeByGrid, applyAdaptiveDistance, etc.)
   - Keep existing distance calculation if it works

3. **Update the function call**
   ```javascript
   // OLD (probably something like this):
   const filtered = filterByZoomAndDistance(places, zoom, minDist);
   
   // NEW:
   const filtered = getVisibleMarkers(places, map, userLocation, radiusKm);
   ```

4. **Remove old filtering logic**
   - Delete any zoom-based distance calculations
   - Delete any sector-based filtering
   - Keep only: viewport bounds, radius filtering

5. **Test with these scenarios:**
   - Zoom level 5, radius 1000km → should show ~150 markers
   - Zoom level 10, radius 500km → should show ~150 markers
   - Zoom level 13, radius 100km → should show ~150 markers
   - Check that markers are evenly distributed (not all clustered)

### Key Concepts to Understand:

**Soft Clustering (Natural Distribution):**
- Places sorted globally by quality (badges > score > temperature)
- Best places selected first
- BUT: Max 30 markers per 100km region (prevents ALL markers in one spot)
- Result: More markers where weather is good, fewer where it's bad
- Example: Mediterranean 80 markers, North Sea 20 markers (not 150 vs 0)

**Regional Density Limits:**
- Map divided into 100km × 100km regions
- Each region can have max 30 markers
- Exception: Places with badges always shown (even if region full)
- Prevents: All 200 markers in Barcelona

**Minimum Distance:**
- 5km minimum between any two markers
- Prevents visual overlap on map
- Much looser than old grid-based approach

**Priority System:**
1. Places with badges (always shown)
2. High attractiveness score
3. High temperature

### What NOT to do:
- ❌ Don't create new tables or views
- ❌ Don't add complex caching logic
- ❌ Don't modify database queries
- ❌ Keep it simple - this is pure JavaScript filtering

### Expected Result:
- Map always has 100-200 markers
- More markers in good weather regions (natural clustering OK)
- No region has ALL markers (max 30 per 100km region)
- Best places (badges, high scores) always visible
- No visual overlap (5km minimum distance)
- Performance stays good (<100ms filtering time)

**Example Distribution:**
- South France (sunny): 60 markers
- Germany (cloudy): 30 markers  
- Norway (cold): 10 markers
- NOT: South France 190, Norway 0

### If you get stuck:
- Console.log the number of markers at each step
- Check that bounds.contains() is working correctly
- Verify that temperature data exists on all places
- Make sure distance calculation returns kilometers not meters
