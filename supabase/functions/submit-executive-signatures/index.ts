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

interface DocumentSignature {
  documentId: string;
  signatureName: string;
  signedAt: string;
  auditData: {
    timestamp: string;
    ipAddress: string;
    userAgent: string;
    documentVersion: string;
  };
}

interface SubmitPayload {
  token: string;
  placedSignatures?: PlacedSignature[]; // Legacy format
  documentSignatures?: DocumentSignature[]; // New format
  typedName: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SubmitPayload = await req.json();
    if (!body.token) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Support both new format (documentSignatures) and legacy format (placedSignatures)
    if (!body.documentSignatures && !body.placedSignatures) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing signatures data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get IP address from request headers
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Use new format if available, otherwise fall back to legacy
    if (body.documentSignatures && body.documentSignatures.length > 0) {
      // New format: typed signatures with audit trail
      // First, find one document with the token to get executive/appointment info
      const { data: sampleDoc, error: sampleError } = await supabase
        .from('executive_documents')
        .select('executive_id, appointment_id, officer_name, role')
        .eq('signature_token', body.token)
        .maybeSingle();

      if (sampleError || !sampleDoc) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired token' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      // Get officer info from appointment if available
      let officerName = sampleDoc.officer_name || body.typedName || '';
      let officerEmail = null;
      
      if (sampleDoc.appointment_id) {
        const { data: appointment } = await supabase
          .from('executive_appointments')
          .select('officer_name, officer_email')
          .eq('id', sampleDoc.appointment_id)
          .maybeSingle();
        
        if (appointment) {
          officerName = appointment.officer_name || officerName;
          officerEmail = appointment.officer_email;
        }
      }

      // Process each document signature
      for (const docSig of body.documentSignatures) {
        // Verify document exists and is linked to the same executive/appointment
        const { data: docData, error: docError } = await supabase
          .from('executive_documents')
          .select('id, executive_id, appointment_id, signature_status')
          .eq('id', docSig.documentId)
          .maybeSingle();

        if (docError || !docData) {
          console.error(`Document ${docSig.documentId} not found:`, docError);
          continue;
        }

        // Verify document belongs to same executive/appointment
        // Check executive_id match if both have it
        if (sampleDoc.executive_id && docData.executive_id) {
          if (docData.executive_id !== sampleDoc.executive_id) {
            console.error(`Document ${docSig.documentId} does not belong to the same executive`);
            continue;
          }
        }
        // Check appointment_id match if both have it
        if (sampleDoc.appointment_id && docData.appointment_id) {
          if (docData.appointment_id !== sampleDoc.appointment_id) {
            console.error(`Document ${docSig.documentId} does not belong to the same appointment`);
            continue;
          }
        }
        // If sample has executive_id but doc doesn't, or vice versa, skip
        if ((sampleDoc.executive_id && !docData.executive_id) || (!sampleDoc.executive_id && docData.executive_id)) {
          console.error(`Document ${docSig.documentId} has mismatched executive_id`);
          continue;
        }
        // If sample has appointment_id but doc doesn't, or vice versa, skip
        if ((sampleDoc.appointment_id && !docData.appointment_id) || (!sampleDoc.appointment_id && docData.appointment_id)) {
          console.error(`Document ${docSig.documentId} has mismatched appointment_id`);
          continue;
        }

        // Update audit data with server-side IP
        const auditData = {
          ...docSig.auditData,
          ipAddress: clientIp,
        };

        const filePath = `exec-signatures/${docSig.documentId}_${body.token}.json`;
        const payload = {
          token: body.token,
          documentId: docSig.documentId,
          typed_name: docSig.signatureName,
          signature_name: docSig.signatureName,
          signed_at: docSig.signedAt,
          audit_trail: auditData,
          officer_name: officerName,
          officer_email: officerEmail,
          signature_method: 'typed_electronic',
          e_sign_compliant: true,
        };

        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

        const { error: uploadError } = await supabase.storage
          .from('craver-documents')
          .upload(filePath, blob, { upsert: true, contentType: 'application/json' });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          // Continue with other documents even if one fails
          continue;
        }

        // Update document signature status
        const { error: updateError } = await supabase
          .from('executive_documents')
          .update({
            signature_status: 'signed',
            signed_at: docSig.signedAt,
            signed_by_user: officerEmail || officerName,
            signature_metadata: {
              method: 'typed_electronic',
              signature_name: docSig.signatureName,
              audit_trail: auditData,
            },
          })
          .eq('id', docSig.documentId);

        if (updateError) {
          console.error(`Error updating document ${docSig.documentId}:`, updateError);
          // Continue with other documents
        }
      }

      return new Response(JSON.stringify({ 
        ok: true, 
        message: 'All documents signed successfully',
        documentsCount: body.documentSignatures.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      // Legacy format: drag-and-drop signatures
      const { data: tokenData, error: tokenError } = await supabase
        .from('executive_documents')
        .select('executive_id, appointment_id, officer_name, role')
        .eq('signature_token', body.token)
        .eq('signature_status', 'pending')
        .maybeSingle();

      if (tokenError || !tokenData) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired token' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      // Get officer info from appointment if available
      let officerName = tokenData.officer_name || body.typedName || '';
      let officerEmail = null;
      
      if (tokenData.appointment_id) {
        const { data: appointment } = await supabase
          .from('executive_appointments')
          .select('officer_name, officer_email')
          .eq('id', tokenData.appointment_id)
          .maybeSingle();
        
        if (appointment) {
          officerName = appointment.officer_name || officerName;
          officerEmail = appointment.officer_email;
        }
      }

      // Group signatures by document
      const signaturesByDoc = (body.placedSignatures || []).reduce((acc, sig) => {
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
          officer_name: officerName,
          officer_email: officerEmail,
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
    }
  } catch (e) {
    console.error('Submit signatures error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
