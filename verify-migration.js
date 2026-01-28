require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function verify() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Migration Verification                          ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // 1. Total places
  const { count: placesCount } = await supabase
    .from('places')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  // 2. Weather data count
  const { count: weatherCount } = await supabase
    .from('weather_data')
    .select('*', { count: 'exact', head: true })
    .eq('data_source', 'open-meteo');
  
  // 3. Forecast count
  const { count: forecastCount } = await supabase
    .from('weather_forecast')
    .select('*', { count: 'exact', head: true })
    .eq('data_source', 'open-meteo');
  
  // 4. Recent updates
  const { data: recentWeather } = await supabase
    .from('weather_data')
    .select('weather_timestamp')
    .eq('data_source', 'open-meteo')
    .order('weather_timestamp', { ascending: false })
    .limit(1);
  
  console.log('📊 Database Status:');
  console.log(`   Places (active):     ${placesCount.toLocaleString()}`);
  console.log(`   Weather data:        ${weatherCount.toLocaleString()}`);
  console.log(`   Forecast data:       ${forecastCount.toLocaleString()}`);
  
  if (recentWeather && recentWeather[0]) {
    const age = Math.round((Date.now() - new Date(recentWeather[0].weather_timestamp).getTime()) / 1000 / 60);
    console.log(`   Latest update:       ${age} minutes ago`);
  }
  
  console.log('\n✅ Expected Results:');
  console.log(`   Weather data:        ~${placesCount.toLocaleString()} rows (1 per place)`);
  console.log(`   Forecast data:       ~${(placesCount * 14).toLocaleString()} rows (14 days per place)`);
  
  console.log('\n📈 Coverage:');
  console.log(`   Weather coverage:    ${((weatherCount / placesCount) * 100).toFixed(1)}%`);
  console.log(`   Forecast coverage:   ${((forecastCount / (placesCount * 14)) * 100).toFixed(1)}%`);
  
  console.log('\n');
}

verify();
