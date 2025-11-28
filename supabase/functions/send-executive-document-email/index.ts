import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const escapeHtml = (input: string = '') =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

interface ExecutiveDocumentEmailRequest {
  to: string;
  executiveName: string;
  documentTitle: string;
  documentUrl?: string;
  pdfBase64?: string;
  htmlContent?: string;
  documents?: Array<{ title: string; url: string; id?: string }>; // multiple docs support
  executiveId?: string; // Optional: to help find documents
  temporaryPassword?: string; // Optional: temporary password if user was just created
  userCreated?: boolean; // Optional: whether user was just created
}

// Convert HTML to PDF using aPDF.io for legacy .html documents
async function convertHtmlToPdf(htmlContent: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get('APDF_API_KEY');
  if (!apiKey) throw new Error('APDF_API_KEY not configured.');

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

  const resp = await fetch('https://apdf.io/api/pdf/file/create', {
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

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`aPDF convert failed: ${resp.status} ${errorText}`);
  }
  const json = await resp.json();
  if (!json?.file) {
    throw new Error(`aPDF.io did not return a file URL: ${JSON.stringify(json)}`);
  }
  const fileResp = await fetch(json.file);
  if (!fileResp.ok) {
    const t = await fileResp.text();
    throw new Error(`Failed to download generated PDF: ${fileResp.status} - ${t}`);
  }
  const buf = await fileResp.arrayBuffer();
  return new Uint8Array(buf);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, executiveName, documentTitle, documentUrl, pdfBase64, htmlContent, documents, executiveId, temporaryPassword, userCreated }: ExecutiveDocumentEmailRequest = await req.json();

    if (!to || !executiveName || !documentTitle) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, executiveName, documentTitle" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Allow sending email even if documents array is empty (for error notifications)
    if (documents && documents.length === 0 && !documentUrl && !pdfBase64 && !htmlContent) {
      console.warn('No documents provided, but sending email anyway for notification purposes');
    }

    console.log(`Sending ${documentTitle} to ${executiveName} at ${to}`);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'N HR <hr@craven.com>";

    // Prepare attachments and links
    let attachments: Array<{ filename: string; content: string; type?: string }> = [];
    let linksHtml = '';

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch email template from database
    // Priority: 1) c_suite_executive_appointment (default for appointments), 2) executive_onboarding_packet, 3) fallback
    let emailTemplate: { subject: string; html_content: string } | null = null;
    try {
      // First try: C-Suite Executive Appointment template (default for appointments)
      const { data: cSuiteTemplate } = await supabaseClient
        .from('email_templates')
        .select('subject, html_content')
        .eq('template_key', 'c_suite_executive_appointment')
        .eq('is_active', true)
        .single();
      
      if (cSuiteTemplate) {
        emailTemplate = cSuiteTemplate;
        console.log('Using C-Suite Executive Appointment email template');
      } else {
        // Second try: get from template_usage
        const { data: usage } = await supabaseClient
          .from('template_usage')
          .select('template_id')
          .eq('template_type', 'email')
          .eq('usage_context', 'executive_appointment')
          .eq('is_default', true)
          .single();

        if (usage?.template_id) {
          const { data: template } = await supabaseClient
            .from('email_templates')
            .select('subject, html_content')
            .eq('id', usage.template_id)
            .eq('is_active', true)
            .single();
          
          if (template) {
            emailTemplate = template;
            console.log('Using template from template_usage');
          }
        }
        
        // Third try: executive_onboarding_packet (legacy fallback)
        if (!emailTemplate) {
          const { data: template } = await supabaseClient
            .from('email_templates')
            .select('subject, html_content')
            .eq('template_key', 'executive_onboarding_packet')
            .eq('is_active', true)
            .single();
          
          if (template) {
            emailTemplate = template;
            console.log('Using executive_onboarding_packet template (fallback)');
          }
        }
      }
    } catch (error) {
      console.warn('Could not fetch email template from database, using fallback:', error);
    }

    if (documents && documents.length > 0) {
      console.log(`Preparing ${documents.length} documents for email...`);
      const itemsHtml: string[] = [];
      let successfulAttachments = 0;

      for (const doc of documents) {
        try {
          // Always add link, even if attachment fails
          const safeTitle = escapeHtml(doc.title);
          itemsHtml.push(`<li style="margin: 6px 0;"><a href="${doc.url}" style="color: #ff7a45; text-decoration: none;">${safeTitle}</a></li>`);

          // Parse storage URL to bucket/path (supports public and signed URLs)
          const parts = doc.url.split('/storage/v1/object/');
          if (parts.length === 2) {
            const rest = parts[1]; // e.g. "public/bucket/path" or "sign/bucket/path?..."
            const restParts = rest.split('/');
            // restParts[0] is 'public' or 'sign'
            const bucket = restParts[1];
            const pathWithQuery = restParts.slice(2).join('/');
            const path = pathWithQuery.split('?')[0];

            const { data: fileData, error: downloadError } = await supabaseClient.storage
              .from(bucket)
              .download(path);
            if (downloadError) {
              console.warn(`Failed to download ${doc.title} from storage:`, downloadError);
              continue; // Skip this attachment but keep the link
            }

            const lowerPath = path.toLowerCase();
            let pdfBytes: Uint8Array | null = null;

            if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) {
              // Legacy HTML document: convert to PDF on the fly
              const html = await fileData.text();
              try {
                pdfBytes = await convertHtmlToPdf(html);
              } catch (convErr) {
                console.error('HTML->PDF conversion failed for', path, convErr);
                pdfBytes = null;
              }
            } else if (lowerPath.endsWith('.pdf')) {
              const arrayBuffer = await fileData.arrayBuffer();
              pdfBytes = new Uint8Array(arrayBuffer);
            } else {
              // Unknown type, attempt to attach as-is but label as PDF
              const arrayBuffer = await fileData.arrayBuffer();
              pdfBytes = new Uint8Array(arrayBuffer);
            }

            if (pdfBytes && pdfBytes.length > 0) {
              const base64 = base64Encode(pdfBytes.buffer);
              attachments.push({
                filename: `${doc.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
                content: base64,
                type: "application/pdf",
              });
              successfulAttachments++;
              console.log(`✓ Successfully attached ${doc.title} (${pdfBytes.length} bytes)`);
            } else {
              console.warn('Skipping attachment due to empty bytes for', doc.title);
            }
          } else {
            console.warn('Unrecognized storage URL format, skipping attachment for', doc.url);
          }
        } catch (err) {
          console.error('Failed to attach document:', doc.title, err);
          // continue without attachment, link will still be present
        }
      }

      if (itemsHtml.length > 0) {
        linksHtml = `
          <div style="background-color: #f9f9f9; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px;">Included Documents</h3>
            <ul style="margin: 0; padding-left: 18px; color: #4a4a4a; font-size: 14px; line-height: 1.6;">${itemsHtml.join('')}</ul>
            ${successfulAttachments > 0 ? `<p style="margin: 10px 0 0 0; color: #2e7d32; font-size: 13px;">✓ ${successfulAttachments} PDF attachment(s) included</p>` : ''}
          </div>
        `;
      }
    } else if (pdfBase64) {
      // If we have a base64 PDF, attach it
      attachments = [{
        filename: `${documentTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        content: pdfBase64,
        type: "application/pdf",
      }];
      console.log(`Attaching PDF: ${documentTitle}`);
    } else if (documentUrl) {
      // Try to fetch PDF from Supabase storage
      try {
        console.log(`Fetching PDF from storage URL: ${documentUrl}`);
        // Extract the path from the public URL
        const urlParts = documentUrl.split('/storage/v1/object/public/');
        if (urlParts.length === 2) {
          const pathParts = urlParts[1].split('/');
          const bucket = pathParts[0];
          const path = pathParts.slice(1).join('/');
          // Download the file from storage
          const { data: fileData, error: downloadError } = await supabaseClient.storage
            .from(bucket)
            .download(path);
          if (downloadError) throw downloadError;
          if (fileData) {
            // Convert Blob to ArrayBuffer to base64
            const arrayBuffer = await fileData.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            attachments = [{
              filename: `${documentTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`,
              content: base64,
              type: "application/pdf",
            }];
            console.log(`Successfully downloaded PDF from storage, size: ${arrayBuffer.byteLength} bytes`);
          }
        } else {
          console.error('Could not parse storage URL:', documentUrl);
        }
      } catch (fetchError) {
        console.error("Failed to fetch PDF from storage:", fetchError);
      }
    }

    // Build dynamic content sections
    let dynamicContent = '';
    
    if (documents && documents.length > 0) {
      dynamicContent += linksHtml;
      if (attachments.length > 0) {
        dynamicContent += `
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #2e7d32; font-size: 16px; font-weight: bold;">✅ PDF Attachments Included</p>
          <p style="margin: 8px 0 0 0; color: #4a4a4a; font-size: 14px;">All documents are attached as PDFs.</p>
        </div>
        `;
      }
    } else if (attachments.length > 0) {
      dynamicContent = `
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 6px; margin: 30px 0; text-align: center;">
          <p style="margin: 0; color: #2e7d32; font-size: 16px; font-weight: bold;">
            ✅ PDF Document Attached
          </p>
          <p style="margin: 10px 0 0 0; color: #4a4a4a; font-size: 14px;">
            Please see the attached PDF file
          </p>
        </div>
      `;
    } else if (documentUrl) {
      dynamicContent = `
        <div style="text-align: center; margin: 40px 0 30px 0;">
          <a href="${documentUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #ff7a45 0%, #ff8c00 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(255, 122, 69, 0.3);">
            View Document
          </a>
        </div>
      `;
    }

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const companyWebsiteUrl = Deno.env.get('COMPANY_WEBSITE_URL') || 'https://cravenusa.com';
    const currentYear = String(new Date().getFullYear());
    
    // Fetch signature tokens for documents
    let signatureToken: string | null = null;
    const hasDocuments = documents && documents.length > 0;
    const hasExecutiveId = executiveId && typeof executiveId === 'string' && executiveId.length > 0;
    
    if (hasDocuments || hasExecutiveId) {
      try {
        console.log(`Fetching signature token for executiveId: ${executiveId || 'none'}, documents count: ${documents?.length || 0}`);
        
        // First try: Search by executive_id (most reliable)
        if (hasExecutiveId && executiveId) {
          const { data: execDocs, error: execError } = await supabaseClient
            .from('executive_documents')
            .select('signature_token, file_url, id, created_at')
            .eq('executive_id', executiveId)
            .not('signature_token', 'is', null)
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (execError) {
            console.warn('Error fetching by executive_id:', execError);
          } else if (execDocs && execDocs.length > 0) {
            // Use the most recent document's token
            signatureToken = execDocs[0].signature_token;
            console.log(`Found token via executive_id: ${signatureToken ? 'Yes' : 'No'}`);
          }
        }
        
        // Second try: Search by file_url if no token found yet
        if (!signatureToken && documents && documents.length > 0) {
          const docUrls = documents.map(d => d.url);
          console.log(`Trying to find tokens by file_url, checking ${docUrls.length} URLs`);
          
          // Try exact match first
          for (const url of docUrls) {
            const { data: urlDocs, error: urlError } = await supabaseClient
              .from('executive_documents')
              .select('signature_token, file_url')
              .eq('file_url', url)
              .not('signature_token', 'is', null)
              .limit(1);
            
            if (!urlError && urlDocs && urlDocs.length > 0 && urlDocs[0].signature_token) {
              signatureToken = urlDocs[0].signature_token;
              console.log(`Found token via file_url match: ${signatureToken ? 'Yes' : 'No'}`);
              break;
            }
          }
          
          // If still no token, try partial URL match (in case URLs differ slightly)
          if (!signatureToken) {
            for (const url of docUrls) {
              // Extract filename from URL
              const urlParts = url.split('/');
              const filename = urlParts[urlParts.length - 1].split('?')[0];
              
              if (filename) {
                const { data: partialDocs, error: partialError } = await supabaseClient
                  .from('executive_documents')
                  .select('signature_token, file_url')
                  .like('file_url', `%${filename}%`)
                  .not('signature_token', 'is', null)
                  .limit(1);
                
                if (!partialError && partialDocs && partialDocs.length > 0 && partialDocs[0].signature_token) {
                  signatureToken = partialDocs[0].signature_token;
                  console.log(`Found token via partial URL match: ${signatureToken ? 'Yes' : 'No'}`);
                  break;
                }
              }
            }
          }
        }
        
        if (signatureToken) {
          console.log(`✓ Successfully found signature token: ${signatureToken.substring(0, 10)}...`);
        } else {
          console.warn('⚠ No signature token found for documents');
        }
      } catch (tokenError) {
        console.error('Failed to fetch signature token:', tokenError);
        // Continue without token - template might not need it
      }
    }
    
    // Signing portal URL - points to the executive document signing route
    // Include token if available
    const portalUrl = signatureToken 
      ? `${companyWebsiteUrl}/executive/sign?token=${signatureToken}`
      : `${companyWebsiteUrl}/executive/sign`;

    const safeDocumentTitle = escapeHtml(documentTitle);
    const safeExecutiveName = escapeHtml(executiveName);

    if (!emailTemplate) {
      throw new Error("No active email template configured for executive onboarding packet emails.");
    }

    let emailSubject = emailTemplate.subject;
    let emailHtmlContent = emailTemplate.html_content;

    const safeDocuments = (documents ?? []).filter((doc) => doc && doc.title && doc.url);
    emailHtmlContent = emailHtmlContent.replace(/{{#documents}}([\s\S]*?){{\/documents}}/g, (_match, block) => {
      if (safeDocuments.length === 0) {
        return '<tr><td colspan="2" style="padding:15px 10px;color:#6b7280;text-align:center;">Documents are available in the secure signing portal.</td></tr>';
      }
      return safeDocuments
        .map((doc) =>
          block
            .replace(/{{title}}/g, escapeHtml(doc.title))
            .replace(/{{preview_url}}/g, doc.url)
        )
        .join('');
    });

    const subjectReplacements: Record<string, string> = {
      '{{documentTitle}}': documentTitle,
      '{{executiveName}}': executiveName,
      '{{executive_name}}': executiveName,
      '{{date}}': dateStr,
      '{{currentYear}}': currentYear,
      '{{current_year}}': currentYear,
    };

    // Build login credentials section if user was just created
    let loginCredentialsHtml = '';
    if (userCreated && temporaryPassword) {
      loginCredentialsHtml = `
<div style="background-color: #fff5ec; border-left: 4px solid #ff6b00; padding: 20px; margin: 30px 0; border-radius: 6px;">
  <h3 style="margin: 0 0 15px 0; color: #ff6b00; font-size: 18px;">🔐 Your Account Has Been Created</h3>
  <p style="margin: 0 0 15px 0; color: #4a4a4a; font-size: 15px; line-height: 1.6;">
    Your executive portal account has been set up. Use these credentials to log in:
  </p>
  <div style="background-color: #ffffff; padding: 15px; border-radius: 4px; margin: 15px 0;">
    <p style="margin: 5px 0; color: #1a1a1a; font-size: 14px;"><strong>Email:</strong> ${escapeHtml(to)}</p>
    <p style="margin: 5px 0; color: #1a1a1a; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background-color: #f5f5f5; padding: 4px 8px; border-radius: 3px; font-family: monospace;">${escapeHtml(temporaryPassword)}</code></p>
  </div>
  <p style="margin: 15px 0 0 0; color: #ff6b00; font-size: 14px; font-weight: bold;">
    ⚠️ Important: Please change your password after your first login for security.
  </p>
</div>`;
    }

    const htmlReplacements: Record<string, string> = {
      '{{documentTitle}}': safeDocumentTitle,
      '{{executiveName}}': safeExecutiveName,
      '{{executive_name}}': safeExecutiveName,
      '{{date}}': dateStr,
      '{{currentYear}}': currentYear,
      '{{current_year}}': currentYear,
      '{{portalUrl}}': portalUrl,
      '{{signing_portal_url}}': portalUrl,
      '{{signature_token}}': signatureToken || '',
      '{{company_website_url}}': companyWebsiteUrl,
      '{{dynamicContent}}': dynamicContent,
      '{{linksHtml}}': linksHtml,
      '{{loginCredentials}}': loginCredentialsHtml,
      '{{temporaryPassword}}': temporaryPassword ? escapeHtml(temporaryPassword) : '',
      '{{userEmail}}': escapeHtml(to),
    };

    const applyReplacements = (input: string, replacements: Record<string, string>) =>
      Object.entries(replacements).reduce((acc, [token, value]) => acc.split(token).join(value), input);

    emailSubject = applyReplacements(emailSubject, subjectReplacements);
    let emailHtml = applyReplacements(emailHtmlContent, htmlReplacements);
    
    // If user was just created and we have a temp password, inject login credentials section
    // This will be inserted before the "If You Don't Have an Account Yet" section
    if (userCreated && temporaryPassword) {
      const loginSection = loginCredentialsHtml;
      // Try to insert before "If You Don't Have an Account Yet" section
      const accountSectionRegex = /(### If You Don't Have an Account Yet[\s\S]*?)(?=---|##|$)/;
      if (accountSectionRegex.test(emailHtml)) {
        emailHtml = emailHtml.replace(
          accountSectionRegex,
          `${loginSection}\n\n$1`
        );
      } else {
        // If section not found, prepend to the email content after opening
        emailHtml = emailHtml.replace(
          /(<body[^>]*>)/,
          `$1\n${loginSection}`
        );
      }
    }
    
    // Fallback: Replace any hardcoded app.cravenusa.com URLs with the correct signing portal URL
    // This handles cases where the template has hardcoded URLs instead of placeholders
    // Match various URL formats: http://app.cravenusa.com, https://app.cravenusa.com, app.cravenusa.com
    const appCravenUrlPatterns = [
      // Full URLs with protocol
      /https?:\/\/app\.cravenusa\.com(\/[^\s"'>]*)?/gi,
      // URLs in href attributes
      /(href=["'])(https?:\/\/)?app\.cravenusa\.com(\/[^\s"']*)?(["'])/gi,
      // URLs in src attributes
      /(src=["'])(https?:\/\/)?app\.cravenusa\.com(\/[^\s"']*)?(["'])/gi,
      // Plain text URLs (without quotes)
      /\bapp\.cravenusa\.com(\/[^\s"'>]*)?/gi,
    ];
    
    // Replace all variations
    emailHtml = emailHtml.replace(/https?:\/\/app\.cravenusa\.com(\/[^\s"'>]*)?/gi, portalUrl);
    emailHtml = emailHtml.replace(/(href=["'])(https?:\/\/)?app\.cravenusa\.com(\/[^\s"']*)?(["'])/gi, `$1${portalUrl}$4`);
    emailHtml = emailHtml.replace(/(src=["'])(https?:\/\/)?app\.cravenusa\.com(\/[^\s"']*)?(["'])/gi, `$1${portalUrl}$4`);
    emailHtml = emailHtml.replace(/\bapp\.cravenusa\.com(\/[^\s"'>]*)?/gi, portalUrl.replace('https://', '').replace('http://', ''));
    
    // Log if we found and replaced any URLs (for debugging)
    if (emailHtmlContent.includes('app.cravenusa.com')) {
      console.log(`Found hardcoded app.cravenusa.com URLs in template, replacing with: ${portalUrl}`);
    }

    console.log('Using email template from database');

    // Add README file with signing instructions
    const readmeContent = `# Executive Document Signing Instructions

## Welcome to Your Executive Appointment Signing Portal

This guide will walk you through the process of accessing and signing your executive appointment documents.

---

## 📋 Table of Contents

1. Accessing the Signing Portal
2. Logging In
3. Navigating to Your Documents
4. Reviewing Documents
5. Signing Documents
6. Completing the Process
7. Troubleshooting

---

## 1. Accessing the Signing Portal

### Option A: Direct Link from Email
- Click the "Access Signing Portal" button in your appointment email
- This will take you directly to your signing page

### Option B: Manual Access
1. Navigate to: ${portalUrl}
2. If you have a signature token, it will be included in the link automatically

---

## 2. Logging In

### If You Already Have an Account
1. Enter your email address (the one used for your appointment)
2. Enter your password
3. Click "Sign In"

### If You Don't Have an Account Yet
1. Click "Sign Up" or "Create Account"
2. Enter your email address (must match the email used for your appointment)
3. Create a secure password (minimum 8 characters)
4. Verify your email address by clicking the link sent to your inbox
5. Return to the signing portal and log in

---

## 3. Navigating to Your Documents

Once logged in:
1. Dashboard View: You'll see a list of documents awaiting your signature
2. Document Status: Each document will show its status (Pending, Signed, Expired)
3. Filter Options: Use filters to view only pending documents or sort by date

---

## 4. Reviewing Documents

Before signing, carefully review each document:
- ✅ Your name, title, and role are correct
- ✅ Compensation details are accurate
- ✅ Effective date matches your appointment date
- ✅ All terms and conditions are understood

---

## 5. Signing Documents

### Step-by-Step Signing Process

#### Step 1: Open the Document
- Click on the document you wish to sign
- The document will open in the signing interface

#### Step 2: Locate Signature Fields
- Signature fields are marked with highlighted boxes or tags
- Look for fields labeled with your role (CEO, CFO, CTO, COO, Secretary, etc.)

#### Step 3: Choose Your Signing Method

**Option A: Draw Your Signature**
1. Click the signature field
2. Select "Draw Signature"
3. Use your mouse, trackpad, or touchscreen to draw your signature
4. Click "Save" when satisfied
5. Click "Apply" to place it in the document

**Option B: Type Your Signature**
1. Click the signature field
2. Select "Type Signature"
3. Choose a font style
4. Type your full legal name
5. Click "Apply" to place it in the document

**Option C: Upload Signature Image**
1. Click the signature field
2. Select "Upload Image"
3. Choose a PNG, JPG, or PDF file of your signature
4. Adjust size and position if needed
5. Click "Apply" to place it in the document

#### Step 4: Complete All Required Fields
- Some documents may require initials on specific pages, date fields, or additional information
- Complete all required fields before proceeding

#### Step 5: Review and Submit
1. Review the entire document with your signature(s) in place
2. Ensure all required fields are completed
3. Click "Submit Signature" or "Sign Document"
4. Confirm your submission in the popup dialog

---

## 6. Completing the Process

### After Signing All Documents

1. Confirmation Email: You'll receive an email confirmation for each signed document
2. Document Status: Your dashboard will update to show all documents as "Signed"
3. Final Review: The board/HR team will review all signatures
4. Activation: Once all parties have signed, your appointment will be activated

---

## 7. Troubleshooting

### Common Issues and Solutions

**"I can't log in"**
- Check your email: Ensure you're using the correct email address
- Reset password: Use the "Forgot Password" feature
- Contact support: executive@cravenusa.com

**"I don't see my documents"**
- Check email: Ensure you clicked the correct link from your appointment email
- Refresh page: Try refreshing your browser
- Contact support: We can resend your document links

**"Signature field not appearing"**
- Zoom out: Try zooming out to see the full document
- Scroll: Signature fields may be on different pages
- Browser compatibility: Ensure you're using a modern browser

**"I need to make changes"**
- Before signing: Contact executive@cravenusa.com to request changes
- After signing: Contact us immediately - we may be able to void and regenerate

---

## 📞 Support Contact Information

**Executive Onboarding Team**
- Email: executive@cravenusa.com
- Response Time: Within 24 hours (urgent matters: same day)
- Hours: Monday - Friday, 9:00 AM - 5:00 PM EST

---

## ✅ Checklist

Before you finish, ensure you have:
- [ ] Logged into the signing portal
- [ ] Reviewed all documents carefully
- [ ] Signed all required documents
- [ ] Received confirmation emails
- [ ] Saved copies of signed documents for your records

---

**Last Updated**: ${new Date().getFullYear()}
**Signing Portal**: ${portalUrl}

For the most up-to-date instructions, visit: ${portalUrl}/instructions
`;

    // Convert README to base64 for attachment
    // Use TextEncoder to properly encode UTF-8, then base64
    const readmeBytes = new TextEncoder().encode(readmeContent);
    const readmeBase64 = base64Encode(readmeBytes.buffer);
    
    // Add README to attachments
    const allAttachments = [
      ...attachments,
      {
        filename: 'EXECUTIVE_SIGNING_INSTRUCTIONS.txt',
        content: readmeBase64,
        type: 'text/plain',
      }
    ];

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: emailSubject,
      html: emailHtml,
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
    });

    console.log(`Email sent successfully to ${to}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: (emailResponse.data as any)?.id || (emailResponse as any)?.id,
        to,
        documentTitle 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending executive document email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

