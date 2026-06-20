import {
  CX_MSA_TEXT,
  CX_CARRIER_AGREEMENT_TEXT,
  CX_INDEMNIFICATION_TEXT,
} from "./agreements";

export interface CXPrintData {
  legal_name?: string | null;
  dba?: string | null;
  ein?: string | null;
  owner_name?: string | null;
  owner_title?: string | null;
  owner_email?: string | null;
  signature_typed?: string | null;
  certified_truthful?: boolean | null;
  ach_intent?: boolean | null;
  msa_signed_at?: string | null;
  carrier_agreement_signed_at?: string | null;
  indemnification_signed_at?: string | null;
  signature_payload?: {
    typed_name?: string;
    typed?: string;
    signed_at?: string;
    ip_address?: string;
    user_agent?: string;
    consent_text?: string;
  } | null;
  id?: string | null;
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

function agreementSection(title: string, body: string, signedAt?: string | null): string {
  const paragraphs = body
    .split(/\n\n+/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `
    <section class="agreement">
      <h2>${esc(title)}</h2>
      <div class="status">${signedAt ? `Signed ${fmtDate(signedAt)}` : "Not yet signed"}</div>
      <div class="body">${paragraphs}</div>
    </section>
  `;
}

export function buildCXAgreementsHTML(app: CXPrintData): string {
  const typed =
    app.signature_typed ||
    app.signature_payload?.typed_name ||
    app.signature_payload?.typed ||
    "";
  const consent =
    app.signature_payload?.consent_text ||
    "I agree to sign electronically under the federal E-SIGN Act and applicable state law, and I certify that the information I have provided is true and accurate.";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Crave'N Express — Signed Agreements — ${esc(app.legal_name || "")}</title>
<style>
  @page { size: Letter; margin: 0.75in; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.55; font-size: 11.5pt; }
  header.brand { border-bottom: 3px solid #f97316; padding-bottom: 10px; margin-bottom: 18px; display:flex; justify-content:space-between; align-items:flex-end; }
  header.brand .title { font-size: 20pt; font-weight: 800; letter-spacing: 0.5px; color:#0F172A; }
  header.brand .sub { font-size: 9pt; color: #475569; text-transform: uppercase; letter-spacing: 1px; }
  .carrier-block { background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:6px; margin-bottom:18px; font-size:10.5pt; }
  .carrier-block .row { display:flex; gap:24px; flex-wrap:wrap; }
  .carrier-block .lbl { color:#64748b; font-size:9pt; text-transform:uppercase; letter-spacing:0.5px; }
  section.agreement { page-break-inside: avoid; margin-bottom: 28px; }
  section.agreement h2 { font-size: 14pt; color:#0F172A; border-bottom:1px solid #cbd5e1; padding-bottom:4px; margin-bottom:6px; }
  section.agreement .status { font-size:9.5pt; color:#16a34a; font-weight:600; margin-bottom:8px; }
  section.agreement .body p { margin: 0 0 8px 0; text-align: justify; }
  .sig-block { margin-top: 30px; page-break-inside: avoid; border-top:2px solid #0F172A; padding-top:14px; }
  .sig-block h3 { font-size:12pt; margin:0 0 10px 0; color:#0F172A; }
  .sig-line { font-family: 'Brush Script MT','Lucida Handwriting',cursive; font-size: 28pt; color:#0F172A; border-bottom:1px solid #94a3b8; padding-bottom:4px; margin: 6px 0 4px 0; min-height: 40px; }
  .sig-meta { font-size: 9pt; color:#475569; margin-top: 8px; }
  .sig-meta .row { margin: 2px 0; }
  .consent { font-size:9pt; color:#334155; font-style: italic; margin-top:10px; border-left:3px solid #f97316; padding-left:8px; }
  footer.foot { margin-top:24px; padding-top:8px; border-top:1px solid #e2e8f0; font-size:8.5pt; color:#64748b; text-align:center; }
  @media print { .no-print { display:none !important; } }
  .no-print { position: fixed; top: 10px; right: 10px; }
  .no-print button { background:#f97316; color:#fff; border:0; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-family: system-ui, sans-serif; }
</style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">Print / Save PDF</button></div>
  <header class="brand">
    <div>
      <div class="title">CRAVE'N EXPRESS</div>
      <div class="sub">Carrier Onboarding — Signed Agreements Packet</div>
    </div>
    <div style="text-align:right; font-size:9pt; color:#475569;">
      <div>Application: <strong>${esc((app.id || "").slice(0, 8).toUpperCase())}</strong></div>
      <div>Generated: ${esc(new Date().toLocaleString())}</div>
    </div>
  </header>

  <div class="carrier-block">
    <div class="row">
      <div><div class="lbl">Carrier Legal Name</div><div><strong>${esc(app.legal_name || "—")}</strong></div></div>
      ${app.dba ? `<div><div class="lbl">DBA</div><div>${esc(app.dba)}</div></div>` : ""}
      ${app.ein ? `<div><div class="lbl">EIN</div><div>${esc(app.ein)}</div></div>` : ""}
    </div>
    <div class="row" style="margin-top:8px;">
      <div><div class="lbl">Authorized Representative</div><div>${esc(app.owner_name || "—")}${app.owner_title ? ` <span style="color:#64748b;">(${esc(app.owner_title)})</span>` : ""}</div></div>
      ${app.owner_email ? `<div><div class="lbl">Email</div><div>${esc(app.owner_email)}</div></div>` : ""}
    </div>
  </div>

  ${agreementSection("Master Services Agreement", CX_MSA_TEXT, app.msa_signed_at)}
  ${agreementSection("Independent Carrier Agreement", CX_CARRIER_AGREEMENT_TEXT, app.carrier_agreement_signed_at)}
  ${agreementSection("Indemnification & Insurance Addendum", CX_INDEMNIFICATION_TEXT, app.indemnification_signed_at)}

  <div class="sig-block">
    <h3>Electronic Signature (E-SIGN Act)</h3>
    <div class="sig-line">${esc(typed) || "&nbsp;"}</div>
    <div class="sig-meta">
      <div class="row"><strong>Signed by:</strong> ${esc(typed || "—")} ${app.owner_title ? `, ${esc(app.owner_title)}` : ""}</div>
      <div class="row"><strong>On behalf of:</strong> ${esc(app.legal_name || "—")}</div>
      <div class="row"><strong>Signed at:</strong> ${fmtDate(app.signature_payload?.signed_at)}</div>
      <div class="row"><strong>IP address:</strong> ${esc(app.signature_payload?.ip_address || "—")}</div>
      <div class="row"><strong>User agent:</strong> ${esc(app.signature_payload?.user_agent || "—")}</div>
      <div class="row"><strong>Certified truthful:</strong> ${app.certified_truthful ? "Yes" : "—"} &nbsp;·&nbsp; <strong>ACH payout intent:</strong> ${app.ach_intent ? "Yes" : "—"}</div>
    </div>
    <div class="consent">"${esc(consent)}"</div>
  </div>

  <footer class="foot">
    Crave'N USA, Inc. — Crave'N Express Carrier Program · This document is an electronic record of agreements executed via the CX onboarding portal and is legally binding under the federal E-SIGN Act (15 U.S.C. § 7001 et seq.) and applicable state law.
  </footer>
</body></html>`;
}

export function openCXAgreementsPrintWindow(app: CXPrintData): void {
  const html = buildCXAgreementsHTML(app);
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
  if (!w) {
    // Popup blocked — fallback: download as HTML file
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cx-agreements-${(app.id || "packet").slice(0, 8)}.html`;
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