import { supabase } from '../config/supabase';
import Constants from 'expo-constants';

/**
 * Weatherbit.io Bulk API Service
 * Efficient batch weather updates for thousands of places
 */

const WEATHERBIT_API_KEY = Constants.expoConfig?.extra?.weatherbitApiKey || '';
const BATCH_SIZE = 100; // Weatherbit allows up to 100 locations per batch

if (!WEATHERBIT_API_KEY) {
  console.warn('⚠️  Weatherbit API key not configured. Weather updates will fail.');
}

/**
 * Fetch current weather for multiple locations in one call
 * @param {Array} places - Array of place objects with latitude, longitude
 * @returns {Promise<{data, error}>}
 */
export const fetchBulkCurrentWeather = async (places) => {
  try {
    const locations = places.map(p => ({
      lat: p.latitude,
      lon: p.longitude,
    }));

    const response = await fetch(
      'https://api.weatherbit.io/v2.0/current/bulk',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'key': WEATHERBIT_API_KEY,
        },
        body: JSON.stringify({ locations }),
      }
    );

    if (!response.ok) {
      throw new Error(`Weatherbit API error: ${response.status}`);
    }

    const data = await response.json();
    return { data: data.data, error: null };
  } catch (error) {
    console.error('Fetch bulk current weather error:', error);
    return { data: null, error };
  }
};

/**
 * Fetch 16-day forecast for multiple locations in one call
 * @param {Array} places - Array of place objects
 * @param {number} days - Number of days (default 16, max 16)
 * @returns {Promise<{data, error}>}
 */
export const fetchBulkForecast = async (places, days = 16) => {
  try {
    const locations = places.map(p => ({
      lat: p.latitude,
      lon: p.longitude,
    }));

    const response = await fetch(
      `https://api.weatherbit.io/v2.0/forecast/daily/bulk?days=${days}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'key': WEATHERBIT_API_KEY,
        },
        body: JSON.stringify({ locations }),
      }
    );

    if (!response.ok) {
      throw new Error(`Weatherbit API error: ${response.status}`);
    }

    const data = await response.json();
    return { data: data.data, error: null };
  } catch (error) {
    console.error('Fetch bulk forecast error:', error);
    return { data: null, error };
  }
};

/**
 * Update weather for a batch of places (up to 100)
 * @param {Array} places - Array of place objects
 * @returns {Promise<{success, failed, error}>}
 */
export const updateBatchWeather = async (places) => {
  try {
    console.log(`📦 Updating weather for batch of ${places.length} places`);

    // Fetch current weather
    const { data: currentWeather, error: currentError } = await fetchBulkCurrentWeather(places);
    
    if (currentError) {
      throw currentError;
    }

    // Fetch forecast
    const { data: forecastData, error: forecastError } = await fetchBulkForecast(places);
    
    if (forecastError) {
      throw forecastError;
    }

    let success = 0;
    let failed = 0;

    // Save to database
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      const current = currentWeather[i];
      const forecast = forecastData[i]?.data || []; // Array of daily forecasts

      try {
        // Save current weather
        await saveWeatherData(place.id, current);

        // Save forecast (16 days)
        await saveForecastData(place.id, forecast);

        // Update last_weather_fetch
        await supabase
          .from('places')
          .update({ last_weather_fetch: new Date().toISOString() })
          .eq('id', place.id);

        success++;
      } catch (err) {
        console.error(`Failed to save weather for place ${place.id}:`, err);
        failed++;
      }
    }

    console.log(`✅ Batch complete: ${success} success, ${failed} failed`);
    return { success, failed, error: null };
  } catch (error) {
    console.error('Update batch weather error:', error);
    return { success: 0, failed: places.length, error };
  }
};

/**
 * Save current weather data to database
 * @param {string} placeId - Place ID
 * @param {object} weatherData - Weatherbit current weather data
 */
const saveWeatherData = async (placeId, weatherData) => {
  const record = {
    place_id: placeId,
    weather_timestamp: new Date(weatherData.ts * 1000).toISOString(),
    
    // Temperature
    temperature: weatherData.temp,
    feels_like: weatherData.app_temp,
    temp_min: weatherData.min_temp,
    temp_max: weatherData.max_temp,
    dew_point: weatherData.dewpt,
    
    // Conditions
    weather_main: weatherData.weather?.description,
    weather_description: weatherData.weather?.description,
    weather_icon: weatherData.weather?.icon,
    
    // Humidity & Pressure
    humidity: weatherData.rh,
    pressure: weatherData.pres,
    pressure_sea_level: weatherData.slp,
    
    // Wind
    wind_speed: weatherData.wind_spd,
    wind_deg: weatherData.wind_dir,
    wind_gust: weatherData.gust,
    
    // Clouds & Visibility
    clouds: weatherData.clouds,
    visibility: weatherData.vis * 1000, // km to meters
    
    // Precipitation
    rain_1h: weatherData.precip,
    snow_1h: weatherData.snow,
    
    // UV & Sun
    uv_index: weatherData.uv,
    sunrise: weatherData.sunrise ? new Date(weatherData.sunrise).toISOString() : null,
    sunset: weatherData.sunset ? new Date(weatherData.sunset).toISOString() : null,
    
    data_source: 'weatherbit',
  };

  await supabase
    .from('weather_data')
    .upsert(record, { onConflict: 'place_id,weather_timestamp' });
};

/**
 * Save forecast data to database
 * @param {string} placeId - Place ID
 * @param {Array} forecastArray - Array of daily forecasts
 */
const saveForecastData = async (placeId, forecastArray) => {
  const fetchedAt = new Date().toISOString();
  
  const records = forecastArray.map(day => ({
    place_id: placeId,
    forecast_timestamp: new Date(day.ts * 1000).toISOString(),
    fetched_at: fetchedAt,
    
    temperature: day.temp,
    feels_like: day.app_temp,
    temp_min: day.min_temp,
    temp_max: day.max_temp,
    
    weather_main: day.weather?.description,
    weather_description: day.weather?.description,
    weather_icon: day.weather?.icon,
    
    humidity: day.rh,
    pressure: day.pres,
    wind_speed: day.wind_spd,
    wind_deg: day.wind_dir,
    wind_gust: day.wind_gust,
    clouds: day.clouds,
    
    rain_probability: day.pop / 100, // Convert % to 0-1
    rain_volume: day.precip,
    snow_volume: day.snow,
    
    uv_index: day.uv,
    
    data_source: 'weatherbit',
  }));

  await supabase
    .from('weather_forecast')
    .upsert(records, { onConflict: 'place_id,forecast_timestamp,fetched_at' });
};

/**
 * Update all places in batches
 * @param {string} region - Optional: 'europe' or 'north_america'
 * @returns {Promise<{totalSuccess, totalFailed, batches, error}>}
 */
export const updateAllPlacesBatch = async (region = null) => {
  try {
    let query = supabase
      .from('places')
      .select('id, latitude, longitude')
      .eq('is_active', true);

    if (region) {
      query = query.eq('region', region);
    }

    const { data: places, error } = await query;

    if (error) throw error;

    console.log(`🌍 Starting batch update for ${places.length} places`);

    let totalSuccess = 0;
    let totalFailed = 0;
    let batches = 0;

    // Process in batches of 100
    for (let i = 0; i < places.length; i += BATCH_SIZE) {
      const batch = places.slice(i, i + BATCH_SIZE);
      batches++;

      console.log(`📦 Processing batch ${batches} (${i + 1}-${i + batch.length} of ${places.length})`);

      const { success, failed } = await updateBatchWeather(batch);
      
      totalSuccess += success;
      totalFailed += failed;

      // Rate limiting: Wait 1 second between batches
      if (i + BATCH_SIZE < places.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Update complete: ${totalSuccess} success, ${totalFailed} failed across ${batches} batches`);

    return {
      totalSuccess,
      totalFailed,
      batches,
      error: null,
    };
  } catch (error) {
    console.error('Update all places batch error:', error);
    return {
      totalSuccess: 0,
      totalFailed: 0,
      batches: 0,
      error,
    };
  }
};

/**
 * Estimate API calls needed for full update
 * @param {string} region - Optional region filter
 * @returns {Promise<{places, batches, calls, error}>}
 */
export const estimateApiCalls = async (region = null) => {
  try {
    let query = supabase
      .from('places')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (region) {
      query = query.eq('region', region);
    }

    const { count, error } = await query;

    if (error) throw error;

    const batches = Math.ceil(count / BATCH_SIZE);
    const calls = batches * 2; // Current weather + Forecast = 2 calls per batch

    return {
      places: count,
      batches,
      calls,
      error: null,
    };
  } catch (error) {
    console.error('Estimate API calls error:', error);
    return { places: 0, batches: 0, calls: 0, error };
  }
};

export default {
  fetchBulkCurrentWeather,
  fetchBulkForecast,
  updateBatchWeather,
  updateAllPlacesBatch,
  estimateApiCalls,
};


