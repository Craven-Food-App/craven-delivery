import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from '../_shared/cors.ts';

const MIN_SUBTOTAL_CENTS = 1200; // $12.00

interface GetOfferRequest {
  userId?: string;
  location?: string;
  cartSubtotalCents?: number;
  merchantId?: string;
  zoneId?: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: GetOfferRequest = await req.json().catch(() => ({}));

    // Get active plans
    const { data: plans, error: plansError } = await supabase
      .from("cravemore_plans")
      .select("*")
      .eq("is_active", true)
      .order("is_most_popular", { ascending: false });

    if (plansError) throw plansError;

    // Check for active promo
    const now = new Date().toISOString();
    const { data: promos } = await supabase
      .from("cravemore_promos")
      .select("*")
      .eq("is_active", true)
      .lte("starts_at", now)
      .gte("ends_at", now);

    const activePromo = promos && promos.length > 0 ? promos[0] : null;

    // Get user's current membership if userId provided
    let currentMembership = null;
    if (body.userId) {
      const { data: membership } = await supabase
        .from("user_memberships")
        .select("*")
        .eq("user_id", body.userId)
        .eq("status", "active")
        .single();

      currentMembership = membership;
    }

    // Process plans with pricing
    const processedPlans = plans.map((plan) => {
      const priceCents = activePromo && plan.promo_price_cents
        ? plan.promo_price_cents
        : plan.price_cents;

      // Calculate savings for annual
      let annualSavings = null;
      let monthlyEquivalent = null;
      if (plan.plan_key === "annual") {
        const monthlyPlan = plans.find((p) => p.plan_key === "monthly");
        if (monthlyPlan) {
          const monthlyPrice = activePromo && monthlyPlan.promo_price_cents
            ? monthlyPlan.promo_price_cents
            : monthlyPlan.price_cents;
          annualSavings = monthlyPrice * 12 - priceCents;
          monthlyEquivalent = Math.round(priceCents / 12);
        }
      }

      // Calculate breakeven for lifetime
      let breakevenMonths = null;
      if (plan.plan_key === "lifetime") {
        const monthlyPlan = plans.find((p) => p.plan_key === "monthly");
        if (monthlyPlan) {
          const monthlyPrice = activePromo && monthlyPlan.promo_price_cents
            ? monthlyPlan.promo_price_cents
            : monthlyPlan.price_cents;
          breakevenMonths = Math.ceil(priceCents / monthlyPrice);
        }
      }

      // Check lifetime availability
      const lifetimeAvailable = plan.plan_key === "lifetime"
        ? (plan.lifetime_cap_used || 0) < (plan.lifetime_cap_total || 0)
        : true;

      return {
        id: plan.id,
        planKey: plan.plan_key,
        displayName: plan.display_name,
        billingPeriod: plan.billing_period,
        priceCents,
        isMostPopular: plan.is_most_popular,
        badgeText: plan.badge_text,
        annualSavings,
        monthlyEquivalent,
        breakevenMonths,
        lifetimeAvailable,
        lifetimeRemaining: plan.plan_key === "lifetime"
          ? Math.max(0, (plan.lifetime_cap_total || 0) - (plan.lifetime_cap_used || 0))
          : null,
      };
    });

    // Check eligibility for $0 delivery fee
    let isEligibleForZeroFee = false;
    let eligibilityReason = null;

    if (currentMembership && body.cartSubtotalCents && body.merchantId && body.zoneId) {
      // Check merchant eligibility
      const { data: merchant } = await supabase
        .from("merchants")
        .select("cravemore_eligible")
        .eq("id", body.merchantId)
        .single();

      // Check zone eligibility (if zones table exists)
      let zoneEligible = true;
      try {
        const { data: zone } = await supabase
          .from("zones")
          .select("cravemore_eligible")
          .eq("id", body.zoneId)
          .single();
        zoneEligible = zone?.cravemore_eligible !== false;
      } catch {
        // Zones table might not exist, default to eligible
      }

      if (body.cartSubtotalCents >= MIN_SUBTOTAL_CENTS) {
        if (merchant?.cravemore_eligible !== false && zoneEligible) {
          isEligibleForZeroFee = true;
        } else {
          eligibilityReason = "merchant_or_zone_not_eligible";
        }
      } else {
        eligibilityReason = "subtotal_below_minimum";
      }
    }

    return new Response(
      JSON.stringify({
        plans: processedPlans,
        activePromo: activePromo ? {
          promoKey: activePromo.promo_key,
          endsAt: activePromo.ends_at,
        } : null,
        currentMembership: currentMembership ? {
          planKey: currentMembership.plan_key,
          status: currentMembership.status,
          renewsAt: currentMembership.renews_at,
          foundingMember: currentMembership.founding_member,
        } : null,
        eligibility: {
          isEligibleForZeroFee,
          eligibilityReason,
          minSubtotalCents: MIN_SUBTOTAL_CENTS,
          amountNeededCents: body.cartSubtotalCents
            ? Math.max(0, MIN_SUBTOTAL_CENTS - body.cartSubtotalCents)
            : null,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error getting CraveMore offer:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

