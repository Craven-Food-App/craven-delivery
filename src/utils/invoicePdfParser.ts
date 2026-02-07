/**
 * Invoice PDF Parser
 *
 * Uses pdfjs-dist to extract structured invoice data from uploaded PDF files.
 * Extracts: vendor info, invoice number, dates, line items, totals.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedInvoice {
  vendor_name: string;
  vendor_email: string;
  vendor_address: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  line_items: ParsedLineItem[];
  notes: string;
  raw_text: string;
}

export interface ParsedLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

// ── Regex patterns for common invoice fields ───────────────────────────
const INVOICE_NUM_PATTERNS = [
  /invoice\s*(?:#|no\.?|number)\s*[:\s]*([A-Z0-9\-]+)/i,
  /inv\s*[:\s#]*([A-Z0-9\-]+)/i,
  /(?:bill|receipt)\s*(?:#|no\.?)\s*[:\s]*([A-Z0-9\-]+)/i,
];

const DATE_PATTERNS = [
  /(?:invoice\s+date|date\s+of\s+invoice|issue\s+date|billed?\s+date)\s*[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
  /(?:invoice\s+date|date)\s*[:\s]*([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i,
  /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
];

const DUE_DATE_PATTERNS = [
  /(?:due\s+date|payment\s+due|pay\s+by)\s*[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
  /(?:due\s+date|payment\s+due)\s*[:\s]*([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i,
  /(?:net\s+(\d+))/i,
];

const TOTAL_PATTERNS = [
  /(?:total\s+(?:due|amount|balance))\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i,
  /(?:amount\s+due|balance\s+due|grand\s+total)\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i,
  /(?:^|\s)total\s*[:\s]*\$?\s*([\d,]+\.?\d*)/im,
];

const SUBTOTAL_PATTERNS = [
  /sub\s*-?\s*total\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i,
];

const TAX_PATTERNS = [
  /(?:tax|vat|gst|hst)\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i,
  /(?:sales\s+tax)\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// ── Helpers ───────────────────────────────────────────────────────────

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, '')) || 0;
}

function parseDate(raw: string): string {
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch { /* ignore */ }
  // Try MM/DD/YYYY or DD/MM/YYYY
  const parts = raw.split(/[\/-]/);
  if (parts.length === 3) {
    let [a, b, c] = parts.map(Number);
    if (c < 100) c += 2000;
    // Assume MM/DD/YYYY (US style)
    const d = new Date(c, a - 1, b);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return '';
}

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return '';
}

// Guess vendor name from the first few non-empty lines
function guessVendor(lines: string[]): string {
  for (const line of lines.slice(0, 8)) {
    const trimmed = line.trim();
    if (
      trimmed.length > 2 &&
      trimmed.length < 80 &&
      !/^(invoice|bill|receipt|statement|page|date|due|total|sub|tax|qty|description|item|amount)/i.test(trimmed) &&
      !/^\d/.test(trimmed) &&
      !/@/.test(trimmed)
    ) {
      return trimmed;
    }
  }
  return '';
}

// Try to parse a line-item table
function parseLineItems(text: string): ParsedLineItem[] {
  const items: ParsedLineItem[] = [];
  // Look for rows like: "Description  Qty  Price  Amount"
  const lines = text.split('\n');
  const tableStart = lines.findIndex(l =>
    /description/i.test(l) && (/qty|quantity/i.test(l) || /price|rate/i.test(l) || /amount/i.test(l))
  );

  if (tableStart === -1) return items;

  for (let i = tableStart + 1; i < lines.length && items.length < 50; i++) {
    const line = lines[i].trim();
    if (!line || /^(sub\s*-?\s*total|total|tax|balance|amount\s+due|grand\s+total)/i.test(line)) break;

    // Try to match: description ... numbers
    const numMatches = line.match(/[\d,]+\.?\d*/g);
    if (numMatches && numMatches.length >= 1) {
      const nums = numMatches.map(n => parseFloat(n.replace(/,/g, '')));
      const descEnd = line.indexOf(numMatches[0]);
      const desc = line.substring(0, descEnd).trim();

      if (desc && nums.length >= 1) {
        const qty = nums.length >= 3 ? nums[0] : 1;
        const unitPrice = nums.length >= 3 ? nums[1] : nums.length >= 2 ? nums[0] : nums[0];
        const amount = nums[nums.length - 1];
        items.push({ description: desc, quantity: qty, unit_price: unitPrice, amount });
      }
    }
  }
  return items;
}

// ── Main parser ──────────────────────────────────────────────────────

export async function parseInvoicePdf(file: File): Promise<ParsedInvoice> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  const lines = fullText.split('\n').filter(l => l.trim());

  // Extract fields
  const invoiceNumber = firstMatch(fullText, INVOICE_NUM_PATTERNS);
  const invoiceDateRaw = firstMatch(fullText, DATE_PATTERNS);
  const dueDateRaw = firstMatch(fullText, DUE_DATE_PATTERNS);
  const totalRaw = firstMatch(fullText, TOTAL_PATTERNS);
  const subtotalRaw = firstMatch(fullText, SUBTOTAL_PATTERNS);
  const taxRaw = firstMatch(fullText, TAX_PATTERNS);
  const emailMatch = fullText.match(EMAIL_PATTERN);

  const total = parseAmount(totalRaw);
  const subtotal = parseAmount(subtotalRaw) || total;
  const tax = parseAmount(taxRaw);

  // Compute due date from Net terms
  let dueDate = parseDate(dueDateRaw);
  if (!dueDate && dueDateRaw && /^\d+$/.test(dueDateRaw)) {
    const invoiceDate = parseDate(invoiceDateRaw);
    if (invoiceDate) {
      const d = new Date(invoiceDate);
      d.setDate(d.getDate() + parseInt(dueDateRaw));
      dueDate = d.toISOString().split('T')[0];
    }
  }

  const lineItems = parseLineItems(fullText);

  return {
    vendor_name: guessVendor(lines),
    vendor_email: emailMatch ? emailMatch[0] : '',
    vendor_address: '',
    invoice_number: invoiceNumber,
    invoice_date: parseDate(invoiceDateRaw) || new Date().toISOString().split('T')[0],
    due_date: dueDate || '',
    subtotal,
    tax_amount: tax,
    total_amount: total || subtotal + tax,
    line_items: lineItems,
    notes: '',
    raw_text: fullText.slice(0, 5000), // Cap for storage
  };
}

