// External data source: Weather API provider
// Note: You'll need to get a free API key from OpenWeatherMap or similar service
// For demo purposes, we'll use mock data structure

const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // Replace with your API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Cache configuration
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes in milliseconds
const forecastCache = new Map();

/**
 * Cache entry structure: { data, timestamp }
 * Key format: "lat,lon" (rounded to 2 decimals for consistency)
 */

// Mock weather data for demonstration
const generateMockWeatherData = (lat, lon, index) => {
  const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
  const condition = conditions[index % conditions.length];

  const baseTemp = condition === 'snowy' ? -5 : condition === 'sunny' ? 25 : 15;
  const temp = baseTemp + (Math.random() * 10 - 5);

  return {
    lat,
    lon,
    name: `Destination ${index + 1}`,
    condition,
    temperature: Math.round(temp),
    humidity: Math.round(50 + Math.random() * 30),
    windSpeed: Math.round(5 + Math.random() * 20),
    stability: Math.round(70 + Math.random() * 25), // Weather stability score
    forecast: {
      today: { condition, temp: Math.round(temp), high: Math.round(temp + 5), low: Math.round(temp - 5) },
      tomorrow: { condition: conditions[(index + 1) % conditions.length], temp: Math.round(temp + 2), high: Math.round(temp + 7), low: Math.round(temp - 3) },
      day3: { condition: conditions[(index + 2) % conditions.length], temp: Math.round(temp - 1), high: Math.round(temp + 4), low: Math.round(temp - 6) },
    },
    description: `${condition.charAt(0).toUpperCase() + condition.slice(1)} conditions`,
  };
};

/**
 * Generate cache key from coordinates
 */
const getCacheKey = (lat, lon) => {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
};

/**
 * Check if cache entry is still valid
 */
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  const now = Date.now();
  return (now - cacheEntry.timestamp) < CACHE_TTL_MS;
};

/**
 * Get forecast from cache or return null if not available/expired
 */
const getFromCache = (lat, lon) => {
  const key = getCacheKey(lat, lon);
  const cacheEntry = forecastCache.get(key);
  
  if (isCacheValid(cacheEntry)) {
    console.log(`Cache HIT for ${key}`);
    return cacheEntry.data;
  }
  
  if (cacheEntry) {
    console.log(`Cache EXPIRED for ${key}`);
    forecastCache.delete(key);
  }
  
  return null;
};

/**
 * Store forecast in cache
 */
const setInCache = (lat, lon, data) => {
  const key = getCacheKey(lat, lon);
  console.log(`Cache SET for ${key}`);
  forecastCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

/**
 * Provider method: returns weather-enriched destinations in a radius (no domain filtering)
 */
export const fetchWeatherDestinationsForRadius = async (userLat, userLon, radiusKm) => {
  // In production, this would call a real weather API
  // For now, we'll generate mock destinations within the radius

  const destinations = [];
  const numDestinations = Math.min(20, Math.floor(radiusKm / 50)); // More destinations for larger radius

  for (let i = 0; i < numDestinations; i++) {
    // Generate random points within the radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusKm * 1000; // Convert to meters
    const latOffset = (distance * Math.cos(angle)) / 111000; // Rough conversion
    const lonOffset = (distance * Math.sin(angle)) / (111000 * Math.cos(userLat * Math.PI / 180));

    const destLat = userLat + latOffset;
    const destLon = userLon + lonOffset;

    const weather = generateMockWeatherData(destLat, destLon, i);
    destinations.push(weather);
  }

  return destinations;
};

/**
 * Provider method: fetch detailed forecast for a specific destination with caching
 * Cache TTL: 60 minutes
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} name - Destination name (optional)
 * @returns {Promise<Object>} Detailed forecast data
 */
export const fetchDetailedForecast = async (lat, lon, name = null) => {
  // Check cache first
  const cached = getFromCache(lat, lon);
  if (cached) {
    return cached;
  }

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // In production, this would call a real weather API
  // For demo, we generate mock data based on coordinates
  const index = Math.floor(Math.abs(lat * lon * 1000)) % 100;
  const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
  const condition = conditions[index % conditions.length];

  const baseTemp = condition === 'snowy' ? -5 : condition === 'sunny' ? 25 : 15;
  const temp = baseTemp + (Math.abs(lat) % 10);

  const forecast = {
    lat,
    lon,
    name: name || `Location at ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    condition,
    temperature: Math.round(temp),
    humidity: Math.round(50 + (Math.abs(lon) % 30)),
    windSpeed: Math.round(5 + (Math.abs(lat + lon) % 20)),
    stability: Math.round(70 + (Math.abs(lat * 10) % 25)),
    forecast: {
      today: { 
        condition, 
        temp: Math.round(temp), 
        high: Math.round(temp + 5), 
        low: Math.round(temp - 5) 
      },
      tomorrow: { 
        condition: conditions[(index + 1) % conditions.length], 
        temp: Math.round(temp + 2), 
        high: Math.round(temp + 7), 
        low: Math.round(temp - 3) 
      },
      day3: { 
        condition: conditions[(index + 2) % conditions.length], 
        temp: Math.round(temp - 1), 
        high: Math.round(temp + 4), 
        low: Math.round(temp - 6) 
      },
    },
    description: `${condition.charAt(0).toUpperCase() + condition.slice(1)} conditions`,
    fetchedAt: new Date().toISOString(),
  };

  // Store in cache
  setInCache(lat, lon, forecast);

  return forecast;
};


