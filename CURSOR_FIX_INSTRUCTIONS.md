# ANWEISUNGEN FÜR CURSOR - MARKER FILTER FIX

## Problem
Zu viele Marker, extreme Clusterung. Bisheriger Soft Clustering Ansatz funktioniert nicht.

## Lösung
Ersetze die komplette Marker-Filterung mit dieser EINFACHEN Variante.

## Schritt für Schritt:

1. **Finde die aktuelle Filter-Funktion**
   - Suche nach "getVisibleMarkers" oder "distributeSoftClustering"
   - Oder wo immer Marker gefiltert werden

2. **Ersetze KOMPLETT mit diesem Code:**

```javascript
export const filterMarkersSimple = (allPlaces, map, userLocation, radiusKm) => {
  const bounds = map.getBounds();
  const zoom = map.getZoom();
  
  // Filter viewport + radius
  let candidates = allPlaces.filter(p => {
    if (!bounds.contains({ lat: p.lat, lng: p.lon })) return false;
    if (userLocation && radiusKm) {
      const dist = getDistanceKm(userLocation.lat, userLocation.lon, p.lat, p.lon);
      if (dist > radiusKm) return false;
    }
    if (!p.temperature && p.temperature !== 0) return false;
    return true;
  });
  
  // Sort by quality
  candidates.sort((a, b) => {
    const aBadges = a.badges?.length || 0;
    const bBadges = b.badges?.length || 0;
    if (aBadges !== bBadges) return bBadges - aBadges;
    
    const scoreDiff = (b.attractivenessScore || 50) - (a.attractivenessScore || 50);
    if (Math.abs(scoreDiff) > 10) return scoreDiff;
    
    return (b.temperature || 0) - (a.temperature || 0);
  });
  
  // Get zoom-dependent minimum distance
  const minDist = zoom < 5 ? 100 : zoom < 7 ? 70 : zoom < 9 ? 50 : zoom < 11 ? 30 : 20;
  
  // Select markers with distance check
  const result = [];
  const MAX_MARKERS = 50;
  
  for (const place of candidates) {
    if (result.length >= MAX_MARKERS) break;
    
    const tooClose = result.some(existing => 
      getDistanceKm(place.lat, place.lon, existing.lat, existing.lon) < minDist
    );
    
    if (!tooClose) {
      result.push(place);
    }
  }
  
  console.log(`✅ ${result.length} markers at zoom ${zoom} (${minDist}km spacing)`);
  return result;
};

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

3. **Update den Function Call**
   Wo auch immer die Filter-Funktion aufgerufen wird:
   ```javascript
   const markers = filterMarkersSimple(places, map, userLocation, radiusKm);
   ```

4. **Lösche alle alten Filter-Funktionen**
   - distributeSoftClustering
   - getVisibleMarkers (falls alt)
   - Alle Region/Grid-basierten Funktionen

## Was dieser Code macht:
- MAX 50 Marker (hart codiert, nicht verhandelbar)
- Zoom 4: 100km Mindestabstand
- Zoom 7: 70km
- Zoom 10: 30km
- KEINE Regionen, KEIN Soft Clustering
- Einfach: Beste Places mit großem Abstand

## Erwartetes Ergebnis:
- Console: "✅ 47 markers at zoom 5 (100km spacing)"
- Karte: ~50 gut verteilte Marker
- Kein Clustering mehr

## WICHTIG:
- Speichern (Cmd+S)
- App neu laden (Cmd+R im Simulator)
- Check Console Output
