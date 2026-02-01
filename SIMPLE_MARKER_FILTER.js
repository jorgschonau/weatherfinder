/**
 * DEAD SIMPLE MARKER FILTER
 * No regions, no soft clustering, just WORKS
 */

export const filterMarkersSimple = (allPlaces, map, userLocation, radiusKm) => {
  const bounds = map.getBounds();
  const zoom = map.getZoom();
  
  // STEP 1: Filter viewport + radius
  let candidates = allPlaces.filter(p => {
    if (!bounds.contains({ lat: p.lat, lng: p.lon })) return false;
    if (userLocation && radiusKm) {
      const dist = getDistanceKm(userLocation.lat, userLocation.lon, p.lat, p.lon);
      if (dist > radiusKm) return false;
    }
    if (!p.temperature && p.temperature !== 0) return false;
    return true;
  });
  
  console.log(`🎯 ${candidates.length} candidates`);
  
  // STEP 2: Sort by quality (badges > score > temp)
  candidates.sort((a, b) => {
    const aBadges = a.badges?.length || 0;
    const bBadges = b.badges?.length || 0;
    if (aBadges !== bBadges) return bBadges - aBadges;
    
    const scoreDiff = (b.attractivenessScore || 50) - (a.attractivenessScore || 50);
    if (Math.abs(scoreDiff) > 10) return scoreDiff;
    
    return (b.temperature || 0) - (a.temperature || 0);
  });
  
  // STEP 3: Zoom-dependent distance
  const minDist = getMinDistanceForZoom(zoom);
  console.log(`📏 Zoom ${zoom} → ${minDist}km min distance`);
  
  // STEP 4: Greedy selection with distance check
  const result = [];
  const MAX_MARKERS = 50; // HARD LIMIT
  
  for (const place of candidates) {
    if (result.length >= MAX_MARKERS) break;
    
    // Check distance to ALL existing markers
    const tooClose = result.some(existing => 
      getDistanceKm(place.lat, place.lon, existing.lat, existing.lon) < minDist
    );
    
    if (!tooClose) {
      result.push(place);
    }
  }
  
  console.log(`✅ ${result.length} markers selected`);
  return result;
};

function getMinDistanceForZoom(zoom) {
  if (zoom < 5) return 100;  // Very far out
  if (zoom < 7) return 70;   
  if (zoom < 9) return 50;   
  if (zoom < 11) return 30;  
  return 20;                 // Zoomed in
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}
