import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

interface GenerateSignedICARequest {
  driverId: string;
  signatureImageUrl: string; // Base64 or storage URL
  driverName?: string;
  driverEmail?: string;
  signedAt?: string;
}

function generateICAHTML(data: GenerateSignedICARequest): string {
  const signatureImgTag = data.signatureImageUrl.includes('data:') 
    ? `<img src="${data.signatureImageUrl}" style="max-width: 300px; border-bottom: 2px solid black; display: block; margin-top: 40px;" />`
    : `<img src="${data.signatureImageUrl}" style="max-width: 300px; border-bottom: 2px solid black; display: block; margin-top: 40px;" />`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Crave'n Inc. Feeder Independent Contractor Agreement</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #ff7a00; padding-bottom: 20px; }
    .title { color: #ff7a00; font-size: 24px; margin: 0; }
    .subtitle { font-size: 18px; margin: 10px 0; }
    .effective-date { color: #666; font-size: 14px; }
    .section { margin: 30px 0; }
    h2 { color: #262626; font-size: 18px; margin-top: 25px; margin-bottom: 15px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; }
    p { margin: 12px 0; font-size: 14px; }
    .signature-section { margin-top: 60px; padding-top: 30px; border-top: 2px solid #000; }
    .signature-line { border-bottom: 2px solid black; width: 300px; margin-top: 10px; }
    .contact-info { background: #f0f9ff; padding: 20px; border-radius: 8px; border: 1px solid #91d5ff; margin-top: 40px; }
    .footer { text-align: center; margin-top: 60px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">CRAVE'N INC.</h1>
    <p class="subtitle">Feeder Independent Contractor Agreement & Terms Addendum</p>
    <p class="effective-date">Effective: October 29, 2025</p>
  </div>

  <div class="section">
    <h2>1. Introduction</h2>
    <p>This Crave'n Feeder Independent Contractor Agreement & Terms Addendum ("Agreement") is entered
    into between Crave'n Inc. ("Crave'n") and the individual applying to perform delivery services ("Feeder").
    By accepting this Agreement electronically, Feeder agrees to the terms contained herein. This Agreement
    is incorporated into the Crave'n Terms of Service and Privacy Policy.</p>
  </div>

  <div class="section">
    <h2>2. Independent Contractor Status</h2>
    <p>Feeders operate as independent contractors, not employees or agents of Crave'n. Feeders determine their
    own schedules and methods of delivery. Nothing in this Agreement creates an employment, partnership,
    or joint-venture relationship. Feeders are responsible for: (a) providing and maintaining their own vehicles
    and equipment; (b) paying all taxes, insurance, fuel, and expenses; and (c) complying with all laws.</p>
  </div>

  <div class="section">
    <h2>3. Eligibility</h2>
    <p>Feeders must: (a) be at least 18 years old; (b) hold a valid driver's license and maintain insurance and
    registration; (c) pass a background check and motor vehicle record review; and (d) maintain an active
    Crave'n Feeder App account.</p>
  </div>

  <div class="section">
    <h2>4. Compensation</h2>
    <p>Feeders are compensated per completed delivery according to Crave'n's pay model, which may include
    base pay, customer tips, promotions, bonuses, and incentives. All payments are made through approved
    third-party payment processors. Crave'n is not responsible for transfer delays caused by external
    processors or incorrect payout details.</p>
  </div>

  <div class="section">
    <h2>5. Taxes</h2>
    <p>Feeders are solely responsible for reporting and paying applicable income and self-employment taxes.
    Crave'n may issue an IRS Form 1099 as required by law.</p>
  </div>

  <div class="section">
    <h2>6. Conduct & Standards</h2>
    <p>Feeders must perform deliveries safely and professionally, follow all traffic laws, and treat customers and
    merchants with respect. Repeated complaints, unsafe behavior, or fraud may result in account
    deactivation.</p>
  </div>

  <div class="section">
    <h2>7. Insurance & Liability</h2>
    <p>Feeders must maintain required vehicle insurance. Crave'n assumes no liability for damages, accidents, or
    injuries occurring during deliveries.</p>
  </div>

  <div class="section">
    <h2>8. Dispute Resolution</h2>
    <p>Any disputes arising from this Agreement shall be resolved through binding arbitration administered by the
    American Arbitration Association (AAA) in Toledo, Ohio, under applicable rules. Class actions are waived.</p>
  </div>

  <div class="section">
    <h2>9. Termination</h2>
    <p>Either party may terminate this Agreement at any time. Outstanding payments will be made in the next
    payout cycle.</p>
  </div>

  <div class="section signature-section">
    <h2>10. Acknowledgment & Signature (Digital)</h2>
    <p>By selecting "I Agree", Feeder confirms they understand and accept this Agreement.</p>
    
    <div style="margin-top: 50px;">
      <p><strong>Driver Signature:</strong></p>
      ${signatureImgTag}
      <p style="margin-top: 10px;"><strong>${data.driverName || 'Driver Name'}</strong></p>
      ${data.signedAt ? `<p style="font-size: 12px; color: #666;">Signed: ${new Date(data.signedAt).toLocaleString()}</p>` : ''}
    </div>

    <div style="margin-top: 40px;">
      <p><strong>Company Representative Signature:</strong></p>
      <div class="signature-line" style="height: 40px;"></div>
      <p style="margin-top: 10px;"><strong>Crave'n Inc.</strong></p>
      <p style="font-size: 12px; color: #666;">${new Date().toLocaleDateString()}</p>
    </div>
  </div>

  <div class="contact-info">
    <h3 style="margin: 0 0 10px 0; color: #1890ff;">Contact</h3>
    <p style="margin: 5px 0;"><strong>Crave'n Inc.</strong></p>
    <p style="margin: 5px 0;">1121 W Sylvania Ave., Toledo, OH 43612</p>
    <p style="margin: 5px 0;">Email: support@cravenusa.com</p>
    <p style="margin: 5px 0;">Phone: 216-435-0821</p>
  </div>

  <div class="footer">
    <p>© 2025 Crave'n Inc. All Rights Reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: GenerateSignedICARequest = await req.json();
    
    if (!body.driverId || !body.signatureImageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: driverId, signatureImageUrl" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate ICA HTML with embedded signature
    const htmlContent = generateICAHTML(body);

    // Upload HTML to storage
    const fileName = `ica-signed-${body.driverId}-${Date.now()}.html`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('feeder-documents')
      .upload(fileName, htmlContent, {
        contentType: 'text/html',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload ICA: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('feeder-documents')
      .getPublicUrl(fileName);

    // Update driver_signatures table with signed ICA URL
    const { error: updateError } = await supabase
      .from('driver_signatures')
      .update({
        signed_ica_url: urlData.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('driver_id', body.driverId)
      .eq('agreement_type', 'ICA');

    if (updateError) {
      console.error('Update error:', updateError);
      // Don't fail - file is uploaded, just couldn't update database
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        icaUrl: urlData.publicUrl,
        fileName 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error generating signed ICA:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

