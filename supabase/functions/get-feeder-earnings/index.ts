import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const { timeframe } = await req.json();
    const feederId = user.id;

    // 1) Compute timeframe bounds
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: string | null = null;
    let endDate: string | null = null;

    switch (timeframe) {
      case 'today':
        startDate = today.toISOString();
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'this_week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        startDate = weekStart.toISOString();
        endDate = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      }
      case 'last_week': {
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        startDate = lastWeekStart.toISOString();
        endDate = new Date(lastWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      }
      case 'overall':
      default:
        // null bounds = all time
        break;
    }

    // 2) Fetch ledger entries for this feeder within timeframe
    let query = supabase
      .from('feeder_wallet_ledger_entries')
      .select('type, direction, amount_cents, status, source_type, source_id')
      .eq('feeder_id', feederId);

    if (startDate) query = query.gte('occurred_at', startDate);
    if (endDate) query = query.lt('occurred_at', endDate);

    const { data: entries, error: ledgerError } = await query;
    if (ledgerError) throw new Error(`Ledger query failed: ${ledgerError.message}`);

    const rows = entries || [];

    // 3) Compute earnings breakdown
    const sumByType = (type: string) =>
      rows.filter(r => r.type === type).reduce((s, r) => s + r.amount_cents, 0);

    const base_pay_cents = sumByType('earnings_base_pay');
    const distance_pay_cents = sumByType('earnings_distance_pay');
    const tips_cents = sumByType('earnings_tip');
    const bonuses_cents = sumByType('earnings_bonus');
    const adj_credit = sumByType('earnings_adjustment_credit');
    const adj_debit = sumByType('earnings_adjustment_debit');
    const adjustments_cents = adj_credit - adj_debit;

    const total_earned_cents = base_pay_cents + distance_pay_cents + tips_cents + bonuses_cents + adjustments_cents;

    // 4) Compute payout status
    const earningsTypes = [
      'earnings_base_pay', 'earnings_distance_pay', 'earnings_tip',
      'earnings_bonus', 'earnings_adjustment_credit',
    ];

    const available_cents = rows
      .filter(r => earningsTypes.includes(r.type) && r.status === 'available')
      .reduce((s, r) => s + r.amount_cents, 0)
      - rows
        .filter(r => r.type === 'earnings_adjustment_debit' && r.status === 'available')
        .reduce((s, r) => s + r.amount_cents, 0);

    const pending_cents = rows
      .filter(r => earningsTypes.includes(r.type) && r.status === 'pending')
      .reduce((s, r) => s + r.amount_cents, 0)
      - rows
        .filter(r => r.type === 'earnings_adjustment_debit' && r.status === 'pending')
        .reduce((s, r) => s + r.amount_cents, 0);

    const paid_cents = rows
      .filter(r => r.type === 'payout_debit' && r.status === 'paid')
      .reduce((s, r) => s + r.amount_cents, 0);

    // 5) Gas money
    const gas_credit = rows
      .filter(r => r.type === 'gas_credit' && r.status === 'available')
      .reduce((s, r) => s + r.amount_cents, 0);
    const gas_debit = rows
      .filter(r => r.type === 'gas_transfer_debit' && ['processing', 'paid'].includes(r.status))
      .reduce((s, r) => s + r.amount_cents, 0);
    const gas_money_cents = gas_credit - gas_debit;

    // 6) Metrics
    const orderSourceIds = new Set(
      rows
        .filter(r => r.source_type === 'order' && r.type.startsWith('earnings_'))
        .map(r => r.source_id)
        .filter(Boolean)
    );
    const total_trips = orderSourceIds.size;

    // Fetch active time and miles from driver_profiles (overall metrics)
    const { data: profile } = await supabase
      .from('driver_profiles')
      .select('completed_orders, rolling_rating, on_time_rate, completion_rate')
      .eq('user_id', feederId)
      .maybeSingle();

    // We don't have per-timeframe active hours/miles in the current schema
    // so for now these are null (UI shows "--")
    const active_time_hours: number | null = null;
    const total_miles: number | null = null;

    const earnings_per_hour_cents = active_time_hours && active_time_hours > 0
      ? Math.round(total_earned_cents / active_time_hours) : null;
    const earnings_per_mile_cents = total_miles && total_miles > 0
      ? Math.round(total_earned_cents / total_miles) : null;

    // 7) Cashout eligibility (always overall, not timeframe-filtered)
    // Count deliveries from overall ledger
    let deliveriesQuery = supabase
      .from('feeder_wallet_ledger_entries')
      .select('source_id', { count: 'exact', head: false })
      .eq('feeder_id', feederId)
      .eq('source_type', 'order')
      .eq('type', 'earnings_base_pay');

    const { data: deliveryRows } = await deliveriesQuery;
    const completed_deliveries = new Set(
      (deliveryRows || []).map(r => r.source_id).filter(Boolean)
    ).size;

    // Use profile metrics with minimum sample sizes
    const MIN_RATED = 20;
    const MIN_TRACKED = 10;

    const rating = profile?.rolling_rating != null && completed_deliveries >= MIN_RATED
      ? profile.rolling_rating : null;
    const on_time_rate = profile?.on_time_rate != null && completed_deliveries >= MIN_TRACKED
      ? profile.on_time_rate : null;
    const accuracy = profile?.completion_rate != null && completed_deliveries >= MIN_TRACKED
      ? profile.completion_rate : null;

    const unlocked =
      completed_deliveries >= 50
      && (rating === null || rating >= 4.5)
      && (on_time_rate === null || on_time_rate >= 95)
      && (accuracy === null || accuracy >= 100);

    // 8) Build response
    const payload = {
      available_balance_cents: Math.max(0, available_cents),
      total_earned_cents,
      breakdown: {
        base_pay_cents,
        distance_pay_cents,
        tips_cents,
        bonuses_cents,
        adjustments_cents,
      },
      payout_status: {
        available_cents: Math.max(0, available_cents),
        pending_cents: Math.max(0, pending_cents),
        paid_cents,
      },
      sent_to_feeder_card_cents: paid_cents,
      gas_money_cents: Math.max(0, gas_money_cents),
      metrics: {
        total_trips,
        active_time_hours,
        total_miles,
        earnings_per_hour_cents,
        earnings_per_mile_cents,
      },
      cashout_eligibility: {
        unlocked,
        deliveries: completed_deliveries,
        deliveries_required: 50,
        rating,
        rating_required: 4.5,
        on_time_rate,
        on_time_required: 95,
        accuracy,
        accuracy_required: 100,
      },
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('get-feeder-earnings error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
