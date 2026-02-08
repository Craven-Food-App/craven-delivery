import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.1";
import { getCorsHeaders } from "../_shared/cors.ts";

interface PurgePayload {
  executive_id?: string;
  officer_name?: string;
  dryRun?: boolean;
}

const createSupabaseClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role credentials are not configured.");
  }

  return createClient(url, serviceRoleKey);
};

const parseStoragePath = (fileUrl?: string | null): string | null => {
  if (!fileUrl) return null;
  try {
    const url = new URL(fileUrl);
    const path = decodeURIComponent(url.pathname);
    const match = path.match(/\/storage\/v1\/object\/public\/documents\/(.+)$/i);
    return match ? match[1] : null;
  } catch (error) {
    console.warn("Failed to parse storage path:", fileUrl, error);
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

    const { executive_id, officer_name, dryRun = false } = payload;

    if (!executive_id && !officer_name) {
      return new Response(
        JSON.stringify({
          error: "Provide either executive_id or officer_name to purge.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build filter
    const filters: string[] = [];
    if (executive_id) {
      filters.push(`executive_id.eq.${executive_id}`);
    }
    if (officer_name) {
      filters.push(`officer_name.eq.${encodeURIComponent(officer_name)}`);
    }

    let docQuery = supabase.from("executive_documents").select("id, file_url, executive_id, officer_name");
    if (filters.length === 1 && executive_id) {
      docQuery = docQuery.eq("executive_id", executive_id);
    } else {
      docQuery = docQuery.or(filters.join(","));
    }

    const { data: documents, error: docsError } = await docQuery;
    if (docsError) {
      throw docsError;
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No matching documents found.",
          documentsPurged: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const docIds = documents.map((doc) => doc.id).filter(Boolean);
    const storagePaths = documents
      .map((doc) => parseStoragePath(doc.file_url))
      .filter((path): path is string => Boolean(path));

    if (dryRun) {
      return new Response(
        JSON.stringify({
          message: "Dry run successful. No changes applied.",
          documentsMatched: documents.length,
          documentIds: docIds,
          storagePaths,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    if (docIds.length > 0) {
      const { error: sigError } = await supabase
        .from("executive_signatures")
        .delete()
        .in("document_id", docIds);
      if (sigError) {
        console.warn("Error deleting linked signatures:", sigError);
      }
    }

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage.from("documents").remove(storagePaths);
      if (storageError) {
        console.warn("Error deleting storage files:", storageError);
      }
    }

    if (filters.length === 1 && executive_id) {
      const { error: deleteError } = await supabase
        .from("executive_documents")
        .delete()
        .eq("executive_id", executive_id);
      if (deleteError) throw deleteError;
    } else {
      const { error: deleteError } = await supabase
        .from("executive_documents")
        .delete()
        .or(filters.join(","));
      if (deleteError) throw deleteError;
    }

    return new Response(
      JSON.stringify({
        message: `Purged ${documents.length} executive document(s).`,
        documentsPurged: documents.length,
        documentIds: docIds,
        storagePathsRemoved: storagePaths,
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

