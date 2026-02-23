import { Router } from "express";
import { z } from "zod";
import { renderHtml, templates } from "../templates/index.js";
import { htmlToPdfBuffer } from "../pdf.js";
import { supabase } from "../supabase.js";
import { sendDocEmail } from "../mailer.js";
import { env } from "../env.js";

const r = Router();

const GenerateSchema = z.object({
  template_id: z.string(),
  data: z.record(z.any()),
  officer_name: z.string(),
  role: z.string(),
  equity: z.number().optional()
});

r.get("/templates", (_req, res) => {
  res.json(templates.map(t => ({ id: t.id, title: t.title, placeholders: t.placeholders })));
});

r.post("/generate", async (req, res) => {
  try {
    const { template_id, data, officer_name, role, equity } = GenerateSchema.parse(req.body);

    const html = renderHtml(template_id, data);

    const pdf = await htmlToPdfBuffer(html);

    const { data: upload, error } = await supabase.storage
      .from(env.STORAGE_BUCKET)
      .upload(`executive_docs/${crypto.randomUUID()}.pdf`, pdf, { contentType: "application/pdf", upsert: false });

    if (error) throw error;

    const file_url = supabase.storage.from(env.STORAGE_BUCKET).getPublicUrl(upload.path).data.publicUrl;

    const { data: row, error: dberr } = await supabase
      .from("executive_documents")
      .insert({ type: template_id, officer_name, role, equity, status: "generated", file_url })
      .select()
      .single();

    if (dberr) throw dberr;

    res.json({ ok: true, document: row, htmlPreview: html, file_url });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

const SignSchema = z.object({
  document_id: z.string(),
  signature_company_html: z.string().optional(),
  signature_executive_html: z.string().optional(),
  data: z.record(z.any()).optional()
});

// Simple "sign" by re-rendering HTML with signature <img> tags injected, then PDF again
r.post("/sign", async (req, res) => {
  try {
    const { document_id, signature_company_html, signature_executive_html, data: clientData } = SignSchema.parse(req.body);

    // load stored doc to retrieve template + minimal data to re-render
    const { data: doc, error: docErr } = await supabase
      .from("executive_documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docErr || !doc) throw new Error("Document not found");

    // Re-render from the same template inputs with signatures
    const renderData = clientData || {};
    renderData.signature_company_html = signature_company_html || "";
    renderData.signature_executive_html = signature_executive_html || "";

    const html = renderHtml(doc.type, renderData);
    const pdf = await htmlToPdfBuffer(html);

    const { data: upload2, error: err2 } = await supabase.storage
      .from(env.STORAGE_BUCKET)
      .upload(`executive_docs/${crypto.randomUUID()}-signed.pdf`, pdf, { contentType: "application/pdf", upsert: false });

    if (err2) throw err2;

    const signed_url = supabase.storage.from(env.STORAGE_BUCKET).getPublicUrl(upload2.path).data.publicUrl;

    const { error: updErr } = await supabase
      .from("executive_documents")
      .update({ status: "signed", signed_file_url: signed_url })
      .eq("id", document_id);

    if (updErr) throw updErr;

    res.json({ ok: true, signed_file_url: signed_url });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

const EmailSchema = z.object({
  document_id: z.string(),
  to: z.string().email(),
  subject: z.string().default("Crave'n Executive Document"),
  message_html: z.string().default("Your document is attached and/or available via the portal.")
});

r.post("/email", async (req, res) => {
  try {
    const { document_id, to, subject, message_html } = EmailSchema.parse(req.body);

    const { data: doc, error } = await supabase
      .from("executive_documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (error || !doc) throw new Error("Document not found");

    const fileBuffer = doc.signed_file_url
      ? Buffer.from(await (await fetch(doc.signed_file_url)).arrayBuffer())
      : Buffer.from(await (await fetch(doc.file_url)).arrayBuffer());

    await sendDocEmail(
      to,
      subject,
      `${message_html}<br/><br/><a href="${doc.signed_file_url || doc.file_url}">Open Document</a>`,
      { filename: "document.pdf", content: fileBuffer }
    );

    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

export default r;

// ============ DRIVER DOCUMENTS ============
// Minimal driver ICA generation + email route
// Generates a PDF confirmation/ICA from provided fields, uploads to storage, and emails the driver

import type { Request, Response } from "express";

const DriverICASchema = z.object({
  driver_name: z.string(),
  driver_email: z.string().email(),
  signed_at: z.string().optional(), // ISO string
  contents_html: z.string().optional(), // optional pre-rendered HTML; if not provided, we render a simple confirmation
});

function buildDriverICAHtml(input: { driver_name: string; signed_at?: string }) {
  const when = input.signed_at ? new Date(input.signed_at) : new Date();
  const dateStr = when.toLocaleString();
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Independent Contractor Agreement</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
          h1 { color: #ff7a45; margin-bottom: 8px; }
          .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 16px; }
          .muted { color: #6b7280; }
          .section-title { font-weight: 700; margin-top: 16px; }
          ul { line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1>Independent Contractor Agreement (Receipt)</h1>
        <div class="muted">This document confirms your acceptance of the Independent Contractor Agreement with Crave'n.</div>
        <div class="card">
          <div><strong>Contractor:</strong> ${input.driver_name}</div>
          <div><strong>Signed At:</strong> ${dateStr}</div>
        </div>
        <div class="section-title">Summary</div>
        <p class="muted">You agreed to the Crave'n Independent Contractor terms including relationship, compensation, compliance with applicable law, and confidentiality. Keep this receipt for your records.</p>
      </body>
    </html>
  `;
}

// POST /documents/driver/ica-email
r.post("/driver/ica-email", async (req: Request, res: Response) => {
  try {
    const { driver_name, driver_email, signed_at, contents_html } = DriverICASchema.parse(req.body);

    const html = contents_html && contents_html.trim().length > 0
      ? contents_html
      : buildDriverICAHtml({ driver_name, signed_at });

    const pdf = await htmlToPdfBuffer(html);

    // Upload to storage (optional but helpful for audit)
    const { data: upload, error: upErr } = await supabase.storage
      .from(env.STORAGE_BUCKET)
      .upload(`driver_docs/${crypto.randomUUID()}-ica.pdf`, pdf, { contentType: "application/pdf", upsert: false });
    if (upErr) throw upErr;
    const file_url = supabase.storage.from(env.STORAGE_BUCKET).getPublicUrl(upload.path).data.publicUrl;

    // Email the driver the attachment and a link
    await sendDocEmail(
      driver_email,
      "Your Crave'n Contractor Agreement Receipt",
      `Hello ${driver_name},<br/><br/>Attached is your agreement receipt. You can also access it here: <a href="${file_url}">${file_url}</a>.<br/><br/>Welcome to Crave'n!`,
      { filename: "Craven-ICA.pdf", content: pdf }
    );

    res.json({ ok: true, file_url });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

