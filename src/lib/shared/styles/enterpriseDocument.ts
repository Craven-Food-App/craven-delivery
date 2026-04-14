/**
 * Enterprise-grade document styling for governance documents.
 * Applies Fortune 500-standard formatting to semantic HTML content.
 */
export const enterpriseDocumentStyles: React.CSSProperties = {
  padding: '3rem 3.5rem',
  fontFamily: '"Georgia", "Times New Roman", "Garamond", serif',
  fontSize: '14.5px',
  lineHeight: '1.7',
  color: '#1a1a2e',
  maxWidth: '900px',
  margin: '0 auto',
  background: '#fff',
};

/**
 * CSS string injected as a scoped stylesheet for the document container.
 * Uses a parent selector `.enterprise-doc` to avoid global style leaks.
 */
export const enterpriseDocumentCSS = `
.enterprise-doc {
  padding: 3rem 3.5rem;
  font-family: "Georgia", "Times New Roman", "Garamond", serif;
  font-size: 14.5px;
  line-height: 1.7;
  color: #1a1a2e;
  max-width: 900px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  border-radius: 2px;
}

/* ── Header / Title Block ── */
.enterprise-doc header {
  border-bottom: 3px solid #1a1a2e;
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
}

.enterprise-doc header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #0d0d1a;
  margin: 0 0 1rem 0;
  line-height: 1.3;
}

.enterprise-doc header p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #444;
  font-family: "Helvetica Neue", Arial, sans-serif;
}

.enterprise-doc header p strong {
  color: #1a1a2e;
  font-weight: 600;
  min-width: 160px;
  display: inline-block;
}

/* ── Section Headings ── */
.enterprise-doc h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #0d0d1a;
  margin: 2.5rem 0 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 2px solid #1a1a2e;
  padding-bottom: 0.5rem;
}

.enterprise-doc h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 2rem 0 0.75rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid #ccc;
  letter-spacing: 0.5px;
}

.enterprise-doc h3 {
  font-size: 1.05rem;
  font-weight: 600;
  color: #2c2c4a;
  margin: 1.5rem 0 0.5rem;
  font-family: "Helvetica Neue", Arial, sans-serif;
}

.enterprise-doc h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #3a3a5c;
  margin: 1.25rem 0 0.4rem;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-style: italic;
}

/* ── Body Text ── */
.enterprise-doc p {
  margin: 0.75rem 0;
  text-align: justify;
  hyphens: auto;
}

.enterprise-doc strong {
  font-weight: 700;
  color: #0d0d1a;
}

/* ── Lists ── */
.enterprise-doc ul,
.enterprise-doc ol {
  margin: 0.75rem 0 0.75rem 1.5rem;
  padding: 0;
}

.enterprise-doc ul {
  list-style-type: disc;
}

.enterprise-doc ol {
  list-style-type: decimal;
}

.enterprise-doc li {
  margin: 0.4rem 0;
  padding-left: 0.25rem;
  line-height: 1.6;
}

.enterprise-doc li::marker {
  color: #555;
}

.enterprise-doc ul ul,
.enterprise-doc ol ol,
.enterprise-doc ul ol,
.enterprise-doc ol ul {
  margin: 0.3rem 0 0.3rem 1.25rem;
}

/* ── Tables ── */
.enterprise-doc table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
  font-size: 0.875rem;
  font-family: "Helvetica Neue", Arial, sans-serif;
}

.enterprise-doc thead {
  background: #1a1a2e;
  color: #fff;
}

.enterprise-doc th {
  padding: 0.65rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid #1a1a2e;
}

.enterprise-doc td {
  padding: 0.55rem 0.75rem;
  border: 1px solid #ddd;
  vertical-align: top;
}

.enterprise-doc tbody tr:nth-child(even) {
  background: #f8f9fa;
}

.enterprise-doc tbody tr:hover {
  background: #eef1f5;
}

/* ── Sections ── */
.enterprise-doc section {
  margin-bottom: 1.5rem;
}

.enterprise-doc article {
  /* Root article wrapper */
}

/* ── Blockquotes / Callouts ── */
.enterprise-doc blockquote {
  margin: 1.25rem 0;
  padding: 0.75rem 1.25rem;
  border-left: 4px solid #1a1a2e;
  background: #f5f6f8;
  font-style: italic;
  color: #333;
}

/* ── Horizontal Rules ── */
.enterprise-doc hr {
  border: none;
  border-top: 1px solid #ddd;
  margin: 2rem 0;
}

/* ── Code / Pre ── */
.enterprise-doc code {
  font-family: "Courier New", monospace;
  font-size: 0.85rem;
  background: #f0f0f5;
  padding: 0.15rem 0.35rem;
  border-radius: 2px;
}

.enterprise-doc pre {
  background: #f0f0f5;
  padding: 1rem;
  border-radius: 2px;
  overflow-x: auto;
  font-size: 0.8rem;
  border: 1px solid #ddd;
}

/* ── Signature Blocks ── */
.enterprise-doc .signature-line,
.enterprise-doc [class*="signature"] {
  border-bottom: 1px solid #000;
  min-height: 24px;
  margin-top: 2rem;
  width: 300px;
}

/* ── Footer / Classification ── */
.enterprise-doc footer {
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 2px solid #1a1a2e;
  font-size: 0.8rem;
  color: #666;
  font-family: "Helvetica Neue", Arial, sans-serif;
}

/* ── Print-friendly ── */
@media print {
  .enterprise-doc {
    border: none;
    box-shadow: none;
    padding: 0;
    font-size: 11pt;
  }
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .enterprise-doc {
    padding: 1.5rem 1.25rem;
    font-size: 13.5px;
  }
  
  .enterprise-doc header h1 {
    font-size: 1.35rem;
    letter-spacing: 0.75px;
  }
  
  .enterprise-doc h2 {
    font-size: 1.1rem;
  }
  
  .enterprise-doc table {
    font-size: 0.75rem;
  }
}
`;
