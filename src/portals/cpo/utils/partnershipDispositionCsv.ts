import { PARTNERSHIP_DISPOSITION_VALUES, PARTNER_TYPES } from '../dealConstants';

/** Enterprise-friendly column headers (import/export). */
export const PARTNERSHIP_CSV_HEADERS = [
  'partner_name',
  'partner_type',
  'status',
  'disposition',
  'disposition_notes',
  'next_follow_up_at',
  'ok_to_reengage',
  'contact_email',
  'contact_phone',
  'website_url',
  'industry',
  'assigned_to',
  'priority',
  'description',
] as const;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

/** Minimal RFC4180-style CSV parser (quoted fields). */
export function parseCsvRows(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      if (cur.trim()) lines.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.trim()) lines.push(cur);

  if (lines.length === 0) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let field = '';
    let q = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (q && line[j + 1] === '"') {
          field += '"';
          j++;
        } else {
          q = !q;
        }
      } else if (ch === ',' && !q) {
        out.push(field);
        field = '';
      } else {
        field += ch;
      }
    }
    out.push(field);
    return out.map((s) => s.trim());
  };

  const rawHeaders = splitLine(lines[0]).map(normalizeHeader);
  const headers = rawHeaders.filter(Boolean);
  const rows: Record<string, string>[] = [];

  for (let li = 1; li < lines.length; li++) {
    const cells = splitLine(lines[li]);
    if (cells.every((c) => c === '')) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseBool(v: string | undefined): boolean {
  const s = (v || '').trim().toLowerCase();
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return true;
}

function parseIsoDate(v: string | undefined): string | null {
  const s = (v || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function resolvePartnerType(raw: string | undefined): string {
  const s = (raw || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!s) return 'other';
  const byValue = PARTNER_TYPES.find((t) => t.value === s);
  if (byValue) return byValue.value;
  const byLabel = PARTNER_TYPES.find((t) => t.label.toLowerCase().replace(/\s+/g, '_') === s);
  if (byLabel) return byLabel.value;
  return 'other';
}

export function resolveDisposition(raw: string | undefined): string | null {
  const s = (raw || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!s) return null;
  if (PARTNERSHIP_DISPOSITION_VALUES.includes(s)) return s;
  const map: Record<string, string> = {
    not_interested: 'not_interested',
    not_now: 'not_now',
    competitor: 'competitor',
    pricing: 'pricing',
    no_fit: 'no_fit',
    no_response: 'no_response',
    other: 'other',
  };
  return map[s] || null;
}

const STATUS_ALIASES: Record<string, string> = {
  lost: 'lost',
  lead: 'lead',
  contacted: 'contacted',
  in_talks: 'in_talks',
  negotiating: 'negotiating',
  verbal_agreement: 'verbal_agreement',
  signed: 'signed',
};

export function resolveStatus(raw: string | undefined): string {
  const s = (raw || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (s && STATUS_ALIASES[s]) return STATUS_ALIASES[s];
  return 'lost';
}

export type ImportPartnershipRow = {
  partner_name: string;
  partner_type: string;
  status: string;
  disposition: string | null;
  disposition_notes: string | null;
  next_follow_up_at: string | null;
  ok_to_reengage: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  industry: string | null;
  assigned_to: string | null;
  priority: string | null;
  description: string | null;
};

export function rowToImportPayload(row: Record<string, string>): ImportPartnershipRow | null {
  const name =
    row.partner_name ||
    row.name ||
    row.company ||
    row.organization ||
    '';
  if (!name.trim()) return null;

  return {
    partner_name: name.trim(),
    partner_type: resolvePartnerType(row.partner_type || row.type),
    status: resolveStatus(row.status || row.stage),
    disposition: resolveDisposition(row.disposition || row.reason || row.outcome),
    disposition_notes: (row.disposition_notes || row.notes || '').trim() || null,
    next_follow_up_at: parseIsoDate(row.next_follow_up_at || row.follow_up || row.followup),
    ok_to_reengage: parseBool(row.ok_to_reengage ?? row.reengage ?? row.ok_to_contact),
    contact_email: (row.contact_email || row.email || '').trim() || null,
    contact_phone: (row.contact_phone || row.phone || '').trim() || null,
    website_url: (row.website_url || row.website || '').trim() || null,
    industry: (row.industry || '').trim() || null,
    assigned_to: (row.assigned_to || row.owner || '').trim() || null,
    priority: ['low', 'medium', 'high', 'strategic'].includes((row.priority || '').trim().toLowerCase())
      ? (row.priority || '').trim().toLowerCase()
      : 'medium',
    description: (row.description || '').trim() || null,
  };
}
