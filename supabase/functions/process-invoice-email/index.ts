import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

import { getCorsHeaders } from '../_shared/cors.ts';
// CORS helper function (inlined for Dashboard deployment)
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim());
  }
  // Default allowed origins - PRODUCTION SECURE
  return [
    "https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com",
    "https://cravenusa.com",
    "https://www.cravenusa.com",
    "https://feeder.cravenusa.com",
    "https://merchant.cravenusa.com",
    "https://board.cravenusa.com",
    "https://hq.cravenusa.com",
    "https://ceo.cravenusa.com",
    "https://cfo.cravenusa.com",
    "https://coo.cravenusa.com",
    "https://cto.cravenusa.com",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:5173",
  ];
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

interface EmailPayload {
  from: { email: string; name?: string };
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded
    content_type: string;
  }>;
}

interface ExtractedInvoiceData {
  invoice_number?: string;
  amount?: number;
  tax_amount?: number;
  invoice_date?: string;
  due_date?: string;
  vendor_name?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify webhook signature (if using Resend or other services)
    // For now, we'll accept all requests but log them
    const signature = req.headers.get('resend-signature') || 
                     req.headers.get('x-webhook-signature');
    
    const payload: EmailPayload = await req.json();
    
    console.log('Received email webhook:', {
      from: payload.from?.email,
      to: payload.to,
      subject: payload.subject,
      hasAttachments: !!payload.attachments?.length
    });
    
    // Only process emails to invoices@cravenusa.com
    const isInvoiceEmail = payload.to?.some((email: string) => 
      email.toLowerCase().includes('invoices@cravenusa.com')
    );

    if (!isInvoiceEmail) {
      console.log('Not an invoice email, skipping');
      return new Response(JSON.stringify({ message: 'Not an invoice email' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing invoice email from:', payload.from.email);

    // Extract vendor information from email
    const vendorEmail = payload.from.email;
    const vendorName = payload.from.name || extractVendorNameFromEmail(vendorEmail);
    
    // Process attachments (PDF invoices)
    let invoiceFileUrl: string | null = null;
    let extractedData: ExtractedInvoiceData = {};

    if (payload.attachments && payload.attachments.length > 0) {
      console.log(`Processing ${payload.attachments.length} attachment(s)`);
      
      // Find PDF attachments
      const pdfAttachment = payload.attachments.find(
        (att: any) => att.content_type === 'application/pdf' || 
                     att.filename?.toLowerCase().endsWith('.pdf') ||
                     att.filename?.toLowerCase().endsWith('.jpg') ||
                     att.filename?.toLowerCase().endsWith('.png')
      );

      if (pdfAttachment) {
        try {
          // Upload PDF/image to Supabase Storage
          invoiceFileUrl = await uploadInvoiceFile(supabase, pdfAttachment);
          console.log('Uploaded invoice file:', invoiceFileUrl);
          
          // Extract data from PDF/image (basic parsing - can be enhanced with OCR later)
          extractedData = await extractInvoiceDataFromFile(pdfAttachment, payload);
        } catch (error) {
          console.error('Error processing attachment:', error);
          // Continue without attachment
        }
      }
    }

    // Parse invoice data from email subject/body
    const invoiceData = parseInvoiceFromEmail(payload, extractedData);

    // Generate invoice number
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .like('invoice_number', `INV-${year}-%`);

    const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(6, '0')}`;

    // Create invoice record
    const invoiceRecord = {
      invoice_number: invoiceNumber,
      vendor_name: invoiceData.vendor_name || vendorName,
      vendor_email: vendorEmail,
      invoice_date: invoiceData.invoice_date || new Date().toISOString().split('T')[0],
      due_date: invoiceData.due_date || calculateDueDate(invoiceData.invoice_date || new Date().toISOString().split('T')[0]),
      amount: invoiceData.amount || 0,
      tax_amount: invoiceData.tax_amount || 0,
      status: 'pending',
      invoice_file_url: invoiceFileUrl,
      notes: `Received via email from ${vendorEmail}. Subject: ${payload.subject}${invoiceData.invoice_number ? `. Invoice #: ${invoiceData.invoice_number}` : ''}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceRecord)
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      throw invoiceError;
    }

    console.log('Invoice created successfully:', invoice.id);

    // Log email processing
    try {
      await supabase.from('invoice_email_logs').insert({
        invoice_id: invoice.id,
        email_from: vendorEmail,
        email_subject: payload.subject,
        email_received_at: new Date().toISOString(),
        processing_status: 'processed',
        extracted_data: extractedData,
      });
    } catch (logError) {
      console.warn('Failed to log email processing (table may not exist):', logError);
    }

    // Notify CFO about new invoice
    try {
      await notifyCFO(supabase, invoice);
    } catch (notifyError) {
      console.warn('Failed to notify CFO:', notifyError);
    }

    // Send confirmation email to vendor
    try {
      await sendVendorConfirmation(vendorEmail, invoiceNumber);
    } catch (confirmError) {
      console.warn('Failed to send vendor confirmation:', confirmError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoice_id: invoice.id,
        invoice_number: invoiceNumber 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error processing invoice email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper functions
function extractVendorNameFromEmail(email: string): string {
  const domain = email.split('@')[1];
  if (!domain) return 'Unknown Vendor';
  
  const domainParts = domain.split('.');
  const companyName = domainParts[0];
  return companyName.charAt(0).toUpperCase() + companyName.slice(1) + ' Inc.';
}

function parseInvoiceFromEmail(email: EmailPayload, extractedData: ExtractedInvoiceData): ExtractedInvoiceData {
  const subject = email.subject || '';
  const text = email.text || email.html || '';
  const combinedText = `${subject} ${text}`.toLowerCase();
  
  const result: ExtractedInvoiceData = {
    vendor_name: extractedData.vendor_name,
  };

  // Extract invoice number (common patterns: INV-123, Invoice #123, etc.)
  const invoiceNumPatterns = [
    /(?:invoice|inv)[\s#:]*([A-Z0-9-]+)/i,
    /invoice\s+number[:\s]+([A-Z0-9-]+)/i,
    /#\s*([A-Z0-9-]+)/i,
  ];
  
  for (const pattern of invoiceNumPatterns) {
    const match = subject.match(pattern) || text.match(pattern);
    if (match && match[1]) {
      result.invoice_number = match[1].trim();
      break;
    }
  }
  
  // Extract amount (common patterns: $1,234.56, USD 1234.56, Total: $123.45, etc.)
  const amountPatterns = [
    /\$[\d,]+\.?\d*/g,
    /(?:total|amount|due)[:\s]*\$?[\d,]+\.?\d*/gi,
    /usd\s*[\d,]+\.?\d*/gi,
  ];
  
  for (const pattern of amountPatterns) {
    const matches = combinedText.match(pattern);
    if (matches && matches.length > 0) {
      // Get the largest amount (likely the total)
      const amounts = matches.map(m => {
        const numStr = m.replace(/[^0-9.]/g, '');
        return parseFloat(numStr);
      }).filter(n => !isNaN(n) && n > 0);
      
      if (amounts.length > 0) {
        result.amount = Math.max(...amounts);
        break;
      }
    }
  }
  
  // Extract dates (MM/DD/YYYY, YYYY-MM-DD, etc.)
  const datePatterns = [
    /\d{1,2}\/\d{1,2}\/\d{4}/g,
    /\d{4}-\d{2}-\d{2}/g,
    /(?:invoice\s+date|date)[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:due\s+date|due)[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = combinedText.match(pattern);
    if (match) {
      const dateStr = match[1] || match[0];
      if (!result.invoice_date) {
        result.invoice_date = normalizeDate(dateStr);
      } else if (!result.due_date && match[0] !== result.invoice_date) {
        result.due_date = normalizeDate(dateStr);
      }
    }
  }

  // Use extracted data if available
  if (extractedData.amount) result.amount = extractedData.amount;
  if (extractedData.tax_amount) result.tax_amount = extractedData.tax_amount;
  if (extractedData.invoice_date) result.invoice_date = extractedData.invoice_date;
  if (extractedData.due_date) result.due_date = extractedData.due_date;
  if (extractedData.vendor_name) result.vendor_name = extractedData.vendor_name;

  return result;
}

function normalizeDate(dateStr: string): string {
  // Convert MM/DD/YYYY to YYYY-MM-DD
  if (dateStr.includes('/')) {
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Already in YYYY-MM-DD format
  return dateStr;
}

function calculateDueDate(invoiceDate: string): string {
  const date = new Date(invoiceDate);
  date.setDate(date.getDate() + 30); // Default Net 30
  return date.toISOString().split('T')[0];
}

async function uploadInvoiceFile(supabase: any, attachment: any): Promise<string> {
  try {
    // Decode base64 content
    const fileBuffer = Uint8Array.from(
      atob(attachment.content.replace(/^data:.*,/, '')), 
      c => c.charCodeAt(0)
    );
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const fileName = `invoices/${timestamp}_${randomId}_${attachment.filename || 'invoice.pdf'}`;
    
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, fileBuffer, {
        contentType: attachment.content_type || 'application/pdf',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading invoice file:', error);
    throw error;
  }
}

async function extractInvoiceDataFromFile(attachment: any, email: EmailPayload): Promise<ExtractedInvoiceData> {
  // Placeholder for OCR/PDF parsing
  // Can be enhanced with:
  // - AWS Textract
  // - Google Vision API
  // - Tesseract OCR
  // - PDF parsing libraries
  
  // For now, return empty object - data will be extracted from email text
  return {};
}

async function notifyCFO(supabase: any, invoice: any) {
  try {
    // Get CFO email from exec_users
    const { data: cfoUsers, error: cfoError } = await supabase
      .from('exec_users')
      .select(`
        user_id,
        user_profiles!inner(email)
      `)
      .eq('role', 'cfo')
      .limit(1);

    if (cfoError || !cfoUsers || cfoUsers.length === 0) {
      console.log('No CFO found or error fetching CFO:', cfoError);
      return;
    }

    const cfoEmail = cfoUsers[0].user_profiles?.email;
    if (!cfoEmail) {
      console.log('CFO email not found');
      return;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Call send-notification function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        recipientEmail: cfoEmail,
        recipientName: 'CFO',
        subject: `New Invoice Received: ${invoice.invoice_number}`,
        body: `
          <h2>New Invoice Received via Email</h2>
          <p>A new invoice has been received via email and added to Accounts Payable.</p>
          <ul>
            <li><strong>Invoice Number:</strong> ${invoice.invoice_number}</li>
            <li><strong>Vendor:</strong> ${invoice.vendor_name}</li>
            <li><strong>Amount:</strong> $${Number(invoice.total_amount || invoice.amount || 0).toFixed(2)}</li>
            <li><strong>Date:</strong> ${invoice.invoice_date}</li>
            <li><strong>Due Date:</strong> ${invoice.due_date}</li>
          </ul>
          <p><a href="${supabaseUrl.replace('/rest/v1', '')}/cfo-portal?section=ap">View in Accounts Payable</a></p>
        `,
        type: 'invoice_received',
        metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number }
      })
    });

    if (!response.ok) {
      console.error('Failed to send CFO notification:', await response.text());
    } else {
      console.log('CFO notification sent successfully');
    }
  } catch (error) {
    console.error('Error notifying CFO:', error);
  }
}

async function sendVendorConfirmation(vendorEmail: string, invoiceNumber: string) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        recipientEmail: vendorEmail,
        subject: `Invoice Received: ${invoiceNumber}`,
        body: `
          <p>Thank you for submitting your invoice.</p>
          <p>We have received your invoice <strong>${invoiceNumber}</strong> and it is being processed.</p>
          <p>You will be notified once payment is processed.</p>
          <p>If you have any questions, please contact accounts payable.</p>
        `
      })
    });

    if (!response.ok) {
      console.error('Failed to send vendor confirmation:', await response.text());
    } else {
      console.log('Vendor confirmation sent successfully');
    }
  } catch (error) {
    console.error('Error sending vendor confirmation:', error);
  }
}

