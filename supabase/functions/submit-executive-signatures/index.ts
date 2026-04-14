import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

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
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

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
      // Find one matching document, but don't require the token to be unique across the packet
      const { data: sampleDocs, error: sampleError } = await supabase
        .from('executive_documents')
        .select('executive_id, appointment_id, officer_name, role')
        .eq('signature_token', body.token)
        .limit(1);

      const sampleDoc = sampleDocs?.[0] ?? null;

      if (sampleError || !sampleDoc) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired token' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      // Get officer info from appointment if available
      let officerName = sampleDoc.officer_name || body.typedName || '';
      let officerEmail = null;
      let signedByUserId: string | null = null;
      
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

      if (sampleDoc.executive_id) {
        const { data: execUser } = await supabase
          .from('exec_users')
          .select('user_id')
          .eq('id', sampleDoc.executive_id)
          .maybeSingle();

        signedByUserId = execUser?.user_id || null;
      }

      const savedDocumentIds: string[] = [];
      const failedDocuments: Array<{ documentId: string; reason: string }> = [];

      // Process each document signature
      for (const docSig of body.documentSignatures) {
        // Verify document exists and is linked to the same executive/appointment
        const { data: docData, error: docError } = await supabase
          .from('executive_documents')
          .select('id, executive_id, appointment_id, signature_status')
          .eq('id', docSig.documentId)
          .maybeSingle();

        if (docError || !docData) {
          const reason = docError?.message || 'Document not found';
          console.error(`Document ${docSig.documentId} not found:`, docError);
          failedDocuments.push({ documentId: docSig.documentId, reason });
          continue;
        }

        // Verify document belongs to same executive/appointment
        if (sampleDoc.executive_id && docData.executive_id && docData.executive_id !== sampleDoc.executive_id) {
          const reason = 'Document does not belong to the same executive';
          console.error(`Document ${docSig.documentId} does not belong to the same executive`);
          failedDocuments.push({ documentId: docSig.documentId, reason });
          continue;
        }

        if (sampleDoc.appointment_id && docData.appointment_id && docData.appointment_id !== sampleDoc.appointment_id) {
          const reason = 'Document does not belong to the same appointment';
          console.error(`Document ${docSig.documentId} does not belong to the same appointment`);
          failedDocuments.push({ documentId: docSig.documentId, reason });
          continue;
        }

        if ((sampleDoc.executive_id && !docData.executive_id) || (!sampleDoc.executive_id && docData.executive_id)) {
          const reason = 'Document has mismatched executive linkage';
          console.error(`Document ${docSig.documentId} has mismatched executive_id`);
          failedDocuments.push({ documentId: docSig.documentId, reason });
          continue;
        }

        if ((sampleDoc.appointment_id && !docData.appointment_id) || (!sampleDoc.appointment_id && docData.appointment_id)) {
          const reason = 'Document has mismatched appointment linkage';
          console.error(`Document ${docSig.documentId} has mismatched appointment_id`);
          failedDocuments.push({ documentId: docSig.documentId, reason });
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
          .from('feeder-documents')
          .upload(filePath, blob, { upsert: true, contentType: 'application/json' });

        if (uploadError) {
          const reason = uploadError.message || 'Failed to store signature audit payload';
          console.error('Storage upload error:', uploadError);
          failedDocuments.push({ documentId: docSig.documentId, reason });
          continue;
        }

        // Update document signature status
        const updatePayload: Record<string, unknown> = {
          signature_status: 'signed',
          signed_at: docSig.signedAt,
          signature_metadata: {
            method: 'typed_electronic',
            signature_name: docSig.signatureName,
            audit_trail: auditData,
            officer_name: officerName,
            officer_email: officerEmail,
          },
        };

        if (signedByUserId) {
          updatePayload.signed_by_user = signedByUserId;
        }

        const { error: updateError } = await supabase
          .from('executive_documents')
          .update(updatePayload)
          .eq('id', docSig.documentId);

        if (updateError) {
          const reason = updateError.message || 'Failed to update document';
          console.error(`Error updating document ${docSig.documentId}:`, updateError);
          failedDocuments.push({ documentId: docSig.documentId, reason });
          continue;
        }

        savedDocumentIds.push(docSig.documentId);
      }

      let appointmentSummary: {
        id: string;
        status: string;
        totalDocuments: number;
        signedDocuments: number;
        allSigned: boolean;
      } | null = null;

      if (sampleDoc.appointment_id) {
        const { data: appointmentDocs, error: appointmentDocsError } = await supabase
          .from('executive_documents')
          .select('signature_status, status')
          .eq('appointment_id', sampleDoc.appointment_id)
          .neq('status', 'generated_for_board_only');

        if (!appointmentDocsError && appointmentDocs) {
          const totalDocuments = appointmentDocs.length;
          const signedDocuments = appointmentDocs.filter((doc) => doc.signature_status === 'signed').length;
          const allSigned = totalDocuments > 0 && signedDocuments === totalDocuments;
          const someSigned = signedDocuments > 0;
          const nextStatus = allSigned
            ? 'READY_FOR_SECRETARY_REVIEW'
            : someSigned
              ? 'partially_signed'
              : 'AWAITING_SIGNATURES';

          const { error: appointmentUpdateError } = await supabase
            .from('executive_appointments')
            .update({
              status: nextStatus,
            })
            .eq('id', sampleDoc.appointment_id);

          if (appointmentUpdateError) {
            console.error('Error updating appointment status after signing:', appointmentUpdateError);
          }

          appointmentSummary = {
            id: sampleDoc.appointment_id,
            status: nextStatus,
            totalDocuments,
            signedDocuments,
            allSigned,
          };
        }
      }

      if (failedDocuments.length > 0) {
        return new Response(JSON.stringify({ 
          ok: false,
          error: `Only ${savedDocumentIds.length} of ${body.documentSignatures.length} documents were saved.`,
          documentsCount: savedDocumentIds.length,
          totalRequested: body.documentSignatures.length,
          failedDocuments,
          appointment: appointmentSummary,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ 
        ok: true, 
        message: 'All documents signed successfully',
        documentsCount: savedDocumentIds.length,
        appointment: appointmentSummary,
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
          .from('feeder-documents')
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
