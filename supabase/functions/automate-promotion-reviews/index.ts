import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Automating promotion review schedules...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // Find engagements that need review schedules created
    const { data: engagements, error: engError } = await supabaseClient
      .from("promotion_engagements")
      .select("id, start_date, current_stage, review_cadence_days")
      .in("current_stage", ["INTERN_ACTIVE", "ACTING_ACTIVE"])
      .is("end_date", null);

    if (engError) throw engError;

    let created = 0;
    let overdue = 0;

    for (const engagement of engagements || []) {
      const startDate = new Date(engagement.start_date);
      const cadenceDays = engagement.review_cadence_days || 30;

      // Calculate next review dates (30, 60, 90 day marks)
      const reviewDates = [
        { days: 30, type: "30_DAY" },
        { days: 60, type: "60_DAY" },
        { days: 90, type: "90_DAY" },
      ];

      for (const { days, type } of reviewDates) {
        const reviewDate = new Date(startDate);
        reviewDate.setDate(reviewDate.getDate() + days);
        const reviewDateStr = reviewDate.toISOString().split("T")[0];

        // Check if schedule already exists
        const { data: existing } = await supabaseClient
          .from("promotion_review_schedules")
          .select("id")
          .eq("engagement_id", engagement.id)
          .eq("review_type", type)
          .single();

        // Create schedule if it doesn't exist and is within next 7 days or past due
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const sevenDaysStr = sevenDaysFromNow.toISOString().split("T")[0];

        if (!existing && reviewDateStr <= sevenDaysStr) {
          const status = reviewDateStr < todayStr ? "OVERDUE" : "SCHEDULED";
          const isBlocking = reviewDateStr < todayStr && engagement.current_stage === "ACTING_ACTIVE";

          await supabaseClient
            .from("promotion_review_schedules")
            .insert({
              engagement_id: engagement.id,
              review_type: type,
              scheduled_date: reviewDateStr,
              status,
              is_blocking: isBlocking,
            });

          created++;
          if (status === "OVERDUE") overdue++;

          // Mark engagement as review-blocked if overdue and blocking
          if (isBlocking) {
            await supabaseClient
              .from("promotion_engagements")
              .update({ is_review_blocked: true })
              .eq("id", engagement.id);
          }
        }
      }
    }

    // Update overdue statuses for existing schedules
    const { data: overdueSchedules, error: overdueError } = await supabaseClient
      .from("promotion_review_schedules")
      .select("engagement_id")
      .eq("status", "SCHEDULED")
      .lt("scheduled_date", todayStr);

    if (overdueError) {
      console.error("Error fetching overdue schedules:", overdueError);
    } else if (overdueSchedules && overdueSchedules.length > 0) {
      const engagementIds = [...new Set(overdueSchedules.map(s => s.engagement_id))];
      
      for (const engagementId of engagementIds) {
        // Update status to OVERDUE
        await supabaseClient
          .from("promotion_review_schedules")
          .update({ status: "OVERDUE" })
          .eq("engagement_id", engagementId)
          .eq("status", "SCHEDULED")
          .lt("scheduled_date", todayStr);

        // Block promotions for overdue reviews if they're blocking
        const { data: blockingReviews } = await supabaseClient
          .from("promotion_review_schedules")
          .select("id")
          .eq("engagement_id", engagementId)
          .eq("status", "OVERDUE")
          .eq("is_blocking", true);

        if (blockingReviews && blockingReviews.length > 0) {
          await supabaseClient.rpc('increment_missed_review_count', { 
            engagement_id_param: engagementId 
          }).catch(async () => {
            // Fallback if function doesn't exist
            const { data: current } = await supabaseClient
              .from("promotion_engagements")
              .select("missed_review_count")
              .eq("id", engagementId)
              .single();
            
            await supabaseClient
              .from("promotion_engagements")
              .update({ 
                is_review_blocked: true,
                missed_review_count: (current?.missed_review_count || 0) + 1
              })
              .eq("id", engagementId);
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        created,
        overdue,
        message: `Created ${created} review schedules, ${overdue} overdue`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error automating reviews:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

