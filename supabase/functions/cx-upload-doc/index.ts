// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ensure bucket exists (idempotent)
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.find((b: any) => b.id === "cx-applications")) {
      await admin.storage.createBucket("cx-applications", {
        public: false,
        fileSizeLimit: 26214400, // 25 MB
      });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const applicationId = String(form.get("application_id") ?? "");
    const docType = String(form.get("doc_type") ?? "misc");
    if (!file || !applicationId) {
      return new Response(JSON.stringify({ error: "Missing file or application_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
    const path = `${applicationId}/${docType}-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: upErr } = await admin.storage
      .from("cx-applications")
      .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upErr) throw upErr;

    // Signed URL (7 days) for reviewer/applicant access
    const { data: signed } = await admin.storage
      .from("cx-applications")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    const { data: doc, error: docErr } = await admin
      .from("cx_application_documents")
      .insert({
        application_id: applicationId,
        doc_type: docType,
        file_name: file.name,
        file_url: signed?.signedUrl ?? path,
      })
      .select()
      .single();
    if (docErr) throw docErr;

    await admin.from("cx_application_events").insert({
      application_id: applicationId,
      event_type: "doc_uploaded",
      payload: { doc_type: docType, file_name: file.name },
    });

    return new Response(JSON.stringify({ ok: true, document: doc, path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});