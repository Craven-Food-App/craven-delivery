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

    const { parent_restaurant_id, location_data } = await req.json();

    // Fetch parent restaurant
    const { data: parentRestaurant, error: parentError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', parent_restaurant_id)
      .eq('owner_id', user.id)
      .single();

    if (parentError || !parentRestaurant) {
      return new Response(
        JSON.stringify({ error: 'Parent restaurant not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new restaurant with cloned settings
    const { data: newRestaurant, error: createError } = await supabase
      .from('restaurants')
      .insert({
        owner_id: user.id,
        name: location_data.name,
        address: location_data.address,
        city: location_data.city,
        state: location_data.state,
        zip_code: location_data.zip_code,
        phone: location_data.phone || parentRestaurant.phone,
        email: location_data.email || parentRestaurant.email,
        // Clone settings from parent
        cuisine_type: parentRestaurant.cuisine_type,
        commission_tier: parentRestaurant.commission_tier,
        delivery_radius_miles: parentRestaurant.delivery_radius_miles,
        minimum_order_cents: parentRestaurant.minimum_order_cents,
        // New location starts fresh onboarding
        onboarding_status: 'in_progress',
        is_active: false
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Clone restaurant hours
    const { data: parentHours } = await supabase
      .from('restaurant_hours')
      .select('*')
      .eq('restaurant_id', parent_restaurant_id);

    if (parentHours && parentHours.length > 0) {
      const newHours = parentHours.map(h => ({
        restaurant_id: newRestaurant.id,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed
      }));

      await supabase
        .from('restaurant_hours')
        .insert(newHours);
    }

    // Create or update restaurant group
    let groupId;
    const { data: existingGroup } = await supabase
      .from('restaurant_groups')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (existingGroup) {
      groupId = existingGroup.id;
    } else {
      const { data: newGroup } = await supabase
        .from('restaurant_groups')
        .insert({
          name: `${parentRestaurant.name} Group`,
          owner_id: user.id,
          commission_tier: parentRestaurant.commission_tier
        })
        .select()
        .single();
      
      groupId = newGroup?.id;
    }

    console.log('Created new restaurant location:', newRestaurant.id);

    return new Response(
      JSON.stringify({
        success: true,
        restaurant: newRestaurant,
        group_id: groupId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating additional location:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});