import { ESIGN_DISCLOSURE, FEEDER_AGREEMENTS } from "./agreements";
import type { FeederSignatureRow } from "./recordSignature";

export interface FeederPrintApplicant {
  id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
}

function esc(s: any): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(s?: string | null): string {
  if (!s) return "—";
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

function paragraphs(body: string): string {
  return body
    .split(/\n\n+/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function signatureBlock(sig: FeederSignatureRow | undefined, applicantName: string): string {
  if (!sig) {
    return `<div class="sig-block missing">
      <div class="sig-line">&nbsp;</div>
      <div class="sig-meta"><em>Not yet signed.</em></div>
    </div>`;
  }
  const typed = sig.typed_name || applicantName;
  return `
    <div class="sig-block">
      <div class="sig-line">${esc(typed)}</div>
      <div class="sig-meta">
        <div><strong>Signed by:</strong> ${esc(typed)}</div>
        <div><strong>Signed at:</strong> ${fmtDate(sig.signed_at)}</div>
        <div><strong>Agreement version:</strong> ${esc(sig.agreement_version || "—")}</div>
        <div><strong>IP address:</strong> ${esc(sig.ip_address || "—")}</div>
        <div><strong>User agent:</strong> ${esc(sig.user_agent || "—")}</div>
      </div>
      <div class="consent">"${esc(sig.consent_statement || "")}"</div>
    </div>`;
}

function agreementSection(
  title: string,
  body: string,
  sig: FeederSignatureRow | undefined,
  applicantName: string
): string {
  return `
    <section class="agreement">
      <h2>${esc(title)}</h2>
      <div class="status ${sig ? "ok" : "pending"}">
        ${sig ? `Signed ${fmtDate(sig.signed_at)}` : "Not yet signed"}
      </div>
      <div class="body">${paragraphs(body)}</div>
      ${signatureBlock(sig, applicantName)}
    </section>
  `;
}

export function buildFeederAgreementsHTML(
  applicant: FeederPrintApplicant,
  signatures: FeederSignatureRow[]
): string {
  const name = `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim() || "—";
  const sigByType = new Map(signatures.map((s) => [s.agreement_type, s]));

  const sections = [
    agreementSection(FEEDER_AGREEMENTS.BACKGROUND_CHECK.title, FEEDER_AGREEMENTS.BACKGROUND_CHECK.text, sigByType.get(FEEDER_AGREEMENTS.BACKGROUND_CHECK.type), name),
    agreementSection(FEEDER_AGREEMENTS.CRIMINAL_HISTORY.title, FEEDER_AGREEMENTS.CRIMINAL_HISTORY.text, sigByType.get(FEEDER_AGREEMENTS.CRIMINAL_HISTORY.type), name),
    agreementSection(FEEDER_AGREEMENTS.FACIAL_IMAGE.title, FEEDER_AGREEMENTS.FACIAL_IMAGE.text, sigByType.get(FEEDER_AGREEMENTS.FACIAL_IMAGE.type), name),
    agreementSection(FEEDER_AGREEMENTS.ELECTRONIC_1099.title, FEEDER_AGREEMENTS.ELECTRONIC_1099.text, sigByType.get(FEEDER_AGREEMENTS.ELECTRONIC_1099.type), name),
    agreementSection(FEEDER_AGREEMENTS.W9.title, FEEDER_AGREEMENTS.W9.text, sigByType.get(FEEDER_AGREEMENTS.W9.type), name),
    agreementSection(FEEDER_AGREEMENTS.ICA.title, FEEDER_AGREEMENTS.ICA.text, sigByType.get(FEEDER_AGREEMENTS.ICA.type), name),
  ].join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Crave'N Feeder — Signed Agreements Packet — ${esc(name)}</title>
<style>
  @page { size: Letter; margin: 0.75in; }
  body { font-family: Georgia, 'Times New Roman', serif; color:#111; line-height:1.55; font-size:11.5pt; }
  header.brand { border-bottom:3px solid #f97316; padding-bottom:10px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:flex-end; }
  header.brand .title { font-size:20pt; font-weight:800; color:#0F172A; letter-spacing:0.5px; }
  header.brand .sub { font-size:9pt; color:#475569; text-transform:uppercase; letter-spacing:1px; }
  .applicant-block { background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:6px; margin-bottom:18px; font-size:10.5pt; }
  .applicant-block .row { display:flex; gap:24px; flex-wrap:wrap; }
  .applicant-block .lbl { color:#64748b; font-size:9pt; text-transform:uppercase; letter-spacing:0.5px; }
  .esign-disclosure { background:#fff7ed; border:1px solid #fed7aa; border-left:4px solid #f97316; padding:10px 14px; margin-bottom:22px; font-size:10pt; }
  .esign-disclosure h3 { margin:0 0 6px 0; color:#9a3412; font-size:11pt; }
  section.agreement { page-break-inside: avoid; margin-bottom:30px; }
  section.agreement h2 { font-size:14pt; color:#0F172A; border-bottom:1px solid #cbd5e1; padding-bottom:4px; margin-bottom:6px; }
  section.agreement .status.ok { font-size:9.5pt; color:#16a34a; font-weight:600; margin-bottom:8px; }
  section.agreement .status.pending { font-size:9.5pt; color:#b45309; font-weight:600; margin-bottom:8px; }
  section.agreement .body p { margin:0 0 8px 0; text-align:justify; }
  .sig-block { margin-top:18px; border-top:2px solid #0F172A; padding-top:10px; page-break-inside: avoid; }
  .sig-block.missing { border-top:2px dashed #cbd5e1; }
  .sig-line { font-family:'Brush Script MT','Lucida Handwriting',cursive; font-size:24pt; color:#0F172A; border-bottom:1px solid #94a3b8; padding-bottom:4px; min-height:36px; }
  .sig-meta { font-size:9pt; color:#475569; margin-top:6px; }
  .sig-meta div { margin:1px 0; }
  .consent { font-size:9pt; color:#334155; font-style:italic; margin-top:8px; border-left:3px solid #f97316; padding-left:8px; }
  footer.foot { margin-top:24px; padding-top:8px; border-top:1px solid #e2e8f0; font-size:8.5pt; color:#64748b; text-align:center; }
  @media print { .no-print { display:none !important; } }
  .no-print { position: fixed; top: 10px; right: 10px; }
  .no-print button { background:#f97316; color:#fff; border:0; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-family: system-ui, sans-serif; }
</style>
</head><body>
  <div class="no-print"><button onclick="window.print()">Print / Save PDF</button></div>
  <header class="brand">
    <div>
      <div class="title">CRAVE'N FEEDER</div>
      <div class="sub">Driver Onboarding — Signed Agreements Packet</div>
    </div>
    <div style="text-align:right; font-size:9pt; color:#475569;">
      ${applicant.id ? `<div>Application: <strong>${esc(String(applicant.id).slice(0,8).toUpperCase())}</strong></div>` : ""}
      <div>Generated: ${esc(new Date().toLocaleString())}</div>
    </div>
  </header>

  <div class="applicant-block">
    <div class="row">
      <div><div class="lbl">Feeder</div><div><strong>${esc(name)}</strong></div></div>
      ${applicant.email ? `<div><div class="lbl">Email</div><div>${esc(applicant.email)}</div></div>` : ""}
      ${applicant.phone ? `<div><div class="lbl">Phone</div><div>${esc(applicant.phone)}</div></div>` : ""}
    </div>
    ${(applicant.city || applicant.state) ? `<div class="row" style="margin-top:8px;">
      <div><div class="lbl">Location</div><div>${esc([applicant.city, applicant.state, applicant.zip_code].filter(Boolean).join(", "))}</div></div>
    </div>` : ""}
  </div>

  <div class="esign-disclosure">
    <h3>E-SIGN Act Consent on File</h3>
    ${paragraphs(ESIGN_DISCLOSURE)}
  </div>

  ${sections}

  <footer class="foot">
    Crave'N USA, Inc. — Feeder Onboarding · This document is an electronic record of agreements executed in the Crave'N Feeder onboarding flow and is legally binding under the federal E-SIGN Act (15 U.S.C. § 7001 et seq.) and applicable state law.
  </footer>
</body></html>`;
}

export function openFeederAgreementsPrintWindow(
  applicant: FeederPrintApplicant,
  signatures: FeederSignatureRow[]
): void {
  const html = buildFeederAgreementsHTML(applicant, signatures);
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
  if (!w) {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feeder-agreements-${(applicant.id || "packet").toString().slice(0,8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}