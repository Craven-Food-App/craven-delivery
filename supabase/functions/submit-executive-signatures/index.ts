import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlacedSignature {
  id: string;
  type: 'signature' | 'initial';
  pageNumber: number;
  xPercent: number;
  yPercent: number;
  dataUrl: string;
  isLocked: boolean;
  placedAt: string;
  documentId: string;
}

interface SubmitPayload {
  token: string;
  placedSignatures: PlacedSignature[];
  typedName: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SubmitPayload = await req.json();
    if (!body.token || !body.placedSignatures) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify token and get document info
    const { data: tokenData, error: tokenError } = await supabase
      .from('executive_documents')
      .select('*, executive_appointments!inner(officer_name, officer_email)')
      .eq('signature_token', body.token)
      .eq('signature_status', 'pending')
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Group signatures by document
    const signaturesByDoc = body.placedSignatures.reduce((acc, sig) => {
      if (!acc[sig.documentId]) {
        acc[sig.documentId] = [];
      }
      acc[sig.documentId].push(sig);
      return acc;
    }, {} as Record<string, PlacedSignature[]>);

    // Save signatures for each document
    for (const [documentId, signatures] of Object.entries(signaturesByDoc)) {
      const filePath = `exec-signatures/${documentId}_${body.token}.json`;
      const payload = {
        token: body.token,
        documentId,
        typed_name: body.typedName,
        placedSignatures: signatures,
        officer_name: tokenData.executive_appointments?.officer_name,
        officer_email: tokenData.executive_appointments?.officer_email,
        signed_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

      const { error: uploadError } = await supabase.storage
        .from('craver-documents')
        .upload(filePath, blob, { upsert: true, contentType: 'application/json' });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      // Update document signature status
      await supabase
        .from('executive_documents')
        .update({
          signature_status: 'signed',
          signed_at: new Date().toISOString(),
          signature_placements: signatures,
        })
        .eq('id', documentId);
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'All documents signed successfully',
      documentsCount: Object.keys(signaturesByDoc).length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('Submit signatures error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
