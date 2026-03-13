import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.1";
import { getCorsHeaders } from "../_shared/cors.ts";

interface PurgePayload {
  executive_id?: string;
  officer_name?: string;
  appointment_id?: string;
  dryRun?: boolean;
}

const DOC_URL_COLUMNS = [
  'appointment_letter_url', 'board_resolution_url', 'certificate_url',
  'employment_agreement_url', 'deferred_compensation_url', 'confidentiality_ip_url',
  'stock_subscription_url', 'pre_incorporation_consent_url',
  'certificate_of_incorporation_url', 'bylaws_url', 'bylaws_acknowledgment_url',
  'fiduciary_ethics_url', 'conflict_disclosure_url', 'officer_indemnification_url',
  'equity_plan_url', 'option_rsu_award_url',
];

const createSupabaseClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role credentials are not configured.");
  }
  return createClient(url, serviceRoleKey);
};

const parseBucketAndPath = (fileUrl?: string | null): { bucket: string; path: string } | null => {
  if (!fileUrl) return null;
  try {
    const url = new URL(fileUrl);
    const pathname = decodeURIComponent(url.pathname);
    const match = pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i);
    if (match) return { bucket: match[1], path: match[2] };
    return null;
  } catch {
    return null;
  }
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();
    const payload: PurgePayload = await req.json();
    const { executive_id, officer_name, appointment_id, dryRun = false } = payload;

    if (!executive_id && !officer_name && !appointment_id) {
      return new Response(
        JSON.stringify({ error: "Provide executive_id, officer_name, or appointment_id." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const summary: Record<string, any> = {
      executiveDocsPurged: 0,
      signaturesPurged: 0,
      storageFilesPurged: 0,
      appointmentUrlsCleared: 0,
    };

    // 1. Find matching appointment(s) -- try multiple strategies
    let appointmentIds: string[] = [];

    if (appointment_id) {
      appointmentIds.push(appointment_id);
    }

    // Search by officer_name in exec_users -> executive_appointments
    if (officer_name) {
      const { data: execUsers } = await supabase
        .from("exec_users")
        .select("id")
        .or(`full_name.ilike.%${officer_name}%,email.ilike.%${officer_name}%`);

      if (execUsers && execUsers.length > 0) {
        const execIds = execUsers.map((e: any) => e.id);
        const { data: apts } = await supabase
          .from("executive_appointments")
          .select("id")
          .in("executive_id", execIds);
        if (apts) {
          appointmentIds.push(...apts.map((a: any) => a.id));
        }
      }

      // Also try user_profiles
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id")
        .ilike("full_name", `%${officer_name}%`);

      if (profiles && profiles.length > 0) {
        const userIds = profiles.map((p: any) => p.user_id);
        const { data: execs } = await supabase
          .from("exec_users")
          .select("id")
          .in("user_id", userIds);
        if (execs) {
          const execIds = execs.map((e: any) => e.id);
          const { data: apts } = await supabase
            .from("executive_appointments")
            .select("id")
            .in("executive_id", execIds);
          if (apts) {
            appointmentIds.push(...apts.map((a: any) => a.id));
          }
        }
      }
    }

    if (executive_id) {
      const { data: apts } = await supabase
        .from("executive_appointments")
        .select("id")
        .eq("executive_id", executive_id);
      if (apts) {
        appointmentIds.push(...apts.map((a: any) => a.id));
      }
    }

    appointmentIds = [...new Set(appointmentIds)];
    console.log("Matched appointment IDs:", appointmentIds);

    // 2. Collect all document URLs from those appointments so we can delete storage files
    const storageItems: { bucket: string; path: string }[] = [];
    if (appointmentIds.length > 0) {
      const { data: appointments } = await supabase
        .from("executive_appointments")
        .select("*")
        .in("id", appointmentIds);

      if (appointments) {
        for (const apt of appointments) {
          for (const col of DOC_URL_COLUMNS) {
            const url = (apt as any)[col];
            const parsed = parseBucketAndPath(url);
            if (parsed) storageItems.push(parsed);
          }
        }
      }
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          message: "Dry run. No changes applied.",
          appointmentIds,
          storageItems,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // 3. Delete executive_documents + executive_signatures
    const filters: string[] = [];
    if (executive_id) filters.push(`executive_id.eq.${executive_id}`);
    if (officer_name) filters.push(`officer_name.ilike.%${officer_name}%`);

    if (filters.length > 0) {
      const { data: docs } = await supabase
        .from("executive_documents")
        .select("id, file_url")
        .or(filters.join(","));

      if (docs && docs.length > 0) {
        const docIds = docs.map((d: any) => d.id);
        const { error: sigErr } = await supabase.from("executive_signatures").delete().in("document_id", docIds);
        if (sigErr) console.warn("Sig delete warn:", sigErr);
        else summary.signaturesPurged = docIds.length;

        for (const doc of docs) {
          const parsed = parseBucketAndPath(doc.file_url);
          if (parsed) storageItems.push(parsed);
        }

        const { error: docErr } = await supabase.from("executive_documents").delete().or(filters.join(","));
        if (docErr) console.warn("Doc delete warn:", docErr);
        else summary.executiveDocsPurged = docs.length;
      }
    }

    // 4. Delete storage files (from all buckets)
    const bucketGroups: Record<string, string[]> = {};
    for (const item of storageItems) {
      if (!bucketGroups[item.bucket]) bucketGroups[item.bucket] = [];
      bucketGroups[item.bucket].push(item.path);
    }
    for (const [bucket, paths] of Object.entries(bucketGroups)) {
      const { error: stErr } = await supabase.storage.from(bucket).remove(paths);
      if (stErr) console.warn(`Storage delete warn (${bucket}):`, stErr);
      else summary.storageFilesPurged += paths.length;
    }

    // 5. Clear all document URL columns on the appointments
    if (appointmentIds.length > 0) {
      const nullUpdate: Record<string, null> = {};
      for (const col of DOC_URL_COLUMNS) {
        nullUpdate[col] = null;
      }
      const { error: aptErr } = await supabase
        .from("executive_appointments")
        .update(nullUpdate)
        .in("id", appointmentIds);
      if (aptErr) console.warn("Appointment URL clear warn:", aptErr);
      else summary.appointmentUrlsCleared = appointmentIds.length;
    }

    return new Response(
      JSON.stringify({
        message: `Purge complete for ${officer_name || executive_id || appointment_id}.`,
        appointmentIds,
        ...summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    console.error("Error purging executive documents:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Failed to purge executive documents." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

