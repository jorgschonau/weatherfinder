import { supabase } from '../config/supabase';
import { getCountryName, getCountryFlag } from '../utils/countryNames';

/**
 * Places + Weather Service
 * Core service: Fetches places WITH weather from database
 */

/**
 * Convert legacy "Weather code XX" to proper description
 * (for old database entries that weren't updated yet)
 */
const fixWeatherCodeDescription = (description) => {
  if (!description) return '';
  
  const match = description.match(/Weather code (\d+)/i);
  if (match) {
    const code = parseInt(match[1]);
    const codeDescriptions = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Depositing rime fog',
      51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
      56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
      61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
      66: 'Light freezing rain', 67: 'Heavy freezing rain',
      71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
      80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
      85: 'Slight snow showers', 86: 'Heavy snow showers',
      95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
    };
    return codeDescriptions[code] || description;
  }
  
  return description;
};

/**
 * Get all places with latest weather
 * @param {object} filters - Filtering options
 * @param {number} filters.userLat - User latitude
 * @param {number} filters.userLon - User longitude
 * @param {number} filters.radiusKm - Search radius in km
 * @param {string[]} filters.regions - Array of regions (e.g., ['europe', 'north_america'])
 * @returns {Promise<{places, error}>}
 */
export const getPlacesWithWeather = async (filters = {}) => {
  try {
    // Use the view - it's stable and tested
    // CRITICAL: Use explicit columns (not *) to avoid React Native crash!
    let query = supabase
      .from('places_with_latest_weather')
      .select(`
        id, name, latitude, longitude, country_code, region,
        place_category, population, attractiveness_score, clustering_radius_m,
        temperature, feels_like, humidity, wind_speed, wind_gust,
        cloud_cover, rain_1h, rain_3h, snow_1h, snow_3h, snow_24h,
        weather_main, weather_description, weather_icon,
        weather_timestamp, data_source,
        stability_score, weather_trend
      `);

    // Radius filter (bounding box for performance)
    if (filters.userLat && filters.userLon && filters.radiusKm) {
      const { latMin, latMax, lonMin, lonMax } = getBoundingBox(
        filters.userLat,
        filters.userLon,
        filters.radiusKm
      );
      
      console.log(`📦 Bounding Box: Lat [${latMin.toFixed(2)}, ${latMax.toFixed(2)}], Lon [${lonMin.toFixed(2)}, ${lonMax.toFixed(2)}]`);
      
      query = query
        .gte('latitude', latMin)
        .lte('latitude', latMax)
        .gte('longitude', lonMin)
        .lte('longitude', lonMax);
    }

    // WORKAROUND: Supabase has 1000-row limit!
    // We need to fetch multiple pages
    const PAGE_SIZE = 1000;
    // CRITICAL: For large radius, we need enough pages
    const MAX_PAGES = filters.radiusKm >= 1500 ? 50 : 10; // 50k max for large radius
    let allData = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore && page < MAX_PAGES) {
      const { data: pageData, error } = await query
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
      if (error) throw error;
      
      if (pageData && pageData.length > 0) {
        allData = allData.concat(pageData);
        hasMore = pageData.length === PAGE_SIZE; // Continue if we got a full page
        page++;
        
        // Log progress for large fetches
        if (page % 5 === 0) {
          console.log(`📥 Fetched ${page}/${MAX_PAGES} pages (${allData.length} places)...`);
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ Fetched ${page} pages total: ${allData.length} places`);
    
    // View returns flat data - no processing needed!
    let places = allData || [];
    
    // NOTE: Weather data may be outdated (manual updates only)
    // This is acceptable for now - showing old data is better than no data!
    
    console.log(`🗺️ DB returned ${places.length} places in bounding box`);
    
    // Debug: Show geographic distribution
    if (places.length > 0) {
      const byCountry = {};
      places.forEach(p => {
        const cc = p.country_code || '??';
        byCountry[cc] = (byCountry[cc] || 0) + 1;
      });
      const top5 = Object.entries(byCountry).sort((a,b) => b[1]-a[1]).slice(0,5);
      console.log(`📍 Top countries: ${top5.map(([cc, cnt]) => `${cc}:${cnt}`).join(', ')}`);
      
      // Show latitude range
      const lats = places.map(p => p.latitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      console.log(`🌍 Actual latitude range: ${minLat.toFixed(2)} to ${maxLat.toFixed(2)}`);
    }

    if (filters.userLat && filters.userLon) {
      places = places
        .map(place => {
          const distance = getDistanceKm(
            filters.userLat,
            filters.userLon,
            place.latitude,
            place.longitude
          );
          
          // Calculate bearing (direction from center)
          const dLon = (place.longitude - filters.userLon) * Math.PI / 180;
          const lat1 = filters.userLat * Math.PI / 180;
          const lat2 = place.latitude * Math.PI / 180;
          const y = Math.sin(dLon) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
          const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
          
          // Determine sector (16 directions for finer granularity)
          // N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW
          const sector = Math.floor((bearing + 11.25) / 22.5) % 16;
          
          return {
            ...place,
            distance,
            bearing,
            sector,
          };
        })
        .filter(place => !filters.radiusKm || place.distance <= filters.radiusKm);
      
      // NO BACKEND SECTORING! Return ALL places sorted by quality
      // Let the frontend (MapScreen) do the geographic filtering
      console.log(`🗺️ Backend: Returning ALL ${places.length} places in radius (no sectoring)`);
    }
    
    // Sort by score + population only (let frontend handle geographic distribution)
    places = places.sort((a, b) => {
      const scoreDiff = (b.attractiveness_score || 50) - (a.attractiveness_score || 50);
      if (Math.abs(scoreDiff) > 5) return scoreDiff;
      
      const popDiff = (b.population || 0) - (a.population || 0);
      if (popDiff !== 0) return popDiff;
      
      return a.distance - b.distance;
    });

    // Adapt to app format
    const adaptedPlaces = places.map(place => adaptPlaceToDestination(place));

    return { places: adaptedPlaces, error: null };
  } catch (error) {
    console.error('Get places with weather error:', error);
    return { places: [], error };
  }
};

/**
 * Get single place with weather + forecast
 * @param {string} placeId - Place ID
 * @returns {Promise<{place, forecast, error}>}
 */
export const getPlaceDetail = async (placeId) => {
  try {
    // Get place with latest weather
    const { data: place, error: placeError } = await supabase
      .from('places_with_latest_weather')
      .select(`
        id, name, latitude, longitude, country_code, region,
        place_category, population, attractiveness_score,
        temperature, feels_like, humidity, wind_speed, wind_gust,
        cloud_cover, rain_1h, rain_3h, snow_1h, snow_3h, snow_24h,
        weather_main, weather_description, weather_icon,
        weather_timestamp, data_source,
        stability_score, weather_trend
      `)
      .eq('id', placeId)
      .single();

    if (placeError) throw placeError;

    // Get 16-day forecast
    const { data: forecast, error: forecastError } = await supabase
      .from('weather_forecast')
      .select(`
        forecast_timestamp, temp_min, temp_max,
        precipitation_sum, rain_volume, precipitation_probability, rain_probability,
        wind_speed_max, wind_speed,
        weather_main, weather_icon, weather_description
      `)
      .eq('place_id', placeId)
      .gte('forecast_timestamp', new Date().toISOString())
      .order('forecast_timestamp', { ascending: true })
      .limit(16);

    if (forecastError) console.warn('Forecast fetch failed:', forecastError);

    return {
      place: adaptPlaceToDestination(place),
      forecast: (forecast || []).map(adaptForecastEntry),
      error: null,
    };
  } catch (error) {
    console.error('Get place detail error:', error);
    return { place: null, forecast: [], error };
  }
};

/**
 * Search places by name
 * @param {string} searchTerm - Search term
 * @param {number} limit - Max results (default 20)
 * @returns {Promise<{places, error}>}
 */
export const searchPlacesByName = async (searchTerm, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('places_with_latest_weather')
      .select(`
        id, name, latitude, longitude, country_code, region,
        place_category, population, attractiveness_score,
        temperature, feels_like, humidity, wind_speed, wind_gust,
        cloud_cover, rain_1h, rain_3h, snow_1h, snow_3h, snow_24h,
        weather_main, weather_description, weather_icon,
        weather_timestamp, data_source,
        stability_score, weather_trend
      `)
      .ilike('name', `%${searchTerm}%`)
      .limit(limit);

    if (error) throw error;

    const adaptedPlaces = (data || []).map(place => adaptPlaceToDestination(place));

    return { places: adaptedPlaces, error: null };
  } catch (error) {
    console.error('Search places error:', error);
    return { places: [], error };
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calculate bounding box for radius search
 */
function getBoundingBox(lat, lon, radiusKm) {
  const latDelta = Math.min(89.9, radiusKm / 111.32);
  const lonMultiplier = Math.max(Math.cos(lat * Math.PI / 180), 0.1);
  const lonDelta = Math.min(179.9, radiusKm / (111.32 * lonMultiplier));

  return {
    latMin: lat - latDelta,
    latMax: lat + latDelta,
    lonMin: lon - lonDelta,
    lonMax: lon + lonDelta,
  };
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
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
 * Adapt place + weather to destination format used by app
 */
function adaptPlaceToDestination(place) {
  // Map weather_main to app condition
  const condition = mapWeatherMainToCondition(place.weather_main);

  return {
    // Core place data
    id: place.id,
    lat: place.latitude,
    lon: place.longitude,
    name: place.name,
    country: getCountryName(place.country_code),
    countryCode: place.country_code,
    countryFlag: getCountryFlag(place.country_code),
    region: place.region,
    
    // Weather data (from database)
    condition,
    temperature: place.temperature ? Math.round(place.temperature) : null,
    feelsLike: place.feels_like ? Math.round(place.feels_like) : null,
    humidity: place.humidity,
    windSpeed: place.wind_speed ? Math.round(place.wind_speed) : null,
    windGust: place.wind_gust ? Math.round(place.wind_gust) : null,
    precipitation: place.rain_1h || 0, // Use rain_1h as precipitation
    snowfall1h: place.snow_1h || 0, // mm Schnee letzte 1h
    snowfall3h: place.snow_3h || 0, // mm Schnee letzte 3h
    snowfall24h: place.snow_24h || 0, // mm Schnee letzte 24h
    cloudCover: place.cloud_cover, // View aliases clouds as cloud_cover
    
    // Calculated stability (simple version)
    stability: calculateStability(place),
    
    // Metadata
    weatherMain: place.weather_main,
    weatherIcon: place.weather_icon,
    weatherDescription: fixWeatherCodeDescription(place.weather_description),
    weatherTimestamp: place.weather_timestamp,
    
    // Weather trend (from DB: improving, stable, worsening)
    weatherTrend: place.weather_trend,
    
    // Attractiveness score
    attractivenessScore: place.attractiveness_score || 50,
    population: place.population || 0,
    clusteringRadiusM: place.clustering_radius_m || 50000, // Default 50km if missing
    
    // Distance (filled in by getPlacesWithWeather if applicable)
    distance: place.distance || null,
    
    // Future: badges will be calculated based on weather + place attributes
    badges: [],
  };
}

/**
 * Map weather_main to app condition
 * Based on OpenWeatherMap categories (Clear, Clouds, Rain, etc.)
 */
function mapWeatherMainToCondition(weatherMain) {
  if (!weatherMain) return 'cloudy';
  
  const main = weatherMain.toLowerCase();
  
  if (main === 'clear') return 'sunny';
  if (main === 'clouds') return 'cloudy';
  if (main === 'rain' || main === 'drizzle' || main === 'thunderstorm') return 'rainy';
  if (main === 'snow') return 'snowy';
  if (main === 'fog' || main === 'mist' || main === 'haze') return 'windy';
  
  return 'cloudy'; // Default
}

/**
 * Calculate simple stability score (0-100)
 * Higher = better weather
 */
function calculateStability(place) {
  // Use stability_score if already calculated in DB, otherwise calculate
  if (place.stability_score) {
    return place.stability_score;
  }

  // Calculate from cloud_cover and wind_speed
  const cloudCover = place.cloud_cover || place.clouds || 50; // Fallback to 50 if missing
  const windSpeed = place.wind_speed || 5; // Fallback to 5 m/s if missing

  // Less clouds = better
  // Less wind = better
  const cloudScore = 100 - cloudCover;
  const windScore = Math.max(0, 100 - windSpeed * 2);
  
  return Math.round((cloudScore + windScore) / 2);
}

/**
 * Adapt forecast entry to app format
 */
function adaptForecastEntry(entry) {
  return {
    timestamp: entry.forecast_timestamp,
    date: new Date(entry.forecast_timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    condition: mapWeatherMainToCondition(entry.weather_main),
    tempMin: entry.temp_min ? Math.round(entry.temp_min) : null,
    tempMax: entry.temp_max ? Math.round(entry.temp_max) : null,
    precipitation: entry.precipitation_sum || entry.rain_volume || 0,
    precipitationProbability: entry.precipitation_probability || entry.rain_probability,
    windSpeed: entry.wind_speed_max || entry.wind_speed ? Math.round(entry.wind_speed_max || entry.wind_speed) : null,
    weatherMain: entry.weather_main,
    weatherIcon: entry.weather_icon,
    weatherDescription: fixWeatherCodeDescription(entry.weather_description),
  };
}

export default {
  getPlacesWithWeather,
  getPlaceDetail,
  searchPlacesByName,
};

