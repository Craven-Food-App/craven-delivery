import { PIPELINE_STAGES } from '../dealConstants';
import { parseCsvRows, resolveDisposition } from './partnershipDispositionCsv';

/** Headers aligned with VendorRecords export + import (round-trip). */
export const VENDOR_CSV_HEADERS = [
  'vendor_name',
  'point_of_contact',
  'title',
  'email',
  'phone',
  'industry',
  'website',
  'payment_terms',
  'renewal_date',
  'contract_start',
  'contract_end',
  'assigned_to',
  'pipeline_stage',
  'notes',
  'disposition',
  'disposition_notes',
] as const;

function parseDateOnly(v: string | undefined): string | null {
  const s = (v || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Map pipeline_stage / status text to partnership status enum value. */
export function resolveVendorPipelineStatus(raw: string | undefined): string {
  const original = (raw || '').trim();
  if (!original) return 'in_talks';
  const s = original.toLowerCase().replace(/\s+/g, '_');
  if (PIPELINE_STAGES.some((p) => p.value === s)) return s;
  const byLabel = PIPELINE_STAGES.find(
    (p) =>
      p.label.toLowerCase().replace(/\s+/g, '_') === s ||
      p.label.toLowerCase() === original.toLowerCase(),
  );
  if (byLabel) return byLabel.value;
  return 'in_talks';
}

export type VendorImportPayload = {
  partner_name: string;
  poc_name: string | null;
  poc_title: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  website_url: string | null;
  payment_terms: string | null;
  renewal_date: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  assigned_to: string | null;
  status: string;
  notes: string | null;
  disposition: string | null;
  disposition_notes: string | null;
};

/**
 * One CSV row → vendor insert payload. Skips rows with no vendor name.
 * Accepts column aliases for spreadsheets from other systems.
 */
export function rowToVendorImportPayload(row: Record<string, string>): VendorImportPayload | null {
  const partner_name = (
    row.vendor_name ||
    row.partner_name ||
    row.name ||
    row.company ||
    row.organization ||
    ''
  ).trim();
  if (!partner_name) return null;

  const poc_name = (
    row.point_of_contact ||
    row.poc_name ||
    row.contact_name ||
    row.full_name ||
    row.contact ||
    ''
  ).trim() || null;

  const poc_title = (row.title || row.job_title || '').trim() || null;
  const email = (row.email || row.contact_email || '').trim() || null;
  const phone = (row.phone || row.contact_phone || '').trim() || null;
  const industry = (row.industry || '').trim() || null;
  const website_url = (row.website || row.website_url || '').trim() || null;
  const payment_terms = (row.payment_terms || '').trim() || null;

  const renewal_date = parseDateOnly(row.renewal_date || row.renewal);
  const contract_start_date = parseDateOnly(row.contract_start || row.contract_start_date);
  const contract_end_date = parseDateOnly(row.contract_end || row.contract_end_date);

  const assigned_to = (row.assigned_to || row.owner || 'CPO').trim() || 'CPO';
  const status = resolveVendorPipelineStatus(row.pipeline_stage || row.status || row.stage);
  const notes = (row.notes || row.description || '').trim() || null;

  let disposition = resolveDisposition(row.disposition || row.close_reason);
  const disposition_notes = (row.disposition_notes || '').trim() || null;
  if (status === 'lost') {
    disposition = disposition || 'other';
  } else {
    disposition = null;
  }

  return {
    partner_name,
    poc_name,
    poc_title,
    email,
    phone,
    industry,
    website_url,
    payment_terms,
    renewal_date,
    contract_start_date,
    contract_end_date,
    assigned_to,
    status,
    notes,
    disposition,
    disposition_notes,
  };
}

export { parseCsvRows };
