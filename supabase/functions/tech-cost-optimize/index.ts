import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

import { getCorsHeaders } from '../_shared/cors.ts';
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const optimizations = [];

    // 1. Detect unused licenses
    const { data: licenses, error: licensesError } = await supabase
      .from("tech_licenses")
      .select(`
        *,
        vendor:tech_vendors(name, service_name, monthly_cost)
      `)
      .eq("is_active", true);

    if (!licensesError && licenses) {
      for (const license of licenses) {
        const unusedPct = license.unused_licenses / license.total_licenses;
        if (unusedPct > 0.2) { // More than 20% unused
          const potentialSavings = license.unused_licenses * (license.cost_per_license || 0);
          
          optimizations.push({
            type: "unused_license",
            vendor: license.vendor?.name || "Unknown",
            service: license.vendor?.service_name || "Unknown",
            recommendation: `Downgrade from ${license.total_licenses} to ${license.used_licenses} licenses`,
            potential_savings: potentialSavings,
            unused_licenses: license.unused_licenses,
            license_id: license.id,
          });

          // Create alert
          await supabase.from("tech_cost_alerts").insert({
            alert_type: "license_optimization",
            severity: unusedPct > 0.5 ? "warning" : "info",
            vendor_id: license.vendor_id,
            title: `${license.vendor?.name}: ${license.unused_licenses} unused licenses detected`,
            message: `${license.unused_licenses} of ${license.total_licenses} licenses are unused. Potential savings: $${potentialSavings.toFixed(2)}/month`,
            estimated_impact: potentialSavings,
            metadata: {
              unused_licenses: license.unused_licenses,
              total_licenses: license.total_licenses,
              recommendation: "downgrade",
            },
          });
        }
      }
    }

    // 2. Detect shadow tools (vendors marked as shadow tools)
    const { data: shadowTools, error: shadowError } = await supabase
      .from("tech_vendors")
      .select("*")
      .eq("is_shadow_tool", true)
      .eq("is_active", true);

    if (!shadowError && shadowTools) {
      for (const tool of shadowTools) {
        const annualCost = tool.annual_cost || (tool.monthly_cost * 12);
        
        optimizations.push({
          type: "shadow_tool",
          vendor: tool.name,
          service: tool.service_name,
          recommendation: "Review and potentially cancel unauthorized tool",
          potential_savings: annualCost,
          vendor_id: tool.id,
        });

        // Create alert
        await supabase.from("tech_cost_alerts").insert({
          alert_type: "shadow_tool",
          severity: "warning",
          vendor_id: tool.id,
          title: `Shadow tool detected: ${tool.name}`,
          message: `${tool.name} (${tool.service_name}) is marked as a shadow tool. Annual cost: $${annualCost.toFixed(2)}. Review and consider cancellation.`,
          estimated_impact: annualCost,
          metadata: {
            monthly_cost: tool.monthly_cost,
            annual_cost: annualCost,
          },
        });
      }
    }

    // 3. Detect vendors with low usage but high cost
    const { data: vendors, error: vendorsError } = await supabase
      .from("tech_vendors")
      .select(`
        *,
        actual_costs:tech_actual_costs(amount, usage_metrics, period)
      `)
      .eq("is_active", true);

    if (!vendorsError && vendors) {
      const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      for (const vendor of vendors) {
        const currentCost = vendor.actual_costs?.find((c: any) => c.period === currentPeriod);
        if (currentCost && vendor.monthly_cost > 100) {
          // Check if usage metrics indicate low usage
          const usageMetrics = currentCost.usage_metrics || {};
          const hasLowUsage = Object.keys(usageMetrics).some(key => {
            const value = usageMetrics[key];
            if (typeof value === 'number') {
              // Heuristic: if usage is less than 20% of typical, flag it
              return value < (vendor.metadata?.typical_usage?.[key] || 0) * 0.2;
            }
            return false;
          });

          if (hasLowUsage) {
            optimizations.push({
              type: "low_usage",
              vendor: vendor.name,
              service: vendor.service_name,
              recommendation: "Consider downgrading to a lower tier plan",
              potential_savings: vendor.monthly_cost * 0.3, // Estimate 30% savings
              vendor_id: vendor.id,
            });
          }
        }
      }
    }

    // 4. Detect storage overages (example: Supabase storage)
    const { data: storageCosts, error: storageError } = await supabase
      .from("tech_actual_costs")
      .select(`
        *,
        category:tech_cost_categories(name),
        vendor:tech_vendors(name, service_name)
      `)
      .eq("category.name", "Storage")
      .gte("period", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7));

    if (!storageError && storageCosts) {
      for (const cost of storageCosts) {
        const usageMetrics = cost.usage_metrics || {};
        const storageGB = usageMetrics.storage_gb || usageMetrics.storage || 0;
        const budgetGB = cost.metadata?.budget_gb || 100; // Default 100GB budget
        
        if (storageGB > budgetGB) {
          const overageGB = storageGB - budgetGB;
          // Estimate cost: ~$0.19/GB for Supabase storage overage
          const estimatedOverageCost = overageGB * 0.19;
          const nextMonthProjection = (storageGB * 1.1) * 0.19; // Assume 10% growth
          
          optimizations.push({
            type: "storage_overage",
            vendor: cost.vendor?.name || "Unknown",
            service: cost.vendor?.service_name || "Unknown",
            recommendation: `Storage is ${overageGB.toFixed(0)}GB over budget. Estimated $${nextMonthProjection.toFixed(2)} increase next month.`,
            potential_savings: -estimatedOverageCost, // Negative = cost increase
            current_usage_gb: storageGB,
            budget_gb: budgetGB,
            overage_gb: overageGB,
          });

          // Create alert
          await supabase.from("tech_cost_alerts").insert({
            alert_type: "overage",
            severity: overageGB > budgetGB * 0.5 ? "critical" : "warning",
            category_id: cost.category_id,
            vendor_id: cost.vendor_id,
            title: `${cost.vendor?.name || 'Storage'} is ${overageGB.toFixed(0)}GB over budget`,
            message: `Storage usage: ${storageGB.toFixed(0)}GB (Budget: ${budgetGB}GB). Estimated $${nextMonthProjection.toFixed(2)} increase next month.`,
            estimated_impact: nextMonthProjection,
            metadata: {
              current_usage_gb: storageGB,
              budget_gb: budgetGB,
              overage_gb: overageGB,
            },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        optimizations_found: optimizations.length,
        optimizations,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in tech-cost-optimize:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

