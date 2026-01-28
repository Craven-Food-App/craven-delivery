-- Create Foundational Support Certificate Template
-- This is separate from the executive stock certificate template (template_key = 'stock_certificate')
-- This template is specifically for foundational support acknowledgment certificates

INSERT INTO public.document_templates (
  template_key,
  name,
  category,
  html_content,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'foundational_support_certificate',
  'Foundational Support Certificate',
  'foundational',
  '<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Foundational Support Certificate - Crave''n Inc.</title>

  <style>
    @page {
      size: Letter landscape;
      margin: 0;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      margin: 0;
      padding: 20px;
      background: #2c2c2c;
      font-family: ''Georgia'', ''Times New Roman'', serif;
    }

    .certificate {
      width: 11in;
      height: 8.5in;
      margin: 0 auto;
      background: linear-gradient(135deg, #fdfbf7 0%, #ffffff 50%, #fdfbf7 100%);
      position: relative;
      box-shadow: 0 8px 40px rgba(0,0,0,0.3);
      overflow: visible;
    }

    /* WATERMARK LOGO */
    .watermark-logo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 5.5in;
      height: auto;
      opacity: 0.04;
      z-index: 0;
      pointer-events: none;
    }

    /* BORDERS */
    .outer-border {
      position: absolute;
      inset: 0.2in;
      border: 6px solid #ff6a00;
      z-index: 1;
      pointer-events: none;
    }

    .inner-border {
      position: absolute;
      inset: 0.3in;
      border: 2px solid #ff8533;
      z-index: 1;
      pointer-events: none;
    }

    /* CORNER ORNAMENTS */
    .corner-dot {
      position: absolute;
      width: 40px;
      height: 40px;
      background: radial-gradient(circle, #ffb366, #ff6a00);
      border: 3px solid #ff6a00;
      border-radius: 50%;
      z-index: 2;
    }
    .corner-dot.tl { top: 0.1in; left: 0.1in; }
    .corner-dot.tr { top: 0.1in; right: 0.1in; }
    .corner-dot.bl { bottom: 0.1in; left: 0.1in; }
    .corner-dot.br { bottom: 0.1in; right: 0.1in; }

    /* CONTENT - PROPERLY CONSTRAINED */
    .content {
      position: absolute;
      top: 0.45in;
      left: 0.5in;
      right: 0.5in;
      bottom: 0.45in;
      z-index: 3;
      display: flex;
      flex-direction: column;
    }

    /* HEADER */
    .header {
      text-align: center;
      border-bottom: 3px double #ff6a00;
      padding-bottom: 0.12in;
      margin-bottom: 0.1in;
    }

    .company-name {
      font-size: 44px;
      font-weight: 900;
      letter-spacing: 8px;
      color: #ff6a00;
      margin-bottom: 0.05in;
    }

    .incorporation {
      font-size: 11px;
      color: #666;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-family: ''Arial'', sans-serif;
    }

    /* DIVIDER */
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #ff6a00, transparent);
      margin: 0.08in 0;
    }

    /* CERTIFICATE TYPE */
    .cert-type {
      text-align: center;
      padding: 0.08in 0;
      border-top: 2px solid #ff6a00;
      border-bottom: 2px solid #ff6a00;
      margin-bottom: 0.08in;
    }

    .cert-type h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #1a1a1a;
    }

    /* METADATA */
    .metadata {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.12in;
      font-family: ''Arial'', sans-serif;
      font-size: 10px;
      color: #333;
    }

    .metadata strong {
      color: #000;
      font-weight: 700;
    }

    /* CERTIFICATION */
    .certification {
      text-align: center;
      margin-bottom: 0.12in;
    }

    .this-certifies {
      font-size: 11px;
      font-style: italic;
      color: #666;
      margin-bottom: 0.1in;
      letter-spacing: 1px;
    }

    .shareholder-name {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
      padding-bottom: 0.05in;
      border-bottom: 2px solid #1a1a1a;
      display: inline-block;
      min-width: 4.5in;
      margin-bottom: 0.08in;
    }

    .holder-text {
      font-size: 11px;
      font-style: italic;
      color: #666;
      margin-bottom: 0.1in;
    }

    /* SHARE DETAILS - COMPACT */
    .share-details {
      background: rgba(255, 106, 0, 0.05);
      border: 1px solid rgba(255, 106, 0, 0.3);
      padding: 0.1in 0.25in;
      margin: 0 auto 0.12in;
      max-width: 5.5in;
      border-radius: 3px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.04in;
      font-family: ''Arial'', sans-serif;
      font-size: 10px;
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      font-weight: 600;
      color: #666;
    }

    .detail-value {
      font-weight: 700;
      color: #1a1a1a;
      text-align: right;
    }

    /* LEGAL TEXT - COMPACT */
    .legal-section {
      margin: 0.1in 0;
      padding: 0.08in 0;
      border-top: 1px solid rgba(0,0,0,0.12);
      border-bottom: 1px solid rgba(0,0,0,0.12);
    }

    .legal-text {
      font-family: ''Arial'', sans-serif;
      font-size: 8px;
      line-height: 1.4;
      color: #333;
      text-align: justify;
      column-count: 2;
      column-gap: 0.25in;
    }

    .legal-text strong {
      color: #000;
    }

    /* BOTTOM SECTION - TWO COLUMNS SIDE BY SIDE */
    .bottom-section {
      display: grid;
      grid-template-columns: 1fr 1.8in;
      gap: 0.25in;
      margin-top: 0.1in;
      flex: 1;
    }

    /* LEFT: RIGHTS */
    .rights-section {
      display: flex;
      flex-direction: column;
      gap: 0.08in;
    }

    .rights-box {
      background: rgba(255, 106, 0, 0.03);
      border: 1px solid rgba(255, 106, 0, 0.2);
      border-radius: 3px;
      padding: 0.08in;
      flex: 1;
    }

    .rights-box h3 {
      font-size: 10px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 0.04in;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(255, 106, 0, 0.3);
      padding-bottom: 0.03in;
    }

    .rights-box p {
      font-family: ''Arial'', sans-serif;
      font-size: 8px;
      line-height: 1.35;
      color: #444;
      text-align: justify;
    }

    /* RIGHT: SEAL + SIGNATURES */
    .signature-section {
      display: flex;
      flex-direction: column;
    }

    /* CORPORATE SEAL - SMALLER */
    .corporate-seal {
      width: 1.3in;
      height: 1.3in;
      border: 3px double #ff6a00;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle, rgba(255, 106, 0, 0.08), transparent 70%);
      margin: 0 auto 0.12in;
    }

    .seal-inner {
      text-align: center;
    }

    .seal-company {
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 1px;
      color: #ff6a00;
    }

    .seal-state {
      font-size: 8px;
      font-weight: 600;
      color: #ff8533;
      margin: 0.02in 0;
    }

    .seal-year {
      font-size: 18px;
      font-weight: 900;
      color: #ff6a00;
    }

    /* WITNESS TEXT */
    .witness-text {
      font-size: 8px;
      font-style: italic;
      color: #666;
      text-align: center;
      margin-bottom: 0.08in;
    }

    /* SIGNATURES - STACKED */
    .signatures {
      display: flex;
      flex-direction: column;
      gap: 0.08in;
    }

    .signature-block {
      text-align: center;
    }

    .signature-line {
      border-bottom: 1.5px solid #1a1a1a;
      height: 0.35in;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.02in;
    }

    .signature-img {
      max-width: 100%;
      height: auto;
      max-height: 0.3in;
      filter: brightness(0) saturate(100%);
    }

    .signer-name {
      font-family: ''Arial'', sans-serif;
      font-size: 9px;
      font-weight: 700;
      color: #1a1a1a;
    }

    .signer-title {
      font-family: ''Arial'', sans-serif;
      font-size: 8px;
      color: #666;
    }

    /* FOOTER */
    .footer {
      position: absolute;
      bottom: 0.28in;
      left: 0.5in;
      right: 0.5in;
      text-align: center;
      font-family: ''Arial'', sans-serif;
      font-size: 7px;
      color: #888;
      padding-top: 0.05in;
      border-top: 1px solid rgba(0,0,0,0.1);
      z-index: 3;
    }

    /* SECURITY TEXT */
    .security-text {
      position: absolute;
      top: 0.4in;
      left: 0.35in;
      font-family: ''Arial'', sans-serif;
      font-size: 6px;
      color: rgba(255, 106, 0, 0.25);
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      letter-spacing: 2px;
      z-index: 2;
    }

    @media print {
      body { background: white; padding: 0; }
      .certificate { box-shadow: none; }
    }
  </style>
</head>

<body>
  <div class="certificate">
    <!-- Watermark Logo -->
    <img 
      class="watermark-logo" 
      src="{{watermark_url}}" 
      alt="Crave''n Logo Watermark"
    />

    <!-- Borders -->
    <div class="outer-border"></div>
    <div class="inner-border"></div>

    <!-- Corner Dots -->
    <div class="corner-dot tl"></div>
    <div class="corner-dot tr"></div>
    <div class="corner-dot bl"></div>
    <div class="corner-dot br"></div>

    <!-- Security Text -->
    <div class="security-text">FOUNDATIONAL-SUPPORT-{{certificate_number}}-{{issue_year}}</div>

    <!-- Main Content -->
    <div class="content">
      <!-- Header -->
      <div class="header">
        <div class="company-name">CRAVE''N INC.</div>
        <div class="incorporation">Incorporated Under the Laws of the State of Delaware</div>
      </div>

      <div class="divider"></div>

      <!-- Certificate Type -->
      <div class="cert-type">
        <h1>Foundational Support Certificate</h1>
      </div>

      <!-- Metadata -->
      <div class="metadata">
        <div>Reference ID: <strong>{{certificate_number}}</strong></div>
        <div>Contribution Date: <strong>{{contribution_date}}</strong></div>
      </div>

      <!-- Certification -->
      <div class="certification">
        <div class="this-certifies">THIS CERTIFIES THAT</div>
        
        <div class="shareholder-name">{{contributor_name}}</div>

        <div class="holder-text">has provided a Foundational Support Contribution to Crave''n Inc.</div>

        <!-- Share Details -->
        <div class="share-details">
          <div class="detail-row">
            <span class="detail-label">Program:</span>
            <span class="detail-value">Foundational Support Program</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Reference ID:</span>
            <span class="detail-value">{{certificate_number}}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Contribution Date:</span>
            <span class="detail-value">{{contribution_date}}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Contribution Amount:</span>
            <span class="detail-value">{{contribution_amount}}</span>
          </div>
        </div>
      </div>

      <!-- Legal Text -->
      <div class="legal-section">
        <div class="legal-text">
          The contribution was made as part of the Company''s Foundational Support Program and is recorded in the Company''s internal records. <strong>This Foundational Support Certificate is issued solely as an acknowledgment of the contribution described above. This certificate is not a stock certificate and does not represent issued shares, ownership, or any immediate equity interest in the Company.</strong> If the Company elects to issue equity, credits, or other consideration in connection with the Foundational Support Program, such issuance (if any) shall occur only pursuant to: proper authorization by the Company, compliance with applicable federal and state securities laws, and entry into the Company''s official capitalization records, including its stock transfer ledger and cap table. Any equity or consideration issued in the future, if applicable, shall be subject to the Company''s Certificate of Incorporation, Bylaws, and any applicable stockholder agreements, equity plans, or program terms, including restrictions on transfer and resale. This certificate is non-transferable and is intended solely for the individual or entity named above. Participation in the Foundational Support Program does not guarantee issuance of equity or any specific rights unless and until formally granted by the Company.
        </div>
      </div>

      <!-- Bottom: Rights + Seal + Signatures -->
      <div class="bottom-section">
        <!-- Left: Rights -->
        <div class="rights-section">
          <div class="rights-box">
            <h3>Important Notice</h3>
            <p>
              This is an acknowledgment certificate only and does not confer any ownership rights, voting rights, dividend rights, or other equity-related benefits. This certificate does not represent issued shares or any immediate equity interest in the Company. Any future equity issuance is discretionary and subject to Company authorization and securities law compliance.
            </p>
          </div>
          <div class="rights-box">
            <h3>Future Consideration</h3>
            <p>
              If the Company elects to issue equity or other consideration in connection with this contribution, such issuance shall be properly authorized, comply with securities laws, and be recorded in the Company''s official capitalization records. This certificate is non-transferable and does not guarantee future equity or rights.
            </p>
          </div>
        </div>

        <!-- Right: Seal + Signatures -->
        <div class="signature-section">
          <!-- Corporate Seal -->
          <div class="corporate-seal">
            <div class="seal-inner">
              <div class="seal-company">CRAVE''N INC.</div>
              <div class="seal-state">DELAWARE</div>
              <div class="seal-year">{{seal_year}}</div>
            </div>
          </div>

          <!-- Witness -->
          <div class="witness-text">
            IN WITNESS WHEREOF, executed by duly authorized officers.
          </div>

          <!-- Signatures -->
          <div class="signatures">
            <div class="signature-block">
              <div class="signature-line">
                <img 
                  class="signature-img" 
                  src="{{signature_url}}" 
                  alt="Torrance Stroman Signature"
                />
              </div>
              <div class="signer-name">Torrance A. Stroman</div>
              <div class="signer-title">CEO & President</div>
            </div>

            <div class="signature-block">
              <div class="signature-line">
                <img 
                  class="signature-img" 
                  src="{{signature_url}}" 
                  alt="Torrance Stroman Signature"
                />
              </div>
              <div class="signer-name">Torrance A. Stroman</div>
              <div class="signer-title">Corporate Secretary</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      This Foundational Support Certificate is recorded in the Company''s internal contribution records. 
      This document does not represent ownership or equity and is subject to the terms of the Foundational Support Program.
    </div>
  </div>
</body>
</html>',
  true,
  now(),
  now()
)
ON CONFLICT (template_key) 
DO UPDATE SET
  html_content = EXCLUDED.html_content,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMENT ON TABLE public.document_templates IS
  'Document templates for generated PDFs. stock_certificate = executive equity certificates, foundational_support_certificate = foundational program acknowledgment (not equity).';

