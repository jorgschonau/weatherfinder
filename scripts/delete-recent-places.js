#!/usr/bin/env node

/**
 * Delete Places added recently (today)
 * 
 * Run: node scripts/delete-recent-places.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Delete Recently Added Places                    ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  // Get current count
  const { count: beforeCount } = await supabase
    .from('places')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📍 Current places in DB: ${beforeCount?.toLocaleString()}`);
  
  // Today's date (start of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  
  console.log(`\n🗓️  Deleting places created after: ${todayISO}`);
  console.log('   (This will delete places added today)\n');
  
  // Check how many will be deleted
  const { count: toDeleteCount } = await supabase
    .from('places')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO);
  
  console.log(`🔍 Found ${toDeleteCount?.toLocaleString()} places to delete`);
  
  if (!toDeleteCount || toDeleteCount === 0) {
    console.log('\n✅ No places to delete!');
    return;
  }
  
  console.log('\n🗑️  Deleting...');
  
  // Delete in batches
  let deletedCount = 0;
  const BATCH_SIZE = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('id')
      .gte('created_at', todayISO)
      .limit(BATCH_SIZE);
    
    if (error) {
      console.error('❌ Error fetching batch:', error.message);
      break;
    }
    
    if (!data || data.length === 0) {
      break;
    }
    
    const ids = data.map(p => p.id);
    
    const { error: deleteError } = await supabase
      .from('places')
      .delete()
      .in('id', ids);
    
    if (deleteError) {
      console.error('❌ Error deleting batch:', deleteError.message);
      break;
    }
    
    deletedCount += ids.length;
    console.log(`   ✅ Deleted ${deletedCount.toLocaleString()} places so far...`);
    
    if (data.length < BATCH_SIZE) {
      break;
    }
  }
  
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Delete Complete                                 ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`\n   🗑️  Deleted: ${deletedCount.toLocaleString()} places`);
  
  // Final count
  const { count: afterCount } = await supabase
    .from('places')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   📍 Remaining places in DB: ${afterCount?.toLocaleString()}`);
  console.log(`   📊 Difference: ${(beforeCount - afterCount).toLocaleString()}`);
  console.log('');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
