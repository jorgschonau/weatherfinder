#!/usr/bin/env node

/**
 * Delete Places imported from filtered_pois.txt
 * Identifies them by geonames_id from the file
 * 
 * Run: node scripts/delete-filtered-pois.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const readline = require('readline');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const FILE_PATH = './filtered_pois.txt';
const BATCH_SIZE = 1000;

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Delete Places from filtered_pois.txt           ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  // Step 1: Extract all geonames_ids from file
  console.log('📄 Reading geonames_ids from filtered_pois.txt...');
  
  const fileStream = fs.createReadStream(FILE_PATH);
  const rl = readline.createInterface({ input: fileStream });
  
  const geonamesIds = [];
  let lineCount = 0;
  
  for await (const line of rl) {
    lineCount++;
    const fields = line.split('\t');
    const geonamesId = parseInt(fields[0]);
    
    if (geonamesId) {
      geonamesIds.push(geonamesId);
    }
    
    if (lineCount % 100000 === 0) {
      console.log(`   Read ${lineCount.toLocaleString()} lines, found ${geonamesIds.length.toLocaleString()} IDs...`);
    }
  }
  
  console.log(`\n✅ Found ${geonamesIds.length.toLocaleString()} geonames_ids from file`);
  
  // Step 2: Delete in batches
  console.log('\n🗑️  Deleting places...');
  
  let deletedCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < geonamesIds.length; i += BATCH_SIZE) {
    const batch = geonamesIds.slice(i, i + BATCH_SIZE);
    
    const { error, count } = await supabase
      .from('places')
      .delete({ count: 'exact' })
      .in('geonames_id', batch);
    
    if (error) {
      console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errorCount++;
    } else {
      deletedCount += count || 0;
      console.log(`   ✅ Deleted ${deletedCount.toLocaleString()} places so far...`);
    }
  }
  
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Delete Complete                                 ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`\n   🗑️  Deleted: ${deletedCount.toLocaleString()} places`);
  console.log(`   ❌ Errors:  ${errorCount.toLocaleString()} batches`);
  
  // Final count
  const { count: totalCount } = await supabase
    .from('places')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n   📍 Remaining places in DB: ${totalCount?.toLocaleString() || 'unknown'}`);
  console.log('');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
