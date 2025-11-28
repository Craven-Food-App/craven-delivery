// ================================================================
// INTAKE-IDENTITY EDGE FUNCTION
// ================================================================
// Securely encrypts and stores driver identity information (SSN, DL, DOB)
// Uses pgcrypto for AES encryption
// ONLY accessible with service_role key

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface IdentityRequest {
  driverId: string;
  dateOfBirth: string;
  ssn: string;
  dlNumber: string;
  dlState: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get encryption key from environment
    const encryptionKey = Deno.env.get('IDENTITY_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    // Parse request
    const { driverId, dateOfBirth, ssn, dlNumber, dlState }: IdentityRequest = await req.json();

    // Validate required fields
    if (!driverId || !dateOfBirth || !ssn || !dlNumber || !dlState) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate SSN format (XXX-XX-XXXX or XXXXXXXXX)
    const ssnClean = ssn.replace(/-/g, '');
    if (!/^\d{9}$/.test(ssnClean)) {
      return new Response(
        JSON.stringify({ error: 'Invalid SSN format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract last 4 digits of SSN
    const ssnLast4 = ssnClean.slice(-4);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify driver exists and belongs to authenticated user
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, status')
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      return new Response(
        JSON.stringify({ error: 'Driver not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encrypt sensitive data using pgcrypto
    const { data: encryptedData, error: encryptError } = await supabase.rpc('encrypt_driver_identity', {
      p_driver_id: driverId,
      p_dob: dateOfBirth,
      p_ssn: ssnClean,
      p_dl_number: dlNumber,
      p_dl_state: dlState,
      p_encryption_key: encryptionKey
    });

    if (encryptError) {
      console.error('Encryption error:', encryptError);
      console.error('Error details:', JSON.stringify(encryptError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to encrypt identity data',
          details: encryptError.message || 'Unknown encryption error',
          hint: 'Check if encrypt_driver_identity function exists in database'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update driver record with SSN last 4 and status
    const { error: updateError } = await supabase
      .from('drivers')
      .update({
        ssn_last4: ssnLast4,
        status: 'id_submitted',
        updated_at: new Date().toISOString()
      })
      .eq('id', driverId);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update driver record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create background check record (auto-triggers check)
    const { error: bgError } = await supabase
      .from('driver_background_checks')
      .insert({
        driver_id: driverId,
        status: 'pending'
      });

    if (bgError) {
      console.error('Background check creation error:', bgError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Identity information securely stored',
        driverId: driverId,
        nextStep: 'background_check'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Intake identity error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

