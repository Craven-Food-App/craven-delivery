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

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const apiKey = lovableKey || openaiKey;
    const useGateway = !!lovableKey;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "No AI API key configured (LOVABLE_API_KEY or OPENAI_API_KEY)" }),
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

    // Call AI Vision to extract invoice data
    console.log(`Scanning invoice: ${file_name}`);

    const isPdf = (content_type || "").includes("pdf");

    const userContent: any[] = [
      {
        type: "text",
        text: `Extract invoice fields from this document.
Return: vendor_name, vendor_email, vendor_address, invoice_number, invoice_date (YYYY-MM-DD), due_date (YYYY-MM-DD), subtotal, tax_amount, total_amount, currency, line_items (description, quantity, unit_price, amount), notes.
If not present, return empty string for text and 0 for numbers.`,
      },
    ];

    const mimeType = isPdf ? "application/pdf" : content_type || "image/png";
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${cleanBase64}`,
      },
    });

    const aiEndpoint = useGateway
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const aiModel = useGateway ? "google/gemini-2.5-flash" : "gpt-4o";

    const invoiceSchema = {
      name: "extract_invoice_data",
      description: "Extract structured invoice data from a PDF or image",
      parameters: {
        type: "object",
        properties: {
          vendor_name: { type: "string" },
          vendor_email: { type: "string" },
          vendor_address: { type: "string" },
          invoice_number: { type: "string" },
          invoice_date: { type: "string" },
          due_date: { type: "string" },
          subtotal: { type: "number" },
          tax_amount: { type: "number" },
          total_amount: { type: "number" },
          currency: { type: "string" },
          line_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unit_price: { type: "number" },
                amount: { type: "number" },
              },
              required: ["description", "quantity", "unit_price", "amount"],
              additionalProperties: false,
            },
          },
          notes: { type: "string" },
        },
        required: [
          "vendor_name",
          "vendor_email",
          "vendor_address",
          "invoice_number",
          "invoice_date",
          "due_date",
          "subtotal",
          "tax_amount",
          "total_amount",
          "currency",
          "line_items",
          "notes",
        ],
        additionalProperties: false,
      },
    };

    const buildBasePayload = (model: string) => ({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert invoice data extractor. Return only structured invoice fields. Never include reasoning or commentary.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      max_tokens: 1500,
      temperature: 0,
    });

    const callAi = async (payload: Record<string, unknown>) => {
      const response = await fetch(aiEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`AI API error: ${response.status} :: ${errText}`);
      }

      return response.json();
    };

    const parseJsonCandidate = (candidate: unknown): Record<string, any> | null => {
      if (!candidate) return null;

      if (typeof candidate === "object" && !Array.isArray(candidate)) {
        return candidate as Record<string, any>;
      }

      if (Array.isArray(candidate)) {
        for (const item of candidate) {
          const parsed = parseJsonCandidate(item);
          if (parsed) return parsed;

          if (item && typeof item === "object" && "text" in (item as Record<string, unknown>)) {
            const parsedFromText = parseJsonCandidate((item as Record<string, unknown>).text);
            if (parsedFromText) return parsedFromText;
          }
        }
        return null;
      }

      if (typeof candidate !== "string") return null;

      const direct = candidate.trim();
      if (!direct) return null;

      const normalized = direct.startsWith("```")
        ? direct.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
        : direct;

      const attempts = [normalized];
      const firstBrace = normalized.indexOf("{");
      const lastBrace = normalized.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        attempts.push(normalized.slice(firstBrace, lastBrace + 1));
      }

      for (const text of attempts) {
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, any>;
          }
        } catch {
          // Continue trying best-effort parse candidates
        }
      }

      return null;
    };

    const toNumber = (value: unknown): number => {
      const num = typeof value === "number" ? value : Number(value);
      return Number.isFinite(num) ? num : 0;
    };

    const normalizeDate = (value: unknown, fallback: string): string => {
      if (typeof value !== "string") return fallback;
      const trimmed = value.trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : fallback;
    };

    const today = new Date().toISOString().split("T")[0];

    const defaultExtracted: ExtractedInvoice = {
      vendor_name: "",
      vendor_email: "",
      vendor_address: "",
      invoice_number: "",
      invoice_date: today,
      due_date: "",
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      currency: "USD",
      line_items: [],
      notes: "AI extraction failed — manual entry required",
    };

    let aiData: any;
    try {
      aiData = await callAi({
        ...buildBasePayload(aiModel),
        tools: [{ type: "function", function: invoiceSchema }],
        tool_choice: { type: "function", function: { name: "extract_invoice_data" } },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("AI API error: 400")) throw error;

      console.warn("Tool-call payload rejected; retrying without tools");
      aiData = await callAi({
        ...buildBasePayload(aiModel),
        response_format: { type: "json_object" },
      });
    }

    let raw =
      parseJsonCandidate(aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) ||
      parseJsonCandidate(aiData?.choices?.[0]?.message?.content);

    const finishReason = aiData?.choices?.[0]?.finish_reason;
    const hasReasoning = Boolean(aiData?.choices?.[0]?.message?.reasoning);

    if (!raw || finishReason === "length" || hasReasoning) {
      console.warn("Retrying invoice extraction with strict JSON mode due to incomplete or non-JSON response");

      try {
        const strictRetry = await callAi({
          ...buildBasePayload("google/gemini-2.5-flash-lite"),
          response_format: { type: "json_object" },
          max_tokens: 800,
        });

        raw =
          parseJsonCandidate(strictRetry?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) ||
          parseJsonCandidate(strictRetry?.choices?.[0]?.message?.content) ||
          raw;
      } catch (retryError) {
        console.error("Strict JSON retry failed:", retryError);
      }
    }

    let extracted: ExtractedInvoice;
    if (!raw) {
      console.error("Failed to parse AI response:", JSON.stringify(aiData));
      extracted = defaultExtracted;
    } else {
      extracted = {
        vendor_name: typeof raw.vendor_name === "string" ? raw.vendor_name.trim() : "",
        vendor_email: typeof raw.vendor_email === "string" ? raw.vendor_email.trim() : "",
        vendor_address: typeof raw.vendor_address === "string" ? raw.vendor_address.trim() : "",
        invoice_number: typeof raw.invoice_number === "string" ? raw.invoice_number.trim() : "",
        invoice_date: normalizeDate(raw.invoice_date, today),
        due_date: normalizeDate(raw.due_date, ""),
        subtotal: toNumber(raw.subtotal),
        tax_amount: toNumber(raw.tax_amount),
        total_amount: toNumber(raw.total_amount),
        currency: typeof raw.currency === "string" && raw.currency.trim() ? raw.currency.trim() : "USD",
        line_items: Array.isArray(raw.line_items)
          ? raw.line_items.map((item: any) => ({
              description: typeof item?.description === "string" ? item.description : "",
              quantity: toNumber(item?.quantity),
              unit_price: toNumber(item?.unit_price),
              amount: toNumber(item?.amount),
            }))
          : [],
        notes: typeof raw.notes === "string" ? raw.notes.trim() : "",
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
