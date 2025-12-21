import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { restaurant_id, verified, notes } = await req.json();

    const now = new Date().toISOString();

    // Update restaurant
    await supabase
      .from('restaurants')
      .update({
        business_verified_at: verified ? now : null
      })
      .eq('id', restaurant_id);

    // Update onboarding progress
    await supabase
      .from('restaurant_onboarding_progress')
      .update({
        business_info_verified: verified,
        business_verified_at: verified ? now : null,
        admin_notes: notes
      })
      .eq('restaurant_id', restaurant_id);

    // Create or update verification task
    await supabase
      .from('restaurant_verification_tasks')
      .insert({
        restaurant_id,
        task_type: 'business_license_review',
        status: verified ? 'completed' : 'rejected',
        assigned_admin_id: user.id,
        completion_notes: notes,
        completed_at: now
      });

    console.log(`Business verification ${verified ? 'approved' : 'rejected'} for restaurant:`, restaurant_id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying business:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});