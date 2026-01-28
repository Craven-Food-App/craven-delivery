-- Update Executive Stock Certificate Template (EXACT USER-PROVIDED TEMPLATE)
-- This replaces the previous template with the exact design specified by the user.

UPDATE public.document_templates
SET 
  html_content = '<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Stock Certificate - Crave''n Inc.</title>

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
    <div class="security-text">CERTIFICATE-{{certificate_number}}-DELAWARE-{{issue_year}}</div>

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
        <h1>Common Stock Certificate</h1>
      </div>

      <!-- Metadata -->
      <div class="metadata">
        <div>Certificate No. <strong>{{certificate_number}}</strong></div>
        <div>Authorized by Board Resolution dated <strong>{{resolution_date}}</strong></div>
      </div>

      <!-- Certification -->
      <div class="certification">
        <div class="this-certifies">THIS IS TO CERTIFY THAT</div>
        
        <div class="shareholder-name">{{shareholder_name}}</div>

        <div class="holder-text">is the registered owner of</div>

        <!-- Share Details -->
        <div class="share-details">
          <div class="detail-row">
            <span class="detail-label">Number of Shares:</span>
            <span class="detail-value">{{shares_amount}}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Class of Stock:</span>
            <span class="detail-value">{{share_class}}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Par Value:</span>
            <span class="detail-value">$0.0001 per share</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date of Issuance:</span>
            <span class="detail-value">{{issue_date}}</span>
          </div>
        </div>
      </div>

      <!-- Legal Text -->
      <div class="legal-section">
        <div class="legal-text">
          fully paid and non-assessable shares of Common Stock of <strong>Crave''n Inc.</strong>, a Delaware corporation, 
          transferable only on the books of the Corporation by the holder hereof in person or by duly authorized attorney 
          upon surrender of this Certificate properly endorsed. This Certificate and the shares represented hereby are issued 
          and shall be held subject to all of the provisions of the Corporation''s Certificate of Incorporation and Bylaws, 
          as amended from time to time, and to any applicable stockholders'' agreements, equity incentive plans, and securities laws. 
          The holder of this Certificate, by acceptance hereof, assents to and is bound by such provisions.
        </div>
      </div>

      <!-- Bottom: Rights + Seal + Signatures -->
      <div class="bottom-section">
        <!-- Left: Rights -->
        <div class="rights-section">
          <div class="rights-box">
            <h3>Voting Rights</h3>
            <p>
              Each share of Common Stock entitles the holder to one vote on all matters submitted to stockholders. 
              Shares participate equally in dividends and distributions when and if declared by the Board of Directors.
              Share ownership is officially recorded in the Corporation''s stock ledger.
            </p>
          </div>
          <div class="rights-box">
            <h3>Transfer Restrictions</h3>
            <p>
              Transfer of shares may be restricted by federal and state securities laws, rights of first refusal, 
              co-sale rights, and other restrictions as set forth in the Corporation''s governing documents. 
              This certificate may be issued in digital or physical form with equal validity.
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
      This certificate is issued in accordance with Delaware General Corporation Law. 
      Share ownership is officially recorded in the Corporation''s stock transfer ledger and capitalization table.
    </div>
  </div>
</body>
</html>',
  updated_at = now()
WHERE template_key = 'stock_certificate';

COMMENT ON COLUMN public.document_templates.html_content IS
  'HTML templates for generated documents. stock_certificate is the exact user-specified executive certificate design with Crave''n branding, corporate seal, and dual signatures.';

