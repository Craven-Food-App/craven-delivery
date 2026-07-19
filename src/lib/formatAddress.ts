/**
 * Safely format an address value (string or JSONB object) into a display string.
 * Prevents React error #31 ("objects are not valid as a React child") when an
 * address column is sometimes a plain string and sometimes a JSON object with
 * keys like { street, address, city, state, zip, zip_code, name, phone, latitude, longitude }.
 *
 * Also resolves customer dropoff across dropoff_address / delivery_address variants.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/** True when address is missing or cannot be shown (null, "", "—", {}). */
export function isBlankAddress(address: unknown): boolean {
  if (address == null) return true;
  if (typeof address === 'string') {
    const t = address.trim();
    return !t || t === '—' || t === '-' || t.toLowerCase() === 'delivery address';
  }
  if (typeof address !== 'object') return true;
  const formatted = formatAddress(address);
  return !formatted || formatted === '—';
}

export function formatAddress(addr: unknown): string {
  if (addr == null) return '';
  if (typeof addr === 'string') {
    const t = addr.trim();
    if (!t || t === '—' || t === '-') return '';
    return t;
  }
  if (typeof addr !== 'object') return String(addr);

  const a = addr as Record<string, unknown>;

  const street =
    (typeof a.street === 'string' && a.street.trim()) ||
    (typeof a.address === 'string' && a.address.trim()) ||
    (typeof a.street_address === 'string' && a.street_address.trim()) ||
    (typeof a.line1 === 'string' && a.line1.trim()) ||
    (typeof a.address_line_1 === 'string' && a.address_line_1.trim()) ||
    (typeof a.address_line1 === 'string' && a.address_line1.trim()) ||
    (typeof a.formatted === 'string' && a.formatted.trim()) ||
    (typeof a.formatted_address === 'string' && a.formatted_address.trim()) ||
    (typeof a.full_address === 'string' && a.full_address.trim()) ||
    '';

  // Checkout often stores a full one-line address in `address` (already includes city/state/zip).
  const streetLooksComplete = /,\s*[A-Za-z.\s]+,\s*[A-Z]{2}\b/.test(street);
  if (streetLooksComplete) {
    const unitEarly =
      (a.apt_suite as string) || (a.unit as string) || (a.apt as string) || (a.suite as string) || '';
    if (unitEarly && !street.toLowerCase().includes(String(unitEarly).toLowerCase())) {
      const unitLabel = /^(apt|unit|ste|suite|#)/i.test(String(unitEarly).trim())
        ? String(unitEarly).trim()
        : `Apt ${String(unitEarly).trim()}`;
      return `${street} ${unitLabel}`.trim();
    }
    return street;
  }

  const unitRaw =
    (a.unit as string) ||
    (a.apt as string) ||
    (a.apartment as string) ||
    (a.apt_suite as string) ||
    (a.suite as string) ||
    (a.line2 as string) ||
    (a.address_line_2 as string) ||
    (a.address_line2 as string) ||
    '';
  const unit = unitRaw
    ? /^(apt|unit|ste|suite|#)/i.test(String(unitRaw).trim())
      ? String(unitRaw).trim()
      : `Apt ${String(unitRaw).trim()}`
    : '';

  const streetFull = [street, unit].filter(Boolean).join(' ').trim();
  const city = typeof a.city === 'string' ? a.city.trim() : '';
  const state = typeof a.state === 'string' ? a.state.trim() : '';
  const zip =
    (typeof a.zip === 'string' && a.zip.trim()) ||
    (typeof a.zip_code === 'string' && a.zip_code.trim()) ||
    (typeof a.postal_code === 'string' && a.postal_code.trim()) ||
    '';
  const cityState = [city, state].filter(Boolean).join(', ');
  const parts = [streetFull, cityState, zip].filter((v) => v.length > 0);
  if (parts.length > 0) return parts.join(', ');

  return '';
}

/** Prefer dropoff_address, then delivery_address, skipping blank values. */
export function resolveOrderDropoffAddress(order: {
  dropoff_address?: unknown;
  delivery_address?: unknown;
} | null | undefined): unknown {
  if (!order) return null;
  if (!isBlankAddress(order.dropoff_address)) return order.dropoff_address;
  if (!isBlankAddress(order.delivery_address)) return order.delivery_address;
  return null;
}

export function resolveOrderCustomerPhone(order: {
  customer_phone?: string | null;
  dropoff_address?: unknown;
  delivery_address?: unknown;
} | null | undefined): string {
  if (!order) return '';
  const direct = (order.customer_phone || '').trim();
  if (direct && direct !== '—') return direct;

  for (const candidate of [order.delivery_address, order.dropoff_address]) {
    const rec = asRecord(candidate);
    const phone = rec && (rec.phone || rec.customer_phone || rec.mobile || rec.tel);
    if (typeof phone === 'string' && phone.trim() && phone.trim() !== '—') {
      return phone.trim();
    }
  }
  return '';
}
