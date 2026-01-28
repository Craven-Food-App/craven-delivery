-- ==============================================================================
-- EXECUTIVE STOCK CERTIFICATE - FORMAL TEMPLATE
-- ==============================================================================
-- This is for C-suite executives with real equity value.
-- Foundational certificates remain separate and unchanged.
-- ==============================================================================

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
      margin: 0.18in 0 0.12in;
    }

    .meta-row{
      position: relative;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
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
      margin: 0.15in 0 0.05in;
      font-size: 17pt;
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
      margin: 0.08in auto 0.14in;
    }

    .center-block{
      position: relative;
      z-index: 2;
      text-align: center;
      padding: 0 0.6in;
    }

    .center-lead{
      font-size: 12pt;
      color: var(--muted);
      margin-bottom: 0.12in;
      font-style: italic;
    }

    .name-row{
      display: inline-flex;
      align-items: baseline;
      gap: 10px;
      padding: 0.08in 0.15in 0.06in;
      border-bottom: 1px solid var(--rule);
      margin-bottom: 0.10in;
    }

    .label{
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: var(--ink);
      font-weight: 600;
    }

    .value{
      font-family: "Georgia", "Times New Roman", serif;
      font-size: 13pt;
      font-weight: 700;
      color: var(--ink);
    }

    .holder-lead{
      font-size: 12pt;
      color: var(--muted);
      margin: 0.08in 0 0.10in;
    }

    .kv{
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px 18px;
      width: 4.2in;
      margin: 0 auto 0.08in;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
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

    .legal-text{
      margin: 0.08in auto;
      width: 82%;
      font-size: 10.5pt;
      color: var(--ink);
      line-height: 1.4;
      text-align: justify;
    }

    .lower{
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.30in;
      padding: 0.18in 0.6in 0;
      margin-top: 0.08in;
    }

    .block h3{
      margin: 0 0 0.08in;
      font-size: 12.5pt;
      font-weight: 700;
    }
    .block p{
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      color: #222;
      line-height: 1.4;
    }

    .witness-block{
      position: relative;
      z-index: 2;
      text-align: center;
      margin-top: 0.12in;
      font-size: 10.5pt;
      font-style: italic;
      color: var(--muted);
    }

    .signature-row{
      position: absolute;
      left: 0.6in;
      right: 0.6in;
      bottom: 0.85in;
      z-index: 3;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4in;
    }

    .sig-block{
      text-align: center;
    }
    .sig-img{
      width: 2.3in;
      height: auto;
      display: block;
      margin: 0 auto 0.04in;
    }
    .sig-line{
      border-top: 1px solid var(--ink);
      margin: 0.05in auto 0.04in;
      width: 2.5in;
    }
    .sig-name{
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 700;
      font-size: 10.5pt;
      margin: 0;
    }
    .sig-title{
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      color: var(--muted);
      margin: 0.02in 0 0;
    }

    .footer{
      position: absolute;
      left: 0.6in;
      right: 0.6in;
      bottom: 0.32in;
      z-index: 2;
      border-top: 1px solid var(--rule);
      padding-top: 0.08in;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      color: var(--muted);
      text-align: center;
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

    <!-- Watermark C logo -->
    <img class="watermark" src="{{watermark_url}}" alt="Watermark" />

    <!-- Header logo -->
    <div class="header">
      <img class="logo" src="{{logo_url}}" alt="Company Logo" />
    </div>

    <div class="subhead">A Delaware Corporation</div>

    <div class="rule"></div>

    <div class="meta-row">
      <div class="meta-left">
        Certificate No.: <strong>{{certificate_number}}</strong>
      </div>
      <div class="meta-right">
        Authorized by Board Resolution dated {{resolution_date}}
      </div>
    </div>

    <div class="rule"></div>

    <div class="title">COMMON STOCK CERTIFICATE</div>
    <div class="title-rule"></div>

    <div class="center-block">
      <div class="center-lead">THIS CERTIFIES THAT</div>

      <div class="name-row">
        <div class="label">Shareholder:</div>
        <div class="value">{{shareholder_name}}</div>
      </div>

      <div class="holder-lead">is the registered holder of</div>

      <div class="kv">
        <div class="k">Number of Shares:</div>
        <div class="v">{{shares_amount}}</div>

        <div class="k">Class of Stock:</div>
        <div class="v">{{share_class}}</div>

        <div class="k">Par Value per Share:</div>
        <div class="v">$0.0001</div>

        <div class="k">Date of Issuance:</div>
        <div class="v">{{issue_date}}</div>
      </div>

      <div class="legal-text">
        of fully paid and non-assessable shares of Common Stock of <strong>{{company_name}}</strong> (the "Corporation"), 
        a Delaware corporation, transferable only on the books of the Corporation by the holder hereof in person or by 
        duly authorized attorney upon surrender of this Certificate properly endorsed. This Certificate and the shares 
        represented hereby are issued and shall be held subject to all of the provisions of the Corporation''s Certificate 
        of Incorporation and Bylaws, as amended from time to time (copies of which are on file with the Corporation and 
        available for inspection), and to any applicable stockholders'' agreements or equity incentive plans, and the holder 
        of this Certificate, by acceptance hereof, assents to and is bound by such provisions.
      </div>
    </div>

    <div class="lower">
      <div class="block">
        <h3>Voting Rights & Preferences</h3>
        <p>
          The shares of Common Stock represented by this Certificate carry full voting rights (one vote per share) 
          on all matters submitted to stockholders. These shares participate equally with all other shares of Common Stock 
          in dividends and distributions, if and when declared by the Board of Directors, and in the distribution of assets 
          upon liquidation or dissolution of the Corporation.
        </p>
      </div>

      <div class="block">
        <h3>Transfer Restrictions</h3>
        <p>
          The transfer of the shares represented by this Certificate is restricted by the terms of the Corporation''s 
          governing documents and may also be subject to restrictions under federal and state securities laws, rights of 
          first refusal, co-sale rights, and other transfer restrictions as set forth in any applicable stockholders'' 
          agreement or equity plan.
        </p>
      </div>
    </div>

    <div class="witness-block">
      IN WITNESS WHEREOF, the Corporation has caused this Certificate to be executed by its duly authorized officers.
    </div>

    <!-- Signature Row -->
    <div class="signature-row">
      <div class="sig-block">
        <img class="sig-img" src="{{signature_url}}" alt="CEO Signature" />
        <div class="sig-line"></div>
        <p class="sig-name">Torrance A. Stroman</p>
        <p class="sig-title">Chief Executive Officer</p>
      </div>

      <div class="sig-block">
        <div class="sig-line"></div>
        <p class="sig-name">Corporate Secretary</p>
        <p class="sig-title">{{company_name}}</p>
      </div>
    </div>

    <div class="footer">
      This certificate may be issued in digital or physical form. Share ownership is determined by the Corporation''s official stock transfer ledger and cap table.
    </div>
  </div>
</body>
</html>
'
WHERE template_key = 'stock_certificate';

COMMENT ON COLUMN public.document_templates.html_content IS
  'HTML templates for generated documents. stock_certificate is formal executive-grade certificate for C-suite and officers with real equity value.';

