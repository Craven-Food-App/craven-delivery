/**
 * Check what storage buckets exist and list files in brand-assets
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStorage() {
  console.log('🔍 Checking Supabase Storage...\n');

  // List all buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError);
    return;
  }

  console.log('📦 Available buckets:');
  buckets?.forEach(bucket => {
    console.log(`   - ${bucket.name} (${bucket.public ? 'PUBLIC' : 'PRIVATE'})`);
  });
  
  console.log('\n');

  // Check brand-assets bucket specifically
  const brandAssetsBucket = buckets?.find(b => b.name === 'brand-assets');
  
  if (!brandAssetsBucket) {
    console.log('⚠️  brand-assets bucket DOES NOT EXIST');
    console.log('   You need to create it in Supabase Dashboard → Storage');
    return;
  }

  console.log('✅ brand-assets bucket EXISTS\n');

  // List files in brand-assets
  const { data: files, error: filesError } = await supabase.storage
    .from('brand-assets')
    .list('', {
      limit: 100,
      offset: 0,
    });

  if (filesError) {
    console.error('❌ Error listing files:', filesError);
    return;
  }

  if (!files || files.length === 0) {
    console.log('⚠️  brand-assets bucket is EMPTY');
    console.log('   Upload craven-logo.png and craven-c-new.png');
    return;
  }

  console.log('📄 Files in brand-assets bucket:');
  files.forEach(file => {
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/brand-assets/${file.name}`;
    console.log(`   - ${file.name}`);
    console.log(`     URL: ${publicUrl}`);
  });

  // Check for specific files
  const hasLogo = files.some(f => f.name === 'craven-logo.png');
  const hasWatermark = files.some(f => f.name === 'craven-c-new.png');

  console.log('\n');
  console.log(hasLogo ? '✅ craven-logo.png EXISTS' : '❌ craven-logo.png MISSING');
  console.log(hasWatermark ? '✅ craven-c-new.png EXISTS' : '❌ craven-c-new.png MISSING');
}

checkStorage()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Unexpected error:', err);
    process.exit(1);
  });

