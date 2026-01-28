/**
 * Regenerate Specific Executive Stock Certificates
 * 
 * Directly regenerates CERT-2026-000001 and CERT-2026-000002
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

const certificatesToRegenerate = [
  'CERT-2026-000001',
  'CERT-2026-000002'
];

async function regenerateSpecificCertificates() {
  console.log('🔍 Fetching specific certificates to regenerate...\n');

  for (const certNumber of certificatesToRegenerate) {
    console.log(`\n📄 Processing ${certNumber}...`);

    // Query for this specific certificate
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
      console.log(`   ⚠️  Certificate ${certNumber} not found in database`);
      continue;
    }

    console.log(`   ✓ Found certificate:`);
    console.log(`     Recipient: ${cert.recipient_user_id}`);
    console.log(`     Shares: ${cert.shares_amount} ${cert.share_class}`);
    console.log(`     Current document_url: ${cert.document_url || '(none)'}`);

    try {
      // Call the governance-generate-certificate Edge Function
      console.log(`   🔄 Calling Edge Function to regenerate PDF...`);
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/governance-generate-certificate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            recipient_user_id: cert.recipient_user_id,
            shares_amount: cert.shares_amount,
            share_class: cert.share_class,
            resolution_id: cert.resolution_id,
            appointment_id: cert.appointment_id,
            certificate_id: cert.id,              // Pass existing ID to update
            certificate_number: cert.certificate_number, // Preserve original number
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`   ✅ SUCCESS! New PDF URL: ${result.document_url}`);
    } catch (err: any) {
      console.error(`   ❌ Failed: ${err.message}`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('🎉 Certificate regeneration complete!');
  console.log('═══════════════════════════════════════════════════\n');
}

regenerateSpecificCertificates()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Unexpected error:', err);
    process.exit(1);
  });

