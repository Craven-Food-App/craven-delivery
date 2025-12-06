/**
 * Script to reset CXO Training Progress
 * 
 * This script clears all training progress data from the database.
 * Run with: npx tsx scripts/reset-cxo-training-progress.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetTrainingProgress() {
  console.log('🔄 Resetting CXO Training Progress...\n');

  try {
    // Get counts before deletion
    const { count: progressCount } = await supabase
      .from('cxo_training_progress')
      .select('*', { count: 'exact', head: true });

    const { count: auditCount } = await supabase
      .from('cxo_training_audit')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Current counts:`);
    console.log(`   - Progress records: ${progressCount || 0}`);
    console.log(`   - Audit records: ${auditCount || 0}\n`);

    // Delete all progress records
    const { error: progressError } = await supabase
      .from('cxo_training_progress')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (progressError) {
      throw progressError;
    }

    console.log('✅ Training progress records deleted');

    // Optionally delete audit records (uncomment if needed)
    // const { error: auditError } = await supabase
    //   .from('cxo_training_audit')
    //   .delete()
    //   .neq('id', '00000000-0000-0000-0000-000000000000');

    // if (auditError) {
    //   throw auditError;
    // }

    // console.log('✅ Training audit records deleted');

    // Verify deletion
    const { count: newProgressCount } = await supabase
      .from('cxo_training_progress')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 New counts:`);
    console.log(`   - Progress records: ${newProgressCount || 0}`);
    console.log(`   - Audit records: ${auditCount || 0} (unchanged)\n`);

    console.log('✅ CXO Training Progress reset complete!');
    console.log('   All users can now start training from the beginning.\n');
  } catch (error) {
    console.error('❌ Error resetting training progress:', error);
    process.exit(1);
  }
}

resetTrainingProgress();

