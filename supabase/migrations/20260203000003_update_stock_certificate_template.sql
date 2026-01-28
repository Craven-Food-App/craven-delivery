-- ==============================================================================
-- UPDATE EXECUTIVE STOCK CERTIFICATE TEMPLATE
-- ==============================================================================
-- Aligns document_templates.stock_certificate with the new Crave'n landscape
-- certificate design used for Foundational Invites, adapted for executives.
--
-- Placeholders used here MUST match governance-generate-certificate:
--   {{certificate_number}}
--   {{shareholder_name}}
--   {{shares_amount}}
--   {{share_class}}
--   {{company_name}}
--   {{state}}
--   {{issue_date}}
-- ==============================================================================

DO $$
BEGIN
  UPDATE public.document_templates
  SET html_content = '
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Stock Certificate - {{shareholder_name}}</title>

  <style>
    @page {
      size: Letter landscape;
      margin: 0.5in;
    }

    :root{
      --ink: #111;
      --muted: #666;
      --rule: rgba(0,0,0,0.18);
      --accent: #f57c00;
    }

    *{ box-sizing: border-box; }
    body{
      margin: 0;
      font-family: "Georgia", "Times New Roman", serif;
      color: var(--ink);
      background: #fff;
    }

    .page{
      position: relative;
      width: 100%;
      height: calc(8.5in - 1in);
      padding: 0;
      overflow: hidden;
    }

    .bg-texture{
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 20% 10%, rgba(0,0,0,0.02), transparent 45%),
        radial-gradient(circle at 80% 80%, rgba(0,0,0,0.02), transparent 45%);
      pointer-events: none;
      z-index: 0;
    }

    .watermark{
      position: absolute;
      right: 0.35in;
      bottom: 0.45in;
      width: 3.35in;
      height: auto;
      opacity: 0.18;
      z-index: 1;
      pointer-events: none;
      filter: grayscale(0%);
    }

    .header{
      position: relative;
      z-index: 2;
      display: flex;
      justify-content: center;
      align-items: center;
      padding-top: 0.05in;
    }
    .logo{
      height: 0.72in;
      width: auto;
    }

    .subhead{
      position: relative;
      z-index: 2;
      text-align: center;
      margin-top: 0.08in;
      font-size: 12.5pt;
      color: var(--muted);
    }

    .rule{
      position: relative;
      z-index: 2;
      height: 1px;
      background: var(--rule);
      margin: 0.18in 0 0.14in;
    }

    .meta-row{
      position: relative;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: var(--ink);
    }
    .meta-left{
      white-space: nowrap;
    }
    .meta-right{
      text-align: right;
      white-space: nowrap;
    }

    .title{
      position: relative;
      z-index: 2;
      text-align: center;
      margin: 0.18in 0 0.06in;
      font-size: 18pt;
      letter-spacing: 0.8px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .title-rule{
      position: relative;
      z-index: 2;
      height: 1px;
      background: var(--rule);
      width: 72%;
      margin: 0.10in auto 0.18in;
    }

    .center-block{
      position: relative;
      z-index: 2;
      text-align: center;
      padding: 0 0.6in;
    }

    .center-lead{
      font-size: 12.5pt;
      color: var(--muted);
      margin-bottom: 0.14in;
    }

    .name-row{
      display: inline-flex;
      align-items: baseline;
      gap: 10px;
      padding: 0.08in 0.15in 0.06in;
      border-bottom: 1px solid var(--rule);
      margin-bottom: 0.12in;
    }

    .label{
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12pt;
      color: var(--ink);
      font-weight: 600;
    }

    .value{
      font-family: "Georgia", "Times New Roman", serif;
      font-size: 14pt;
      font-weight: 700;
      color: var(--ink);
    }

    .holder-lead{
      font-size: 12.5pt;
      color: var(--muted);
      margin: 0.08in 0 0.10in;
    }

    .kv{
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px 18px;
      width: 3.8in;
      margin: 0 auto 0.10in;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11.5pt;
    }
    .kv .k{
      text-align: right;
      color: var(--muted);
      font-weight: 600;
    }
    .kv .v{
      text-align: left;
      color: var(--ink);
      font-weight: 700;
    }

    .mid-sentence{
      margin: 0.10in auto 0.10in;
      width: 80%;
      font-size: 11.5pt;
      color: var(--ink);
      line-height: 1.35;
    }

    .lower{
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35in;
      padding: 0.25in 0.6in 0;
      margin-top: 0.10in;
    }

    .block h3{
      margin: 0 0 0.10in;
      font-size: 13.5pt;
      font-weight: 700;
    }
    .block p{
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.8pt;
      color: #222;
      line-height: 1.45;
    }

    .lower-bottom{
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35in;
      padding: 0.18in 0.6in 0;
    }

    .governing{
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      margin-top: 0.20in;
    }
    .governing .k{
      font-weight: 700;
      color: var(--ink);
    }
    .governing .v{
      margin-top: 0.05in;
      color: #222;
      line-height: 1.45;
    }

    .signature{
      position: absolute;
      right: 0.65in;
      bottom: 0.78in;
      z-index: 3;
      text-align: center;
      width: 2.9in;
    }
    .sig-name{
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 700;
      font-size: 11pt;
      margin: 0;
    }
    .sig-title{
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.8pt;
      color: var(--muted);
      margin: 0.02in 0 0;
    }

    .footer{
      position: absolute;
      left: 0.6in;
      right: 0.6in;
      bottom: 0.35in;
      z-index: 2;
      border-top: 1px solid var(--rule);
      padding-top: 0.10in;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      color: var(--muted);
    }

    .accent-line{
      position: absolute;
      top: 0.02in;
      left: 0.6in;
      right: 0.6in;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--accent), transparent);
      opacity: 0.35;
      z-index: 2;
    }
  </style>
</head>

<body>
  <div class="page">
    <div class="bg-texture"></div>
    <div class="accent-line"></div>

    <!-- Header -->
    <div class="header">
      <span class="logo">{{company_name}}</span>
    </div>

    <div class="subhead">Incorporated in {{state}}</div>

    <div class="rule"></div>

    <div class="meta-row">
      <div class="meta-left">
        Certificate No.: <strong>{{certificate_number}}</strong>
      </div>
      <div class="meta-right"></div>
    </div>

    <div class="rule"></div>

    <div class="title">STOCK CERTIFICATE</div>
    <div class="title-rule"></div>

    <div class="center-block">
      <div class="center-lead">This certifies that:</div>

      <div class="name-row">
        <div class="label">Shareholder Name:</div>
        <div class="value">{{shareholder_name}}</div>
      </div>

      <div class="holder-lead">is the record holder of:</div>

      <div class="kv">
        <div class="k">Number of Shares:</div>
        <div class="v">{{shares_amount}}</div>

        <div class="k">Class:</div>
        <div class="v">{{share_class}}</div>
      </div>

      <div class="mid-sentence">
        fully paid and non-assessable shares of stock of {{company_name}} (the "Company"),
        transferable only on the books of the Company by the holder hereof in person or by
        duly authorized attorney upon surrender of this Certificate properly endorsed.
      </div>
    </div>

    <div class="lower">
      <div class="block">
        <h3>Governing Documents</h3>
        <p>
          This Certificate and the shares represented hereby are subject to all of the provisions
          of the Company''s Certificate of Incorporation, Bylaws, and any applicable shareholders''
          or equity agreements (each as amended from time to time), and may be subject to
          restrictions on transfer under such documents and under applicable securities laws.
        </p>
      </div>

      <div class="block">
        <h3>Transfer Restrictions</h3>
        <p>
          The shares represented by this certificate may not be sold, assigned, pledged, or otherwise
          transferred except in compliance with applicable law and any restrictions set forth in the
          Company''s governing documents or equity agreements.
        </p>
      </div>
    </div>

    <div class="lower-bottom">
      <div class="governing">
        <div class="k">Governing Law</div>
        <div class="v">
          This certificate and the rights of the holder hereof shall be governed by and construed in
          accordance with the laws of the State of {{state}}, without regard to conflicts of law principles.
        </div>

        <div style="margin-top:0.12in;">
          <span class="k">Date of Issuance:</span>
          <span class="v" style="display:inline; margin-left:6px; font-weight:700; color:#111;">
            {{issue_date}}
          </span>
        </div>
      </div>

      <div></div>
    </div>

    <div class="footer">
      This certificate may be issued in digital form. Ownership is determined by the Company''s official stock ledger.
    </div>
  </div>
</body>
</html>
'
  WHERE template_key = 'stock_certificate';
END $$;

COMMENT ON COLUMN public.document_templates.html_content IS
  'HTML templates for generated documents. stock_certificate now uses Crave''n landscape design consistent with foundational certificates.';


