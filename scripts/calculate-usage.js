#!/usr/bin/env node

/**
 * Weatherbit API Usage Calculator
 * 
 * Calculate how many API calls you need for different scenarios
 * Run: node scripts/calculate-usage.js [places] [updates_per_day]
 */

const places = parseInt(process.argv[2]) || 100;
const updatesPerDay = parseInt(process.argv[3]) || 2;

const BATCH_SIZE = 100;
const CALLS_PER_BATCH = 2; // Current + Forecast

const batches = Math.ceil(places / BATCH_SIZE);
const callsPerUpdate = batches * CALLS_PER_BATCH;
const dailyCalls = callsPerUpdate * updatesPerDay;

const FREE_TRIAL_LIMIT = 1500;
const DEVELOPER_LIMIT = 5000;

const freeTrialUsage = (dailyCalls / FREE_TRIAL_LIMIT) * 100;
const developerUsage = (dailyCalls / DEVELOPER_LIMIT) * 100;

console.log('\n╔════════════════════════════════════════════════╗');
console.log('║   Weatherbit API Usage Calculator             ║');
console.log('╚════════════════════════════════════════════════╝\n');

console.log(`📍 Places: ${places.toLocaleString()}`);
console.log(`🔄 Updates per day: ${updatesPerDay}x`);
console.log('');
console.log(`📦 Batches per update: ${batches} (${BATCH_SIZE} locations/batch)`);
console.log(`📡 API calls per update: ${callsPerUpdate} (${batches} current + ${batches} forecast)`);
console.log('');
console.log(`📈 DAILY API CALLS: ${dailyCalls.toLocaleString()}`);
console.log(`📈 Monthly: ~${(dailyCalls * 30).toLocaleString()}`);
console.log('');

console.log('═══════════════════════════════════════════════\n');

console.log('FREE TRIAL (21 Days):');
console.log(`  Limit: ${FREE_TRIAL_LIMIT.toLocaleString()} calls/day`);
console.log(`  Usage: ${freeTrialUsage.toFixed(1)}%`);
console.log(`  Status: ${freeTrialUsage <= 100 ? '✅ FITS' : '❌ TOO MANY'}`);
if (freeTrialUsage <= 100) {
  console.log(`  Buffer: ${(FREE_TRIAL_LIMIT - dailyCalls).toLocaleString()} calls available`);
}
console.log('');

console.log('DEVELOPER PLAN ($29/mo):');
console.log(`  Limit: ${DEVELOPER_LIMIT.toLocaleString()} calls/day`);
console.log(`  Usage: ${developerUsage.toFixed(1)}%`);
console.log(`  Status: ${developerUsage <= 100 ? '✅ FITS' : '❌ TOO MANY'}`);
if (developerUsage <= 100) {
  console.log(`  Buffer: ${(DEVELOPER_LIMIT - dailyCalls).toLocaleString()} calls available`);
}
console.log('');

console.log('═══════════════════════════════════════════════\n');

// Recommendations
if (freeTrialUsage <= 100) {
  console.log('💡 RECOMMENDATION: Start with FREE TRIAL');
  console.log('   Perfect for testing and development!');
  
  const maxPlacesFreeTrial = Math.floor((FREE_TRIAL_LIMIT / (CALLS_PER_BATCH * updatesPerDay)) * BATCH_SIZE);
  console.log(`   You can test up to ${maxPlacesFreeTrial.toLocaleString()} places.`);
} else {
  console.log('💡 RECOMMENDATION: Need DEVELOPER PLAN or reduce updates');
  
  const maxPlacesFreeTrial = Math.floor((FREE_TRIAL_LIMIT / (CALLS_PER_BATCH * updatesPerDay)) * BATCH_SIZE);
  console.log(`   Free Trial max: ${maxPlacesFreeTrial.toLocaleString()} places (${updatesPerDay}x/day)`);
  
  if (developerUsage <= 100) {
    console.log(`   Or upgrade to Developer Plan ($29/mo)`);
  } else {
    const requiredUpdates = Math.ceil(dailyCalls / DEVELOPER_LIMIT);
    console.log(`   Consider reducing updates to ${Math.floor(updatesPerDay / requiredUpdates)}x/day`);
  }
}

console.log('');

// Examples
console.log('═══════════════════════════════════════════════');
console.log('EXAMPLES:');
console.log('');
console.log('Test with 100 places:');
console.log('  node scripts/calculate-usage.js 100 2');
console.log('');
console.log('Scale to 1,000 places:');
console.log('  node scripts/calculate-usage.js 1000 2');
console.log('');
console.log('Full 20k with once daily:');
console.log('  node scripts/calculate-usage.js 20000 1');
console.log('');

