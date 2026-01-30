import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1?bundle";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

interface CeoSignatureSetting {
  typed_name?: string;
  signature_png_base64?: string;
  title?: string;
  updated_at?: string;
}

interface CeoSignatureRow {
  setting_value: CeoSignatureSetting;
}

interface SignatureFieldLayoutItem {
  id?: string;
  field_type?: string;
  signer_role?: string;
  page_number?: number;
  x_percent?: number;
  y_percent?: number;
  width_percent?: number;
  height_percent?: number;
  label?: string | null;
  required?: boolean | null;
  auto_filled?: boolean;
  rendered_value?: string | null;
  signed_at?: string | null;
  signature_data_url?: string | null;
  auto_filled_by?: string | null;
}

const base64ToUint8Array = (base64: string): Uint8Array => {
  const cleaned = base64.includes(",") ? base64.split(",").pop() ?? "" : base64;
  const binaryString = atob(cleaned);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const normalizeRole = (role: string | null | undefined): string => String(role || "").trim().toLowerCase();

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id } = await req.json();

    if (!document_id || typeof document_id !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "document_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: document, error: documentError } = await supabaseClient
      .from("executive_documents")
      .select("id, file_url, signature_field_layout, signer_roles")
      .eq("id", document_id)
      .maybeSingle();

    if (documentError) {
      throw documentError;
    }

    if (!document) {
      return new Response(
        JSON.stringify({ ok: false, error: "Document not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 },
      );
    }

    if (!document.file_url) {
      return new Response(
        JSON.stringify({ ok: false, error: "Document does not have an associated PDF" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const signatureLayout: SignatureFieldLayoutItem[] = Array.isArray(document.signature_field_layout)
      ? document.signature_field_layout as SignatureFieldLayoutItem[]
      : [];

    if (signatureLayout.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Document has no signature field layout to apply" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const targetRoles = ["ceo", "board", "incorporator"];

    const { data: ceoSigRow, error: ceoSigError } = await supabaseClient
      .from("ceo_system_settings")
      .select("setting_value")
      .eq("setting_key", "ceo_signature")
      .maybeSingle();

    if (ceoSigError) {
      throw ceoSigError;
    }

    const ceoSignature = ceoSigRow?.setting_value as CeoSignatureSetting | undefined;
    if (!ceoSignature?.signature_png_base64) {
      return new Response(
        JSON.stringify({ ok: false, error: "CEO signature is not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const pdfResponse = await fetch(document.file_url);
    if (!pdfResponse.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to download document PDF" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }
    const pdfBytes = await pdfResponse.arrayBuffer();

    const pdfDoc = await PDFDocument.load(pdfBytes);
    let pages = pdfDoc.getPages();
    if (pages.length === 0) {
      pdfDoc.addPage([612, 792]);
      pages = pdfDoc.getPages();
    }

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const signatureImage = await pdfDoc.embedPng(base64ToUint8Array(ceoSignature.signature_png_base64));

    const updatedLayout: SignatureFieldLayoutItem[] = [];
    const updatedRoles: Record<string, boolean> = typeof document.signer_roles === "object" && document.signer_roles !== null
      ? { ...(document.signer_roles as Record<string, boolean>) }
      : {};

    const appliedAt = new Date().toISOString();
    let ceoSignatureApplied = false;

    for (const field of signatureLayout) {
      const fieldType = String(field.field_type || "signature").toLowerCase();
      const role = normalizeRole(field.signer_role);
      const pageNumber = Math.max(1, Number(field.page_number) || 1);
      const xPercent = Number(field.x_percent) || 0;
      const yPercent = Number(field.y_percent) || 0;
      const widthPercent = Number(field.width_percent) || 0;
      const heightPercent = Number(field.height_percent) || 0;

      const pageIndex = Math.min(pageNumber - 1, pages.length - 1);
      const page = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const boxWidth = Math.min(pageWidth, Math.max(pageWidth * (widthPercent / 100), 10));
      const boxHeight = Math.min(pageHeight, Math.max(pageHeight * (heightPercent / 100), 10));
      const rawX = pageWidth * (xPercent / 100);
      const rawYTop = pageHeight * (yPercent / 100);

      const boxX = Math.min(Math.max(rawX, 0), pageWidth - boxWidth);
      const boxY = Math.min(Math.max(pageHeight - rawYTop - boxHeight, 0), pageHeight - boxHeight);

      const layoutEntry: SignatureFieldLayoutItem = {
        ...field,
        page_number: pageNumber,
        x_percent: xPercent,
        y_percent: yPercent,
        width_percent: widthPercent,
        height_percent: heightPercent,
      };

      const shouldAutoFill = fieldType === "signature" && targetRoles.includes(role);

      if (shouldAutoFill) {
        page.drawRectangle({
          x: boxX,
          y: boxY,
          width: boxWidth,
          height: boxHeight,
          borderColor: rgb(0.15, 0.32, 0.58),
          borderWidth: 1.6,
          color: rgb(0.92, 0.95, 1),
          opacity: 0.2,
        });

        const aspectRatio = signatureImage.width / signatureImage.height;
        let drawWidth = boxWidth * 0.88;
        let drawHeight = drawWidth / aspectRatio;

        if (drawHeight > boxHeight * 0.65) {
          drawHeight = boxHeight * 0.65;
          drawWidth = drawHeight * aspectRatio;
        }

        const imageX = boxX + (boxWidth - drawWidth) / 2;
        const imageY = boxY + (boxHeight - drawHeight) / 2 + boxHeight * 0.08;

        page.drawImage(signatureImage, {
          x: imageX,
          y: imageY,
          width: drawWidth,
          height: drawHeight,
        });

        if (ceoSignature.typed_name) {
          page.drawText(ceoSignature.typed_name, {
            x: boxX + 6,
            y: boxY + 6,
            size: 10,
            font: fontBold,
            color: rgb(0.18, 0.28, 0.46),
          });
        }

        layoutEntry.auto_filled = true;
        layoutEntry.rendered_value = ceoSignature.typed_name ?? null;
        layoutEntry.signature_data_url = ceoSignature.signature_png_base64 ?? null;
        layoutEntry.signed_at = appliedAt;
        layoutEntry.auto_filled_by = "SYSTEM_CEO_SIGNATURE";

        updatedRoles[role] = true;
        ceoSignatureApplied = true;
      } else {
        page.drawRectangle({
          x: boxX,
          y: boxY,
          width: boxWidth,
          height: boxHeight,
          borderColor: rgb(0.2, 0.35, 0.65),
          borderWidth: 1,
          color: rgb(0.92, 0.95, 1),
          opacity: 0.1,
        });

        page.drawText((field.label || `${fieldType.toUpperCase()} (${field.signer_role || "Signer"})`).toString(), {
          x: boxX + 6,
          y: boxY + boxHeight - 14,
          size: 9,
          font: fontRegular,
          color: rgb(0.16, 0.24, 0.45),
        });
      }

      updatedLayout.push(layoutEntry);
    }

    if (!ceoSignatureApplied) {
      return new Response(
        JSON.stringify({ ok: false, error: "No CEO signature fields were applied" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const outputPdfBytes = await pdfDoc.save();
    const storagePath = `executive_docs/pre_signed/${document_id}.pdf`;

    const { error: uploadError } = await supabaseClient.storage
      .from("documents")
      .upload(storagePath, outputPdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from("documents")
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData?.publicUrl;

    const { data: updatedDocument, error: updateError } = await supabaseClient
      .from("executive_documents")
      .update({
        file_url: publicUrl ?? document.file_url,
        signature_field_layout: updatedLayout,
        signer_roles: updatedRoles,
      })
      .eq("id", document_id)
      .select()
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ ok: true, document: updatedDocument, file_url: publicUrl ?? document.file_url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Failed to apply CEO signature layout:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

