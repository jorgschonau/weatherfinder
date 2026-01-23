import { getPlacesWithWeather } from '../services/placesWeatherService';
import { filterDestinationsByCondition } from '../domain/weatherFilter';
import { getWeatherIcon, getWeatherColor } from '../domain/weatherPresentation';
import { calculateBadges } from '../domain/destinationBadge';

/**
 * Helper: Calculate distance between two points (Haversine formula)
 */
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRadians = (deg) => deg * (Math.PI / 180);
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
};

/**
 * Apply badge calculations to all destinations
 * Mutates destination objects by adding 'badges' array
 * Limits "Worth the Drive" badges to top 3 destinations only
 */
const applyBadgesToDestinations = (destinations, originLocation, originLat, originLon) => {
  if (!destinations || !originLocation) return;
  
  destinations.forEach(dest => {
    // Skip current location (it shouldn't get badges)
    if (dest.isCurrentLocation) {
      dest.badges = [];
      return;
    }
    
    // Calculate distance if not already present
    if (!dest.distance) {
      dest.distance = getDistanceKm(originLat, originLon, dest.lat, dest.lon);
    }
    
    // Calculate and assign badges
    dest.badges = calculateBadges(dest, originLocation, dest.distance, destinations);
  });
  
  // Limit certain badges to prevent overcrowding
  const MAX_WORTH_THE_DRIVE_BADGES = 3;
  
  // "Worth the Drive Budget" - RANKING SYSTEM: Only TOP 1 gets the badge!
  // Award this FIRST before Worth the Drive
  const budgetCandidates = destinations
    .filter(d => !d.isCurrentLocation && d._worthTheDriveBudgetData?.isEligible)
    .sort((a, b) => (b._worthTheDriveBudgetData?.efficiency || 0) - (a._worthTheDriveBudgetData?.efficiency || 0));
  
  // Award badge ONLY to the best one
  if (budgetCandidates.length > 0) {
    const winner = budgetCandidates[0];
    winner.badges.push('WORTH_THE_DRIVE_BUDGET');
    // REMOVE Worth the Drive if present (Budget is exclusive!)
    winner.badges = winner.badges.filter(b => b !== 'WORTH_THE_DRIVE');
    console.log(
      `💰 ${winner.name}: Budget Winner! ` +
      `Efficiency: ${winner._worthTheDriveBudgetData.efficiency.toFixed(3)} °C/km, ` +
      `Temp: +${winner._worthTheDriveBudgetData.tempDelta}°C, ` +
      `Distance: ${winner._worthTheDriveBudgetData.distance}km`
    );
  }
  
  // Limit "Worth the Drive" to top 3 by temperature
  // EXCLUDE destinations that already have Budget badge!
  const worthTheDriveCandidates = destinations
    .filter(d => !d.isCurrentLocation && d.badges.includes('WORTH_THE_DRIVE') && !d.badges.includes('WORTH_THE_DRIVE_BUDGET'))
    .sort((a, b) => (b._worthTheDriveData?.tempDest || 0) - (a._worthTheDriveData?.tempDest || 0));
  
  if (worthTheDriveCandidates.length > MAX_WORTH_THE_DRIVE_BADGES) {
    worthTheDriveCandidates.slice(MAX_WORTH_THE_DRIVE_BADGES).forEach(dest => {
      dest.badges = dest.badges.filter(b => b !== 'WORTH_THE_DRIVE');
    });
  }
  
  // Other badges: NO LIMIT (Warm & Dry, Beach Paradise, Sunny Streak, Weather Miracle, Heatwave, Snow King)
  
  const destWithBadges = destinations.filter(d => d.badges && d.badges.length > 0);
  const totalBadges = destWithBadges.reduce((sum, d) => sum + d.badges.length, 0);
  const worthCount = destinations.filter(d => d.badges?.includes('WORTH_THE_DRIVE')).length;
  const budgetCount = destinations.filter(d => d.badges?.includes('WORTH_THE_DRIVE_BUDGET')).length;
  const warmDryCount = destinations.filter(d => d.badges?.includes('WARM_AND_DRY')).length;
  const beachCount = destinations.filter(d => d.badges?.includes('BEACH_PARADISE')).length;
  const sunnyCount = destinations.filter(d => d.badges?.includes('SUNNY_STREAK')).length;
  const miracleCount = destinations.filter(d => d.badges?.includes('WEATHER_MIRACLE')).length;
  const heatwaveCount = destinations.filter(d => d.badges?.includes('HEATWAVE')).length;
  const snowCount = destinations.filter(d => d.badges?.includes('SNOW_KING')).length;
  
  console.log(
    `🏆 Awarded ${totalBadges} badges to ${destWithBadges.length} destinations:\n` +
    `  💰 Budget: ${budgetCount}/${budgetCandidates.length} (TOP 1 ONLY)\n` +
    `  🚗 Worth: ${worthCount}/${worthTheDriveCandidates.length} (limited to 3)\n` +
    `  ☀️ Warm&Dry: ${warmDryCount} (unlimited)\n` +
    `  🌊 Beach: ${beachCount} (unlimited)\n` +
    `  ☀️ Sunny: ${sunnyCount} (unlimited)\n` +
    `  🌈 Miracle: ${miracleCount} (unlimited)\n` +
    `  🔥 Heatwave: ${heatwaveCount} (unlimited)\n` +
    `  ⛄ Snow: ${snowCount} (unlimited)`
  );
};

/**
 * Use-case: get destinations for a radius, optionally filtered by desiredCondition.
 * NOW USES REAL DATA FROM SUPABASE via placesWeatherService!
 */
export const getWeatherForRadius = async (userLat, userLon, radiusKm, desiredCondition = null) => {
  // Fetch real places with weather data from Supabase
  const { places, error } = await getPlacesWithWeather({
    userLat,
    userLon,
    radiusKm,
  });

  if (error) {
    console.error('Failed to load places from Supabase:', error);
    return [];
  }

  console.log(`📍 Loaded ${places.length} places from Supabase`);

  // Apply condition filter if specified
  let filteredPlaces = desiredCondition 
    ? filterDestinationsByCondition(places, desiredCondition)
    : places;

  console.log(`🔍 After filter: ${filteredPlaces.length} places`);

  // LIMIT TO 30 PLACES FOR PERFORMANCE
  const MAX_PLACES_ON_MAP = 30;
  if (filteredPlaces.length > MAX_PLACES_ON_MAP) {
    console.log(`⚡ Limiting to ${MAX_PLACES_ON_MAP} places for performance`);
    filteredPlaces = filteredPlaces.slice(0, MAX_PLACES_ON_MAP);
  }

  // Find user's current location weather for badge calculation
  const currentLocationWeather = filteredPlaces.find(p => p.distance === 0 || p.isCurrentLocation) || {
    lat: userLat,
    lon: userLon,
    temperature: filteredPlaces.length > 0 ? Math.min(...filteredPlaces.map(p => p.temperature || 15)) : 15,
    condition: 'cloudy',
    stability: 50,
    windSpeed: 10,
    humidity: 50,
    name: 'Your Location',
    isCurrentLocation: true,
  };

  // Apply badges to all destinations
  applyBadgesToDestinations(filteredPlaces, currentLocationWeather, userLat, userLon);

  return filteredPlaces;
};

// Re-export presentation helpers so UI imports only from usecases
export { getWeatherIcon, getWeatherColor };



