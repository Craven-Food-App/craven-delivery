/**
 * Stable key for a pickup (merchant) leg — used to decide the next on-foot step:
 * new merchant → navigate to store and verify; same pickup as previous stop → already batched, go to drop-off.
 */

function addressSnippet(address: unknown): string {
  if (address == null) return '';
  if (typeof address === 'string') return address.trim().toLowerCase();
  if (typeof address === 'object') {
    const a = address as Record<string, unknown>;
    return String(
      [a.street, a.address, a.city, a.state, a.zip, a.zip_code]
        .filter((x) => x != null && String(x).length > 0)
        .join(' ')
    )
      .trim()
      .toLowerCase();
  }
  return String(address);
}

export function formatPickupKey(
  restaurantId: string | null | undefined,
  pickupAddress: unknown
): string {
  if (restaurantId) return `r:${restaurantId}`;
  const a = addressSnippet(pickupAddress);
  if (a.length > 0) return `a:${a}`;
  return 'a:';
}

export function getStopPickupKey(
  stop: { pickup_key?: string; restaurant_id?: string | null; pickup_address?: unknown } | null | undefined,
  fallback: { restaurant_id?: string | null; pickup_address?: unknown }
): string {
  if (stop?.pickup_key) return stop.pickup_key;
  return formatPickupKey(
    stop?.restaurant_id ?? fallback.restaurant_id,
    stop?.pickup_address ?? fallback.pickup_address
  );
}
