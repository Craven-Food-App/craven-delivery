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

    console.log("Checking for scheduled reports to execute...");

    // Find schedules that need to run
    const now = new Date();
    const { data: schedules, error: schedulesError } = await supabaseClient
      .from("restaurant_report_schedules")
      .select("*, report:restaurant_reports(*)")
      .eq("is_active", true)
      .lte("next_run_at", now.toISOString());

    if (schedulesError) throw schedulesError;

    console.log(`Found ${schedules?.length || 0} schedules to execute`);

    const results = [];

    for (const schedule of schedules || []) {
      try {
        console.log(`Executing schedule ${schedule.id} for report ${schedule.report_id}`);

        // Call generate-report function
        const generateResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-report`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              reportId: schedule.report_id,
              sendEmail: true,
            }),
          }
        );

        const result = await generateResponse.json();

        if (!generateResponse.ok) {
          throw new Error(result.error || "Failed to generate report");
        }

        // Calculate next run time
        let nextRunAt = new Date(schedule.next_run_at);

        if (schedule.frequency === "daily") {
          nextRunAt.setDate(nextRunAt.getDate() + 1);
        } else if (schedule.frequency === "weekly") {
          nextRunAt.setDate(nextRunAt.getDate() + 7);
        } else if (schedule.frequency === "monthly") {
          nextRunAt.setMonth(nextRunAt.getMonth() + 1);
        }

        // Update schedule
        await supabaseClient
          .from("restaurant_report_schedules")
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt.toISOString(),
          })
          .eq("id", schedule.id);

        results.push({
          scheduleId: schedule.id,
          reportId: schedule.report_id,
          status: "success",
          nextRunAt: nextRunAt.toISOString(),
        });

        console.log(`Successfully executed schedule ${schedule.id}`);
      } catch (error: any) {
        console.error(`Error executing schedule ${schedule.id}:`, error);
        results.push({
          scheduleId: schedule.id,
          reportId: schedule.report_id,
          status: "error",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        executedCount: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error executing scheduled reports:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
