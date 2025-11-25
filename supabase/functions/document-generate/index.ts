import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { convertLayoutToAnchors, getPdfPageDimensions } from '../_shared/pdfAnchors.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert HTML to PDF using aPDF.io (free service)
async function convertHtmlToPdf(htmlContent: string): Promise<Uint8Array> {
  // Get API key from environment variable (set in Supabase Edge Function secrets)
  const apiKey = Deno.env.get('APDF_API_KEY');
  
  if (!apiKey) {
    throw new Error('APDF_API_KEY not configured. Please set it in Supabase Edge Function secrets.');
  }
  
  try {
    console.log('Converting HTML to PDF using aPDF.io...');
    console.log('HTML content length:', htmlContent.length);
    
    // Ensure HTML has proper structure with inline styles
    const fullHtml = htmlContent.includes('<!DOCTYPE html>') 
      ? htmlContent 
      : `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`;
    
    const response = await fetch('https://apdf.io/api/pdf/file/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        html: fullHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('aPDF.io error:', response.status, errorText);
      throw new Error(`PDF conversion failed: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    if (!json?.file) {
      throw new Error(`aPDF.io did not return a file URL: ${JSON.stringify(json)}`);
    }
    const fileResp = await fetch(json.file);
    if (!fileResp.ok) {
      const t = await fileResp.text();
      throw new Error(`Failed to download generated PDF: ${fileResp.status} - ${t}`);
    }
    const pdfBuffer = await fileResp.arrayBuffer();
    console.log('PDF generated successfully using aPDF.io, size:', pdfBuffer.byteLength, 'bytes');
    return new Uint8Array(pdfBuffer);
  } catch (error) {
    console.error('Error in convertHtmlToPdf:', error);
    throw error;
  }
}

const base64ToUint8Array = (base64: string): Uint8Array => {
  const cleaned = base64.includes(',') ? base64.split(',').pop() ?? '' : base64;
  const binaryString = atob(cleaned);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const normalizeTemplateId = (value: unknown): string | null => {
  if (typeof value === 'string' && UUID_REGEX.test(value)) {
    return value;
  }
  return null;
};

const uuidFromString = async (value: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hash = await crypto.subtle.digest('SHA-1', data);
  const bytes = new Uint8Array(hash.slice(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
};

interface TemplateSignatureField {
  id: string;
  field_type: 'signature' | 'initials' | 'date' | 'text';
  signer_role: string;
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  label?: string | null;
  required?: boolean | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      template_id,
      data,
      officer_name,
      role,
      equity,
      html_content,
      executive_id,
      packet_id,
      signing_stage,
      signing_order,
      depends_on_document_id,
      required_signers,
      signer_roles,
      template_key,
      document_title,
    } = await req.json();
    
    console.log('Generating document:', { template_id, officer_name, role, executive_id });

    const normalizedTemplateId = normalizeTemplateId(template_id);

    if (!html_content || String(html_content).trim().length < 20) {
      console.error('Received empty or too short html_content');
      return new Response(
        JSON.stringify({ ok: false, error: 'Generated HTML content is empty. Cannot create PDF.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('html_content length:', String(html_content).length);
    console.log('html_content preview:', String(html_content).slice(0, 200));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const htmlForPdf = String(html_content);

    let templateIdentifier: string | null = normalizedTemplateId;
    if (!templateIdentifier && template_key) {
      const { data: templateRow } = await supabaseClient
        .from('document_templates')
        .select('id')
        .eq('template_key', template_key)
        .maybeSingle();
      templateIdentifier = templateRow?.id ?? null;
    }

    const { data: signatureFieldsData, error: signatureFieldsError } = templateIdentifier
      ? await supabaseClient
          .from('document_template_signature_fields')
          .select('*')
          .eq('template_id', templateIdentifier)
          .order('page_number')
          .order('created_at', { ascending: true })
      : { data: [], error: null };

    if (signatureFieldsError) {
      throw signatureFieldsError;
    }

    const signatureFields = (signatureFieldsData as TemplateSignatureField[]) ?? [];

    const normalizedSigners = Array.isArray(required_signers)
      ? required_signers.map((signer: string) => String(signer || '').toLowerCase())
      : [];

    // Build signature layout from template fields first
    const signatureLayout: Array<Record<string, any>> =
      signatureFields.length > 0
        ? signatureFields.map((field, index) => ({
            id: field.id || `template_${index}_${Date.now()}`,
            field_type: (field.field_type || 'signature') as TemplateSignatureField['field_type'],
            signer_role: String(field.signer_role || '').trim() || 'officer',
            page_number: Number(field.page_number || 1),
            x_percent: Number(field.x_percent || 0),
            y_percent: Number(field.y_percent || 0),
            width_percent: Number(field.width_percent || 0),
            height_percent: Number(field.height_percent || 0),
            label: field.label || null,
            required: field.required !== false,
            auto_filled: false,
            rendered_value: null,
          }))
        : [];

    // Signature placement will be handled after generation during manual tagging.

    let computedSignerRoles = signer_roles ?? (normalizedSigners.length > 0
      ? Object.fromEntries(normalizedSigners.map((signer) => [signer, false]))
      : null);

    // Generate a unique filename for PDF
    const filename = `executive_docs/${crypto.randomUUID()}.pdf`;

    console.log('Converting HTML to PDF...');
    const pdfBuffer: Uint8Array = await convertHtmlToPdf(htmlForPdf);
    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    
    // Extract PDF page dimensions and convert signature layout to anchors
    let signatureAnchors = null;
    if (signatureLayout.length > 0) {
      try {
        const pageDimensions = await getPdfPageDimensions(pdfBuffer);
        signatureAnchors = convertLayoutToAnchors(signatureLayout as any, pageDimensions);
        console.log('Signature anchors calculated:', Object.keys(signatureAnchors).length, 'anchors');
      } catch (anchorError) {
        console.error('Error calculating signature anchors:', anchorError);
        // Continue without anchors - will fall back to percentage-based positioning
      }
    }

    const requiresSignatureNeeded =
      signatureLayout.some(
        (field) =>
          field.field_type === 'signature' &&
          !['ceo', 'board', 'incorporator'].includes((field.signer_role || '').toLowerCase()),
      ) ||
      normalizedSigners.some((role) => !['ceo', 'board', 'incorporator'].includes(role));

    if (computedSignerRoles && Object.keys(computedSignerRoles).length === 0) {
      computedSignerRoles = null;
    }

    // Upload PDF to storage
    const { data: upload, error: uploadError } = await supabaseClient.storage
      .from('documents')
      .upload(filename, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseClient.storage
      .from('documents')
      .getPublicUrl(filename);

    // Generate signature token if executive_id is provided (for documents requiring signature)
    const resolvedTemplateKey = template_key || (typeof template_id === 'string' ? template_id : null);
    let signatureToken: string | null = null;
    let tokenExpiresAt: Date | null = null;
    
    if (executive_id && requiresSignatureNeeded) {
      // Generate unique token (32 chars)
      signatureToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      // Token expires in 30 days
      tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);
    }

    // Save document record
    const documentInsertPayload: Record<string, any> = {
        template_key: resolvedTemplateKey,
        officer_name: officer_name || document_title || data.full_name || '',
        role: role || data.role || '',
        equity: equity,
        status: 'generated',
        file_url: publicUrl,
        executive_id: executive_id || null,
        signature_token: signatureToken,
        signature_token_expires_at: tokenExpiresAt ? tokenExpiresAt.toISOString() : null,
        signature_status: requiresSignatureNeeded && executive_id ? 'pending' : null,
        packet_id: packet_id || null,
        signing_stage: signing_stage ?? null,
        signing_order: signing_order ?? null,
        depends_on_document_id: depends_on_document_id ?? null,
        required_signers: Array.isArray(required_signers) ? required_signers : null,
        signer_roles: computedSignerRoles,
        signature_field_layout: signatureLayout,
        signature_anchors: signatureAnchors,
    };

    // Ensure type UUID is always generated
    let typeUuid: string;
    if (normalizedTemplateId) {
      typeUuid = normalizedTemplateId;
      console.log('Using normalizedTemplateId for type:', typeUuid);
    } else {
      const sourceForUuid = resolvedTemplateKey || document_title || 'document-template';
      console.log('Generating UUID from source:', sourceForUuid);
      typeUuid = await uuidFromString(sourceForUuid);
      console.log('Generated type UUID:', typeUuid);
    }
    
    if (!typeUuid) {
      console.error('CRITICAL: typeUuid is null/undefined, using fallback');
      typeUuid = await uuidFromString('document-template-fallback');
    }
    
    documentInsertPayload.type = typeUuid;
    console.log('Final documentInsertPayload.type:', documentInsertPayload.type);

    const { data: document, error: dbError } = await supabaseClient
      .from('executive_documents')
      .insert(documentInsertPayload)
      .select()
      .single();

    if (dbError) throw dbError;

    console.log('Document created successfully:', document.id);

    return new Response(
      JSON.stringify({
        ok: true,
        document,
        file_url: publicUrl,
        signature_layout: signatureLayout,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error generating document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
