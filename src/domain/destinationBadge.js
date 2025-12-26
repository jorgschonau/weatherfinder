/**
 * Badge types that can be awarded to destinations
 * based on various criteria
 */
export const DestinationBadge = {
  WORTH_THE_DRIVE: 'WORTH_THE_DRIVE', // Best weather gain per km/hour
  WARM_AND_DRY: 'WARM_AND_DRY', // Max warm with acceptable weather/wind/night conditions
  BEST_STOP: 'BEST_STOP', // Camper Stop Score: weather + surroundings + amenities
};

/**
 * Badge metadata for display
 */
export const BadgeMetadata = {
  [DestinationBadge.WORTH_THE_DRIVE]: {
    icon: '🚗',
    color: '#FFD700', // Gold
    priority: 1,
  },
  [DestinationBadge.WARM_AND_DRY]: {
    icon: '☀️',
    color: '#FF6B35', // Orange-red
    priority: 2,
  },
  [DestinationBadge.BEST_STOP]: {
    icon: '🏕️',
    color: '#4CAF50', // Green
    priority: 3,
  },
};

/**
 * Calculate a balanced weather score from current conditions
 * Combines multiple factors: temperature comfort, condition quality, stability, wind
 * 
 * @param {Object} destination - Destination with weather data
 * @returns {number} - Score 0-100
 */
export function calculateWeatherScore(destination) {
  if (!destination) return 0;

  // Temperature comfort: optimal around 20-25°C
  const temp = destination.temperature ?? 15;
  const tempScore = Math.max(0, 100 - Math.abs(temp - 22) * 3); // Peaks at 22°C

  // Condition quality
  const conditionScores = {
    sunny: 100,
    cloudy: 60,
    windy: 50,
    rainy: 20,
    snowy: 30,
  };
  const conditionScore = conditionScores[destination.condition] ?? 50;

  // Stability (already 0-100)
  const stabilityScore = destination.stability ?? 50;

  // Wind penalty: Higher wind = worse
  const windSpeed = destination.windSpeed ?? 10;
  const windScore = Math.max(0, 100 - windSpeed * 2); // Penalize >25 km/h heavily

  // Balanced weighted average
  const score = (
    tempScore * 0.35 +
    conditionScore * 0.30 +
    stabilityScore * 0.20 +
    windScore * 0.15
  );

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Calculate ETA in hours based on distance
 * Assumes average speed of 80 km/h (highway driving)
 * 
 * @param {number} distanceKm - Distance in kilometers
 * @returns {number} - ETA in hours
 */
export function calculateETA(distanceKm) {
  const AVERAGE_SPEED_KMH = 80;
  const eta = distanceKm / AVERAGE_SPEED_KMH;
  return Math.max(0.5, eta); // Minimum 0.5h to prevent huge scores for very close destinations
}

/**
 * Get weather score at a specific ETA window
 * For now, uses current weather since we don't have hourly forecasts
 * 
 * TODO: When hourly forecast is available, interpolate based on ETA
 * 
 * @param {Object} destination - Destination with weather data
 * @param {number} eta - ETA in hours
 * @returns {number} - Weather score at that time
 */
export function getWeatherScoreAtETA(destination, eta) {
  // For now, use current weather
  // In the future, interpolate between today/tomorrow forecast based on ETA
  return calculateWeatherScore(destination);
}

/**
 * Calculate "Worth the Drive" value score
 * 
 * @param {Object} destination - Destination to evaluate
 * @param {Object} origin - User's current location with weather data
 * @param {number} distanceKm - Distance in km
 * @returns {Object} - { value, delta, eta, weatherDest, weatherOrigin, shouldAward }
 */
export function calculateWorthTheDrive(destination, origin, distanceKm) {
  const eta = calculateETA(distanceKm);
  
  // Get weather scores at the same absolute time window (ETA from now)
  const weatherDest = getWeatherScoreAtETA(destination, eta);
  const weatherOrigin = getWeatherScoreAtETA(origin, eta);
  
  const delta = weatherDest - weatherOrigin;
  
  // Value = weather gain per hour of travel
  const value = delta / (eta + 0.75); // +0.75 penalty factor
  
  // Temperature check: Destination MUST be warmer (core requirement!)
  const tempDest = destination.temperature ?? 0;
  const tempOrigin = origin.temperature ?? 0;
  const tempDelta = tempDest - tempOrigin;
  
  // Gating criteria (stricter = only the best get the badge)
  const MIN_WEATHER_SCORE = 70; // Destination must be GOOD (not just decent)
  const MIN_DELTA = 10; // Must be SIGNIFICANTLY better than origin
  const MIN_TEMP_ABSOLUTE = 4; // Destination must be at least 4°C (not freezing!)
  const MIN_TEMP_DELTA = 5; // Destination must be MUCH warmer (+5°C minimum)
  const MIN_VALUE = 2.5; // Must have good value (at least 2.5 pts per hour)
  
  const shouldAward = (
    weatherDest >= MIN_WEATHER_SCORE &&
    delta >= MIN_DELTA &&
    value >= MIN_VALUE && // Must have meaningful value
    tempDest >= MIN_TEMP_ABSOLUTE && // Not freezing cold
    tempDelta >= MIN_TEMP_DELTA // Actually warmer
  );
  
  // Final ranking score (for sorting multiple candidates)
  const rankScore = value * 1.0 + weatherDest * 0.02; // Tie-breaker favors better weather
  
  return {
    value: Math.round(value * 10) / 10, // Round to 1 decimal
    delta: Math.round(delta),
    eta: Math.round(eta * 10) / 10,
    weatherDest: Math.round(weatherDest),
    weatherOrigin: Math.round(weatherOrigin),
    tempDest: Math.round(tempDest),
    tempOrigin: Math.round(tempOrigin),
    tempDelta: Math.round(tempDelta),
    shouldAward,
    rankScore,
  };
}

/**
 * Calculate badge eligibility for a destination
 * 
 * @param {Object} destination - The destination to evaluate
 * @param {Object} userLocation - Current user location (with weather data)
 * @param {number} distanceKm - Distance from user to destination
 * @param {Array} allDestinations - All destinations for comparison (for future badges)
 * @returns {Array<string>} - Array of badge types this destination earned
 */
export function calculateBadges(destination, userLocation, distanceKm, allDestinations = []) {
  const badges = [];

  // 1. Worth the Drive
  const worthResult = calculateWorthTheDrive(destination, userLocation, distanceKm);
  destination._worthTheDriveData = worthResult; // Store for UI display (even if no badge awarded)
  
  if (worthResult.shouldAward) {
    // Additional check: Only award to TOP destinations (limit to best 3-5 per search)
    // This will be enforced by limiting badges globally after all are calculated
    badges.push(DestinationBadge.WORTH_THE_DRIVE);
    console.log(
      `🚗 ${destination.name}: Worth it! ` +
      `Temp: ${worthResult.tempOrigin}°C → ${worthResult.tempDest}°C (+${worthResult.tempDelta}°C), ` +
      `Weather: ${worthResult.weatherOrigin} → ${worthResult.weatherDest} (+${worthResult.delta} pts), ` +
      `Value: ${worthResult.value} pts/h, ` +
      `ETA: ${worthResult.eta}h (${Math.round(distanceKm)}km)`
    );
  }

  // 2. Warm & Dry (TODO: Implement later)
  // - Check: temp high, condition not rainy, wind low

  // 3. Best Stop (TODO: Implement later)
  // - Requires: POI/amenities data from Google Places API

  return badges;
}

