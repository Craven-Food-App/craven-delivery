import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const { reportId, sendEmail } = await req.json();

    console.log(`Generating report ${reportId}...`);

    // Create execution record
    const { data: execution, error: execError } = await supabaseClient
      .from("restaurant_report_executions")
      .insert({
        report_id: reportId,
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (execError) throw execError;

    // Fetch report configuration
    const { data: report, error: reportError } = await supabaseClient
      .from("restaurant_reports")
      .select(`
        *,
        template:restaurant_report_templates(*)
      `)
      .eq("id", reportId)
      .single();

    if (reportError) throw reportError;

    // Parse filters
    const filters = report.filters || {};
    const dateFrom = filters.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dateTo = filters.date_to || new Date().toISOString();

    // Execute SQL query
    const sqlQuery = report.template.sql_query
      .replace("$1", `'${report.restaurant_id}'`)
      .replace("$2", `'${dateFrom}'`)
      .replace("$3", `'${dateTo}'`);

    const { data: queryResult, error: queryError } = await supabaseClient
      .rpc("execute_raw_query", { query: sqlQuery })
      .single();

    if (queryError) {
      console.error("Query error:", queryError);
      throw queryError;
    }

    // Convert to CSV
    const rows = (queryResult || []) as any[];
    if (rows.length === 0) {
      throw new Error("No data returned from query");
    }

    const columns = Object.keys(rows[0]);
    const csvHeader = columns.join(",");
    const csvRows = rows.map((row: any) =>
      columns.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return "";
        if (typeof value === "string" && value.includes(",")) return `"${value}"`;
        return value;
      }).join(",")
    );

    const csvContent = [csvHeader, ...csvRows].join("\n");
    const csvBlob = new Blob([csvContent], { type: "text/csv" });

    // Upload to storage
    const fileName = `${report.restaurant_id}/${reportId}/${execution.id}.csv`;
    const { error: uploadError } = await supabaseClient.storage
      .from("restaurant-reports")
      .upload(fileName, csvBlob, {
        contentType: "text/csv",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get file size
    const fileSize = new TextEncoder().encode(csvContent).length;

    // Update execution record
    await supabaseClient
      .from("restaurant_report_executions")
      .update({
        status: "completed",
        file_path: fileName,
        file_size_bytes: fileSize,
        row_count: rows.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", execution.id);

    // Send email if requested
    if (sendEmail) {
      const { data: publicUrl } = supabaseClient.storage
        .from("restaurant-reports")
        .getPublicUrl(fileName);

      const { data: restaurant } = await supabaseClient
        .from("restaurants")
        .select("name, email")
        .eq("id", report.restaurant_id)
        .single();

      if (restaurant?.email) {
        await resend.emails.send({
          from: Deno.env.get("RESEND_FROM_EMAIL") || "Crave'n <reports@craven.com>",
          to: [restaurant.email],
          subject: `Your ${report.name} report is ready`,
          html: `
            <h1>Your report is ready!</h1>
            <p>Your <strong>${report.name}</strong> report has been generated successfully.</p>
            <p><strong>Report details:</strong></p>
            <ul>
              <li>Rows: ${rows.length}</li>
              <li>Generated: ${new Date().toLocaleString()}</li>
            </ul>
            <p>
              <a href="${publicUrl.publicUrl}" style="background-color: #ff6b00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Download Report
              </a>
            </p>
          `,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        executionId: execution.id,
        rowCount: rows.length,
        fileSize,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating report:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
