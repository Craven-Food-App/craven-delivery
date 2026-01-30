import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { restaurant_id } = await req.json();

    if (!restaurant_id) {
      return new Response(
        JSON.stringify({ error: 'restaurant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch restaurant data
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*, restaurant_onboarding_progress(*), restaurant_hours(*)')
      .eq('id', restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return new Response(
        JSON.stringify({ error: 'Restaurant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch menu items count
    const { count: menuItemCount } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant_id);

    // Fetch checklist items
    const { data: checklistItems } = await supabase
      .from('restaurant_go_live_checklist')
      .select('*')
      .eq('restaurant_id', restaurant_id);

    // Calculate readiness score
    let score = 0;
    const blockers: string[] = [];
    const missingItems: string[] = [];

    // Menu completeness (25 points)
    const menuScore = Math.min((menuItemCount || 0) / 10 * 25, 25);
    score += menuScore;
    if (menuItemCount && menuItemCount < 10) {
      missingItems.push(`Add ${10 - menuItemCount} more menu items`);
    }

    // Photos (15 points)
    if (restaurant.logo_url) {
      score += 7.5;
    } else {
      missingItems.push('Upload store logo');
    }

    if (restaurant.header_image_url) {
      score += 7.5;
    } else {
      missingItems.push('Upload header image');
    }

    // Business verified (30 points)
    if (restaurant.business_verified_at) {
      score += 30;
    } else {
      missingItems.push('Business verification pending');
      blockers.push('Business documents must be verified by admin');
    }

    // Banking (20 points)
    if (restaurant.banking_complete) {
      score += 20;
    } else {
      missingItems.push('Complete banking information');
      blockers.push('Banking information required for payouts');
    }

    // Hours set (10 points)
    const hoursSet = restaurant.restaurant_hours && restaurant.restaurant_hours.length > 0;
    if (hoursSet) {
      score += 10;
    } else {
      missingItems.push('Set store operating hours');
    }

    const readinessScore = Math.round(score);
    const isReady = readinessScore >= 90 && blockers.length === 0;

    // Calculate estimated go-live date
    let estimatedGoLive = null;
    if (restaurant.setup_deadline) {
      estimatedGoLive = restaurant.setup_deadline;
    } else if (isReady) {
      // If ready, suggest going live in 3 days
      const date = new Date();
      date.setDate(date.getDate() + 3);
      estimatedGoLive = date.toISOString().split('T')[0];
    } else {
      // Estimate based on missing items (assume 2 days per major item)
      const daysNeeded = Math.max(blockers.length * 2, 7);
      const date = new Date();
      date.setDate(date.getDate() + daysNeeded);
      estimatedGoLive = date.toISOString().split('T')[0];
    }

    // Update restaurant readiness score
    await supabase
      .from('restaurants')
      .update({ readiness_score: readinessScore })
      .eq('id', restaurant_id);

    // Update checklist items
    if (checklistItems) {
      for (const item of checklistItems) {
        let isCompleted = false;
        
        switch (item.item_key) {
          case 'menu_items':
            isCompleted = (menuItemCount || 0) >= 10;
            break;
          case 'business_verified':
            isCompleted = !!restaurant.business_verified_at;
            break;
          case 'banking_info':
            isCompleted = !!restaurant.banking_complete;
            break;
          case 'store_hours':
            isCompleted = hoursSet;
            break;
          case 'logo_uploaded':
            isCompleted = !!restaurant.logo_url;
            break;
          case 'header_uploaded':
            isCompleted = !!restaurant.header_image_url;
            break;
          case 'delivery_settings':
            isCompleted = !!restaurant.delivery_radius_miles;
            break;
        }

        if (item.is_completed !== isCompleted) {
          await supabase
            .from('restaurant_go_live_checklist')
            .update({ 
              is_completed: isCompleted,
              completed_at: isCompleted ? new Date().toISOString() : null
            })
            .eq('id', item.id);
        }
      }
    }

    // Check if ready for tablet shipment (business verified + menu ready)
    const { data: progressData } = await supabase
      .from('restaurant_onboarding_progress')
      .select('tablet_preparing_shipment, tablet_shipped')
      .eq('restaurant_id', restaurant_id)
      .single();

    const readyForTablet = restaurant.business_verified_at && menuItemCount && menuItemCount >= 10;
    
    // Auto-update tablet status to preparing if conditions are met and not already shipped
    if (readyForTablet && progressData && !progressData.tablet_preparing_shipment && !progressData.tablet_shipped) {
      await supabase
        .from('restaurant_onboarding_progress')
        .update({
          tablet_preparing_shipment: true,
          tablet_preparing_at: new Date().toISOString()
        })
        .eq('restaurant_id', restaurant_id);
    }

    return new Response(
      JSON.stringify({
        score: readinessScore,
        ready: isReady,
        blockers,
        missing_items: missingItems,
        estimated_go_live: estimatedGoLive,
        details: {
          menu_score: menuScore,
          menu_items_count: menuItemCount || 0,
          has_logo: !!restaurant.logo_url,
          has_header: !!restaurant.header_image_url,
          business_verified: !!restaurant.business_verified_at,
          banking_complete: !!restaurant.banking_complete,
          hours_set: hoursSet
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating readiness:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});