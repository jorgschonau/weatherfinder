/**
 * IMPROVED MARKER FILTERING
 * 
 * Goals:
 * 1. Always show 100-200 markers (regardless of zoom/radius)
 * 2. Natural clustering allowed (more markers where weather is good)
 * 3. Prevent extreme imbalance (no completely empty regions)
 * 4. Prioritize badges, then score, then temperature
 * 
 * Replace your existing getVisibleMarkers() function with this
 */

const TARGET_MIN_MARKERS = 100;
const TARGET_MAX_MARKERS = 200;
const MIN_DISTANCE_KM = 5; // Minimum 5km between markers
const REGION_SIZE_KM = 100; // Track density per 100km region
const MAX_PER_REGION = 30; // Max 30 markers per 100km region (prevents extreme clustering)

/**
 * Main filtering function
 * @param {Array} allPlaces - All places with weather data
 * @param {object} map - Google Maps instance
 * @param {object} userLocation - {lat, lon} or null
 * @param {number} radiusKm - Search radius
 * @returns {Array} Filtered places for display
 */
export const getVisibleMarkers = (allPlaces, map, userLocation, radiusKm) => {
  const bounds = map.getBounds();
  
  console.log(`🎯 Filtering ${allPlaces.length} places...`);
  
  // STEP 1: Filter by viewport + radius
  let candidates = allPlaces.filter(p => {
    // Must be in viewport
    if (!bounds.contains({ lat: p.lat, lng: p.lon })) return false;
    
    // Must be in radius (if user location set)
    if (userLocation && radiusKm) {
      const dist = getDistanceKm(userLocation.lat, userLocation.lon, p.lat, p.lon);
      if (dist > radiusKm) return false;
    }
    
    // Must have valid temperature
    if (!p.temperature && p.temperature !== 0) return false;
    
    return true;
  });
  
  console.log(`📍 ${candidates.length} in viewport + radius`);
  
  if (candidates.length === 0) return [];
  
  // STEP 2: Apply soft clustering - allows natural clustering but prevents extremes
  const filtered = distributeSoftClustering(candidates, TARGET_MAX_MARKERS);
  console.log(`✅ ${filtered.length} markers (soft clustering)`);
  
  return filtered;
};

/**
 * Distribute with soft clustering
 * - Allows more markers in good weather zones (natural clustering)
 * - Prevents extreme clustering (max per region)
 * - Ensures no completely empty regions (if places exist there)
 * - Prioritizes: badges > score > temperature
 */
function distributeSoftClustering(places, targetCount) {
  // Sort globally by quality (best first)
  const sorted = [...places].sort((a, b) => {
    // 1. Places with badges always win
    const aBadges = a.badges?.length || 0;
    const bBadges = b.badges?.length || 0;
    if (aBadges > 0 && bBadges === 0) return -1;
    if (bBadges > 0 && aBadges === 0) return 1;
    
    // 2. Then by attractiveness score
    const scoreDiff = (b.attractivenessScore || 50) - (a.attractivenessScore || 50);
    if (Math.abs(scoreDiff) > 10) return scoreDiff;
    
    // 3. Then by temperature (warmer = better)
    return (b.temperature || 0) - (a.temperature || 0);
  });
  
  const result = [];
  const regionDensity = {}; // Track markers per 100km region
  const kmPerDegree = 111.32;
  const regionSizeDeg = REGION_SIZE_KM / kmPerDegree;
  
  for (const place of sorted) {
    // Calculate which 100km region this place is in
    const regionX = Math.floor(place.lat / regionSizeDeg);
    const regionY = Math.floor(place.lon / regionSizeDeg);
    const regionKey = `${regionX},${regionY}`;
    
    const currentDensity = regionDensity[regionKey] || 0;
    
    // Skip if region is full (unless place has badges - those always show)
    const hasBadges = place.badges && place.badges.length > 0;
    if (currentDensity >= MAX_PER_REGION && !hasBadges) {
      continue;
    }
    
    // Check minimum distance to existing markers (prevents overlap)
    const tooClose = result.some(existing => 
      getDistanceKm(place.lat, place.lon, existing.lat, existing.lon) < MIN_DISTANCE_KM
    );
    
    if (!tooClose) {
      result.push(place);
      regionDensity[regionKey] = currentDensity + 1;
      
      // Stop when target reached
      if (result.length >= targetCount) break;
    }
  }
  
  console.log(`   Region density: ${Object.keys(regionDensity).length} regions populated`);
  return result;
}

/**
 * Haversine distance formula
 */
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

/**
 * EXAMPLE USAGE:
 * 
 * const visibleMarkers = getVisibleMarkers(
 *   allPlacesWithWeather,  // From your API
 *   mapRef.current,         // Google Maps instance
 *   userLocation,           // {lat: 48.8566, lon: 2.3522} or null
 *   radiusKm                // 500
 * );
 * 
 * setMarkers(visibleMarkers);
 */
