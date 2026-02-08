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
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { reportId, frequency, dayOfWeek, dayOfMonth, timeOfDay, emailRecipients } = await req.json();

    console.log(`Scheduling report ${reportId} with frequency ${frequency}...`);

    // Calculate next run time
    const now = new Date();
    let nextRunAt = new Date();

    if (frequency === "daily") {
      const [hours, minutes] = timeOfDay.split(":");
      nextRunAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (nextRunAt <= now) {
        nextRunAt.setDate(nextRunAt.getDate() + 1);
      }
    } else if (frequency === "weekly") {
      const [hours, minutes] = timeOfDay.split(":");
      nextRunAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      const currentDay = nextRunAt.getDay();
      const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
      nextRunAt.setDate(nextRunAt.getDate() + daysUntilTarget);
      if (nextRunAt <= now) {
        nextRunAt.setDate(nextRunAt.getDate() + 7);
      }
    } else if (frequency === "monthly") {
      const [hours, minutes] = timeOfDay.split(":");
      nextRunAt.setDate(dayOfMonth);
      nextRunAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (nextRunAt <= now) {
        nextRunAt.setMonth(nextRunAt.getMonth() + 1);
      }
    }

    // Create or update schedule
    const { data, error } = await supabaseClient
      .from("restaurant_report_schedules")
      .upsert({
        report_id: reportId,
        frequency,
        day_of_week: dayOfWeek,
        day_of_month: dayOfMonth,
        time_of_day: timeOfDay,
        email_recipients: emailRecipients,
        next_run_at: nextRunAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Update report to mark as scheduled
    await supabaseClient
      .from("restaurant_reports")
      .update({ is_scheduled: true })
      .eq("id", reportId);

    return new Response(
      JSON.stringify({
        success: true,
        schedule: data,
        nextRunAt: nextRunAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error scheduling report:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
