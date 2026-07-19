/** After delivery, hide full customer address from feeder UI. */
export function formatDeliveryAreaOnly(address: unknown): string {
  if (!address) return 'Delivery area unavailable';
  if (typeof address === 'string') {
    const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const city = parts[parts.length - 2];
      const stateZip = parts[parts.length - 1];
      const state = stateZip.split(/\s+/)[0];
      return `Delivery area: ${city}, ${state}`;
    }
    return 'Customer address hidden after completion';
  }
  if (typeof address === 'object') {
    const a = address as Record<string, unknown>;
    const city = String(a.city ?? '').trim();
    const state = String(a.state ?? '').trim();
    if (city && state) return `Delivery area: ${city}, ${state}`;
    if (city) return `Delivery area: ${city}`;
    return 'Customer address hidden after completion';
  }
  return 'Customer address hidden after completion';
}
