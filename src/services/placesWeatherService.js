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
    // Date filter: defaults to today, can be 'today', 'tomorrow', or YYYY-MM-DD
    const now = new Date();
    let targetDate;
    
    if (filters.date === 'tomorrow') {
      targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else if (filters.date === 'in2days') {
      targetDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else if (filters.date === 'in3days') {
      targetDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
      targetDate = filters.date; // Custom date in YYYY-MM-DD format
    } else {
      targetDate = now.toISOString().split('T')[0]; // Default: today
    }
    
    console.log(`🌤️ Fetching places + weather for ${targetDate}...`);
    
    // Build bounding box
    let latMin, latMax, lonMin, lonMax;
    if (filters.userLat && filters.userLon && filters.radiusKm) {
      const box = getBoundingBox(filters.userLat, filters.userLon, filters.radiusKm);
      latMin = box.latMin; latMax = box.latMax; lonMin = box.lonMin; lonMax = box.lonMax;
    }

    // Query 1: Get places
    let placesQuery = supabase
      .from('places')
      .select('id, name, latitude, longitude, country_code, place_type, population, attractiveness_score, clustering_radius_m')
      .eq('is_active', true);
    
    if (latMin !== undefined) {
      placesQuery = placesQuery
        .gte('latitude', latMin).lte('latitude', latMax)
        .gte('longitude', lonMin).lte('longitude', lonMax);
    }
    
    const { data: places, error: placesError } = await placesQuery.limit(5000);
    
    if (placesError) {
      console.error('❌ Places query failed:', placesError);
      throw placesError;
    }
    
    console.log(`📍 Got ${places?.length || 0} places`);
    
    if (!places || places.length === 0) {
      return { places: [], error: null };
    }
    
    // Query 2: Get weather for TODAY ONLY for our places
    const placeIds = places.map(p => p.id);
    // Hole Wetter für targetDate ODER nächste 3 Tage als Fallback
    const fallbackDate = new Date(new Date(targetDate).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    console.log(`🌤️ Fetching weather for ${placeIds.length} places (${targetDate} to ${fallbackDate})...`);
    
    // Fetch in chunks of 200 to avoid URL length issues
    let allWeather = [];
    const CHUNK_SIZE = 200;
    
    // Filter out stale data (older than 7 days) to ensure fresh weather info
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    for (let i = 0; i < placeIds.length; i += CHUNK_SIZE) {
      const chunk = placeIds.slice(i, i + CHUNK_SIZE);
      const { data: chunkWeather, error: chunkError } = await supabase
        .from('weather_forecast')
        .select('place_id, forecast_date, temp_min, temp_max, weather_main, weather_description, weather_icon, wind_speed, sunshine_duration, fetched_at, humidity')
        .in('place_id', chunk)
        .gte('forecast_date', targetDate)
        .lte('forecast_date', fallbackDate)
        .gte('fetched_at', sevenDaysAgo)  // Only data fetched in last 7 days
        .order('forecast_date', { ascending: true });
      
      if (!chunkError && chunkWeather) {
        allWeather.push(...chunkWeather);
      }
    }
    
    console.log(`🌤️ Got ${allWeather.length} weather records (${targetDate} - ${fallbackDate})`);
    
    // Build weather map with forecast for multiple days
    const weatherMap = {};
    allWeather.forEach(w => {
      if (!weatherMap[w.place_id]) {
        weatherMap[w.place_id] = { today: null, tomorrow: null, day2: null, day3: null };
      }
      
      const entry = weatherMap[w.place_id];
      // Fill in order: today, tomorrow, day2, day3
      if (!entry.today) entry.today = w;
      else if (!entry.tomorrow) entry.tomorrow = w;
      else if (!entry.day2) entry.day2 = w;
      else if (!entry.day3) entry.day3 = w;
    });
    
    // Helper to map weather_main to condition
    const getCondition = (weatherMain) => {
      if (!weatherMain) return 'cloudy';
      const main = weatherMain.toLowerCase();
      if (main === 'clear') return 'sunny';
      if (main === 'clouds') return 'cloudy';
      if (main === 'rain' || main === 'drizzle' || main === 'thunderstorm') return 'rainy';
      if (main === 'snow') return 'snowy';
      return 'cloudy';
    };
    
    
    // Combine places with weather (including forecast)
    let placesData = places.map(p => {
      const wData = weatherMap[p.id] || {};
      const today = wData.today || {};
      const tomorrow = wData.tomorrow;
      const day2 = wData.day2;
      const day3 = wData.day3;
      
      // Build forecast structure for badges AND UI display
      const forecast = {
        today: today ? {
          condition: getCondition(today.weather_main),
          temp: today.temp_max,
          high: Math.round(today.temp_max),
          low: Math.round(today.temp_min),
          description: today.weather_description,
        } : null,
        tomorrow: tomorrow ? {
          condition: getCondition(tomorrow.weather_main),
          temp: tomorrow.temp_max,
          high: Math.round(tomorrow.temp_max),
          low: Math.round(tomorrow.temp_min),
          description: tomorrow.weather_description,
        } : null,
        day2: day2 ? {
          condition: getCondition(day2.weather_main),
          temp: day2.temp_max,
          high: Math.round(day2.temp_max),
          low: Math.round(day2.temp_min),
          description: day2.weather_description,
        } : null,
        day3: day3 ? {
          condition: getCondition(day3.weather_main),
          temp: day3.temp_max,
          high: Math.round(day3.temp_max),
          low: Math.round(day3.temp_min),
          description: day3.weather_description,
        } : null,
      };
      
      return {
        ...p,
        temp_min: today.temp_min,
        temp_max: today.temp_max,
        weather_main: today.weather_main,
        weather_description: today.weather_description,
        weather_icon: today.weather_icon,
        wind_speed: today.wind_speed,
        humidity: today.humidity,
        forecast_date: today.forecast_date,
        sunshine_duration: today.sunshine_duration,
        forecast, // Include multi-day forecast!
      };
    });
    
    const withWeather = placesData.filter(p => p.temp_min != null).length;
    console.log(`🔗 ${withWeather}/${placesData.length} places have weather`);
    
    // Transform places - ONLY include those with valid temperature!
    let finalPlaces = placesData
      .filter(place => place.temp_min != null && place.temp_max != null) // Skip places without temp!
      .map(place => {
        // Map weather_main to condition
        let condition = 'cloudy';
        if (place.weather_main) {
          const main = place.weather_main.toLowerCase();
          if (main === 'clear') condition = 'sunny';
          else if (main === 'clouds') condition = 'cloudy';
          else if (main === 'rain' || main === 'drizzle' || main === 'thunderstorm') condition = 'rainy';
          else if (main === 'snow') condition = 'snowy';
        }
        
        return {
          id: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          lat: place.latitude,
          lon: place.longitude,
          country_code: place.country_code, // WICHTIG für Ländername!
          place_type: place.place_type,
          place_category: place.place_type,
          population: place.population,
          attractiveness_score: place.attractiveness_score,
          attractivenessScore: place.attractiveness_score,
          clustering_radius_m: place.clustering_radius_m,
          
          // Weather data - guaranteed to exist! Always show MAX temp
          temperature: Math.round(place.temp_max),
          temp_min: place.temp_min,
          temp_max: place.temp_max,
          condition: condition,
          weather_main: place.weather_main || 'Clouds',
          weather_description: place.weather_description || 'No data',
          weather_icon: place.weather_icon || '03d',
          wind_speed: place.wind_speed,
          sunshine_duration: place.sunshine_duration,
          forecast: place.forecast, // Multi-day forecast for badges!
          precipitation_sum: null,
          precipitation_probability: null,
          sunrise: null,
          sunset: null,
          rain_1h: null,
          snow_1h: null,
          weather_timestamp: null,
          
          feels_like: null,
          humidity: place.humidity || null,
          cloud_cover: null,
          rain_3h: null,
          snow_3h: null,
          snow_24h: null,
          wind_gust: null,
          stability_score: null,
          weather_trend: null
        };
      });
    
    const withWeatherCount = finalPlaces.length;
    console.log(`✅ ${withWeatherCount} places with valid temperature data`);
    
    // Sort by temp (warmest first)
    finalPlaces.sort((a, b) => (b.temp_max || 0) - (a.temp_max || 0));
    
    console.log(`📊 ${finalPlaces.length} places with weather`);
    
    if (filters.userLat && filters.userLon) {
      finalPlaces = finalPlaces
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
      
      console.log(`🗺️ Backend: ${finalPlaces.length} places in radius`);
    }
    
    // Sort by temp (warmest first)
    finalPlaces.sort((a, b) => (b.temp_max || 0) - (a.temp_max || 0));

    // Adapt to app format (pass locale for country name translation)
    const locale = filters.locale || 'en';
    const adaptedPlaces = finalPlaces.map(place => adaptPlaceToDestination(place, locale));

    return { places: adaptedPlaces, error: null };
  } catch (error) {
    console.error('Get places with weather error:', error);
    return { places: [], error };
  }
};

/**
 * Get single place with weather + forecast
 * @param {string} placeId - Place ID
 * @param {string} locale - Locale for translations (e.g. 'de', 'en')
 * @returns {Promise<{place, forecast, error}>}
 */
export const getPlaceDetail = async (placeId, locale = 'en') => {
  try {
    // Get place (separate query - no FK needed)
    const { data: place, error: placeError } = await supabase
      .from('places')
      .select('id, name, latitude, longitude, country_code, place_type, population, attractiveness_score')
      .eq('id', placeId)
      .single();

    if (placeError) throw placeError;
    if (!place) {
      return { place: null, forecast: [], error: 'Place not found' };
    }
    
    // Get today's weather (separate query)
    const today = new Date().toISOString().split('T')[0];
    const { data: weatherData } = await supabase
      .from('weather_forecast')
      .select('forecast_date, temp_min, temp_max, weather_main, weather_description, weather_icon, wind_speed, precipitation_sum, precipitation_probability, sunrise, sunset, rain_volume, snow_volume')
      .eq('place_id', placeId)
      .gte('forecast_date', today)
      .order('forecast_date', { ascending: true })
      .limit(1);
    
    const weather = weatherData?.[0] || {};
    const flatPlace = {
      id: place.id,
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      country_code: place.country_code,
      place_type: place.place_type,
      place_category: place.place_type,
      population: place.population,
      attractiveness_score: place.attractiveness_score,
      temperature: weather.temp_max ? Math.round(weather.temp_max) : null, // Always use MAX temp!
      temp_min: weather.temp_min,
      temp_max: weather.temp_max,
      weather_main: weather.weather_main,
      weather_description: weather.weather_description,
      weather_icon: weather.weather_icon,
      wind_speed: weather.wind_speed,
      rain_1h: weather.rain_volume,
      snow_1h: weather.snow_volume,
    };

    // Get 16-day forecast (using forecast_date)
    const { data: forecast, error: forecastError } = await supabase
      .from('weather_forecast')
      .select(`
        forecast_date, temp_min, temp_max,
        precipitation_sum, rain_volume, precipitation_probability, rain_probability,
        wind_speed,
        weather_main, weather_icon, weather_description
      `)
      .eq('place_id', placeId)
      .gte('forecast_date', today)
      .order('forecast_date', { ascending: true })
      .limit(16);

    if (forecastError) console.warn('Forecast fetch failed:', forecastError);

    return {
      place: adaptPlaceToDestination(flatPlace, locale),
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
 * @param {string} locale - Locale for translations (e.g. 'de', 'en')
 * @returns {Promise<{places, error}>}
 */
export const searchPlacesByName = async (searchTerm, limit = 20, locale = 'en') => {
  try {
    const { data, error } = await supabase
      .from('places')
      .select(`
        id, name, latitude, longitude, country_code,
        place_type, population, attractiveness_score,
        weather_forecast(
          forecast_date, temp_min, temp_max,
          weather_main, weather_description, weather_icon,
          wind_speed, rain_volume, snow_volume
        )
      `)
      .eq('is_active', true)
      .ilike('name', `%${searchTerm}%`)
      .eq('weather_forecast.forecast_date', new Date().toISOString().split('T')[0])
      .limit(limit);

    if (error) throw error;

    // Transform nested data
    const places = (data || []).map(place => {
      const weather = place.weather_forecast?.[0] || {};
      return {
        id: place.id,
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        country_code: place.country_code,
        place_type: place.place_type,
        place_category: place.place_type,
        population: place.population,
        attractiveness_score: place.attractiveness_score,
        temperature: weather.temp_max ? Math.round(weather.temp_max) : null,
        temp_min: weather.temp_min,
        temp_max: weather.temp_max,
        weather_main: weather.weather_main,
        weather_description: weather.weather_description,
        weather_icon: weather.weather_icon,
        wind_speed: weather.wind_speed,
        rain_1h: weather.rain_volume,
        snow_1h: weather.snow_volume,
      };
    });

    const adaptedPlaces = places.map(place => adaptPlaceToDestination(place, locale));

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
function adaptPlaceToDestination(place, locale = 'en') {
  // Map weather_main to app condition
  const condition = mapWeatherMainToCondition(place.weather_main);

  return {
    // Core place data
    id: place.id,
    lat: place.latitude,
    lon: place.longitude,
    name: place.name,
    country: getCountryName(place.country_code, locale),
    countryCode: place.country_code,
    country_code: place.country_code, // Also include as country_code for compatibility
    countryFlag: getCountryFlag(place.country_code),
    
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
    
    // Multi-day forecast for badge calculation!
    forecast: place.forecast || null,
    
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
    timestamp: entry.forecast_date, // Using forecast_date now
    date: new Date(entry.forecast_date + 'T12:00:00Z').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    condition: mapWeatherMainToCondition(entry.weather_main),
    tempMin: entry.temp_min ? Math.round(entry.temp_min) : null,
    tempMax: entry.temp_max ? Math.round(entry.temp_max) : null,
    precipitation: entry.precipitation_sum || entry.rain_volume || 0,
    precipitationProbability: entry.precipitation_probability || entry.rain_probability,
    windSpeed: entry.wind_speed ? Math.round(entry.wind_speed) : null,
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

