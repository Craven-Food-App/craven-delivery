import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface ExtractedInvoice {
  vendor_name: string;
  vendor_email: string;
  vendor_address: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
  notes: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { file_base64, file_name, content_type, auto_create } = body;

    if (!file_base64) {
      return new Response(
        JSON.stringify({ error: "file_base64 is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upload the file to storage first
    const cleanBase64 = file_base64.replace(/^data:[^;]+;base64,/, "");
    const fileBuffer = Uint8Array.from(atob(cleanBase64), (c) =>
      c.charCodeAt(0)
    );
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const storagePath = `invoices/${user.id}/${timestamp}_${randomId}_${file_name || "invoice.pdf"}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, fileBuffer, {
        contentType: content_type || "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`File upload failed: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("documents").getPublicUrl(storagePath);

    // Call OpenAI Vision to extract invoice data
    console.log(`Scanning invoice: ${file_name}`);

    const isPdf = (content_type || "").includes("pdf");
    
    // For PDFs, we use the file URL approach; for images, we use base64
    const userContent: any[] = [
      {
        type: "text",
        text: `Extract all invoice data from this document. Return a JSON object with these exact fields:
{
  "vendor_name": "Company name of the vendor/supplier",
  "vendor_email": "Vendor email if visible",
  "vendor_address": "Full vendor address if visible",
  "invoice_number": "The invoice number/ID",
  "invoice_date": "YYYY-MM-DD format",
  "due_date": "YYYY-MM-DD format, or estimate Net 30 from invoice date",
  "subtotal": numeric subtotal before tax,
  "tax_amount": numeric tax amount,
  "total_amount": numeric total amount due,
  "currency": "USD" or detected currency code,
  "line_items": [{"description": "item desc", "quantity": 1, "unit_price": 100.00, "amount": 100.00}],
  "notes": "Any additional notes, PO numbers, or payment instructions"
}
Return ONLY the JSON object, no markdown or extra text.`,
      },
    ];

    if (isPdf) {
      // For PDFs, pass as a file URL to GPT-4o
      userContent.push({
        type: "file",
        file: {
          url: `data:application/pdf;base64,${cleanBase64}`,
        },
      });
    } else {
      // For images
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${content_type || "image/png"};base64,${cleanBase64}`,
          detail: "high",
        },
      });
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are an expert invoice data extractor. Extract all structured data from invoice documents. Always return valid JSON. Use YYYY-MM-DD for dates. Use numbers (not strings) for amounts. If a field is not found, use empty string for text fields and 0 for numeric fields.",
            },
            {
              role: "user",
              content: userContent,
            },
          ],
          max_tokens: 4000,
          temperature: 0,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error("OpenAI error:", errText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices?.[0]?.message?.content || "{}";

    // Parse the JSON response (strip markdown code blocks if present)
    let cleaned = rawContent.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let extracted: ExtractedInvoice;
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse OpenAI response:", cleaned);
      extracted = {
        vendor_name: "",
        vendor_email: "",
        vendor_address: "",
        invoice_number: "",
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: "",
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        currency: "USD",
        line_items: [],
        notes: "AI extraction failed — manual entry required",
      };
    }

    console.log("Extracted invoice data:", JSON.stringify(extracted));

    // Auto-create invoice record if requested
    let invoice_id: string | null = null;
    if (auto_create) {
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .like("invoice_number", `INV-${year}-%`);

      const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(6, "0")}`;
      const amt = extracted.subtotal || extracted.total_amount || 0;
      const tax = extracted.tax_amount || 0;
      const total = extracted.total_amount || amt + tax;

      const dueDate =
        extracted.due_date ||
        (() => {
          const d = new Date(extracted.invoice_date || Date.now());
          d.setDate(d.getDate() + 30);
          return d.toISOString().split("T")[0];
        })();

      const { data: inv, error: insertError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          vendor_name: extracted.vendor_name || "Unknown Vendor",
          vendor_email: extracted.vendor_email || null,
          vendor_address: extracted.vendor_address || null,
          invoice_date:
            extracted.invoice_date ||
            new Date().toISOString().split("T")[0],
          due_date: dueDate,
          amount: amt,
          tax_amount: tax,
          total_amount: total,
          currency: extracted.currency || "USD",
          line_items:
            extracted.line_items.length > 0
              ? extracted.line_items
              : [
                  {
                    description: "Invoice total",
                    quantity: 1,
                    unit_price: total,
                    amount: total,
                  },
                ],
          invoice_file_url: publicUrl,
          status: "pending",
          notes: `Auto-scanned from PDF upload. Original invoice #: ${extracted.invoice_number || "N/A"}. ${extracted.notes || ""}`.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error creating invoice:", insertError);
        throw new Error(`Failed to create invoice: ${insertError.message}`);
      }

      invoice_id = inv?.id || null;
      console.log("Invoice created:", invoice_id, invoiceNumber);
    }

    return new Response(
      JSON.stringify({
        success: true,
        extracted,
        file_url: publicUrl,
        invoice_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error scanning invoice:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
