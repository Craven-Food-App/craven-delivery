import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // SECURITY: Get secure CORS headers based on request origin
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // SECURITY: Rate limiting for password reset (3 per hour)
    const rateLimitResult = await checkRateLimit(req, supabase, RateLimitPresets.PASSWORD_RESET);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: rateLimitResult.message || 'Too many password reset attempts',
          resetIn: rateLimitResult.resetIn 
        }),
        { 
          status: 429, 
          headers: addRateLimitHeaders(corsHeaders, rateLimitResult)
        }
      );
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get restaurant owned by this user (pick most recently created)
    const { data: restaurantsData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, email, owner_id, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (restaurantError) {
      console.error('Database error:', restaurantError);
      throw new Error(`Database error: ${restaurantError.message}`);
    }

    const restaurant = restaurantsData?.[0];

    if (!restaurant) {
      console.error(`No restaurant found for user ${user.id}`);
      throw new Error('No restaurant found for your account. Please contact support.');
    }

    // Generate a random 8-character password
    const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
    
    // Update the restaurant with the new password (in production, this should be hashed)
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ tablet_password: newPassword })
      .eq('id', restaurant.id);

    if (updateError) {
      throw updateError;
    }

    // In a real implementation, send email via Resend
    // For now, just return the password for demo purposes
    console.log(`Password reset for restaurant ${restaurant.id}: ${newPassword}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset successfully. Check your email for the new credentials.',
        // In production, don't return the password - send via email only
        password: newPassword,
        username: restaurant.id.slice(0, 15)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error resetting tablet password:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});