/** Last 4 characters of a UUID, uppercased (for display-only executive / account hints). */
export function uuidLastFour(id: string | null | undefined): string | null {
  if (!id || typeof id !== 'string' || id.length < 4) return null;
  return id.slice(-4).toUpperCase();
}
