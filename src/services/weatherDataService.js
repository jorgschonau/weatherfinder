import { supabase } from '../config/supabase';

/**
 * Weather Data Service
 * KERN DER APP: Wetterdaten cachen und abrufen
 */

/**
 * Get latest weather data for a place
 * @param {string} placeId - Place ID
 * @returns {Promise<{weather, error}>}
 */
export const getLatestWeather = async (placeId) => {
  try {
    const { data, error } = await supabase
      .from('weather_data')
      .select('*')
      .eq('place_id', placeId)
      .order('weather_timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

    return { weather: data, error: null };
  } catch (error) {
    console.error('Get latest weather error:', error);
    return { weather: null, error };
  }
};

/**
 * Get weather data for multiple places
 * @param {string[]} placeIds - Array of place IDs
 * @returns {Promise<{weatherData, error}>}
 */
export const getLatestWeatherForPlaces = async (placeIds) => {
  try {
    // Use the view for efficient querying
    const { data, error } = await supabase
      .from('places_with_latest_weather')
      .select('*')
      .in('id', placeIds);

    if (error) throw error;
    return { weatherData: data, error: null };
  } catch (error) {
    console.error('Get weather for places error:', error);
    return { weatherData: [], error };
  }
};

/**
 * Save weather data from OpenWeatherMap API (extended with all fields)
 * @param {string} placeId - Place ID
 * @param {object} weatherApiData - Data from OpenWeatherMap API
 * @returns {Promise<{weather, error}>}
 */
export const saveWeatherData = async (placeId, weatherApiData) => {
  try {
    const weatherData = {
      place_id: placeId,
      weather_timestamp: new Date(weatherApiData.dt * 1000).toISOString(),
      
      // Temperature
      temperature: weatherApiData.main?.temp,
      feels_like: weatherApiData.main?.feels_like,
      temp_min: weatherApiData.main?.temp_min,
      temp_max: weatherApiData.main?.temp_max,
      dew_point: weatherApiData.dew_point,
      
      // Conditions
      weather_main: weatherApiData.weather?.[0]?.main,
      weather_description: weatherApiData.weather?.[0]?.description,
      weather_icon: weatherApiData.weather?.[0]?.icon,
      
      // Humidity & Pressure
      humidity: weatherApiData.main?.humidity || weatherApiData.humidity,
      pressure: weatherApiData.main?.pressure || weatherApiData.pressure,
      pressure_sea_level: weatherApiData.main?.sea_level,
      pressure_ground_level: weatherApiData.main?.grnd_level,
      
      // Wind
      wind_speed: weatherApiData.wind?.speed || weatherApiData.wind_speed,
      wind_deg: weatherApiData.wind?.deg || weatherApiData.wind_deg,
      wind_gust: weatherApiData.wind?.gust || weatherApiData.wind_gust,
      
      // Clouds & Visibility
      clouds: weatherApiData.clouds?.all || weatherApiData.clouds,
      visibility: weatherApiData.visibility,
      
      // Precipitation
      rain_1h: weatherApiData.rain?.['1h'],
      rain_3h: weatherApiData.rain?.['3h'],
      rain_24h: weatherApiData.rain?.['24h'],
      snow_1h: weatherApiData.snow?.['1h'],
      snow_3h: weatherApiData.snow?.['3h'],
      snow_24h: weatherApiData.snow?.['24h'],
      precipitation_probability: weatherApiData.pop, // probability of precipitation
      
      // Sun & UV
      sunrise: weatherApiData.sys?.sunrise ? new Date(weatherApiData.sys.sunrise * 1000).toISOString() : 
               weatherApiData.sunrise ? new Date(weatherApiData.sunrise * 1000).toISOString() : null,
      sunset: weatherApiData.sys?.sunset ? new Date(weatherApiData.sys.sunset * 1000).toISOString() : 
              weatherApiData.sunset ? new Date(weatherApiData.sunset * 1000).toISOString() : null,
      uv_index: weatherApiData.uvi || weatherApiData.uv_index,
      
      data_source: 'openweathermap',
    };

    const { data, error } = await supabase
      .from('weather_data')
      .upsert(weatherData, {
        onConflict: 'place_id,weather_timestamp',
      })
      .select()
      .single();

    if (error) throw error;
    return { weather: data, error: null };
  } catch (error) {
    console.error('Save weather data error:', error);
    return { weather: null, error };
  }
};

/**
 * Save multiple weather data points at once (bulk insert)
 * Useful for importing historical data
 * @param {string} placeId - Place ID
 * @param {array} weatherDataArray - Array of weather API data
 * @returns {Promise<{count, error}>}
 */
export const saveWeatherDataBulk = async (placeId, weatherDataArray) => {
  try {
    const weatherRecords = weatherDataArray.map(item => ({
      place_id: placeId,
      weather_timestamp: new Date(item.dt * 1000).toISOString(),
      temperature: item.temp?.day || item.main?.temp || item.temp,
      feels_like: item.feels_like?.day || item.main?.feels_like || item.feels_like,
      temp_min: item.temp?.min || item.main?.temp_min,
      temp_max: item.temp?.max || item.main?.temp_max,
      dew_point: item.dew_point,
      weather_main: item.weather?.[0]?.main,
      weather_description: item.weather?.[0]?.description,
      weather_icon: item.weather?.[0]?.icon,
      humidity: item.humidity || item.main?.humidity,
      pressure: item.pressure || item.main?.pressure,
      wind_speed: item.wind_speed || item.wind?.speed,
      wind_deg: item.wind_deg || item.wind?.deg,
      wind_gust: item.wind_gust || item.wind?.gust,
      clouds: item.clouds || item.clouds?.all,
      visibility: item.visibility,
      rain_1h: item.rain?.['1h'] || item.rain,
      rain_3h: item.rain?.['3h'],
      snow_1h: item.snow?.['1h'] || item.snow,
      uv_index: item.uvi,
      sunrise: item.sunrise ? new Date(item.sunrise * 1000).toISOString() : null,
      sunset: item.sunset ? new Date(item.sunset * 1000).toISOString() : null,
      data_source: 'openweathermap',
    }));

    const { data, error } = await supabase
      .from('weather_data')
      .upsert(weatherRecords, {
        onConflict: 'place_id,weather_timestamp',
      });

    if (error) throw error;
    return { count: weatherRecords.length, error: null };
  } catch (error) {
    console.error('Save weather data bulk error:', error);
    return { count: 0, error };
  }
};

/**
 * Get weather forecast for a place
 * @param {string} placeId - Place ID
 * @param {number} days - Number of days (default 3)
 * @returns {Promise<{forecast, error}>}
 */
export const getWeatherForecast = async (placeId, days = 3) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    const today = new Date().toISOString().split('T')[0];
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('weather_forecast')
      .select('*')
      .eq('place_id', placeId)
      .gte('forecast_date', today)
      .lte('forecast_date', cutoffDateStr)
      .order('forecast_date', { ascending: true });

    if (error) throw error;
    return { forecast: data, error: null };
  } catch (error) {
    console.error('Get weather forecast error:', error);
    return { forecast: [], error };
  }
};

/**
 * Save weather forecast data
 * @param {string} placeId - Place ID
 * @param {array} forecastApiData - Forecast data from OpenWeatherMap API
 * @returns {Promise<{error}>}
 */
export const saveWeatherForecast = async (placeId, forecastApiData) => {
  try {
    const fetchedAt = new Date().toISOString();
    
    const forecastRecords = forecastApiData.map(item => ({
      place_id: placeId,
      forecast_date: new Date(item.dt * 1000).toISOString().split('T')[0], // YYYY-MM-DD
      fetched_at: fetchedAt,
      
      temperature: item.main?.temp,
      feels_like: item.main?.feels_like,
      temp_min: item.main?.temp_min,
      temp_max: item.main?.temp_max,
      
      weather_main: item.weather?.[0]?.main,
      weather_description: item.weather?.[0]?.description,
      weather_icon: item.weather?.[0]?.icon,
      
      humidity: item.main?.humidity,
      pressure: item.main?.pressure,
      wind_speed: item.wind?.speed,
      wind_deg: item.wind?.deg,
      clouds: item.clouds?.all,
      
      rain_probability: item.pop, // probability of precipitation
      rain_volume: item.rain?.['3h'],
      snow_volume: item.snow?.['3h'],
      
      data_source: 'openweathermap',
    }));

    const { error } = await supabase
      .from('weather_forecast')
      .upsert(forecastRecords, {
        onConflict: 'place_id,forecast_date',
      });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Save weather forecast error:', error);
    return { error };
  }
};

/**
 * Get historical weather data for a place
 * @param {string} placeId - Place ID
 * @param {number} days - Number of days back (default 7)
 * @returns {Promise<{history, error}>}
 */
export const getWeatherHistory = async (placeId, days = 7) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('weather_data')
      .select('*')
      .eq('place_id', placeId)
      .gte('weather_timestamp', cutoffDate.toISOString())
      .order('weather_timestamp', { ascending: false });

    if (error) throw error;
    return { history: data, error: null };
  } catch (error) {
    console.error('Get weather history error:', error);
    return { history: [], error };
  }
};

/**
 * Check if weather data is fresh (< 12 hours old = 2x daily update)
 * @param {string} placeId - Place ID
 * @returns {Promise<{isFresh, weather, error}>}
 */
export const isWeatherFresh = async (placeId) => {
  try {
    const { weather, error } = await getLatestWeather(placeId);
    
    if (error || !weather) {
      return { isFresh: false, weather: null, error };
    }

    const weatherAge = Date.now() - new Date(weather.weather_timestamp).getTime();
    const twelveHours = 12 * 60 * 60 * 1000; // 12 hours (2x daily)
    
    return {
      isFresh: weatherAge < twelveHours,
      weather,
      error: null,
    };
  } catch (error) {
    console.error('Check weather freshness error:', error);
    return { isFresh: false, weather: null, error };
  }
};

export default {
  getLatestWeather,
  getLatestWeatherForPlaces,
  saveWeatherData,
  getWeatherForecast,
  saveWeatherForecast,
  getWeatherHistory,
  isWeatherFresh,
};

