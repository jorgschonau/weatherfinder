/**
 * Weather Analytics - Using historical data (20 days)
 * Calculate stability, trends, and conditions
 */

/**
 * Calculate weather stability from historical data
 * Higher score = more stable/predictable weather
 * 
 * @param {Array} weatherData - Array of weather_data records (sorted by date)
 * @returns {number} Stability score 0.0-1.0
 */
export const calculateStability = (weatherData) => {
  if (!weatherData || weatherData.length < 3) return 0.5;

  // Calculate temperature variance
  const temps = weatherData.map(w => w.temperature);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const variance = temps.reduce((sum, temp) => sum + Math.pow(temp - avgTemp, 2), 0) / temps.length;
  const tempStability = Math.max(0, 1 - (variance / 100)); // Lower variance = higher stability

  // Calculate weather condition consistency
  const conditions = weatherData.map(w => w.weather_main);
  const uniqueConditions = new Set(conditions).size;
  const conditionStability = 1 - (uniqueConditions / conditions.length);

  // Combined score
  return (tempStability * 0.6 + conditionStability * 0.4);
};

/**
 * Get stability badge for UI
 * @param {number} stability - Stability score 0.0-1.0
 * @returns {object} { emoji, text, color }
 */
export const getStabilityBadge = (stability) => {
  if (stability >= 0.8) {
    return { emoji: '🟢', text: 'Sehr stabil', color: '#22c55e' };
  } else if (stability >= 0.6) {
    return { emoji: '🟡', text: 'Mäßig stabil', color: '#eab308' };
  } else {
    return { emoji: '🔴', text: 'Wechselhaft', color: '#ef4444' };
  }
};

/**
 * Calculate recent rain (last N days)
 * For camping conditions assessment
 * 
 * @param {Array} weatherData - Array of weather_data records
 * @param {number} days - Number of days to check (default 3)
 * @returns {number} Total rain in mm
 */
export const calculateRecentRain = (weatherData, days = 3) => {
  if (!weatherData || weatherData.length === 0) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return weatherData
    .filter(w => new Date(w.weather_timestamp) >= cutoff)
    .reduce((sum, w) => {
      const rain = w.rain_1h || w.rain_3h || w.rain_24h || 0;
      return sum + rain;
    }, 0);
};

/**
 * Get ground conditions warning
 * @param {number} recentRain - Rain in mm (last 3 days)
 * @returns {object|null} { emoji, text, severity } or null
 */
export const getGroundConditionsWarning = (recentRain) => {
  if (recentRain > 30) {
    return {
      emoji: '⚠️',
      text: 'Boden sehr nass, Camping schwierig',
      severity: 'high'
    };
  } else if (recentRain > 15) {
    return {
      emoji: '💧',
      text: 'Boden feucht, Standort gut wählen',
      severity: 'medium'
    };
  }
  return null;
};

/**
 * Calculate temperature trend
 * Positive = getting warmer, Negative = getting colder
 * 
 * @param {Array} weatherData - Array of weather_data records (sorted old→new)
 * @returns {number} Trend in °C per day
 */
export const calculateTemperatureTrend = (weatherData) => {
  if (!weatherData || weatherData.length < 5) return 0;

  const temps = weatherData.map(w => w.temperature);
  const n = temps.length;
  
  // Simple linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += temps[i];
    sumXY += i * temps[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
};

/**
 * Get trend badge for UI
 * @param {number} trend - Trend in °C per day
 * @returns {object} { emoji, text }
 */
export const getTrendBadge = (trend) => {
  if (trend > 0.5) {
    return { emoji: '📈', text: 'Wird wärmer' };
  } else if (trend < -0.5) {
    return { emoji: '📉', text: 'Wird kälter' };
  } else {
    return { emoji: '➡️', text: 'Stabil' };
  }
};

/**
 * Get comprehensive weather analytics
 * @param {Array} weatherData - Last 7-20 days of weather_data
 * @returns {object} Complete analytics
 */
export const getWeatherAnalytics = (weatherData) => {
  const stability = calculateStability(weatherData);
  const recentRain = calculateRecentRain(weatherData, 3);
  const trend = calculateTemperatureTrend(weatherData);
  
  return {
    stability: {
      score: stability,
      badge: getStabilityBadge(stability),
    },
    groundConditions: {
      recentRain,
      warning: getGroundConditionsWarning(recentRain),
    },
    trend: {
      value: trend,
      badge: getTrendBadge(trend),
    },
  };
};

export default {
  calculateStability,
  getStabilityBadge,
  calculateRecentRain,
  getGroundConditionsWarning,
  calculateTemperatureTrend,
  getTrendBadge,
  getWeatherAnalytics,
};

