/**
 * Regenerate ALL Executive Stock Certificates with new PDF template
 * 
 * This script calls governance-generate-certificate for every existing certificate,
 * preserving the original certificate_number while generating a new PDF document.
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

async function regenerateAllCertificates() {
  console.log('🔍 Fetching all existing share certificates...\n');
  console.log('   Using Supabase URL:', supabaseUrl);
  console.log('   Service key configured:', !!supabaseServiceKey);

  // Get ALL certificates (don't filter by status)
  const { data: certificates, error, count } = await supabase
    .from('share_certificates')
    .select('*', { count: 'exact' })
    .order('issue_date', { ascending: true });

  console.log('   Raw response - data:', certificates?.length || 0, 'error:', error, 'count:', count);

  if (error) {
    console.error('❌ Error fetching certificates:', error);
    process.exit(1);
  }

  if (!certificates || certificates.length === 0) {
    console.log('✅ No certificates found to regenerate.');
    return;
  }

  console.log(`📄 Found ${certificates.length} certificate(s) to regenerate.\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const cert of certificates) {
    console.log(`🔄 Regenerating certificate: ${cert.certificate_number}`);
    console.log(`   Recipient: ${cert.recipient_user_id}`);
    console.log(`   Shares: ${cert.shares_amount} ${cert.share_class}`);

    try {
      // Call the governance-generate-certificate Edge Function
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
      console.log(`   ✅ Success! PDF URL: ${result.document_url}\n`);
      successCount++;
    } catch (err: any) {
      console.error(`   ❌ Failed: ${err.message}\n`);
      errorCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`✅ Successfully regenerated: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📊 Total: ${certificates.length}`);
  console.log('═══════════════════════════════════════════════════\n');
}

regenerateAllCertificates()
  .then(() => {
    console.log('🎉 Certificate regeneration complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Unexpected error:', err);
    process.exit(1);
  });

