require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkPlaces() {
  // Total count
  const { count: totalCount, error: totalError } = await supabase
    .from('places')
    .select('*', { count: 'exact', head: true });
  
  // Active count
  const { count: activeCount, error: activeError } = await supabase
    .from('places')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  console.log('📊 Places Statistics:');
  console.log(`   Total places: ${totalCount}`);
  console.log(`   Active places: ${activeCount}`);
  console.log(`   Inactive places: ${totalCount - activeCount}`);
}

checkPlaces();
