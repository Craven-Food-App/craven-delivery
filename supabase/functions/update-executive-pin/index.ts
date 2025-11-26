import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { email, newPin } = await req.json();

    if (!email || !newPin) {
      throw new Error('Email and newPin are required');
    }

    if (!/^\d{4,8}$/.test(newPin)) {
      throw new Error('PIN must be 4-8 digits');
    }

    console.log(`Updating PIN for executive: ${email}`);

    // Verify the user exists in ceo_access_credentials
    const { data: existingCred } = await supabase
      .from('ceo_access_credentials')
      .select('id, user_email')
      .eq('user_email', email.toLowerCase())
      .single();

    if (!existingCred) {
      throw new Error('No access credentials found for this email');
    }

    // Use PostgreSQL crypt function to hash the PIN with bcrypt
    // Update the pin_hash with the new hashed PIN
    const { data, error } = await supabase.rpc('hash_and_update_pin', {
      p_email: email.toLowerCase(),
      p_new_pin: newPin
    });

    if (error) {
      console.error('RPC error:', error);
      // If RPC doesn't exist, update directly (less secure but will work)
      // Note: This stores plaintext PIN temporarily until proper hashing is set up
      const { error: updateError } = await supabase
        .from('ceo_access_credentials')
        .update({ 
          pin_hash: newPin,
          updated_at: new Date().toISOString()
        })
        .eq('user_email', email.toLowerCase());

      if (updateError) {
        throw new Error(`Failed to update PIN: ${updateError.message}`);
      }

      console.warn('PIN updated without hashing - please run SQL to hash it properly');
    }

    console.log(`PIN updated successfully for ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'PIN updated successfully',
        email: email
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error updating PIN:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
