#!/usr/bin/env node

/**
 * Full Weather Refresh for ALL Locations
 * Uses Open-Meteo API to fetch current + 14-day forecasts
 * 
 * Run: node scripts/refresh-all-weather.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Check Supabase config
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Supabase not configured! Check .env file');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';
const BATCH_SIZE = 20; // Process 20 locations in parallel
const RATE_LIMIT_DELAY = 100; // 100ms between batches (be nice to free API)

/**
 * Weather code mapping
 */
const getWeatherMain = (code) => {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Clouds';
  if (code <= 49) return 'Fog';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 84) return 'Rain';
  if (code <= 94) return 'Snow';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
};

const getWeatherDescription = (code) => {
  const descriptions = {
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
  return descriptions[code] || `Unknown weather (code ${code})`;
};

const getWeatherIcon = (code) => {
  if (code === 0) return '01d';
  if (code <= 2) return '02d';
  if (code === 3) return '03d';
  if (code <= 49) return '50d';
  if (code <= 59) return '09d';
  if (code <= 69) return '10d';
  if (code <= 79) return '13d';
  if (code <= 84) return '09d';
  if (code <= 94) return '13d';
  if (code <= 99) return '11d';
  return '01d';
};

/**
 * Fetch weather for one location (current + 14 days forecast)
 */
async function fetchWeather(place) {
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'rain',
      'snowfall',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'rain_sum',
      'snowfall_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant',
      'sunrise',
      'sunset',
      'sunshine_duration',
    ].join(','),
    forecast_days: 14, // 14 days as requested
    timezone: 'auto',
  });

  const url = `${OPEN_METEO_BASE_URL}/forecast?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Save current weather (stored as today in weather_forecast)
 */
async function saveWeatherData(placeId, current, daily) {
  const today = new Date().toISOString().split('T')[0];
  const fetchedAt = new Date().toISOString();
  
  const record = {
    place_id: placeId,
    forecast_date: today,
    fetched_at: fetchedAt,
    temp_min: daily.temperature_2m_min[0],
    temp_max: daily.temperature_2m_max[0],
    weather_main: getWeatherMain(current.weather_code),
    weather_description: getWeatherDescription(current.weather_code),
    weather_icon: getWeatherIcon(current.weather_code),
    wind_speed: current.wind_speed_10m,
    precipitation_sum: current.precipitation || 0,
    precipitation_probability: daily.precipitation_probability_max?.[0] ? daily.precipitation_probability_max[0] / 100 : null,
    rain_volume: current.rain || 0,
    snow_volume: current.snowfall || 0,
    sunrise: daily.sunrise?.[0] ? new Date(daily.sunrise[0]).toISOString() : null,
    sunset: daily.sunset?.[0] ? new Date(daily.sunset[0]).toISOString() : null,
    sunshine_duration: daily.sunshine_duration?.[0] || null,
    data_source: 'open-meteo',
  };

  const { error } = await supabase
    .from('weather_forecast')
    .upsert(record, { onConflict: 'place_id,forecast_date' }); // FIXED: kein fetched_at!

  if (error) throw error;
}

/**
 * Save forecast (tomorrow onwards, excluding today)
 */
async function saveForecast(placeId, daily) {
  const fetchedAt = new Date().toISOString();
  
  const records = daily.time.slice(1).map((time, i) => {
    const actualIndex = i + 1;
    return {
      place_id: placeId,
      forecast_date: time,
      fetched_at: fetchedAt,
      temp_min: daily.temperature_2m_min[actualIndex],
      temp_max: daily.temperature_2m_max[actualIndex],
      weather_main: getWeatherMain(daily.weather_code[actualIndex]),
      weather_description: getWeatherDescription(daily.weather_code[actualIndex]),
      weather_icon: getWeatherIcon(daily.weather_code[actualIndex]),
      wind_speed: daily.wind_speed_10m_max[actualIndex],
      precipitation_sum: daily.precipitation_sum[actualIndex],
      precipitation_probability: daily.precipitation_probability_max[actualIndex] / 100,
      // rain_probability ENTFERNT (Duplikat von precipitation_probability)
      rain_volume: daily.rain_sum[actualIndex],
      snow_volume: daily.snowfall_sum[actualIndex],
      sunrise: daily.sunrise?.[actualIndex] ? new Date(daily.sunrise[actualIndex]).toISOString() : null,
      sunset: daily.sunset?.[actualIndex] ? new Date(daily.sunset[actualIndex]).toISOString() : null,
      sunshine_duration: daily.sunshine_duration?.[actualIndex] || null,
      data_source: 'open-meteo',
    };
  });

  const { error } = await supabase
    .from('weather_forecast')
    .upsert(records, { onConflict: 'place_id,forecast_date' }); // FIXED: kein fetched_at!

  if (error) throw error;
}

/**
 * Process one batch of places
 */
async function processBatch(places, batchNum, totalBatches) {
  console.log(`📦 Batch ${batchNum}/${totalBatches} (${places.length} places)...`);

  const results = await Promise.all(
    places.map(async (place) => {
      try {
        const data = await fetchWeather(place);
        await saveWeatherData(place.id, data.current, data.daily);
        await saveForecast(place.id, data.daily);
        return { success: true, name: place.name, temp: data.current.temperature_2m };
      } catch (error) {
        // Log failed places with details for debugging
        console.error(`  ❌ FAILED: ${place.name} (ID: ${place.id}) - ${error.message}`);
        return { success: false, name: place.name, id: place.id, error: error.message };
      }
    })
  );

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const failedPlaces = results.filter(r => !r.success);

  // Log sample results
  const samples = results.filter(r => r.success).slice(0, 3);
  samples.forEach(s => {
    console.log(`  ✅ ${s.name}: ${s.temp}°C`);
  });

  if (failCount > 0) {
    console.log(`  ❌ ${failCount} failed in this batch`);
    // Log summary of failed places for this batch
    failedPlaces.forEach(f => {
      console.log(`     - ${f.name}: ${f.error}`);
    });
  }

  console.log(`  📊 Success: ${successCount}/${places.length}`);
  
  return { successCount, failCount };
}

/**
 * Main function
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Full Weather Refresh (All Locations)            ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // 1. Get all active places (paginated to handle large datasets)
  console.log('📍 Fetching all active places...');
  
  let allPlaces = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data: pageData, error } = await supabase
      .from('places')
      .select('id, name, latitude, longitude, country_code')
      .eq('is_active', true)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    
    if (error) {
      console.error(`❌ Failed to fetch page ${page + 1}:`, error.message);
      break;
    }
    
    if (pageData && pageData.length > 0) {
      allPlaces = allPlaces.concat(pageData);
      hasMore = pageData.length === PAGE_SIZE;
      page++;
      
      if (page % 5 === 0) {
        console.log(`   Fetched ${allPlaces.length} places so far...`);
      }
    } else {
      hasMore = false;
    }
  }
  
  const places = allPlaces;

  if (!places || places.length === 0) {
    console.error('❌ No places found!');
    process.exit(1);
  }

  console.log(`✅ Found ${places.length} places`);
  console.log(`📊 Expected API calls: ${places.length} (1 per location)`);
  console.log(`⏱️  Estimated time: ~${Math.ceil(places.length / BATCH_SIZE * (RATE_LIMIT_DELAY / 1000))}s\n`);

  // 2. Process in batches
  const batches = [];
  for (let i = 0; i < places.length; i += BATCH_SIZE) {
    batches.push(places.slice(i, i + BATCH_SIZE));
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < batches.length; i++) {
    const { successCount, failCount } = await processBatch(
      batches[i],
      i + 1,
      batches.length
    );

    totalSuccess += successCount;
    totalFailed += failCount;

    // Rate limiting
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  // 3. Summary
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Summary                                         ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  console.log(`  ✅ Success:  ${totalSuccess}/${places.length} locations`);
  console.log(`  ❌ Failed:   ${totalFailed}/${places.length} locations`);
  console.log(`  📊 API Calls: ${totalSuccess} (1 per location)`);
  console.log(`  ⏱️  Duration: ${duration}s (${(totalSuccess / duration).toFixed(1)} locations/sec)`);
  console.log('');

  if (totalSuccess > 0) {
    console.log('🎉 Weather refresh complete!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Check Supabase Table Editor to verify data');
    console.log('   2. Restart your app - weather should be fresh!');
    console.log('   3. Test badges - they should calculate correctly');
    console.log('   4. Set up daily cron job for automatic updates');
    console.log('');
  } else {
    console.log('⚠️  All updates failed. Check errors above.');
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
