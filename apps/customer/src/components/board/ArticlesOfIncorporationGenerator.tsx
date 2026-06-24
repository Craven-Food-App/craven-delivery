import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Typography,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import {
  CloudUploadOutlined,
  CodeOutlined,
  DownloadOutlined,
  FileTextOutlined,
  LinkOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import JsBarcode from 'jsbarcode';
import { docsAPI } from '@/components/hr/api';
import ohioSealImageUrl from '@/assets/thereal-ohio-state-seal.png';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

type EditorMode = 'preview' | 'html';

type Incorporator = {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  email?: string;
};

type ShareClass = {
  className: string;
  authorizedShares: number | null;
  parValue?: string;
  votingRights?: string;
};

type BarcodeMeta = {
  docTypeCode: string;
  charterNumber: string;
  entityNumber: string;
  submissionNumber: string;
  filingDate: Dayjs;
  filingTime: string;
  receiptNumber?: string;
};

type ArticlesFormValues = {
  entityName: string;
  entityType: string;
  formationState: string;
  principalAddressLine1: string;
  principalAddressLine2?: string;
  principalCity: string;
  principalState: string;
  principalPostalCode: string;
  principalCounty: string;
  purpose: string;
  duration: string;
  effectiveDate: Dayjs;
  contactEmail: string;
  contactPhone: string;
  statutoryAgentName: string;
  statutoryAgentAddressLine1: string;
  statutoryAgentAddressLine2?: string;
  statutoryAgentCity: string;
  statutoryAgentState: string;
  statutoryAgentPostalCode: string;
  statutoryAgentAcceptance: string;
  shareClasses: ShareClass[];
  incorporators: Incorporator[];
  optionalProvisions: string[];
  barcode: BarcodeMeta;
  filingType: string;
  filingFee: string;
  expediteFee: string;
  penaltyFee: string;
  certificateFee: string;
  copyFee: string;
  recipientName: string;
  recipientAddressLine1: string;
  recipientAddressLine2?: string;
  recipientAddressLine3?: string;
  secretaryOfStateName: string;
  certificateNumber?: string;
};

interface TemplateRecord {
  id: string;
  name: string;
  template_key: string;
  html_content: string;
  is_active: boolean;
}

const DEFAULT_BARCODE_META: BarcodeMeta = {
  docTypeCode: 'ART',
  charterNumber: 'DOC-2025-0001',
  entityNumber: '2025123456',
  submissionNumber: 'AIOH-000123',
  filingDate: dayjs(),
  filingTime: dayjs().format('HHmm'),
  receiptNumber: 'RS-987654',
};

const DEFAULT_FORM_VALUES: ArticlesFormValues = {
  entityName: "Crave'n Foods Holdings, Inc.",
  entityType: 'For-Profit Corporation',
  formationState: 'Ohio',
  principalAddressLine1: '123 Innovation Way',
  principalAddressLine2: 'Suite 400',
  principalCity: 'Toledo',
  principalState: 'OH',
  principalPostalCode: '43604',
  principalCounty: 'Lucas',
  purpose:
    'To engage in the business of on-demand local commerce, including food delivery, grocery delivery, retail delivery, convenience delivery, and same-day courier and logistics services (Crave\'n Express / CX), and any lawful act or activity for which corporations may be organized under Chapter 1701 of the Ohio Revised Code.',
  duration: 'Perpetual',
  effectiveDate: dayjs(),
  contactEmail: 'legal@cravenusa.com',
  contactPhone: '(419) 555-2025',
  statutoryAgentName: 'Jane Legal, Esq.',
  statutoryAgentAddressLine1: '100 Capitol Square',
  statutoryAgentAddressLine2: 'Floor 5',
  statutoryAgentCity: 'Columbus',
  statutoryAgentState: 'OH',
  statutoryAgentPostalCode: '43215',
  statutoryAgentAcceptance:
    'I hereby affirm and acknowledge my appointment as the statutory agent for the above-mentioned entity and consent to act in such capacity.',
  shareClasses: [
    {
      className: 'Common Voting',
      authorizedShares: 1000000,
      parValue: '$0.0001',
      votingRights: 'One vote per share.',
    },
    {
      className: 'Preferred (Series A)',
      authorizedShares: 250000,
      parValue: '$0.001',
      votingRights:
        'Each Preferred share votes on an as-converted basis with Common Stock. Preferred holders receive protective provisions as outlined in the company bylaws.',
    },
  ],
  incorporators: [
    {
      name: 'Maya Thompson',
      addressLine1: '55 Executive Park',
      addressLine2: 'Suite 900',
      city: 'Cleveland',
      state: 'OH',
      postalCode: '44114',
      email: 'maya.thompson@cravenusa.com',
    },
    {
      name: 'Harold Jenkins',
      addressLine1: '900 Commerce Avenue',
      city: 'Cincinnati',
      state: 'OH',
      postalCode: '45202',
      email: 'harold.jenkins@cravenusa.com',
    },
  ],
  optionalProvisions: [
    'The directors are authorized to adopt, amend, or repeal bylaws of the corporation.',
    'Preemptive rights are denied to shareholders except as expressly provided in a written agreement approved by the Board of Directors.',
    'The corporation elects to be governed by Section 1701.59(B) of the Ohio Revised Code regarding director liability limitations.',
  ],
  barcode: DEFAULT_BARCODE_META,
  filingType: 'corporation',
  filingFee: '50.00',
  expediteFee: '300.00',
  penaltyFee: '0.00',
  certificateFee: '0.00',
  copyFee: '0.00',
  recipientName: 'Thompson Hine LLP',
  recipientAddressLine1: '3900 Key Center',
  recipientAddressLine2: '127 Public Square',
  recipientAddressLine3: 'Cleveland, OH 44114-1291',
  secretaryOfStateName: 'Frank LaRose',
  certificateNumber: '317430',
};

const DEFAULT_OHIO_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>State of Ohio – Certificate of Incorporation</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: 8.5in 11in;
      margin: 0;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .certificate-page {
        box-shadow: none;
        page-break-inside: avoid;
      }
      .certificate-page.cover {
        page-break-after: always;
      }
      .certificate-page.form {
        page-break-before: always;
      }
      .page-separator {
        display: none;
      }
    }

    body {
      margin: 0;
      padding: 0;
      font-family: "Times New Roman", "Georgia", serif;
      background: #f5f5f5;
      color: #111827;
    }

    .certificate-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #f5f5f5;
      padding: 24px 0;
      gap: 0;
    }

    .page-separator {
      height: 48px;
      width: 100%;
      background: #f5f5f5;
    }

    .certificate-page {
      width: 8.5in;
      min-height: 11in;
      max-height: 11in;
      height: 11in;
      padding: 0;
      box-sizing: border-box;
      background: #ffffff;
      position: relative;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      overflow: hidden;
    }

    /* COVER PAGE STYLES */
    .certificate-page.cover {
      display: flex;
      flex-direction: column;
    }

    .cover-header {
      padding: 0.65in 0.8in 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      position: relative;
      z-index: 2;
      flex-shrink: 0;
    }

    .cover-barcode {
      text-align: center;
    }

    .cover-barcode svg {
      width: 7in;
      height: 1in;
      display: block;
      margin: 0 auto;
    }

    .cover-meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .cover-meta-table th,
    .cover-meta-table td {
      text-align: left;
      padding-right: 18px;
      white-space: nowrap;
    }

    .cover-meta-table td {
      font-size: 11.5px;
      text-transform: none;
      letter-spacing: 0;
      padding-top: 3px;
    }

    .cover-receipt {
      margin-top: 6px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-size: 14px;
    }

    .cover-receipt-note {
      font-size: 10px;
      text-align: center;
    }

    .cover-address {
      font-size: 11px;
      line-height: 1.6;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-top: 6px;
    }

    .certificate-frame {
      margin: 0.4in;
      border: 4px solid #000000;
      flex: 1;
      position: relative;
      display: flex;
    }

    .certificate-inner {
      border: 1px solid #000000;
      margin: 12px 12px 36px;
      padding: 0.18in 0.55in 0.22in;
      width: calc(100% - 24px);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      height: 100%;
    }

    .certificate-title {
      font-size: 40px;
      letter-spacing: 6px;
      text-transform: uppercase;
      font-weight: 700;
      font-family: "Times New Roman", "Georgia", serif;
      margin-bottom: -6px;
    }

    .certificate-subtitle {
      margin-top: -6px;
      font-size: 24px;
      letter-spacing: 4px;
      text-transform: uppercase;
      font-weight: 600;
      font-family: "Times New Roman", "Georgia", serif;
      margin-bottom: 2px;
    }

    .certificate-secretary {
      margin-top: -10px;
      font-size: 21px;
      font-weight: 700;
      font-family: "Times New Roman", "Georgia", serif;
    }

    .certificate-number {
      margin-top: -8px;
      font-size: 19px;
      letter-spacing: 1px;
      font-weight: 700;
      font-family: "Times New Roman", "Georgia", serif;
    }

    .certificate-body {
      margin-top: 10px;
      font-size: 13px;
      line-height: 1.7;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: "Times New Roman", "Georgia", serif;
    }

    .certificate-body p {
      margin: 0 0 6px;
      font-family: "Times New Roman", "Georgia", serif;
    }

    .certificate-body .certificate-entity {
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 1px;
      font-family: "Times New Roman", "Georgia", serif;
      margin-bottom: 4px;
    }

    .certificate-details {
      width: 100%;
      max-width: 6.25in;
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-family: "Times New Roman", "Georgia", serif;
    }

    .certificate-details .details-doc {
      flex: 1 1 auto;
      text-align: left;
      font-family: "Times New Roman", "Georgia", serif;
    }

    .certificate-details .details-doc .label {
      font-size: 11px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    .certificate-details .details-doc .doc-title {
      font-size: 13px;
      letter-spacing: 0.6px;
      font-weight: 700;
      text-transform: none;
      margin-top: 2px;
    }

    .certificate-details .details-doc .effective-line {
      margin-top: 3px;
      font-size: 11px;
      text-transform: none;
      letter-spacing: 0.3px;
      display: flex;
      justify-content: center;
      gap: 6px;
      font-family: "Times New Roman", "Georgia", serif;
    }

    .certificate-details .details-doc .effective-line .label {
      font-weight: 600;
      text-transform: uppercase;
    }

    .certificate-details .details-number {
      flex: 0 0 auto;
      text-align: right;
      font-family: "Times New Roman", "Georgia", serif;
    }

    .certificate-details .details-number .label {
      font-size: 11px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    .certificate-details .details-number .value {
      margin-top: 4px;
      font-size: 13px;
      letter-spacing: 0;
      text-transform: none;
      font-weight: 700;
      font-family: "Times New Roman", "Georgia", serif;
    }

    .certificate-footer {
      margin-top: auto;
      padding-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      text-align: left;
      gap: 180px;
    }

    .certificate-seal-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin-top: 32px;
      width: 3in;
    }

    .certificate-seal-block img {
      width: 1in;
      height: 1in;
      object-fit: contain;
    }

    .certificate-seal-caption {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      line-height: 1.8;
      text-align: center;
      font-family: "Times New Roman", "Georgia", serif;
      margin-top: 8px;
      width: 100%;
    }

    .certificate-signature-block {
      font-size: 12px;
      line-height: 1.6;
      text-align: left;
      font-family: "Times New Roman", "Georgia", serif;
      width: 3.4in;
    }

    .certificate-signature-block .attestation-text {
      font-size: 12px;
      line-height: 1.4;
      margin: 0;
      font-family: "Times New Roman", "Georgia", serif;
      text-align: justify;
      text-align-last: left;
    }

    .certificate-signature-image {
      margin-top: 10px;
      width: 2in;
    }

    .certificate-signature-image svg,
    .certificate-signature-image img {
      width: 100%;
      height: auto;
      display: block;
    }

    .certificate-signature-title {
      margin-top: 4px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-weight: 700;
      font-family: "Times New Roman", "Georgia", serif;
      color: #000000;
      text-align: left;
    }

    /* FORM PAGE STYLES */
    .certificate-page.form {
      padding: 0.65in 0.8in 0.5in;
    }

    .form-header {
      position: relative;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .form-header-left {
      max-width: 60%;
      font-size: 11px;
    }

    .form-header-left img {
      width: 1.2in;
      height: 1.2in;
      margin-bottom: 8px;
      background: #e0e0e0;
      border-radius: 50%;
    }

    .form-header-right {
      text-align: right;
      font-size: 11px;
    }

    .form-title {
      text-align: center;
      font-size: 18px;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      margin: 12px 0 6px;
      font-weight: 600;
    }

    .form-subtitle {
      text-align: center;
      font-size: 12px;
      margin-bottom: 16px;
    }

    .form-section {
      border: 1px solid #1f2937;
      margin-bottom: 12px;
      padding: 8px 10px;
      font-size: 11px;
    }

    .form-section h4 {
      margin: 0 0 6px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-weight: 600;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 16px;
      font-size: 11px;
    }

    .share-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-top: 6px;
    }

    .share-table th,
    .share-table td {
      border: 1px solid #1f2937;
      padding: 4px 6px;
      text-align: left;
    }

    .share-table th {
      background: #f3f4f6;
      font-weight: 600;
    }

    .signature-block {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 8px;
    }

    .signature-card {
      border: 1px solid #1f2937;
      padding: 8px;
      font-size: 10px;
    }

    .signature-card .name {
      font-weight: 600;
      margin-bottom: 6px;
    }

    .signature-card .field-value {
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .signature-card .signature-line {
      border-top: 1px solid #1f2937;
      margin-top: 12px;
      padding-top: 4px;
      font-size: 9px;
      color: #6b7280;
    }

    .form-section ul {
      margin: 8px 0 0 18px;
      padding: 0;
      line-height: 1.5;
    }

    .form-section ul li {
      margin-bottom: 4px;
    }

    .signature-area {
      margin-top: 18px;
      font-size: 11px;
    }

    .signature-area .line {
      border-bottom: 1px solid #1f2937;
      height: 18px;
      margin-top: 8px;
    }

    footer.form-footer {
      margin-top: 24px;
      font-size: 10px;
      display: flex;
      justify-content: space-between;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <!-- PAGE 1: COVER/CERTIFICATE -->
    <div class="certificate-page cover">
      <div class="cover-header">
        <div class="cover-barcode">
          {{articles_barcode_svg}}
        </div>

        <table class="cover-meta-table">
          <tr>
            <th>DATE</th>
            <th>DOCUMENT ID</th>
            <th>DESCRIPTION</th>
            <th>FILING</th>
            <th>EXPED</th>
            <th>PENALTY</th>
            <th>CERT</th>
            <th>COPY</th>
          </tr>
          <tr>
            <td>{{filing_date_short}}</td>
            <td>{{submission_number}}</td>
            <td>{{filing_receipt_description}}</td>
            <td>{{filing_fee}}</td>
            <td>{{filing_expedite_fee}}</td>
            <td>{{filing_penalty_fee}}</td>
            <td>{{filing_certificate_fee}}</td>
            <td>{{filing_copy_fee}}</td>
          </tr>
        </table>

        <div class="cover-receipt">Receipt</div>
        <div class="cover-receipt-note">This is not a bill. Please do not remit payment.</div>
        <div class="cover-address">{{recipient_block}}</div>
      </div>

      <div class="certificate-frame">
        <div class="certificate-inner">
          <div class="certificate-title">STATE OF OHIO</div>
          <div class="certificate-subtitle">CERTIFICATE</div>
          <div class="certificate-secretary">Ohio Secretary of State, {{secretary_name}}</div>
          <div class="certificate-number">{{certificate_number}}</div>

          <div class="certificate-body">
            <p>It is hereby certified that the Secretary of State of Ohio has custody of the business records for</p>
            <div class="certificate-entity">{{entity_name}}</div>
            <p>and, that said business records show the filing and recording of:</p>
          </div>

          <div class="certificate-details">
            <div class="details-doc">
              <div class="label">Document(s)</div>
              <div class="doc-title">{{filing_document_title_upper}}</div>
              <div class="effective-line"><span class="label">Effective Date:</span><span>{{effective_date_short}}</span></div>
            </div>
            <div class="details-number">
              <div class="label">Document No(s):</div>
              <div class="value">{{submission_number}}</div>
            </div>
          </div>

          <div class="certificate-footer">
            <div class="certificate-seal-block">
              <img src="{{ohio_seal_src}}" alt="Great Seal of the State of Ohio" />
              <div class="certificate-seal-caption">
                United States of America<br/>State of Ohio&nbsp;<br/>Office of the&nbsp;Secretary&nbsp;of the&nbsp;State
              </div>
            </div>
            <div class="certificate-signature-block">
              <div class="attestation-text">Witness my hand and the seal of the</div>
              <div class="attestation-text">Secretary of State at Columbus, Ohio this</div>
              <div class="attestation-text">{{filing_date_long}}.</div>
              <div class="certificate-signature-image">{{secretary_signature_svg}}</div>
              <div class="certificate-signature-title">Ohio Secretary of State</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="page-separator"></div>

    <!-- PAGE 2: FORM -->
    <div class="certificate-page form">
      <div class="form-header">
        <div class="form-header-left">
          <img src="{{ohio_seal_src}}" alt="Great Seal of the State of Ohio" />
          <div><strong>Presented by:</strong><br/>The Ohio Secretary of State<br/>Business Services Division<br/>P.O. Box 788 • Columbus, OH 43216<br/>Telephone: 1-877-767-3453 (Ohio SOS)</div>
        </div>
        <div class="form-header-right">
          <div><strong>Mail this filing to:</strong></div>
          <div>Ohio Secretary of State</div>
          <div>P.O. Box 788</div>
          <div>Columbus, OH 43216</div>
          <div style="margin-top:10px;"><strong>Expedite this form, use:</strong></div>
          <div>P.O. Box 1390</div>
          <div>Columbus, OH 43216</div>
        </div>
      </div>

      <div class="form-title">{{filing_document_title}}</div>
      <div class="form-subtitle">{{filing_option_label}}</div>

      <div class="form-section">
        <h4>Entity Information</h4>
        <div class="form-grid">
          <div><strong>Name of Entity:</strong><br/>{{entity_name}}</div>
          <div><strong>Charter Number:</strong><br/>{{charter_number}}</div>
          <div><strong>Document Type:</strong><br/>{{filing_document_title}}</div>
          <div><strong>Description:</strong><br/>{{filing_receipt_description}}</div>
          <div><strong>Filing Date:</strong><br/>{{filing_date_long}}</div>
          <div><strong>Document ID:</strong><br/>{{submission_number}}</div>
        </div>
      </div>

      <div class="form-section">
        <h4>Principal Office Location</h4>
        <div>{{principal_office}}</div>
        <div>County: {{principal_county}}</div>
      </div>

      <div class="form-section">
        <h4>Statutory Agent Information</h4>
        <div><strong>Name:</strong> {{statutory_agent_name}}</div>
        <div><strong>Address:</strong><br/>{{statutory_agent_address}}</div>
      </div>

      <div class="form-section">
        <h4>Share Structure</h4>
        {{share_classes_table}}
      </div>

      <div class="form-section">
        <h4>Purpose &amp; Duration</h4>
        <div><strong>Purpose:</strong> {{purpose}}</div>
        <div style="margin-top: 6px;"><strong>Duration:</strong> {{duration}}</div>
      </div>

      <div class="form-section">
        <h4>Incorporators</h4>
        {{incorporators_block}}
      </div>

      <div class="form-section">
        <h4>Additional Provisions</h4>
        {{optional_provisions_block}}
      </div>

      <div class="signature-area">
        <div>I certify that the statements contained herein are true and accurate.</div>
        <div class="line"></div>
        <div>Incorporator Signature &amp; Date</div>
      </div>

      <footer class="form-footer">
        <div>Form 532A • Last Revised May 2020</div>
        <div>Page 2 of 2</div>
      </footer>
    </div>
  </div>
</body>
</html>`;

const FILING_OPTIONS: Record<string, {
  label: string;
  receiptDescription: string;
  documentTitle: string;
}> = {
  corporation: {
    label: 'For-Profit Corporation',
    receiptDescription: 'ARTICLES OF INCORPORATION (FOR PROFIT)',
    documentTitle: 'Articles of Incorporation',
  },
  llc: {
    label: 'Limited Liability Company',
    receiptDescription: 'ARTICLES OF ORGANIZATION (LLC)',
    documentTitle: 'Articles of Organization',
  },
  nonprofit: {
    label: 'Nonprofit Corporation',
    receiptDescription: 'ARTICLES OF INCORPORATION (NONPROFIT)',
    documentTitle: 'Articles of Incorporation (Nonprofit)',
  },
  professional: {
    label: 'Professional Corporation / LLC',
    receiptDescription: 'PROFESSIONAL ENTITY FILING',
    documentTitle: 'Professional Entity Filing',
  },
  partnership: {
    label: 'Partnership / LLP / LP',
    receiptDescription: 'PARTNERSHIP OR LLP FILING',
    documentTitle: 'Partnership Filing',
  },
  cooperative: {
    label: 'Cooperative Association',
    receiptDescription: 'COOPERATIVE ASSOCIATION FILING',
    documentTitle: 'Articles of Incorporation (Cooperative)',
  },
  trust: {
    label: 'Business or Statutory Trust',
    receiptDescription: 'BUSINESS TRUST FILING',
    documentTitle: 'Business Trust Filing',
  },
  foreign: {
    label: 'Foreign Registration',
    receiptDescription: 'FOREIGN REGISTRATION STATEMENT',
    documentTitle: 'Foreign Registration Statement',
  },
};

const FILING_TYPE_OPTIONS = Object.entries(FILING_OPTIONS).map(([value, info]) => ({
  value,
  label: info.label,
}));

const formatDayjs = (value?: Dayjs, format = 'MMMM D, YYYY'): string => {
  if (!value) return '';
  return value.format(format);
};

const sanitizeText = (value?: string | number | null): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const escapeRegExp = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildShareClassesTable = (shareClasses: ShareClass[]): string => {
  if (!shareClasses?.length) {
    return `<p class="field-value">No share class information provided.</p>`;
  }

  const rows = shareClasses
    .filter((cls) => cls.className)
    .map(
      (cls) => `<tr>
        <td>${sanitizeText(cls.className)}</td>
        <td>${cls.authorizedShares != null ? Number(cls.authorizedShares).toLocaleString('en-US') : ''}</td>
        <td>${sanitizeText(cls.parValue)}</td>
        <td>${sanitizeText(cls.votingRights)}</td>
      </tr>`,
    )
    .join('');

  return `<table class="share-table">
    <thead>
      <tr>
        <th>Class</th>
        <th>Authorized Shares</th>
        <th>Par Value</th>
        <th>Voting Rights / Preferences</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
};

const buildIncorporatorsBlock = (incorporators: Incorporator[]): string => {
  if (!incorporators?.length) {
    return '<p class="field-value">No incorporators listed.</p>';
  }

  const cards = incorporators
    .filter((inc) => inc.name)
    .map(
      (inc) => `<div class="signature-card">
        <div class="name">${sanitizeText(inc.name)}</div>
        <div class="field-value">
          ${sanitizeText(inc.addressLine1)}${inc.addressLine2 ? `<br/>${sanitizeText(inc.addressLine2)}` : ''}
          <br/>${sanitizeText(inc.city)}, ${sanitizeText(inc.state)} ${sanitizeText(inc.postalCode)}
          ${inc.email ? `<br/>Email: ${sanitizeText(inc.email)}` : ''}
        </div>
        <div class="signature-line">Signature of Incorporator</div>
        <div class="signature-line">Date (MM/DD/YYYY)</div>
      </div>`,
    );

  return `<div class="signature-block">${cards.join('')}</div>`;
};

const buildOptionalProvisionsBlock = (provisions: string[]): string => {
  if (!provisions?.length) {
    return '<p class="field-value">No optional provisions elected.</p>';
  }

  const items = provisions
    .filter((text) => text && text.trim().length > 0)
    .map((text) => `<li>${sanitizeText(text)}</li>`)
    .join('');

  return `<ul style="margin-left: 18px;">${items}</ul>`;
};

const createBarcodeSvgMarkup = (payload: string): string => {
  if (!payload || typeof window === 'undefined') {
    return '';
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, payload, {
    format: 'code128',
    displayValue: false,
    height: 80,
    margin: 0,
  });

  return svg.outerHTML;
};

const loadAssetAsDataUrl = async (assetUrl: string): Promise<string> => {
  if (!assetUrl) return '';
  try {
    const response = await fetch(assetUrl);
    if (!response.ok) throw new Error(`Failed to fetch asset: ${assetUrl}`);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error(`Unable to read asset blob: ${assetUrl}`));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('loadAssetAsDataUrl error:', error);
    return '';
  }
};

const buildArticlesHtml = (
  template: string,
  values: ArticlesFormValues,
  barcodeSvg: string,
  barcodeHumanReadable: string,
  sealImageSrc: string,
  signatureImageSrc: string,
): string => {
  const filingOption = FILING_OPTIONS[values.filingType] ?? FILING_OPTIONS.corporation;
  const principalAddress = [`${sanitizeText(values.principalAddressLine1)}`]
    .concat(
      [
        sanitizeText(values.principalAddressLine2),
        `${sanitizeText(values.principalCity)}, ${sanitizeText(values.principalState)} ${sanitizeText(values.principalPostalCode)}`,
      ].filter(Boolean),
    )
    .join('<br/>');

  const statutoryAgentAddress = [`${sanitizeText(values.statutoryAgentAddressLine1)}`]
    .concat(
      [
        sanitizeText(values.statutoryAgentAddressLine2),
        `${sanitizeText(values.statutoryAgentCity)}, ${sanitizeText(values.statutoryAgentState)} ${sanitizeText(values.statutoryAgentPostalCode)}`,
      ].filter(Boolean),
    )
    .join('<br/>');

  const recipientBlock = [
    sanitizeText(values.recipientName),
    sanitizeText(values.recipientAddressLine1),
    sanitizeText(values.recipientAddressLine2),
    sanitizeText(values.recipientAddressLine3),
  ]
    .filter((line) => line && line.length > 0)
    .join('<br/>');

  const secretaryName = sanitizeText(values.secretaryOfStateName);
  const sealSrc = sealImageSrc ? sanitizeText(sealImageSrc) : '';
  const signatureSrc = signatureImageSrc ? sanitizeText(signatureImageSrc) : '';
  const secretarySignatureMarkup = signatureSrc
    ? `<img src="${signatureSrc}" alt="Signature of ${secretaryName || 'Ohio Secretary of State'}" style="width:100%;height:auto;display:block;" />`
    : '';

  const replacements: Record<string, string> = {
    '{{entity_name}}': sanitizeText(values.entityName),
    '{{entity_type}}': sanitizeText(values.entityType),
    '{{formation_state}}': sanitizeText(values.formationState),
    '{{effective_date}}': formatDayjs(values.effectiveDate),
    '{{effective_date_short}}': formatDayjs(values.effectiveDate, 'MM/DD/YYYY'),
    '{{duration}}': sanitizeText(values.duration),
    '{{principal_office}}': principalAddress,
    '{{principal_county}}': sanitizeText(values.principalCounty),
    '{{contact_email}}': sanitizeText(values.contactEmail),
    '{{contact_phone}}': sanitizeText(values.contactPhone),
    '{{purpose}}': sanitizeText(values.purpose),
    '{{share_classes_table}}': buildShareClassesTable(values.shareClasses),
    '{{statutory_agent_name}}': sanitizeText(values.statutoryAgentName),
    '{{statutory_agent_address}}': statutoryAgentAddress,
    '{{statutory_agent_acceptance}}': sanitizeText(values.statutoryAgentAcceptance),
    '{{incorporators_block}}': buildIncorporatorsBlock(values.incorporators),
    '{{optional_provisions_block}}': buildOptionalProvisionsBlock(values.optionalProvisions),
    '{{articles_barcode_svg}}': barcodeSvg || '<div style="height:110px;border:1px dashed #94a3b8;display:flex;align-items:center;justify-content:center;color:#94a3b8;">Barcode Pending</div>',
    '{{barcode_human_readable}}': barcodeHumanReadable,
    '{{ohio_seal_src}}': sealSrc || '',
    '{{submission_number}}': sanitizeText(values.barcode.submissionNumber),
    '{{charter_number}}': sanitizeText(values.barcode.charterNumber),
    '{{entity_number}}': sanitizeText(values.barcode.entityNumber),
    '{{receipt_number}}': sanitizeText(values.barcode.receiptNumber),
    '{{filing_timestamp}}': `${formatDayjs(values.barcode.filingDate)} ${sanitizeText(values.barcode.filingTime)}`,
    '{{filing_date_short}}': formatDayjs(values.barcode.filingDate, 'MM/DD/YYYY'),
    '{{filing_date_long}}': formatDayjs(values.barcode.filingDate, 'MMMM D, YYYY'),
    '{{filing_receipt_description}}': sanitizeText(filingOption.receiptDescription),
    '{{filing_document_title}}': sanitizeText(filingOption.documentTitle),
    '{{filing_document_title_upper}}': sanitizeText(filingOption.documentTitle).toUpperCase(),
    '{{filing_option_label}}': sanitizeText(filingOption.label),
    '{{filing_fee}}': sanitizeText(values.filingFee),
    '{{filing_expedite_fee}}': sanitizeText(values.expediteFee),
    '{{filing_penalty_fee}}': sanitizeText(values.penaltyFee),
    '{{filing_certificate_fee}}': sanitizeText(values.certificateFee),
    '{{filing_copy_fee}}': sanitizeText(values.copyFee),
    '{{recipient_block}}': recipientBlock || '&nbsp;',
    '{{secretary_name}}': secretaryName,
    '{{secretary_signature_svg}}': secretarySignatureMarkup,
    '{{certificate_number}}': sanitizeText(values.certificateNumber || values.barcode.submissionNumber),
  };

  let output = template;
  Object.entries(replacements).forEach(([token, replacement]) => {
    const regex = new RegExp(escapeRegExp(token), 'g');
    output = output.replace(regex, replacement);
  });

  return output;
};

const ArticlesOfIncorporationGenerator: React.FC = () => {
  const [form] = Form.useForm<ArticlesFormValues>();
  const [mode, setMode] = useState<EditorMode>('preview');
  const [templateHtml, setTemplateHtml] = useState<string>(DEFAULT_OHIO_TEMPLATE);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [barcodeReadable, setBarcodeReadable] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [generatedFileUrl, setGeneratedFileUrl] = useState<string | null>(null);
  const [sealDataUrl, setSealDataUrl] = useState<string>('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');

  useEffect(() => {
    let isActive = true;
    const loadAssets = async () => {
      const seal = await loadAssetAsDataUrl(ohioSealImageUrl);
      if (!isActive) return;
      setSealDataUrl(seal);
      // signatureDataUrl remains empty - no default signature loaded
    };

    loadAssets();

    return () => {
      isActive = false;
    };
  }, []);

  const buildBarcodePayload = useCallback((values: Partial<ArticlesFormValues> | undefined): { payload: string; humanReadable: string } => {
    const meta: BarcodeMeta = {
      ...DEFAULT_BARCODE_META,
      ...(values?.barcode ?? {}),
    };

    const filingDatePart = meta.filingDate ? meta.filingDate.format('YYYYMMDD') : '';
    const parts = [
      'OH',
      sanitizeText(meta.docTypeCode).toUpperCase(),
      filingDatePart,
      sanitizeText(meta.filingTime),
      sanitizeText(meta.submissionNumber),
      sanitizeText(meta.charterNumber),
      sanitizeText(meta.entityNumber),
    ].filter(Boolean);

    const payload = parts.join('|');
    const humanReadable = [
      `Type: ${sanitizeText(meta.docTypeCode).toUpperCase()}`,
      `Filed: ${meta.filingDate ? meta.filingDate.format('MM/DD/YYYY') : '-'} ${sanitizeText(meta.filingTime)}`,
      `Submission: ${sanitizeText(meta.submissionNumber)}`,
      `Charter: ${sanitizeText(meta.charterNumber)}`,
      `Entity: ${sanitizeText(meta.entityNumber)}`,
    ]
      .filter((text) => !text.endsWith(': '))
      .join(' • ');

    return { payload, humanReadable };
  }, []);

  const syncHtmlWithForm = useCallback(
    (values: Partial<ArticlesFormValues> | undefined = undefined, options?: { forceTemplate?: string }) => {
      const currentFormValues = form.getFieldsValue(true) as ArticlesFormValues;
      const merged = {
        ...DEFAULT_FORM_VALUES,
        ...currentFormValues,
        ...values,
        barcode: {
          ...DEFAULT_BARCODE_META,
          ...DEFAULT_FORM_VALUES.barcode,
          ...(currentFormValues.barcode ?? {}),
          ...(values?.barcode ?? {}),
        } as BarcodeMeta,
      } as ArticlesFormValues;

      const templateSource = options?.forceTemplate ?? templateHtml;
      const { payload, humanReadable } = buildBarcodePayload(merged);
      let svgMarkup = '';

      if (payload) {
        try {
          svgMarkup = createBarcodeSvgMarkup(payload);
        } catch (error) {
          console.warn('Failed to render barcode:', error);
          svgMarkup = '';
        }
      }

      setBarcodeReadable(humanReadable);
      const compiled = buildArticlesHtml(
        templateSource,
        merged,
        svgMarkup,
        humanReadable,
        sealDataUrl,
        signatureDataUrl,
      );
      console.debug('Articles template compiled length:', compiled.length, {
        hasSeal: Boolean(sealDataUrl?.length),
        hasSignature: Boolean(signatureDataUrl?.length),
      });
      setHtmlContent(compiled);
      return compiled;
    },
    [buildBarcodePayload, form, templateHtml, sealDataUrl, signatureDataUrl],
  );

  const loadTemplates = useCallback(async () => {
    setTemplateLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('id, name, template_key, html_content, is_active')
        .ilike('template_key', 'articles_of_incorporation%')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const records = (data as TemplateRecord[]) ?? [];
      setTemplates(records);

      if (records.length > 0) {
        const activeTemplate = records.find((tpl) => tpl.is_active) ?? records[0];
        setSelectedTemplateId(activeTemplate.id);
        setTemplateHtml(activeTemplate.html_content || DEFAULT_OHIO_TEMPLATE);
        syncHtmlWithForm(undefined, { forceTemplate: activeTemplate.html_content || DEFAULT_OHIO_TEMPLATE });
      } else {
        setSelectedTemplateId(null);
        setTemplateHtml(DEFAULT_OHIO_TEMPLATE);
        syncHtmlWithForm(undefined, { forceTemplate: DEFAULT_OHIO_TEMPLATE });
      }
    } catch (error: any) {
      console.error('Failed to load Articles of Incorporation templates:', error);
      message.error('Unable to load Articles of Incorporation templates.');
      setTemplates([]);
      setSelectedTemplateId(null);
      setTemplateHtml(DEFAULT_OHIO_TEMPLATE);
      syncHtmlWithForm(undefined, { forceTemplate: DEFAULT_OHIO_TEMPLATE });
    } finally {
      setTemplateLoading(false);
    }
  }, [syncHtmlWithForm]);

  useEffect(() => {
    form.setFieldsValue(DEFAULT_FORM_VALUES);
    syncHtmlWithForm(DEFAULT_FORM_VALUES);
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sealDataUrl) return;
    syncHtmlWithForm(form.getFieldsValue(true) as ArticlesFormValues);
  }, [sealDataUrl, form, syncHtmlWithForm]);

  const handleTemplateSelect = (templateId?: string) => {
    if (!templateId) {
      setSelectedTemplateId(null);
      setTemplateHtml(DEFAULT_OHIO_TEMPLATE);
      syncHtmlWithForm(undefined, { forceTemplate: DEFAULT_OHIO_TEMPLATE });
      message.info('Reverted to built-in Ohio Articles template.');
      return;
    }

    const template = templates.find((tpl) => tpl.id === templateId);
    if (!template) {
      message.warning('Template not found.');
      return;
    }

    setSelectedTemplateId(templateId);
    setTemplateHtml(template.html_content || DEFAULT_OHIO_TEMPLATE);
    syncHtmlWithForm(undefined, { forceTemplate: template.html_content || DEFAULT_OHIO_TEMPLATE });
    message.success(`Loaded template "${template.name}".`);
  };

  const handleDownloadPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-10000px';
      container.style.left = '-10000px';
      container.style.width = '816px';
      container.style.padding = '32px';
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#111827';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      await doc.html(container, {
        callback: (docInstance) => {
          const filename = `${sanitizeText(form.getFieldValue('entityName')) || 'Articles-of-Incorporation'}.pdf`;
          docInstance.save(filename);
          document.body.removeChild(container);
        },
        margin: [24, 24, 24, 24],
        html2canvas: {
          backgroundColor: '#ffffff',
          scale: 0.8,
          useCORS: true,
        },
      });
    } catch (error) {
      console.error('Failed to export Articles to PDF:', error);
      message.error('Unable to export Articles to PDF.');
    }
  };

  const handleGenerateDocument = async () => {
    try {
      setGenerating(true);
      const currentValues = form.getFieldsValue(true) as ArticlesFormValues;
      const compiledHtml = syncHtmlWithForm(currentValues);
      const templateRecord = selectedTemplateId ? templates.find((tpl) => tpl.id === selectedTemplateId) : null;
      const templateKey = templateRecord?.template_key || 'articles_of_incorporation_oh';

      if (!compiledHtml || compiledHtml.trim().length < 20) {
        message.warning('Document content is empty. Please complete the form before generating.');
        return;
      }

      const { payload } = buildBarcodePayload(currentValues);
      if (!payload) {
        message.warning('Barcode metadata is incomplete. Please review the barcode tab.');
      }

      const result = await docsAPI.post('/documents/generate', {
        template_id: templateKey,
        template_key: templateKey,
        document_title: `${sanitizeText(currentValues.entityName)} Articles of Incorporation`,
        officer_name: sanitizeText(currentValues.entityName),
        role: sanitizeText(currentValues.entityType),
        data: currentValues,
        html_content: compiledHtml,
        executive_id: null,
        packet_id: null,
        signing_stage: null,
        signing_order: null,
      });

      if (result?.ok) {
        const url = result.file_url;
        setGeneratedFileUrl(url || null);
        message.success('Articles of Incorporation generated and stored successfully.');
        if (!url) {
          message.info('No storage URL returned. Check Supabase Storage for the generated file.');
        }
      } else {
        throw new Error(result?.error || 'Unknown error generating document.');
      }
    } catch (error: any) {
      console.error('Failed to generate Articles document:', error);
      message.error(error?.message || 'Failed to generate the Articles document.');
      setGeneratedFileUrl(null);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      message.error('Unable to open print window. Please allow pop-ups for this site.');
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleResetTemplate = () => {
    Modal.confirm({
      title: 'Reset Form and Template?',
      content: 'This will reset the form values to default Ohio placeholders and reload the default template.',
      onOk: () => {
        form.setFieldsValue(DEFAULT_FORM_VALUES);
        setTemplateHtml(DEFAULT_OHIO_TEMPLATE);
        setSelectedTemplateId(null);
        syncHtmlWithForm(DEFAULT_FORM_VALUES, { forceTemplate: DEFAULT_OHIO_TEMPLATE });
        message.success('Articles generator reset to defaults.');
      },
    });
  };

  const handleValuesChange = (_: any, allValues: ArticlesFormValues) => {
    syncHtmlWithForm(allValues);
  };

  return (
    <Card bordered={false} className="shadow-2xl">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3} className="!mb-1">
            Articles of Incorporation (Ohio)
          </Title>
          <Text type="secondary">
            Generate official-style Articles of Incorporation for the State of Ohio with auto-populated corporate data and a compliant barcode block.
          </Text>
        </div>

        <Alert
          type="info"
          showIcon
          message="State of Ohio Compliance"
          description="Populate the form with the corporation's charter, statutory agent, and share structure details. The document preview mirrors the Ohio Secretary of State Form 532A layout, including a Code 128 barcode with filing metadata."
        />

        <Space align="center" wrap>
          <span className="font-semibold">Template</span>
          <Select
            style={{ minWidth: 260 }}
            allowClear
            placeholder="Select Articles template"
            loading={templateLoading}
            value={selectedTemplateId ?? undefined}
            onChange={handleTemplateSelect}
            options={templates.map((tpl) => ({
              value: tpl.id,
              label: tpl.is_active ? tpl.name : `${tpl.name} (inactive)`,
            }))}
          />
          <Button icon={<SyncOutlined spin={templateLoading} />} onClick={loadTemplates}>
            Refresh Templates
          </Button>
          <Button icon={<CodeOutlined />} onClick={() => setMode(mode === 'preview' ? 'html' : 'preview')}>
            {mode === 'preview' ? 'Show HTML' : 'Show Preview'}
          </Button>
          <Button onClick={handleResetTemplate}>Reset</Button>
          <Button icon={<FileTextOutlined />} onClick={handlePrint}>
            Print
          </Button>
          <Button
            icon={<CloudUploadOutlined />}
            loading={generating}
            disabled={generating}
            onClick={handleGenerateDocument}
          >
            Generate & Save
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadPdf}>
            Download PDF
          </Button>
        </Space>

        {generatedFileUrl && (
          <Alert
            type="success"
            showIcon
            message="Document Generated"
            description={
              <Space direction="vertical">
                <span>The Articles of Incorporation PDF has been generated and stored.</span>
                <Typography.Link href={generatedFileUrl} target="_blank" rel="noopener noreferrer">
                  <LinkOutlined /> View Generated Document
                </Typography.Link>
              </Space>
            }
          />
        )}

        <Form layout="vertical" form={form} onValuesChange={handleValuesChange}>
          <Tabs
            defaultActiveKey="company"
            tabBarGutter={16}
            items={[
              {
                key: 'company',
                label: 'Company Details',
                children: (
                  <div className="space-y-4">
                  <Row gutter={24}>
                    <Col xs={24} md={12}>
                      <Form.Item name="entityName" label="Legal Entity Name" rules={[{ required: true, message: 'Enter the entity name' }] }>
                        <Input placeholder="Legal entity name" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="entityType" label="Entity Type" rules={[{ required: true, message: 'Enter entity type' }] }>
                        <Input placeholder="For-Profit Corporation" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={24}>
                    <Col xs={24} md={12}>
                      <Form.Item name="filingType" label="Filing Type" rules={[{ required: true, message: 'Select filing type' }] }>
                        <Select options={FILING_TYPE_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="certificateNumber" label="Certificate Number">
                        <Input placeholder="Certificate control number" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={24}>
                    <Col xs={24} md={8}>
                      <Form.Item name="formationState" label="Formation State" rules={[{ required: true, message: 'Enter formation state' }] }>
                        <Input placeholder="Ohio" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="principalCounty" label="Principal County" rules={[{ required: true, message: 'Enter county' }] }>
                        <Input placeholder="County name" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="effectiveDate" label="Effective Date" rules={[{ required: true, message: 'Select effective date' }] }>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={24}>
                    <Col xs={24} md={12}>
                      <Form.Item name="duration" label="Duration" rules={[{ required: true, message: 'Specify duration' }] }>
                        <Input placeholder="Perpetual" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="purpose" label="Purpose Clause" rules={[{ required: true, message: 'Describe corporate purpose' }] }>
                        <TextArea rows={4} placeholder="Add the corporate purpose" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider orientation="left">Principal Office</Divider>
                  <Row gutter={24}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="principalAddressLine1"
                        label="Address Line 1"
                        rules={[{ required: true, message: 'Enter principal address' }]}
                      >
                        <Input placeholder="Street address" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="principalAddressLine2" label="Address Line 2">
                        <Input placeholder="Suite, floor, etc." />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={24}>
                    <Col xs={24} md={8}>
                      <Form.Item name="principalCity" label="City" rules={[{ required: true, message: 'Enter city' }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="principalState" label="State" rules={[{ required: true, message: 'Enter state' }]}>
                        <Input placeholder="OH" maxLength={2} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="principalPostalCode" label="Postal Code" rules={[{ required: true, message: 'Enter postal code' }]}>
                        <Input placeholder="ZIP" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={24}>
                    <Col xs={24} md={12}>
                      <Form.Item name="contactEmail" label="Primary Contact Email" rules={[{ type: 'email', message: 'Enter a valid email' }]}>
                        <Input placeholder="legal@yourcompany.com" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="contactPhone" label="Primary Contact Phone">
                        <Input placeholder="(555) 555-1234" />
                      </Form.Item>
                    </Col>
                  </Row>
                  </div>
                ),
              },
              {
                key: 'filing',
                label: 'Filing Details',
                children: (
                  <div className="space-y-4">
                    <Row gutter={24}>
                      <Col xs={24} md={4}>
                        <Form.Item name="filingFee" label="Filing Fee">
                          <Input placeholder="50.00" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item name="expediteFee" label="Expedite Fee">
                          <Input placeholder="300.00" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item name="penaltyFee" label="Penalty">
                          <Input placeholder="0.00" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item name="certificateFee" label="Cert Fee">
                          <Input placeholder="0.00" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item name="copyFee" label="Copy Fee">
                          <Input placeholder="0.00" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={24}>
                      <Col xs={24} md={12}>
                        <Form.Item name="recipientName" label="Recipient Name">
                          <Input placeholder="Thompson Hine LLP" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="secretaryOfStateName" label="Secretary of State">
                          <Input placeholder="Frank LaRose" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={24}>
                      <Col xs={24} md={8}>
                        <Form.Item name="recipientAddressLine1" label="Address Line 1">
                          <Input placeholder="3900 Key Center" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="recipientAddressLine2" label="Address Line 2">
                          <Input placeholder="127 Public Square" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="recipientAddressLine3" label="Address Line 3">
                          <Input placeholder="Cleveland, OH 44114-1291" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },
              {
                key: 'agent',
                label: 'Statutory Agent & Shares',
                children: (
                  <div className="space-y-4">
                  <Divider orientation="left">Statutory Agent</Divider>
                  <Row gutter={24}>
                    <Col xs={24} md={12}>
                      <Form.Item name="statutoryAgentName" label="Agent Name" rules={[{ required: true, message: 'Enter agent name' }]}>
                        <Input placeholder="Full legal name" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="statutoryAgentAcceptance"
                        label="Agent Acceptance Statement"
                        rules={[{ required: true, message: 'Provide agent acceptance statement' }]}
                      >
                        <TextArea rows={3} placeholder="Agent acceptance language" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={24}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="statutoryAgentAddressLine1"
                        label="Agent Address Line 1"
                        rules={[{ required: true, message: 'Enter agent address' }]}
                      >
                        <Input placeholder="Street address" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="statutoryAgentAddressLine2" label="Agent Address Line 2">
                        <Input placeholder="Suite, floor, etc." />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={24}>
                    <Col xs={24} md={8}>
                      <Form.Item name="statutoryAgentCity" label="City" rules={[{ required: true, message: 'Enter city' }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="statutoryAgentState" label="State" rules={[{ required: true, message: 'Enter state' }]}>
                        <Input placeholder="OH" maxLength={2} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="statutoryAgentPostalCode"
                        label="Postal Code"
                        rules={[{ required: true, message: 'Enter postal code' }]}
                      >
                        <Input placeholder="ZIP" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider orientation="left">Authorized Shares</Divider>
                  <Form.List name="shareClasses">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {fields.map((field, index) => (
                          <Card key={field.key} size="small" title={`Share Class ${index + 1}`} extra={<Button onClick={() => remove(field.name)}>Remove</Button>}>
                            <Row gutter={16}>
                              <Col xs={24} md={12}>
                                <Form.Item
                                  {...field}
                                  name={[field.name, 'className']}
                                  fieldKey={[field.fieldKey, 'className']}
                                  label="Class Name"
                                  rules={[{ required: true, message: 'Enter class name' }]}
                                >
                                  <Input placeholder="e.g., Common Voting" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item
                                  {...field}
                                  name={[field.name, 'authorizedShares']}
                                  fieldKey={[field.fieldKey, 'authorizedShares']}
                                  label="Authorized Shares"
                                  rules={[{ required: true, message: 'Enter authorized shares' }]}
                                >
                                  <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g., 1,000,000" />
                                </Form.Item>
                              </Col>
                            </Row>
                            <Row gutter={16}>
                              <Col xs={24} md={12}>
                                <Form.Item
                                  {...field}
                                  name={[field.name, 'parValue']}
                                  fieldKey={[field.fieldKey, 'parValue']}
                                  label="Par Value"
                                >
                                  <Input placeholder="$0.0001" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item
                                  {...field}
                                  name={[field.name, 'votingRights']}
                                  fieldKey={[field.fieldKey, 'votingRights']}
                                  label="Voting Rights / Preferences"
                                >
                                  <TextArea rows={2} placeholder="Describe voting rights, preferences, and limitations." />
                                </Form.Item>
                              </Col>
                            </Row>
                          </Card>
                        ))}
                        <Button type="dashed" onClick={() => add()} block>
                          Add Share Class
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                  </div>
                ),
              },
              {
                key: 'incorporators',
                label: 'Incorporators & Provisions',
                children: (
                  <div className="space-y-4">
                  <Divider orientation="left">Incorporators</Divider>
                  <Form.List name="incorporators">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {fields.map((field, index) => (
                          <Card key={field.key} size="small" title={`Incorporator ${index + 1}`} extra={<Button onClick={() => remove(field.name)}>Remove</Button>}>
                            <Row gutter={16}>
                              <Col xs={24} md={12}>
                                <Form.Item
                                  {...field}
                                  name={[field.name, 'name']}
                                  fieldKey={[field.fieldKey, 'name']}
                                  label="Full Name"
                                  rules={[{ required: true, message: 'Enter incorporator name' }]}
                                >
                                  <Input placeholder="Full legal name" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item {...field} name={[field.name, 'email']} fieldKey={[field.fieldKey, 'email']} label="Email">
                                  <Input type="email" placeholder="name@example.com" />
                                </Form.Item>
                              </Col>
                            </Row>
                            <Row gutter={16}>
                              <Col xs={24} md={12}>
                                <Form.Item
                                  {...field}
                                  name={[field.name, 'addressLine1']}
                                  fieldKey={[field.fieldKey, 'addressLine1']}
                                  label="Address Line 1"
                                  rules={[{ required: true, message: 'Enter address line 1' }]}
                                >
                                  <Input placeholder="Street address" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item {...field} name={[field.name, 'addressLine2']} fieldKey={[field.fieldKey, 'addressLine2']} label="Address Line 2">
                                  <Input placeholder="Suite, floor, etc." />
                                </Form.Item>
                              </Col>
                            </Row>
                            <Row gutter={16}>
                              <Col xs={24} md={8}>
                                <Form.Item
                                  {...field}
                                  name={[field.name, 'city']}
                                  fieldKey={[field.fieldKey, 'city']}
                                  label="City"
                                  rules={[{ required: true, message: 'Enter city' }]}
                                >
                                  <Input />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={8}>
                                <Form.Item
                                  {...field}
                                  name={[field.name, 'state']}
                                  fieldKey={[field.fieldKey, 'state']}
                                  label="State"
                                  rules={[{ required: true, message: 'Enter state' }]}
                                >
                                  <Input placeholder="OH" maxLength={2} />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={8}>
                                <Form.Item
                                  {...field}
                                  name={[field.name, 'postalCode']}
                                  fieldKey={[field.fieldKey, 'postalCode']}
                                  label="Postal Code"
                                  rules={[{ required: true, message: 'Enter postal code' }]}
                                >
                                  <Input placeholder="ZIP" />
                                </Form.Item>
                              </Col>
                            </Row>
                          </Card>
                        ))}
                        <Button type="dashed" onClick={() => add()} block>
                          Add Incorporator
                        </Button>
                      </Space>
                    )}
                  </Form.List>

                  <Divider orientation="left">Optional Provisions</Divider>
                  <Form.List name="optionalProvisions">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {fields.map((field, index) => (
                          <Card
                            key={field.key}
                            size="small"
                            title={`Provision ${index + 1}`}
                            extra={<Button onClick={() => remove(field.name)}>Remove</Button>}
                          >
                            <Form.Item
                              {...field}
                              name={[field.name]}
                              fieldKey={[field.fieldKey]}
                              rules={[{ required: true, message: 'Enter provision text' }]}
                            >
                              <TextArea rows={3} placeholder="Describe the optional provision or limitation." />
                            </Form.Item>
                          </Card>
                        ))}
                        <Button type="dashed" onClick={() => add()} block>
                          Add Provision
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                  </div>
                ),
              },
              {
                key: 'barcode',
                label: 'Barcode Metadata',
                children: (
                  <div className="space-y-4">
                  <Paragraph type="secondary">
                    Ohio uses a Code 128 barcode containing filing metadata (document type, filing timestamp, charter number, entity number, and submission ID). Populate the
                    fields below to mirror the official barcode payload.
                  </Paragraph>
                  <Row gutter={24}>
                    <Col xs={24} md={8}>
                      <Form.Item name={['barcode', 'docTypeCode']} label="Document Type Code" rules={[{ required: true, message: 'Enter document type code' }]}>
                        <Input placeholder="ART" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name={['barcode', 'filingDate']} label="Filing Date" rules={[{ required: true, message: 'Select filing date' }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name={['barcode', 'filingTime']} label="Filing Time (HHMM)" rules={[{ required: true, message: 'Provide filing time' }]}>
                        <Input placeholder="1432" maxLength={4} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={24}>
                    <Col xs={24} md={6}>
                      <Form.Item name={['barcode', 'submissionNumber']} label="Submission Number" rules={[{ required: true, message: 'Enter submission number' }]}>
                        <Input placeholder="AIOH-000123" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item name={['barcode', 'charterNumber']} label="Charter Number" rules={[{ required: true, message: 'Enter charter number' }]}>
                        <Input placeholder="DOC-2025-0001" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item name={['barcode', 'entityNumber']} label="Entity Number" rules={[{ required: true, message: 'Enter entity number' }]}>
                        <Input placeholder="2025123456" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item name={['barcode', 'receiptNumber']} label="Receipt Number">
                        <Input placeholder="RS-987654" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Alert
                    type="success"
                    showIcon
                    message="Barcode Payload"
                    description={
                      <div>
                        <strong>Encoded Payload:</strong>
                        <div style={{ fontFamily: 'monospace', fontSize: 13, marginTop: 4 }}>{buildBarcodePayload(form.getFieldsValue(true) as ArticlesFormValues).payload}</div>
                        <div style={{ marginTop: 8 }}>
                          <strong>Human Readable:</strong> {barcodeReadable || 'No metadata provided yet.'}
                        </div>
                      </div>
                    }
                  />
                  </div>
                ),
              },
            ]}
          />
        </Form>

        <Divider />

        <Card bordered className="shadow-inner">
          <Space align="baseline" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
            <Title level={4} className="!mb-0">
              Document Output
            </Title>
            <Space>
              <Button onClick={() => setMode('preview')} type={mode === 'preview' ? 'primary' : 'default'}>
                Preview
              </Button>
              <Button onClick={() => setMode('html')} type={mode === 'html' ? 'primary' : 'default'}>
                HTML Source
              </Button>
            </Space>
          </Space>

          {mode === 'preview' ? (
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 24, maxHeight: 900, overflow: 'auto' }}>
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />
            </div>
          ) : (
            <TextArea value={htmlContent} onChange={(event) => setHtmlContent(event.target.value)} autoSize={{ minRows: 16 }} spellCheck={false} />
          )}
        </Card>

        {templateLoading && (
          <div className="flex items-center gap-2 text-slate-500">
            <Spin size="small" /> <span>Loading templates...</span>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default ArticlesOfIncorporationGenerator;


