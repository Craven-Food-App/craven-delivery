/**
 * Safely format an address value (string or JSONB object) into a display string.
 * Prevents React error #31 ("objects are not valid as a React child") when an
 * address column is sometimes a plain string and sometimes a JSON object with
 * keys like { street, address, city, state, zip, zip_code, name, phone, latitude, longitude }.
 */
export function formatAddress(addr: unknown): string {
  if (addr == null) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr !== 'object') return String(addr);

  const a = addr as Record<string, unknown>;
  if (typeof a.address === 'string' && a.address.trim()) return a.address;

  const parts = [
    a.street,
    a.city,
    a.state,
    a.zip ?? a.zip_code,
  ]
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter((v) => v.length > 0);

  return parts.join(', ');
}