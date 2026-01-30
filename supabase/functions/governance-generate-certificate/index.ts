import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// Brand asset URLs for executive stock certificates
// Update these if you move assets to a different bucket/path.
const CRAVEN_LOGO_URL =
  'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/brand-assets/Craven-LogoV2.png';
const CRAVEN_C_WATERMARK_URL =
  'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/brand-assets/craven-c-new.png';
const CEO_SIGNATURE_URL =
  'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/brand-assets/torrance_stroman_signature.png';

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
  };
}

// Local HTML → PDF helper (mirrors foundational-generate-docs implementation)
async function convertHtmlToPdf(htmlContent: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get('APDF_API_KEY');

  if (!apiKey) {
    throw new Error(
      'APDF_API_KEY not configured. Please set it in Supabase Edge Function secrets.'
    );
  }

  const fullHtml = htmlContent.includes('<!DOCTYPE html>')
    ? htmlContent
    : `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>${htmlContent}</body>
</html>`;

  const response = await fetch('https://apdf.io/api/pdf/file/create', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ html: fullHtml }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `PDF conversion failed: ${response.status} - ${errorText}`
    );
  }

  const json = await response.json();
  if (!json?.file) {
    throw new Error(
      `aPDF.io did not return a file URL: ${JSON.stringify(json)}`
    );
  }

  const fileResp = await fetch(json.file);
  if (!fileResp.ok) {
    const t = await fileResp.text();
    throw new Error(
      `Failed to download generated PDF: ${fileResp.status} - ${t}`
    );
  }

  const pdfBuffer = await fileResp.arrayBuffer();
  return new Uint8Array(pdfBuffer);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const {
      recipient_user_id,
      shares_amount,
      share_class = 'Common',
      resolution_id,
      appointment_id,
      certificate_id, // Optional: if updating existing certificate
      certificate_number, // Optional: if updating existing certificate
    } = body;

    if (!recipient_user_id || !shares_amount) {
      return new Response(
        JSON.stringify({ error: 'Missing recipient_user_id or shares_amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipient info
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(recipient_user_id);
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', recipient_user_id)
      .maybeSingle();

    const recipientName = profile?.full_name || user?.email?.split('@')[0] || 'Shareholder';

    // Get company info
    const { data: companySettings } = await supabaseAdmin
      .from('company_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['company_name', 'state_of_incorporation']);

    const companyName = companySettings?.find(s => s.setting_key === 'company_name')?.setting_value || 'Crave\'n, Inc.';
    const state = companySettings?.find(s => s.setting_key === 'state_of_incorporation')?.setting_value || 'Delaware';

    // Generate certificate number with retry logic for uniqueness.
    // If certificate_id + certificate_number are provided, reuse the existing
    // certificate_number so that regenerated documents keep the same ID.
    let certNumber: string;

    if (certificate_id && certificate_number) {
      certNumber = certificate_number as string;
    } else {
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const { data: certNumData, error: certNumError } = await supabaseAdmin.rpc('generate_certificate_number');
        
        if (certNumError || !certNumData) {
          // Fallback: generate manually
          const year = new Date().getFullYear();
          const { data: existingCerts } = await supabaseAdmin
            .from('share_certificates')
            .select('certificate_number')
            .like('certificate_number', `CERT-${year}-%`);
          
          // Find the highest number for this year
          let maxNum = 0;
          if (existingCerts && existingCerts.length > 0) {
            existingCerts.forEach(cert => {
              const match = cert.certificate_number.match(new RegExp(`^CERT-${year}-(\\d+)$`));
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
              }
            });
          }
          
          certNumber = `CERT-${year}-${String(maxNum + 1).padStart(6, '0')}`;
        } else {
          certNumber = certNumData as string;
        }
        
        // Check if this certificate number already exists
        const { data: existing } = await supabaseAdmin
          .from('share_certificates')
          .select('id')
          .eq('certificate_number', certNumber)
          .maybeSingle();
        
        if (!existing) {
          // Number is unique, break out of loop
          break;
        }
        
        // Number exists, try again (shouldn't happen with fixed function, but safety check)
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Failed to generate unique certificate number after multiple attempts');
        }
        
        // Add a small delay to avoid race conditions
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Get appointment details if available
    let appointmentData: any = {};
    if (appointment_id) {
      const { data: appointment } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('id', appointment_id)
        .maybeSingle();
      appointmentData = appointment || {};
    }

    // Get resolution details if available
    let resolutionData: any = {};
    if (resolution_id) {
      const { data: resolution } = await supabaseAdmin
        .from('governance_board_resolutions')
        .select('*')
        .eq('id', resolution_id)
        .maybeSingle();
      resolutionData = resolution || {};
    }

    // Get stock certificate template
    const { data: template } = await supabaseAdmin
      .from('document_templates')
      .select('html_content')
      .eq('template_key', 'stock_certificate')
      .eq('is_active', true)
      .single();

    if (!template) {
      return new Response(
        JSON.stringify({ error: 'Stock certificate template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare template data
    const currentYear = new Date().getFullYear();
    const templateData: Record<string, any> = {
      certificate_number: certNumber,
      shareholder_name: recipientName,
      shares_amount: shares_amount.toLocaleString(),
      share_class: share_class,
      company_name: companyName,
      state: state,
      issue_date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      issue_year: currentYear.toString(),
      seal_year: currentYear.toString(),
      effective_date: appointmentData.effective_date || new Date().toISOString().split('T')[0],
      resolution_number: resolutionData.resolution_number || 'N/A',
      resolution_date: resolutionData.meeting_date || new Date().toISOString().split('T')[0],
      logo_url: CRAVEN_LOGO_URL,
      watermark_url: CRAVEN_C_WATERMARK_URL,
      signature_url: CEO_SIGNATURE_URL,
    };

    // Interpolate template to HTML
    let html = template.html_content;
    Object.keys(templateData).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      html = html.replace(regex, String(templateData[key] || ''));
    });

    // Convert HTML → PDF
    const pdfBytes = await convertHtmlToPdf(html);

    // Upload PDF to storage
    const bucket = 'governance-certificates';
    const fileName = `certificates/${certNumber}_${Date.now()}.pdf`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);

    // Create or update certificate record
    let certificate: any;
    
    if (certificate_id) {
      // Update existing certificate (just add the document)
      const { data: updatedCert, error: updateError } = await supabaseAdmin
        .from('share_certificates')
        .update({
          document_url: urlData?.publicUrl || '',
          html_template: html,
          updated_at: new Date().toISOString(),
        })
        .eq('id', certificate_id)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      certificate = updatedCert;
      certNumber = certificate.certificate_number; // Use existing number
    } else {
      // Create new certificate with retry logic for duplicate numbers
      let insertAttempts = 0;
      const maxInsertAttempts = 5;
      
      while (insertAttempts < maxInsertAttempts) {
        const { data: newCert, error: certError } = await supabaseAdmin
          .from('share_certificates')
          .insert({
            certificate_number: certNumber,
            recipient_user_id,
            shares_amount,
            share_class,
            issue_date: new Date().toISOString().split('T')[0],
            resolution_id,
            appointment_id,
            document_url: urlData?.publicUrl || '',
            html_template: html,
            status: 'issued',
          })
          .select()
          .single();

        if (certError) {
          // If duplicate key error, generate a new number and retry
          if (certError.code === '23505' && certError.message?.includes('certificate_number')) {
            insertAttempts++;
            if (insertAttempts >= maxInsertAttempts) {
              throw new Error('Failed to generate unique certificate number after multiple attempts');
            }
            
            // Generate a new certificate number
            const { data: newCertNum } = await supabaseAdmin.rpc('generate_certificate_number');
            if (!newCertNum) {
              throw new Error('Failed to generate new certificate number');
            }
            
            certNumber = newCertNum as string;
            
            // Update the template data with new number
            templateData.certificate_number = certNumber;
            
            // Re-interpolate template with new number
            html = template.html_content;
            Object.keys(templateData).forEach(key => {
              const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
              html = html.replace(regex, String(templateData[key] || ''));
            });
            
            // Re-convert to PDF with new number
            const newPdfBytes = await convertHtmlToPdf(html);
            
            // Re-upload PDF with new number
            const newFileName = `certificates/${certNumber}_${Date.now()}.pdf`;
            const { error: newUploadError } = await supabaseAdmin.storage
              .from(bucket)
              .upload(newFileName, newPdfBytes, {
                contentType: 'application/pdf',
                upsert: false,
              });
            
            if (newUploadError) {
              throw newUploadError;
            }
            
            const { data: newUrlData } = supabaseAdmin.storage
              .from(bucket)
              .getPublicUrl(newFileName);
            
            // Update urlData for next iteration
            if (newUrlData) {
              urlData.publicUrl = newUrlData.publicUrl;
            }
            
            continue; // Retry insert with new number
          } else {
            throw certError;
          }
        } else {
          certificate = newCert;
          break; // Success, exit loop
        }
      }
    }

    // Log the action
    await supabaseAdmin.rpc('log_governance_action', {
      p_action_type: 'certificate_issued',
      p_action_category: 'equity',
      p_target_type: 'certificate',
      p_target_id: certificate.id,
      p_target_name: `Certificate ${certNumber}`,
      p_description: `Share certificate issued: ${certNumber} for ${shares_amount} shares`,
      p_metadata: {
        certificate_number: certNumber,
        shares_amount,
        recipient_user_id,
        resolution_id,
        appointment_id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        certificate_id: certificate.id,
        certificate_number: certNumber,
        document_url: urlData?.publicUrl || '',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in governance-generate-certificate:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

