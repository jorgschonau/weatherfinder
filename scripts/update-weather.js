#!/usr/bin/env node

/**
 * Weather Update Script
 * 
 * Updates weather data for all places in the database
 * Uses Open-Meteo API (free, no API key needed)
 * 
 * Run: node scripts/update-weather.js
 * Run for specific region: node scripts/update-weather.js europe
 */

require('dotenv').config();

// Check if Supabase is configured
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Supabase not configured!');
  console.error('');
  console.error('Please set in .env:');
  console.error('  SUPABASE_URL=https://your-project.supabase.co');
  console.error('  SUPABASE_ANON_KEY=eyJhbG...');
  console.error('');
  process.exit(1);
}

// Import service (Note: This requires proper module setup)
// For now, just show what would happen
async function updateWeather(region = null) {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Weather Update Script (Open-Meteo)             ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  const regionText = region ? `in ${region}` : 'worldwide';
  console.log(`🌍 Starting weather update for all places ${regionText}...\n`);
  
  console.log('ℹ️  To use this script, make sure:');
  console.log('   1. Supabase is configured (.env)');
  console.log('   2. Places table has data');
  console.log('   3. Import openMeteoService in your app');
  console.log('');
  console.log('Example usage in your app:');
  console.log('');
  console.log('```javascript');
  console.log("import { updateAllPlaces } from './src/services/openMeteoService';");
  console.log('');
  console.log('// Update all places');
  console.log('const result = await updateAllPlaces();');
  console.log('');
  console.log('// Or specific region');
  console.log("const result = await updateAllPlaces('europe');");
  console.log('');
  console.log('console.log(result);');
  console.log('// {');
  console.log('//   totalSuccess: 100,');
  console.log('//   totalFailed: 0,');
  console.log('//   batches: 5,');
  console.log('//   duration: 12');
  console.log('// }');
  console.log('```');
  console.log('');
}

const region = process.argv[2] || null;
updateWeather(region);

