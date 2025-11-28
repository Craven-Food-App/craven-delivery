import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1?bundle";
import { determineSignerRole } from '../_shared/pdfAnchors.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmitSignaturePayload {
  document_id: string;
  typed_name?: string | null;
  signature_png_base64?: string | null;
  signer_ip?: string | null;
  signer_user_agent?: string | null;
  signature_token?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SubmitSignaturePayload = await req.json();
    const { document_id, typed_name, signature_png_base64, signer_ip, signer_user_agent, signature_token } = body;

    if (!document_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing document_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: document, error: docError } = await supabaseClient
      .from('executive_documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Document not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const authHeader = req.headers.get('Authorization');
    const tokenProvided = Boolean(signature_token && signature_token.trim().length > 0);

    if (!authHeader && !tokenProvided) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Signature token required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    if (tokenProvided) {
      if (!document.signature_token || document.signature_token !== signature_token) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid signature token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
      if (document.signature_token_expires_at) {
        const expires = new Date(document.signature_token_expires_at);
        if (Number.isFinite(expires.getTime()) && expires.getTime() < Date.now()) {
          return new Response(
            JSON.stringify({ ok: false, error: 'This signing link has expired' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 }
          );
        }
      }
    }

    // Quick check if document is HTML (before detailed check)
    const quickHtmlCheck = (document.file_url || '').toLowerCase().includes('.html');
    
    // Allow re-signing if it's an HTML document without a signed_file_url (signature wasn't embedded)
    const canReSign = document.signature_status === 'signed' && 
                      quickHtmlCheck && 
                      (!document.signed_file_url || document.signed_file_url === document.file_url);
    
    if (document.signature_status === 'signed' && !canReSign) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Document already signed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (canReSign) {
      console.log('Re-signing HTML document to embed signature');
    }

    // Fetch signature fields from template (DocuSign-style tagged fields)
    let templateSignatureFields: Array<any> = [];
    let templateId: string | null = null;
    
    // Try to get template_id from document, or find by type
    if ((document as any).template_id) {
      templateId = (document as any).template_id;
    } else {
      // Find template by document type
      const { data: template } = await supabaseClient
        .from('document_templates')
        .select('id')
        .eq('template_key', document.type)
        .single();
      
      if (template) {
        templateId = template.id;
      }
    }
    
    // Fetch signature fields from template
    if (templateId) {
      const { data: fields } = await supabaseClient
        .from('document_template_signature_fields')
        .select('*')
        .eq('template_id', templateId)
        .order('page_number', { ascending: true })
        .order('y_percent', { ascending: true });
      
      if (fields) {
        templateSignatureFields = fields;
        console.log(`Found ${fields.length} signature fields from template`);
      }
    }

    // Fallback to document's signature_field_layout if no template fields found
    const signatureLayoutRaw = templateSignatureFields.length > 0 
      ? templateSignatureFields
      : (Array.isArray(document.signature_field_layout)
          ? (document.signature_field_layout as Array<any>)
          : []);

    let signature: any = null;
    try {
      const { data: sigData, error: sigError } = await supabaseClient
        .from('signatures')
        .insert({
          document_id: document_id,
          signed_by: typed_name || document.officer_name,
          signature_data_url: signature_png_base64,
          ip: signer_ip || null,
        })
        .select()
        .single();

      if (sigError) {
        console.error('Error creating signature record:', sigError);
        // Don't throw - continue with document update even if signature record fails
        // This allows the document to be marked as signed even if signature table insert fails
        console.warn('Continuing without signature record due to error:', sigError.message);
      } else {
        signature = sigData;
      }
    } catch (sigErr: any) {
      console.error('Exception creating signature:', sigErr);
      // Continue anyway - signature record is optional for document signing
    }

    const signedAtISO = new Date().toISOString();

    if (document.signature_token) {
      await supabaseClient
        .from('executive_signatures')
        .upsert({
          employee_email: document.officer_name,
          employee_name: document.officer_name,
          position: document.role,
          document_type: document.type,
          token: document.signature_token,
          signed_at: signedAtISO,
          typed_name: typed_name || document.officer_name,
          signature_png_base64: signature_png_base64,
          signer_ip: signer_ip,
          signer_user_agent: signer_user_agent,
          document_id: document_id,
        }, {
          onConflict: 'token'
        });
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

    // Check if document is HTML (not PDF) - check multiple ways
    const fileUrlLower = (document.file_url || '').toLowerCase();
    const contentType = document.file_url ? 
      (await fetch(document.file_url, { method: 'HEAD' }).then(r => r.headers.get('content-type')).catch(() => null)) : null;
    
    const isHtmlFile = 
      fileUrlLower.includes('.html') || 
      fileUrlLower.endsWith('.html') ||
      contentType?.includes('text/html') ||
      contentType?.includes('html');
    
    console.log('Document file check:', {
      file_url: document.file_url,
      isHtmlFile,
      contentType,
      fileUrlLower
    });
    
    let pdfBlob: ArrayBuffer | null = null;
    if (!isHtmlFile) {
      try {
        // Only fetch PDF if it's not HTML
        const pdfResponse = await fetch(document.file_url);
        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch original PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
        }
        const contentTypeHeader = pdfResponse.headers.get('content-type') || '';
        if (contentTypeHeader.includes('text/html') || contentTypeHeader.includes('html')) {
          console.log('Detected HTML from Content-Type header, skipping PDF processing');
          pdfBlob = null;
        } else {
          pdfBlob = await pdfResponse.arrayBuffer();
          // Quick check: PDF files start with %PDF
          const firstBytes = new Uint8Array(pdfBlob.slice(0, 4));
          const pdfHeader = String.fromCharCode(...firstBytes);
          if (!pdfHeader.startsWith('%PDF')) {
            console.log('File does not have PDF header, treating as HTML');
            pdfBlob = null;
          }
        }
      } catch (fetchError: any) {
        console.error('Error fetching document file:', fetchError);
        // If fetch fails, assume it might be HTML and continue
        pdfBlob = null;
      }
    }

    let signedPdfBytes: Uint8Array | null = null;
    let updatedLayout = signatureLayoutRaw;
    let officerFields: Array<any> = [];
    const completedFieldValues = new Map<string, string | null>();
    
    // Initialize signedPublicUrl - will be updated if signature is successfully embedded
    let signedPublicUrl = document.file_url;

    // For HTML documents, embed signature into HTML
    if (isHtmlFile) {
      console.log('Document is HTML, embedding signature into HTML');
      try {
        // Fetch the HTML content
        const htmlResponse = await fetch(document.file_url);
        if (htmlResponse.ok) {
          let htmlContent = await htmlResponse.text();
          
          // Create a data URL for the signature image
          const signatureDataUrl = signature_png_base64 || '';
          const signerName = typed_name || document.officer_name || 'Executive';
          const signedDate = new Date(signedAtISO).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          // Create signature HTML components
          const signatureImageHtml = `<img src="${signatureDataUrl}" alt="Signature" style="max-width: 250px; height: auto; display: block; margin-bottom: 4px;" />`;
          const signatureWithNameHtml = `<div style="display: inline-block; vertical-align: bottom; margin-bottom: 8px;">
            ${signatureImageHtml}
            <div style="font-size: 11px; margin-top: 2px; border-top: 1px solid #222; padding-top: 2px; text-align: center;">${signerName}</div>
          </div>`;
          
          // Determine signer role from document
          const documentRole = (document.role || '').toLowerCase();
          let signerRole = 'officer'; // default
          if (documentRole.includes('incorporator') || documentRole.includes('founder')) {
            signerRole = 'incorporator';
          } else if (documentRole.includes('notary')) {
            signerRole = 'notary';
          } else if (documentRole.includes('officer') || documentRole.includes('executive') || documentRole.includes('appointee')) {
            signerRole = 'officer';
          }
          
          let signaturePlaced = false;
          
          // Strategy 1: Use DocuSign-style tagged signature fields with exact coordinates
          // Filter fields that match the signer's role and are on page 1 (or current page)
          const relevantFields = templateSignatureFields.filter((field: any) => 
            field.signer_role.toLowerCase() === signerRole.toLowerCase() &&
            field.page_number === 1 // For HTML, assume single page or page 1
          );
          
          if (relevantFields.length > 0) {
            console.log(`Placing signatures using ${relevantFields.length} tagged fields for role: ${signerRole}`);
            
            // Create a wrapper div to position signatures absolutely
            // We'll inject a style block and position signatures using absolute positioning
            const signatureStyleBlock = `
<style>
  .signature-field-overlay {
    position: absolute;
    z-index: 1000;
  }
</style>`;
            
            // Inject style block if not already present
            if (!htmlContent.includes('signature-field-overlay')) {
              htmlContent = htmlContent.replace('</head>', signatureStyleBlock + '</head>');
              if (!htmlContent.includes('</head>')) {
                htmlContent = htmlContent.replace('<body>', signatureStyleBlock + '<body>');
              }
            }
            
            // Place each signature field at its exact coordinates
            relevantFields.forEach((field: any) => {
              let fieldContent = '';
              
              if (field.field_type === 'signature') {
                fieldContent = signatureWithNameHtml;
              } else if (field.field_type === 'date') {
                fieldContent = `<span style="font-size: 12px;">${signedDate}</span>`;
              } else if (field.field_type === 'text') {
                fieldContent = `<span style="font-size: 12px;">${signerName}</span>`;
              } else if (field.field_type === 'initials') {
                const initials = signerName.split(' ').map(n => n.charAt(0).toUpperCase()).join('');
                fieldContent = `<span style="font-size: 12px; font-weight: bold;">${initials}</span>`;
              }
              
              // Create positioned signature div
              const signatureDiv = `
<div class="signature-field-overlay" style="left: ${field.x_percent}%; top: ${field.y_percent}%; width: ${field.width_percent}%; height: ${field.height_percent}%;">
  ${fieldContent}
</div>`;
              
              // Try to find and replace signature field tags first
              const fieldTagPattern = new RegExp(`\\{\\{SIGNATURE_FIELD:${field.signer_role}:${field.field_type}\\}\\}`, 'gi');
              if (fieldTagPattern.test(htmlContent)) {
                htmlContent = htmlContent.replace(fieldTagPattern, fieldContent);
                signaturePlaced = true;
              } else {
                // If no tag found, append to body (will be positioned absolutely)
                if (htmlContent.includes('</body>')) {
                  htmlContent = htmlContent.replace('</body>', signatureDiv + '</body>');
                } else if (htmlContent.includes('</html>')) {
                  htmlContent = htmlContent.replace('</html>', signatureDiv + '</html>');
                } else {
                  htmlContent += signatureDiv;
                }
                signaturePlaced = true;
              }
            });
            
            if (signaturePlaced) {
              console.log(`Signatures placed using DocuSign-style tagged fields`);
            }
          }
          
          // Strategy 2: Fallback to explicit signature field tags (backward compatibility)
          if (!signaturePlaced) {
            const signatureFieldPattern = /\{\{SIGNATURE_FIELD:([^:]+):([^}]+)\}\}/gi;
            const signatureFieldMatches = htmlContent.match(signatureFieldPattern);
            
            if (signatureFieldMatches && signatureFieldMatches.length > 0) {
              htmlContent = htmlContent.replace(signatureFieldPattern, (match, fieldRole, fieldType) => {
                // Only replace fields that match the current signer's role
                if (fieldRole.toLowerCase() === signerRole.toLowerCase()) {
                  signaturePlaced = true;
                  if (fieldType.toLowerCase() === 'signature') {
                    return signatureWithNameHtml;
                  } else if (fieldType.toLowerCase() === 'date') {
                    return signedDate;
                  } else if (fieldType.toLowerCase() === 'text') {
                    return signerName;
                  }
                }
                return match;
              });
              
              if (signaturePlaced) {
                console.log(`Signature placed using explicit field tags for role: ${signerRole}`);
              }
            }
          }
          
          // Strategy 2: Fallback to signature line replacement (for documents without tags)
          if (!signaturePlaced) {
            // Find signature lines in appointee sections
            const appointeePattern = /<div[^>]*class=["']signature-line["'][^>]*><\/div>[\s\S]*?Signature of Appointee/gi;
            if (appointeePattern.test(htmlContent) && signerRole === 'officer') {
              htmlContent = htmlContent.replace(
                /<div[^>]*class=["']signature-line["'][^>]*><\/div>/,
                signatureWithNameHtml,
                1 // Only replace first occurrence
              );
              signaturePlaced = true;
              console.log('Signature placed in appointee section (fallback)');
            }
          }
          
          // Strategy 3: Replace placeholder patterns (backward compatibility)
          if (!signaturePlaced) {
            const signaturePlaceholders = [
              /\{\{signature\}\}/gi,
              /\{\{SIGNATURE\}\}/g,
              /\{\{executive_signature\}\}/gi,
              /\{\{officer_signature\}\}/gi,
              /\[SIGNATURE\]/gi,
              /\[signature\]/gi,
              /<!-- SIGNATURE PLACEHOLDER -->/gi,
            ];
            
            for (const pattern of signaturePlaceholders) {
              if (pattern.test(htmlContent)) {
                htmlContent = htmlContent.replace(pattern, signatureWithNameHtml);
                signaturePlaced = true;
                console.log('Signature placed using placeholder pattern');
                break;
              }
            }
          }
          
          // Strategy 4: Replace first signature line found (last resort)
          if (!signaturePlaced) {
            htmlContent = htmlContent.replace(
              /<div[^>]*class=["']signature-line["'][^>]*><\/div>/,
              signatureWithNameHtml
            );
            signaturePlaced = true;
            console.log('Signature placed in first available signature line');
          }
          
          // Add signature metadata at the end for audit trail
          const signatureMetadata = `
<div style="margin-top: 40px; padding: 20px; border-top: 2px solid #333; page-break-inside: avoid; font-size: 11px; color: #666;">
  <p><strong>Electronic Signature Record:</strong></p>
  <p>Signed by: ${signerName}</p>
  <p>Signed on: ${new Date(signedAtISO).toLocaleString('en-US', { timeZone: 'UTC' })} UTC</p>
  ${signer_ip ? `<p>IP Address: ${signer_ip}</p>` : ''}
</div>`;
          
          if (htmlContent.includes('</body>')) {
            htmlContent = htmlContent.replace('</body>', signatureMetadata + '\n</body>');
          } else if (htmlContent.includes('</html>')) {
            htmlContent = htmlContent.replace('</html>', signatureMetadata + '\n</html>');
          } else {
            htmlContent += signatureMetadata;
          }
          
          // Upload the signed HTML file
          const signedHtmlPath = `executive_docs/signed/${document_id}.html`;
          const { error: htmlUploadError } = await supabaseClient.storage
            .from('documents')
            .upload(signedHtmlPath, htmlContent, {
              contentType: 'text/html',
              upsert: true,
            });
          
          if (!htmlUploadError) {
            const { data: signedHtmlUrlData } = supabaseClient.storage
              .from('documents')
              .getPublicUrl(signedHtmlPath);
            signedPublicUrl = signedHtmlUrlData?.publicUrl ?? document.file_url;
            console.log('Signed HTML uploaded successfully:', signedPublicUrl);
          } else {
            console.error('Failed to upload signed HTML:', htmlUploadError);
          }
        }
      } catch (htmlErr) {
        console.error('Error processing HTML document:', htmlErr);
        // Continue with original URL if HTML processing fails
      }
      signedPdfBytes = null; // No PDF processing needed
    } else if (pdfBlob) {
      try {
        const pdfDoc = await PDFDocument.load(pdfBlob);
        let pages = pdfDoc.getPages();
      if (pages.length === 0) {
        pdfDoc.addPage([612, 792]);
        pages = pdfDoc.getPages();
      }

      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const signatureImage = signature_png_base64
        ? await pdfDoc.embedPng(base64ToUint8Array(signature_png_base64))
        : null;

      // Check if document has signature anchors (anchor-based positioning)
      const signatureAnchors = document.signature_anchors || null;
      const signerRole = determineSignerRole(document.role);
      
      // Try to use anchor-based positioning first
      let useAnchors = false;
      if (signatureAnchors && signatureAnchors[signerRole]) {
        useAnchors = true;
        console.log(`Using anchor-based positioning for ${signerRole}`);
      } else {
        console.log(`No anchor found for ${signerRole}, using percentage-based positioning`);
      }

      const documentRoleLower = (document.role || '').toLowerCase();
      const matchesOfficerField = (roleLabel: any) => {
        if (!roleLabel) return true;
        const roleLower = String(roleLabel).toLowerCase();
        if (['ceo', 'board', 'incorporator'].includes(roleLower)) return false;
        if (
          roleLower.includes('officer') ||
          roleLower.includes('executive') ||
          roleLower.includes('employee') ||
          roleLower.includes('signer') ||
          roleLower.includes('recipient')
        ) {
          return true;
        }
        if (documentRoleLower && (roleLower.includes(documentRoleLower) || documentRoleLower.includes(roleLower))) {
          return true;
        }
        return false;
      };

      officerFields = signatureLayoutRaw.filter(
        (field: any) => field && !field.auto_filled && matchesOfficerField(field.signer_role),
      );

      const getBox = (field: any, pageWidth: number, pageHeight: number) => {
        const widthPercent = Number(field.width_percent) || 0;
        const heightPercent = Number(field.height_percent) || 0;
        const xPercent = Number(field.x_percent) || 0;
        const yPercent = Number(field.y_percent) || 0;

        const boxWidth = Math.min(pageWidth, Math.max(pageWidth * (widthPercent / 100), 10));
        const boxHeight = Math.min(pageHeight, Math.max(pageHeight * (heightPercent / 100), 10));
        const rawX = pageWidth * (xPercent / 100);
        const rawYTop = pageHeight * (yPercent / 100);

        const boxX = Math.min(Math.max(rawX, 0), pageWidth - boxWidth);
        const boxY = Math.min(Math.max(pageHeight - rawYTop - boxHeight, 0), pageHeight - boxHeight);
        return { boxX, boxY, boxWidth, boxHeight };
      };

      const drawCenteredText = (
        page: any,
        text: string,
        x: number,
        y: number,
        width: number,
        font: any,
        size: number,
      ) => {
        const textWidth = font.widthOfTextAtSize(text, size);
        const textX = x + Math.max((width - textWidth) / 2, 0);
        page.drawText(text, {
          x: textX,
          y,
          size,
          font,
          color: rgb(0, 0, 0),
        });
      };

      if (officerFields.length > 0 || useAnchors) {
        const signedDate = new Date(signedAtISO);
        const formattedDate = signedDate.toLocaleDateString('en-US');
        const signerDisplayName = typed_name || document.officer_name || 'Executive';
        const initials = signerDisplayName
          .split(/\s+/)
          .map((part) => part.trim().charAt(0).toUpperCase())
          .join('')
          .slice(0, 3) || 'ES';

        // Use anchor-based positioning if available
        if (useAnchors && signatureAnchors[signerRole] && signatureImage) {
          const anchor = signatureAnchors[signerRole];
          const pageIndex = Math.min(anchor.page - 1, pages.length - 1);
          const page = pages[pageIndex];
          const { width, height } = page.getSize();
          
          // Use anchor dimensions if available, otherwise use defaults
          const sigWidth = anchor.width || 200;
          const sigHeight = anchor.height || (signatureImage.height / signatureImage.width) * sigWidth;
          
          // Calculate signature image dimensions maintaining aspect ratio
          const aspectRatio = signatureImage.width / signatureImage.height;
          let drawWidth = sigWidth;
          let drawHeight = sigHeight;
          
          if (aspectRatio > (sigWidth / sigHeight)) {
            drawHeight = sigWidth / aspectRatio;
            drawWidth = sigWidth;
          } else {
            drawWidth = sigHeight * aspectRatio;
            drawHeight = sigHeight;
          }
          
          // Remove tag text area (draw white rectangle over it)
          // Use anchor width/height if available, otherwise use signature dimensions
          const tagAreaWidth = anchor.width || sigWidth;
          const tagAreaHeight = anchor.height || 20; // Approximate height of tag text
          
          // anchor.y is the top of the signature field area in PDF coordinates (from bottom)
          // Draw white rectangle to cover tag text area
          page.drawRectangle({
            x: anchor.x,
            y: anchor.y - tagAreaHeight, // Position rectangle below anchor.y
            width: tagAreaWidth,
            height: tagAreaHeight,
            color: rgb(1, 1, 1), // White
            opacity: 1,
          });
          
          // Draw electronic signature stamp beside the signature
          const stampText = 'Electronically Signed';
          const stampFontSize = 8;
          const stampTextWidth = fontRegular.widthOfTextAtSize(stampText, stampFontSize);
          const stampPadding = 8;
          const stampBoxWidth = stampTextWidth + (stampPadding * 2);
          const stampBoxHeight = 20;
          
          // Position stamp to the right of signature
          const stampX = anchor.x + drawWidth + 10; // 10pt gap between signature and stamp
          const stampY = anchor.y - stampBoxHeight; // Align top with signature area
          
          // Draw stamp background (light gray)
          page.drawRectangle({
            x: stampX,
            y: stampY,
            width: stampBoxWidth,
            height: stampBoxHeight,
            color: rgb(0.95, 0.95, 0.95), // Light gray
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 1,
          });
          
          // Draw stamp text
          page.drawText(stampText, {
            x: stampX + stampPadding,
            y: stampY + (stampBoxHeight - stampFontSize) / 2,
            size: stampFontSize,
            font: fontRegular,
            color: rgb(0.3, 0.3, 0.3),
          });
          
          // Draw signature at anchor position
          // anchor.y represents the top of the signature area
          // Position signature so its top aligns with anchor.y, then adjust downward
          // We want the signature to fill the area, so position it at anchor.y - drawHeight
          const imageY = anchor.y - drawHeight;
          
          page.drawImage(signatureImage, {
            x: anchor.x,
            y: imageY,
            width: drawWidth,
            height: drawHeight,
          });
          
          console.log(`Signature placed at anchor for ${signerRole}:`, {
            page: anchor.page,
            x: anchor.x,
            y: anchor.y,
            imageY,
            drawWidth,
            drawHeight,
          });
          
          // Mark as completed
          completedFieldValues.set(`anchor_${signerRole}`, 'Signature');
        } else {
          // Fallback to percentage-based positioning
          for (const field of officerFields) {
            const pageNumber = Math.max(1, Number(field.page_number) || 1);
            const pageIndex = Math.min(pageNumber - 1, pages.length - 1);
            const page = pages[pageIndex];
            const { width, height } = page.getSize();
            const { boxX, boxY, boxWidth, boxHeight } = getBox(field, width, height);

            page.drawRectangle({
              x: boxX,
              y: boxY,
              width: boxWidth,
              height: boxHeight,
              color: rgb(1, 1, 1),
              opacity: 1,
            });
            page.drawRectangle({
              x: boxX,
              y: boxY,
              width: boxWidth,
              height: boxHeight,
              borderColor: rgb(0.18, 0.32, 0.58),
              borderWidth: 1.3,
            });

            const fieldType = String(field.field_type || 'signature').toLowerCase();
            const fieldKey = String(field.id ?? `${pageNumber}-${fieldType}`);
            let renderedValue: string | null = null;

            if (fieldType === 'signature') {
              if (signatureImage) {
                // Fill the signature box while maintaining aspect ratio
                // Leave space for the electronic signature stamp beside it
                const aspectRatio = signatureImage.width / signatureImage.height;
                const boxAspectRatio = boxWidth / boxHeight;
                
                // Reserve space for stamp (about 30% of box width)
                const stampSpace = boxWidth * 0.3;
                const availableWidth = boxWidth - stampSpace - 10; // 10pt gap
                
                let drawWidth = availableWidth;
                let drawHeight = boxHeight;
                
                // Fit to available dimensions while maintaining aspect ratio
                if (aspectRatio > (availableWidth / boxHeight)) {
                  // Signature is wider - fit to width
                  drawHeight = availableWidth / aspectRatio;
                  drawWidth = availableWidth;
                } else {
                  // Signature is taller - fit to height
                  drawWidth = boxHeight * aspectRatio;
                  drawHeight = boxHeight;
                }
                
                // Center the signature vertically in the box, align left
                const imageX = boxX;
                const imageY = boxY + (boxHeight - drawHeight) / 2;
                
                // Draw signature image
                page.drawImage(signatureImage, {
                  x: imageX,
                  y: imageY,
                  width: drawWidth,
                  height: drawHeight,
                });
                
                // Draw electronic signature stamp beside the signature
                const stampText = 'Electronically Signed';
                const stampFontSize = 8;
                const stampTextWidth = fontRegular.widthOfTextAtSize(stampText, stampFontSize);
                const stampPadding = 6;
                const stampBoxWidth = stampTextWidth + (stampPadding * 2);
                const stampBoxHeight = 18;
                
                // Position stamp to the right of signature
                const stampX = imageX + drawWidth + 10; // 10pt gap
                const stampY = boxY + (boxHeight - stampBoxHeight) / 2; // Center vertically
                
                // Draw stamp background (light gray)
                page.drawRectangle({
                  x: stampX,
                  y: stampY,
                  width: stampBoxWidth,
                  height: stampBoxHeight,
                  color: rgb(0.95, 0.95, 0.95), // Light gray
                  borderColor: rgb(0.7, 0.7, 0.7),
                  borderWidth: 1,
                });
                
                // Draw stamp text
                page.drawText(stampText, {
                  x: stampX + stampPadding,
                  y: stampY + (stampBoxHeight - stampFontSize) / 2,
                  size: stampFontSize,
                  font: fontRegular,
                  color: rgb(0.3, 0.3, 0.3),
                });
                
                renderedValue = 'Signature';
              } else {
                // No signature image - don't render anything (signature is required)
                renderedValue = null;
              }
            } else if (fieldType === 'initials') {
              drawCenteredText(page, initials, boxX, boxY + (boxHeight - 12) / 2, boxWidth, fontBold, 12);
              renderedValue = initials;
            } else if (fieldType === 'date') {
              drawCenteredText(page, formattedDate, boxX, boxY + (boxHeight - 10) / 2, boxWidth, fontRegular, 10);
              renderedValue = formattedDate;
            } else {
              drawCenteredText(page, signerDisplayName, boxX, boxY + (boxHeight - 10) / 2, boxWidth, fontRegular, 10);
              renderedValue = signerDisplayName;
            }

            completedFieldValues.set(fieldKey, renderedValue);
          }
        }

        signedPdfBytes = await pdfDoc.save();

        updatedLayout = signatureLayoutRaw.map((field: any) => {
          const key = String(field.id ?? `${field.page_number}-${field.field_type}`);
          if (completedFieldValues.has(key)) {
            return {
              ...field,
              auto_filled: true,
              rendered_value: completedFieldValues.get(key),
            };
          }
          return field;
        });
      } else {
        // Legacy fallback: place signature summary on final page
        const targetPage = pages[pages.length - 1];
        const { width, height } = targetPage.getSize();
        const margin = 50;
        let currentY = margin + 100;

        if (signatureImage) {
          const scaled = signatureImage.scaleToFit(width - margin * 2, 120);
          const sigX = (width - scaled.width) / 2;
          const sigY = margin + 60;
          targetPage.drawImage(signatureImage, {
            x: sigX,
            y: sigY,
            width: scaled.width,
            height: scaled.height,
          });
          currentY = sigY + scaled.height + 12;
        } else {
          currentY = margin + 40;
        }

        const textLines: string[] = [];
        textLines.push(`Signed electronically by: ${typed_name || document.officer_name || 'Executive'}`);
        textLines.push(`Signed on: ${new Date(signedAtISO).toLocaleString('en-US', { timeZone: 'UTC' })} UTC`);
        if (signer_ip) {
          textLines.push(`Signer IP: ${signer_ip}`);
        }
        if (signer_user_agent) {
          textLines.push(`User Agent: ${signer_user_agent.substring(0, 120)}`);
        }

        let textY = currentY;
        textLines.forEach((line, index) => {
          const isHeader = index === 0;
          targetPage.drawText(line, {
            x: margin,
            y: textY,
            size: isHeader ? 12 : 10,
            font: isHeader ? fontBold : fontRegular,
            color: rgb(0, 0, 0),
          });
          textY -= isHeader ? 18 : 14;
        });

        signedPdfBytes = await pdfDoc.save();
      }
      } catch (pdfErr) {
        console.error('Failed to embed signature into PDF, using original file:', pdfErr);
      }
    }

    // For PDFs, upload signed PDF if we have signed bytes
    if (!isHtmlFile && signedPdfBytes) {
      const finalPdfBytes = signedPdfBytes ?? (pdfBlob ? new Uint8Array(pdfBlob) : null);
      if (finalPdfBytes) {
        const signedPath = `executive_docs/signed/${document_id}.pdf`;
        const { error: signedUploadError } = await supabaseClient.storage
          .from('documents')
          .upload(signedPath, finalPdfBytes, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (signedUploadError) {
          console.error('Failed to upload signed PDF, falling back to original URL:', signedUploadError);
        } else {
          const { data: signedUrlData } = supabaseClient.storage
            .from('documents')
            .getPublicUrl(signedPath);
          signedPublicUrl = signedUrlData?.publicUrl ?? document.file_url;
        }
      }
    }

    const existingSignerRoles = document.signer_roles && typeof document.signer_roles === 'object'
      ? (document.signer_roles as Record<string, boolean>)
      : {};
    const updatedSignerRoles: Record<string, boolean> = { ...existingSignerRoles };
    if (officerFields.length > 0) {
      officerFields.forEach((field: any) => {
        const roleKey = String(field.signer_role || 'officer').toLowerCase();
        updatedSignerRoles[roleKey || 'officer'] = true;
      });
    }
    updatedSignerRoles.officer = true;

    // Get current user ID for signed_by_user field
    let signedByUserId: string | null = null;
    if (authHeader) {
      try {
        const userClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: authHeader },
            },
          }
        );
        const { data: { user } } = await userClient.auth.getUser();
        signedByUserId = user?.id ?? null;
      } catch (authErr) {
        console.warn('Could not get user ID for signed_by_user:', authErr);
      }
    }

    // Build update object - only include fields that exist
    const updateData: any = {
      signature_status: 'signed',
      status: 'signed',
      signed_file_url: signedPublicUrl,
      signer_roles: updatedSignerRoles,
      signature_token: null,
      signature_token_expires_at: null,
      signature_field_layout: updatedLayout,
    };

    // Add signed_at and signed_by_user (these should exist from migration)
    updateData.signed_at = signedAtISO;
    if (signedByUserId) {
      updateData.signed_by_user = signedByUserId;
    }

    console.log('Updating document with data:', JSON.stringify(updateData, null, 2));
    console.log('Document ID:', document_id);

    // Try to update the document
    // If the trigger fails, we'll catch it and provide helpful error message
    let updateError: any = null;
    let updateResult: any = null;
    
    try {
      const updateResponse = await supabaseClient
        .from('executive_documents')
        .update(updateData)
        .eq('id', document_id)
        .select();
      
      updateError = updateResponse.error;
      updateResult = updateResponse.data;
    } catch (updateException: any) {
      console.error('Exception during update:', updateException);
      updateError = {
        message: updateException.message || 'Unknown error during update',
        code: updateException.code || 'UNKNOWN',
        details: updateException
      };
    }

    if (updateError) {
      console.error('Error updating document status:', updateError);
      console.error('Update error code:', updateError.code);
      console.error('Update error message:', updateError.message);
      console.error('Update error details:', updateError.details);
      console.error('Update error hint:', updateError.hint);
      console.error('Update data was:', JSON.stringify(updateData, null, 2));
      console.error('Document ID:', document_id);
      
      // Check for specific error types
      const errorMsg = String(updateError.message || '').toLowerCase();
      const errorDetails = String(updateError.details || '').toLowerCase();
      
      if (errorMsg.includes('operator does not exist') || 
          errorMsg.includes('text = boolean') ||
          errorDetails.includes('operator does not exist') ||
          errorDetails.includes('text = boolean')) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: 'Database trigger function error. The check_all_documents_signed function needs to be updated.',
            details: `Error: ${updateError.message}. Please run the SQL fix in Supabase Dashboard SQL Editor to update the function.`,
            code: updateError.code,
            hint: 'The function variable type needs to be BOOLEAN, not TEXT'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Failed to update document: ${updateError.message || 'Unknown error'}`,
          details: updateError.details || updateError.hint || JSON.stringify(updateError),
          code: updateError.code || 'UNKNOWN',
          fullError: updateError
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('Document updated successfully:', updateResult);

    // Step 12: After signing, check if all documents are signed and trigger completion
    // This happens automatically when all documents reach 'completed' status
    if (updateResult && updateResult[0]) {
      const updatedDoc = updateResult[0];
      
      // Check if this is a board_documents document (new governance system)
      if (updatedDoc.related_appointment_id) {
        try {
          const { data: allDocuments } = await supabaseAdmin
            .from('board_documents')
            .select('id, signing_status')
            .eq('related_appointment_id', updatedDoc.related_appointment_id);
          
          const allSigned = allDocuments?.every(doc => doc.signing_status === 'completed') || false;
          
          if (allSigned && updatedDoc.related_appointment_id) {
            // Trigger appointment completion (Step 12)
            try {
              await supabaseAdmin.functions.invoke('governance-complete-appointment', {
                body: {
                  appointment_id: updatedDoc.related_appointment_id,
                },
              });
            } catch (completionError) {
              console.error('Error triggering appointment completion:', completionError);
              // Don't fail the signature submission if completion trigger fails
            }
          }
        } catch (checkError) {
          console.error('Error checking if all documents are signed:', checkError);
          // Don't fail the signature submission if check fails
        }
      }
    }

    console.log(`Document ${document_id} signed successfully by ${typed_name || 'unknown'}`);

    return new Response(
      JSON.stringify({
        ok: true,
        signature_id: signature?.id || null,
        document_id: document_id,
        message: 'Document signed successfully',
        signed_pdf_url: signedPublicUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error submitting signature:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

