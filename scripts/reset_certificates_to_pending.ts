/**
 * Reset specific certificates to pending status
 * 
 * This deletes CERT-2026-000001 and CERT-2026-000002 from share_certificates
 * so they appear in the "Pending" tab and can be regenerated with new PDF template
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const certificatesToReset = [
  'CERT-2026-000001',
  'CERT-2026-000002'
];

async function resetCertificatesToPending() {
  console.log('🔄 Resetting certificates to pending status...\n');

  for (const certNumber of certificatesToReset) {
    console.log(`📄 Processing ${certNumber}...`);

    // First, check if it exists
    const { data: cert, error: fetchError } = await supabase
      .from('share_certificates')
      .select('*')
      .eq('certificate_number', certNumber)
      .maybeSingle();

    if (fetchError) {
      console.error(`   ❌ Error fetching ${certNumber}:`, fetchError);
      continue;
    }

    if (!cert) {
      console.log(`   ⚠️  Certificate ${certNumber} not found in database - already pending or doesn't exist`);
      continue;
    }

    console.log(`   ✓ Found certificate:`);
    console.log(`     ID: ${cert.id}`);
    console.log(`     Recipient: ${cert.recipient_user_id}`);
    console.log(`     Shares: ${cert.shares_amount} ${cert.share_class}`);
    console.log(`     Current document_url: ${cert.document_url || '(none)'}`);

    // Delete the certificate record entirely
    const { error: deleteError } = await supabase
      .from('share_certificates')
      .delete()
      .eq('id', cert.id);

    if (deleteError) {
      console.error(`   ❌ Failed to delete certificate:`, deleteError);
    } else {
      console.log(`   ✅ Certificate deleted successfully - will now appear in Pending tab\n`);
    }

    // Small delay between operations
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('🎉 Reset complete!');
  console.log('   → Go to Governance Admin → Certificates → Pending tab');
  console.log('   → Click "Generate Certificate" for each pending certificate');
  console.log('   → New certificates will be generated as PDFs');
  console.log('═══════════════════════════════════════════════════\n');
}

resetCertificatesToPending()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Unexpected error:', err);
    process.exit(1);
  });

