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

    const { data: resolvedBps } = await supabaseClient.rpc('resolve_merchant_commission_bps', {
      p_restaurant_id: restaurantId,
    })
    const commissionBps =
      typeof resolvedBps === 'number' && Number.isFinite(resolvedBps) ? resolvedBps : 1500
    const commissionRate = commissionBps / 100

    const { data: orders } = await supabaseClient
      .from('orders')
      .select(
        'id, order_number, total_cents, food_subtotal_cents, subtotal_cents, merchant_commission_cents, merchant_payout_cents, created_at, order_status'
      )
      .eq('restaurant_id', restaurantId)
      .eq('order_status', 'delivered')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          totalRevenue: 0,
          totalCommission: 0,
          netPayout: 0,
          orderCount: 0,
          commissionRate,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalRevenue = 0
    let totalCommission = 0
    let netPayout = 0
    for (const order of orders) {
      const food =
        (order.food_subtotal_cents ?? order.subtotal_cents ?? order.total_cents ?? 0) as number
      totalRevenue += food
      const mc = order.merchant_commission_cents
      const mp = order.merchant_payout_cents
      if (typeof mc === 'number' && mc > 0) {
        totalCommission += mc
        netPayout += typeof mp === 'number' && mp > 0 ? mp : food - mc
      } else {
        const c = Math.round((food * commissionBps) / 10000)
        totalCommission += c
        netPayout += food - c
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalRevenue,
        totalCommission,
        netPayout,
        orderCount: orders.length,
        commissionRate,
        orders: orders.map((o) => ({
          id: o.id,
          orderNumber: o.order_number,
          total: o.total_cents,
          createdAt: o.created_at,
        })),
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