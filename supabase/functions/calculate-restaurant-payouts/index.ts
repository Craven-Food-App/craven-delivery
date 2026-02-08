import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

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

    const { restaurantId, startDate, endDate } = await req.json()

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

    // Get commission settings
    const { data: commissionSettings } = await supabaseClient
      .from('commission_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    const commissionRate = commissionSettings?.restaurant_commission_percent || 10

    // Get completed orders in date range
    const { data: orders } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          totalRevenue: 0,
          totalCommission: 0,
          netPayout: 0,
          orderCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate totals
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total_cents || 0), 0)
    const totalCommission = Math.round(totalRevenue * (commissionRate / 100))
    const netPayout = totalRevenue - totalCommission

    return new Response(
      JSON.stringify({ 
        success: true,
        totalRevenue,
        totalCommission,
        netPayout,
        orderCount: orders.length,
        commissionRate,
        orders: orders.map(o => ({
          id: o.id,
          orderNumber: o.order_number,
          total: o.total_cents,
          createdAt: o.created_at
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error calculating payouts:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})