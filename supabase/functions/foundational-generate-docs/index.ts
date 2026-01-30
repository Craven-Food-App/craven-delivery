import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

// Brand asset URLs for foundational support certificates
const CRAVEN_C_WATERMARK_URL = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/brand-assets/craven-c-new.png';
const CEO_SIGNATURE_URL = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/brand-assets/torrance_stroman_signature.png';

// Reuse the same HTML → PDF conversion helper as document-generate
async function convertHtmlToPdf(htmlContent: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get("APDF_API_KEY");

  if (!apiKey) {
    throw new Error("APDF_API_KEY not configured. Please set it in Supabase Edge Function secrets.");
  }

  const fullHtml = htmlContent.includes("<!DOCTYPE html>")
    ? htmlContent
    : `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111827; }
    h1, h2, h3 { margin: 0 0 12px 0; }
    p { margin: 4px 0; line-height: 1.5; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`;

  const response = await fetch("https://apdf.io/api/pdf/file/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ html: fullHtml }),
  });

  if (!response.ok) {
    const errorText = await response.text();
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
  return new Uint8Array(pdfBuffer);
}

interface Payload {
  contribution_order_id: string;
  equity_issuance_id: string | null;
  contributor_id: string | null;
  contributor_name: string;
  contributor_email: string;
  amount_cents: number;
  shares_issued: number;
  tier_name: string;
  pool_code?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const payload = (await req.json()) as Payload;

    const {
      contribution_order_id,
      equity_issuance_id,
      contributor_id,
      contributor_name,
      contributor_email,
      amount_cents,
      shares_issued,
      tier_name,
      pool_code = "family_micro_equity_pool",
    } = payload;

    const amount_dollars = (amount_cents / 100).toFixed(2);

    // Generate certificate number using existing logic
    const { data: certNumData, error: certErr } = await supabase.rpc("generate_certificate_number");
    if (certErr || !certNumData) {
      console.error("Error generating certificate number:", certErr);
      throw new Error("Failed to generate certificate number");
    }
    const certificateNumber = String(certNumData);

    const issueDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const baseMeta = {
      contribution_order_id,
      equity_issuance_id,
      contributor_id,
      contributor_email,
      contributor_name,
      amount_cents,
      shares_issued,
      tier_name,
      certificate_number: certificateNumber,
      pool_code,
      issue_date: issueDate,
    };

    const docs: Array<{ type: string; title: string; file_url: string }> = [];

    async function generateAndStore(
      type: "contribution_receipt" | "stock_certificate" | "participation_disclosure" | "risk_acknowledgment",
      title: string,
      htmlBody: string,
    ) {
      const pdf = await convertHtmlToPdf(htmlBody);

      const filename = `foundational/${type}/${crypto.randomUUID()}.pdf`;
      const { data: upload, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filename, pdf, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error for", type, uploadError);
        throw uploadError;
      }

      const { data: publicData } = supabase.storage.from("documents").getPublicUrl(filename);
      const fileUrl = publicData.publicUrl;

      const docMeta = { ...baseMeta, document_type: type, document_title: title };

      const { error: insertError } = await supabase.from("foundational_documents").insert({
        contribution_order_id,
        equity_issuance_id,
        contributor_id,
        contributor_email,
        contributor_name,
        document_type: type,
        document_title: title,
        file_url: fileUrl,
        certificate_number: certificateNumber,
        pool_code,
        meta: docMeta,
      });

      if (insertError) {
        console.error("Error inserting foundational_documents row:", insertError);
        throw insertError;
      }

      docs.push({ type, title, file_url: fileUrl });
    }

    // DOCUMENT 1: Contribution Receipt
    const receiptHtml = `
      <h1>Contribution Receipt</h1>
      <p>This acknowledges receipt by <strong>Craven, Inc.</strong>, a Delaware corporation, of the following contribution:</p>
      <p><strong>Contributor:</strong> ${contributor_name}</p>
      <p><strong>Contribution Amount:</strong> $${amount_dollars}</p>
      <p><strong>Date Received:</strong> ${issueDate}</p>
      <p><strong>Payment Reference:</strong> ${contribution_order_id}</p>
      <br />
      <p>This receipt evidences payment only. Equity ownership, if any, is evidenced solely by the Company’s stock ledger and the accompanying Common Stock Issuance Certificate.</p>
      <br />
      <p><strong>Issued by:</strong><br/>Craven, Inc.<br/>Authorized Officer</p>
    `;

    await generateAndStore("contribution_receipt", "Contribution Receipt", receiptHtml);

    // DOCUMENT 2: Common Stock Issuance Certificate
    // Fetch the foundational support certificate template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('html_content')
      .eq('template_key', 'foundational_support_certificate')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new Error(`Foundational support certificate template not found: ${templateError?.message}`);
    }

    // Prepare template data for foundational support certificate
    const currentYear = new Date().getFullYear();
    const contributionAmount = `$${(amount_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const templateData: Record<string, string> = {
      certificate_number: certificateNumber,
      contributor_name: contributor_name,
      contribution_date: issueDate,
      contribution_amount: contributionAmount,
      issue_year: currentYear.toString(),
      seal_year: currentYear.toString(),
      watermark_url: CRAVEN_C_WATERMARK_URL,
      signature_url: CEO_SIGNATURE_URL,
    };

    // Replace placeholders in template
    let certificateHtml = template.html_content;
    Object.keys(templateData).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      certificateHtml = certificateHtml.replace(regex, templateData[key] || '');
    });

    await generateAndStore("stock_certificate", "Foundational Support Certificate", certificateHtml);

    // DOCUMENT 3: Foundational Participation Disclosure
    const disclosureHtml = `
      <h1>Foundational Participation Disclosure</h1>
      <p>This Foundational Participation was made pursuant to an invite-only program established by Craven, Inc.</p>
      <p>Contributions support early formation and operational activities of the Company. Shares issued in connection herewith are non-controlling common stock.</p>
      <p>No valuation is established. No liquidity, dividends, or returns are promised. The Company may issue additional equity in the future, and ownership percentages may be diluted.</p>
      <p>Participation involves substantial risk, including the risk of total loss.</p>
      <p>This disclosure is governed by the laws of the State of Delaware.</p>
    `;

    await generateAndStore("participation_disclosure", "Foundational Participation Disclosure", disclosureHtml);

    // DOCUMENT 4: Risk Acknowledgment & Consent
    const riskHtml = `
      <h1>Risk Acknowledgment & Consent</h1>
      <p>By accepting this issuance, I acknowledge and agree that:</p>
      <ul>
        <li>Craven, Inc. is an early-stage company</li>
        <li>My contribution may be lost entirely</li>
        <li>No guarantee of profit or liquidity exists</li>
        <li>The shares issued are non-controlling and subject to dilution</li>
        <li>This is not a public securities offering</li>
      </ul>
      <p>I am participating voluntarily and have had the opportunity to seek independent advice.</p>
      <br />
      <p><strong>Participant Name:</strong> ${contributor_name}</p>
      <p><strong>Date:</strong> ${issueDate}</p>
      <p><strong>Method:</strong> Digital Acceptance</p>
    `;

    await generateAndStore("risk_acknowledgment", "Risk Acknowledgment & Consent", riskHtml);

    return new Response(
      JSON.stringify({ ok: true, certificate_number: certificateNumber, docs }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error("Error in foundational-generate-docs:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { headers: { ...getCorsHeaders(null), "Content-Type": "application/json" }, status: 500 },
    );
  }
});


