/**
 * Badge types that can be awarded to destinations
 * based on various criteria
 */
export const DestinationBadge = {
  WORTH_THE_DRIVE: 'WORTH_THE_DRIVE', // Best weather gain per km/hour
  WORTH_THE_DRIVE_BUDGET: 'WORTH_THE_DRIVE_BUDGET', // Good weather, closer distance (budget-friendly)
  WARM_AND_DRY: 'WARM_AND_DRY', // Max warm with acceptable weather/wind/night conditions
  BEACH_PARADISE: 'BEACH_PARADISE', // Coastal location with perfect beach weather
  SUNNY_STREAK: 'SUNNY_STREAK', // 3+ days of sunshine in a row (stable good weather)
  WEATHER_MIRACLE: 'WEATHER_MIRACLE', // Place transforms from bad to great weather (today bad → tomorrow sunny!)
  HEATWAVE: 'HEATWAVE', // >30°C for 2+ days (warning implied by color)
  SNOW_KING: 'SNOW_KING', // Reliable snow conditions - perfect for skiing
};

/**
 * Badge metadata for display
 */
export const BadgeMetadata = {
  [DestinationBadge.WORTH_THE_DRIVE_BUDGET]: {
    icon: '💰',
    color: '#4CAF50', // Green (budget-friendly)
    priority: 1,
  },
  [DestinationBadge.WORTH_THE_DRIVE]: {
    icon: '🚗',
    color: '#FFD700', // Gold
    priority: 2,
  },
  [DestinationBadge.HEATWAVE]: {
    icon: '🔥',
    color: '#FF5722', // Red/Orange
    priority: 3,
  },
  [DestinationBadge.WEATHER_MIRACLE]: {
    icon: '🌈',
    color: '#E91E63', // Pink (dramatic!)
    priority: 4,
  },
  [DestinationBadge.SUNNY_STREAK]: {
    icon: '☀️',
    color: '#FFA726', // Orange (sunny!)
    priority: 5,
  },
  [DestinationBadge.BEACH_PARADISE]: {
    icon: '🌊',
    color: '#00BCD4', // Cyan/Turquoise
    priority: 5,
  },
  [DestinationBadge.SNOW_KING]: {
    icon: '⛄',
    color: '#2196F3', // Blue (winter cold)
    priority: 6,
  },
  [DestinationBadge.WARM_AND_DRY]: {
    icon: '☀️',
    color: '#FF6B35', // Orange-red
    priority: 7,
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
 * @param {Object} destination - Destination with weather data
 * @param {number} eta - ETA in hours
 * @returns {number} - Weather score at that time
 */
export function getWeatherScoreAtETA(destination, eta) {
  // For now, use current weather
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
 * Calculate "Worth the Drive Budget" efficiency score
 * RANKING SYSTEM: Best temp gain per km distance
 * Only the TOP 1 destination gets the badge!
 * 
 * @param {Object} destination - Destination to evaluate
 * @param {Object} origin - User's current location
 * @param {number} distanceKm - Distance in km
 * @returns {Object} - { efficiency, tempDelta, distance, tempDest, eta, delta, value }
 */
export function calculateWorthTheDriveBudget(destination, origin, distanceKm) {
  const tempDest = destination.temperature ?? 0;
  const tempOrigin = origin.temperature ?? 0;
  const tempDelta = tempDest - tempOrigin;
  
  // Calculate ETA
  const eta = calculateETA(distanceKm);
  
  // Calculate weather scores for display
  const weatherDest = calculateWeatherScore(destination);
  const weatherOrigin = calculateWeatherScore(origin);
  const delta = weatherDest - weatherOrigin;
  
  // Minimum criteria to be considered
  const MIN_TEMP_DELTA = 3; // At least 3°C warmer
  const MIN_TEMP_ABSOLUTE = 10; // At least 10°C (not freezing)
  const MIN_DISTANCE = 1; // Avoid division by zero
  
  // Efficiency = temp gain per km (for ranking)
  const efficiency = tempDelta / Math.max(distanceKm, MIN_DISTANCE);
  
  // Value = for display (temp gain per 100km, like before)
  const value = tempDelta / (distanceKm / 100);
  
  // Eligible if warmer and not freezing
  const isEligible = tempDelta >= MIN_TEMP_DELTA && tempDest >= MIN_TEMP_ABSOLUTE;
  
  return {
    efficiency: Math.round(efficiency * 1000) / 1000, // 3 decimals
    tempDelta: Math.round(tempDelta),
    tempDest: Math.round(tempDest),
    tempOrigin: Math.round(tempOrigin),
    distance: Math.round(distanceKm),
    eta: Math.round(eta * 10) / 10,
    delta: Math.round(delta),
    value: Math.round(value * 10) / 10,
    isEligible,
  };
}

/**
 * Calculate "Warm & Dry" eligibility
 * Awards badge to warmest destinations with good conditions (no rain, low wind)
 * 
 * @param {Object} destination - Destination to evaluate
 * @param {Array} allDestinations - All destinations for comparison
 * @returns {Object} - { isWarm, isDry, isCalm, shouldAward, tempRank }
 */
export function calculateWarmAndDry(destination, allDestinations) {
  const temp = destination.temperature ?? 0;
  const condition = destination.condition ?? 'unknown';
  const windSpeed = destination.windSpeed ?? 0;
  
  // Criteria
  const MIN_TEMP = 12; // Must be at least comfortably warm
  const MAX_WIND = 20; // Max wind speed in km/h (light breeze)
  const BAD_CONDITIONS = ['rainy', 'snowy']; // Conditions that disqualify
  
  // Check conditions
  const isWarm = temp >= MIN_TEMP;
  const isDry = !BAD_CONDITIONS.includes(condition);
  const isCalm = windSpeed <= MAX_WIND;
  
  // Rank by temperature among all destinations (for display purposes)
  const sortedByTemp = [...allDestinations]
    .filter(d => !d.isCurrentLocation)
    .sort((a, b) => (b.temperature ?? 0) - (a.temperature ?? 0));
  const tempRank = sortedByTemp.findIndex(d => 
    d.lat === destination.lat && d.lon === destination.lon
  ) + 1;
  
  // Award to ALL destinations that meet the criteria (no rank limit)
  const shouldAward = isWarm && isDry && isCalm;
  
  return {
    isWarm,
    isDry,
    isCalm,
    shouldAward,
    tempRank,
    temp,
    windSpeed,
    condition,
  };
}

/**
 * Calculate "Beach Paradise" eligibility
 * Perfect beach weather: warm, sunny, light wind
 * 
 * @param {Object} destination - Destination to evaluate
 * @returns {Object} - { shouldAward, temp, condition, windSpeed }
 */
export function calculateBeachParadise(destination) {
  const temp = destination.temperature ?? 0;
  const condition = destination.condition ?? 'unknown';
  const windSpeed = destination.windSpeed ?? 0;
  
  // Perfect beach criteria
  const MIN_TEMP = 22; // Beach-perfect temperature
  const MAX_TEMP = 32; // Not too hot
  const GOOD_CONDITIONS = ['sunny', 'cloudy']; // Dry weather
  const MAX_WIND = 15; // Light breeze only
  
  const shouldAward = (
    temp >= MIN_TEMP &&
    temp <= MAX_TEMP &&
    GOOD_CONDITIONS.includes(condition) &&
    windSpeed <= MAX_WIND
  );
  
  return {
    shouldAward,
    temp,
    condition,
    windSpeed,
  };
}

/**
 * Calculate "Sunny Streak" eligibility
 * 3+ days of sunshine in a row
 * 
 * @param {Object} destination - Destination with forecast data
 * @returns {Object} - { shouldAward, sunnyDays }
 */
export function calculateSunnyStreak(destination) {
  const currentCondition = destination.condition ?? 'unknown';
  const forecast = destination.forecast;
  
  let sunnyDays = currentCondition === 'sunny' ? 1 : 0;
  
  if (forecast) {
    if (forecast.today?.condition === 'sunny') sunnyDays++;
    if (forecast.tomorrow?.condition === 'sunny') sunnyDays++;
    if (forecast.day3?.condition === 'sunny') sunnyDays++;
  }
  
  // Badge criteria: 3+ sunny days
  const MIN_SUNNY_DAYS = 3;
  const shouldAward = sunnyDays >= MIN_SUNNY_DAYS;
  
  return {
    shouldAward,
    sunnyDays,
  };
}

/**
 * Calculate "Weather Miracle" eligibility
 * Place transforms from bad weather today to great weather tomorrow/future
 * 
 * @param {Object} destination - Destination with forecast data
 * @returns {Object} - { shouldAward, todayCondition, futureCondition, tempGain }
 */
export function calculateWeatherMiracle(destination) {
  const todayCondition = destination.condition ?? 'unknown';
  const todayTemp = destination.temperature ?? 0;
  const forecast = destination.forecast;
  
  if (!forecast) {
    return { shouldAward: false };
  }
  
  // Check for transformation: bad today → sunny tomorrow/day3
  const BAD_CONDITIONS = ['rainy', 'snowy', 'windy'];
  const isBadToday = BAD_CONDITIONS.includes(todayCondition);
  
  const tomorrowSunny = forecast.tomorrow?.condition === 'sunny';
  const day3Sunny = forecast.day3?.condition === 'sunny';
  
  const tomorrowTemp = forecast.tomorrow?.temp ?? todayTemp;
  const day3Temp = forecast.day3?.temp ?? todayTemp;
  const futureTempMax = Math.max(tomorrowTemp, day3Temp);
  const tempGain = futureTempMax - todayTemp;
  
  // Badge criteria: bad today AND sunny future AND warmer
  const MIN_TEMP_GAIN = 5; // Must get warmer by at least 5°C
  const shouldAward = (
    isBadToday &&
    (tomorrowSunny || day3Sunny) &&
    tempGain >= MIN_TEMP_GAIN
  );
  
  return {
    shouldAward,
    todayCondition,
    todayTemp,
    futureCondition: tomorrowSunny ? 'sunny (tomorrow)' : 'sunny (day 3)',
    futureTempMax,
    tempGain,
  };
}

/**
 * Calculate "Heatwave" eligibility
 * 2+ days above 30°C
 * 
 * @param {Object} destination - Destination with forecast data
 * @returns {Object} - { shouldAward, hotDays, maxTemp }
 */
export function calculateHeatwave(destination) {
  const currentTemp = destination.temperature ?? 0;
  const forecast = destination.forecast;
  
  let hotDays = currentTemp >= 30 ? 1 : 0;
  let maxTemp = currentTemp;
  
  if (forecast) {
    if (forecast.today?.high >= 30) hotDays++;
    if (forecast.tomorrow?.high >= 30) hotDays++;
    if (forecast.day3?.high >= 30) hotDays++;
    
    maxTemp = Math.max(
      maxTemp,
      forecast.today?.high ?? 0,
      forecast.tomorrow?.high ?? 0,
      forecast.day3?.high ?? 0
    );
  }
  
  // Badge criteria: 2+ days > 30°C
  const MIN_HOT_DAYS = 2;
  const shouldAward = hotDays >= MIN_HOT_DAYS;
  
  return {
    shouldAward,
    hotDays,
    maxTemp: Math.round(maxTemp),
  };
}

/**
 * Calculate "Snow King" eligibility
 * Reliable snow conditions - perfect for skiing
 * 
 * @param {Object} destination - Destination with forecast and snowfall data
 * @returns {Object} - { shouldAward, snowDays, snowfallAmount, avgTemp, reason }
 */
export function calculateSnowKing(destination) {
  const currentCondition = destination.condition ?? 'unknown';
  const currentTemp = destination.temperature ?? 0;
  
  // Snowfall amount (mm)
  const snowfall1h = destination.snowfall1h || 0;
  const snowfall3h = destination.snowfall3h || 0;
  const snowfall24h = destination.snowfall24h || 0;
  const totalSnowfall = Math.max(snowfall1h, snowfall3h / 3, snowfall24h / 24);
  
  // Check forecast if available
  const forecast = destination.forecast;
  let snowDays = currentCondition === 'snowy' ? 1 : 0;
  let maxTemp = currentTemp;
  let minTemp = currentTemp;
  let avgTemp = currentTemp;
  let tempCount = 1;
  
  if (forecast) {
    // Count snowy days in forecast
    if (forecast.today?.condition === 'snowy') snowDays++;
    if (forecast.tomorrow?.condition === 'snowy') snowDays++;
    if (forecast.day3?.condition === 'snowy') snowDays++;
    
    // Calculate temperature stats
    if (forecast.today?.high) {
      maxTemp = Math.max(maxTemp, forecast.today.high);
      minTemp = Math.min(minTemp, forecast.today.low || forecast.today.high);
      avgTemp += forecast.today.high;
      tempCount++;
    }
    if (forecast.tomorrow?.high) {
      maxTemp = Math.max(maxTemp, forecast.tomorrow.high);
      minTemp = Math.min(minTemp, forecast.tomorrow.low || forecast.tomorrow.high);
      avgTemp += forecast.tomorrow.high;
      tempCount++;
    }
    if (forecast.day3?.high) {
      maxTemp = Math.max(maxTemp, forecast.day3.high);
      minTemp = Math.min(minTemp, forecast.day3.low || forecast.day3.high);
      avgTemp += forecast.day3.high;
      tempCount++;
    }
  }
  
  avgTemp = avgTemp / tempCount;
  
  // STRICT CRITERIA - Snow King = EXCLUSIVE!
  
  // Path 1: Heavy snowfall + cold enough (won't melt)
  const MIN_SNOWFALL_PATH1 = 10; // At least 10mm/24h snow
  const MAX_AVG_TEMP_PATH1 = 0; // Average <= 0°C (won't melt!)
  const MAX_MAX_TEMP_PATH1 = 3; // Max temp <= 3°C
  const path1 = snowfall24h >= MIN_SNOWFALL_PATH1 && avgTemp <= MAX_AVG_TEMP_PATH1 && maxTemp <= MAX_MAX_TEMP_PATH1;
  
  // Path 2: Multiple snowy days + cold enough
  const MIN_SNOW_DAYS_PATH2 = 2; // At least 2 days of snow
  const MAX_AVG_TEMP_PATH2 = -2; // Average <= -2°C (won't melt!)
  const MAX_MAX_TEMP_PATH2 = 2; // Max temp <= 2°C
  const path2 = snowDays >= MIN_SNOW_DAYS_PATH2 && avgTemp <= MAX_AVG_TEMP_PATH2 && maxTemp <= MAX_MAX_TEMP_PATH2;
  
  // Path 3: Extremely cold + guaranteed snow
  const MIN_SNOW_DAYS_PATH3 = 1; // At least 1 day of snow
  const MAX_AVG_TEMP_PATH3 = -5; // Average <= -5°C (EXTREMELY cold!)
  const MAX_MAX_TEMP_PATH3 = -1; // Max temp <= -1°C (always below freezing)
  const path3 = snowDays >= MIN_SNOW_DAYS_PATH3 && avgTemp <= MAX_AVG_TEMP_PATH3 && maxTemp <= MAX_MAX_TEMP_PATH3;
  
  const shouldAward = path1 || path2 || path3;
  
  let reason = '';
  if (path1) reason = `${snowfall24h.toFixed(1)}mm snow/24h + Avg ${avgTemp.toFixed(1)}°C (won't melt!)`;
  else if (path2) reason = `${snowDays} snowy days + Avg ${avgTemp.toFixed(1)}°C (won't melt!)`;
  else if (path3) reason = `Extremely cold: Avg ${avgTemp.toFixed(1)}°C, Max ${maxTemp}°C (guaranteed snow!)`;
  
  return {
    shouldAward,
    snowDays,
    snowfallAmount: snowfall24h,
    maxTemp,
    minTemp,
    avgTemp: Math.round(avgTemp * 10) / 10,
    reason,
  };
}

/**
 * Calculate badge eligibility for a destination
 * 
 * @param {Object} destination - The destination to evaluate
 * @param {Object} userLocation - Current user location (with weather data)
 * @param {number} distanceKm - Distance from user to destination
 * @param {Array} allDestinations - All destinations for comparison
 * @returns {Array<string>} - Array of badge types this destination earned
 */
export function calculateBadges(destination, userLocation, distanceKm, allDestinations = []) {
  const badges = [];

  // 1. Worth the Drive Budget - RANKING SYSTEM (PRIORITY 1!)
  // Calculate efficiency for this destination
  const budgetResult = calculateWorthTheDriveBudget(destination, userLocation, distanceKm);
  destination._worthTheDriveBudgetData = budgetResult;
  
  // Badge is awarded later after comparing all destinations (see below)

  // 2. Worth the Drive (PRIORITY 2!)
  const worthResult = calculateWorthTheDrive(destination, userLocation, distanceKm);
  destination._worthTheDriveData = worthResult;
  
  if (worthResult.shouldAward) {
    badges.push(DestinationBadge.WORTH_THE_DRIVE);
    console.log(
      `🚗 ${destination.name}: Worth it! ` +
      `Temp: ${worthResult.tempOrigin}°C → ${worthResult.tempDest}°C (+${worthResult.tempDelta}°C), ` +
      `Weather: ${worthResult.weatherOrigin} → ${worthResult.weatherDest} (+${worthResult.delta} pts), ` +
      `Value: ${worthResult.value} pts/h, ` +
      `ETA: ${worthResult.eta}h (${Math.round(distanceKm)}km)`
    );
  }

  // 3. Warm & Dry
  const warmDryResult = calculateWarmAndDry(destination, allDestinations);
  destination._warmAndDryData = warmDryResult;
  
  if (warmDryResult.shouldAward) {
    badges.push(DestinationBadge.WARM_AND_DRY);
    console.log(
      `☀️ ${destination.name}: Warm & Dry! ` +
      `Temp: ${warmDryResult.temp}°C (Rank: #${warmDryResult.tempRank}), ` +
      `Condition: ${warmDryResult.condition}, ` +
      `Wind: ${warmDryResult.windSpeed} km/h`
    );
  }

  // 4. Beach Paradise
  const beachResult = calculateBeachParadise(destination);
  destination._beachParadiseData = beachResult;
  
  if (beachResult.shouldAward) {
    badges.push(DestinationBadge.BEACH_PARADISE);
    console.log(
      `🌊 ${destination.name}: Beach Paradise! ` +
      `Temp: ${beachResult.temp}°C, ` +
      `Condition: ${beachResult.condition}, ` +
      `Wind: ${beachResult.windSpeed} km/h`
    );
  }

  // 5. Sunny Streak
  const sunnyStreakResult = calculateSunnyStreak(destination);
  destination._sunnyStreakData = sunnyStreakResult;
  
  if (sunnyStreakResult.shouldAward) {
    badges.push(DestinationBadge.SUNNY_STREAK);
    console.log(
      `☀️ ${destination.name}: Sunny Streak! ` +
      `${sunnyStreakResult.sunnyDays} days of sunshine`
    );
  }

  // 6. Weather Miracle
  const miracleResult = calculateWeatherMiracle(destination);
  destination._weatherMiracleData = miracleResult;
  
  if (miracleResult.shouldAward) {
    badges.push(DestinationBadge.WEATHER_MIRACLE);
    console.log(
      `🌈 ${destination.name}: Weather Miracle! ` +
      `TODAY: ${miracleResult.todayTemp}°C, ${miracleResult.todayCondition} → ` +
      `FUTURE: ${miracleResult.futureTempMax}°C, sunny (+${miracleResult.tempGain}°C gain!)`
    );
  }

  // 7. Heatwave
  const heatwaveResult = calculateHeatwave(destination);
  destination._heatwaveData = heatwaveResult;
  
  if (heatwaveResult.shouldAward) {
    badges.push(DestinationBadge.HEATWAVE);
    console.log(
      `🔥 ${destination.name}: Heatwave! ` +
      `${heatwaveResult.hotDays} days >30°C, Max: ${heatwaveResult.maxTemp}°C`
    );
  }

  // 8. Snow King
  const snowKingResult = calculateSnowKing(destination);
  destination._snowKingData = snowKingResult;
  
  if (snowKingResult.shouldAward) {
    badges.push(DestinationBadge.SNOW_KING);
    console.log(
      `⛄ ${destination.name}: Snow King! ` +
      `${snowKingResult.reason} ` +
      `(${snowKingResult.snowDays} snowy days, ${snowKingResult.snowfallAmount.toFixed(1)}mm/24h)`
    );
  }

  return badges;
}
