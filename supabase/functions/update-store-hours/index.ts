import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { restaurantId, hours, specialHours, isActive } = await req.json()

    // Verify user owns the restaurant
    const { data: restaurant } = await supabaseClient
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .single()

    if (!restaurant) {
      throw new Error('Restaurant not found or unauthorized')
    }

    // Update restaurant active status if provided
    if (typeof isActive !== 'undefined') {
      await supabaseClient
        .from('restaurants')
        .update({ is_active: isActive })
        .eq('id', restaurantId)
    }

    // Update regular hours if provided
    if (hours) {
      for (const hour of hours) {
        const { day_of_week, open_time, close_time, is_closed } = hour

        await supabaseClient
          .from('restaurant_hours')
          .upsert({
            restaurant_id: restaurantId,
            day_of_week,
            open_time,
            close_time,
            is_closed
          }, {
            onConflict: 'restaurant_id,day_of_week'
          })
      }
    }

    // Update special hours if provided
    if (specialHours) {
      const { data: newSpecialHours, error: specialError } = await supabaseClient
        .from('restaurant_special_hours')
        .insert({
          restaurant_id: restaurantId,
          ...specialHours
        })
        .select()
        .single()

      if (specialError) throw specialError

      return new Response(
        JSON.stringify({ success: true, specialHours: newSpecialHours }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error updating store hours:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})