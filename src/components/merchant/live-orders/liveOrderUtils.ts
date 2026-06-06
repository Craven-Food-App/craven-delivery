export type LiveOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type KanbanColumn = "new" | "preparing" | "ready";

export type LiveOrder = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  order_status: LiveOrderStatus | string | null;
  created_at: string | null;
  total_cents: number;
  accepted_at: string | null;
  driver_arrived_at: string | null;
  pickup_parking_spot: string | null;
  delivery_method: string | null;
  delivery_address: unknown;
  estimated_delivery_time: string | null;
  special_instructions?: string | null;
  driver_id?: string | null;
  accepted_driver_id?: string | null;
  pickup_code?: string | null;
  pickup_confirmed_at?: string | null;
  feeder_offer_accepted_at?: string | null;
  feeder_route_started_at?: string | null;
  customer_phone?: string | null;
  driver?: LiveOrderDriver | null;
  order_items: Array<{
    id: string;
    quantity: number;
    price_cents: number;
    special_instructions: string | null;
    name: string;
  }>;
};

export type LiveOrderDriver = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color?: string | null;
  license_plate: string | null;
  status: string | null;
};

export const formatTime = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value))
    : "--";

export const formatMoney = (cents: number) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

/**
 * Mask customer name for merchant view: first name + last initial only.
 * Example: "John Smith" -> "John S."
 */
export const formatCustomerNameForMerchant = (fullName: string | null | undefined): string => {
  if (!fullName) return "Customer";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
};

/**
 * Mask delivery address for merchant view: only city, state, zip (never street).
 */
export const formatCustomerAreaForMerchant = (addr: unknown): string | null => {
  if (!addr) return null;
  if (typeof addr === "string") {
    // Try to extract trailing "City, ST ZIP" from a freeform string
    const m = addr.match(/([A-Za-z .'-]+),\s*([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?/);
    if (m) {
      return [m[1].trim(), m[2], m[3]].filter(Boolean).join(", ").replace(/, (\d)/, " $1");
    }
    return null;
  }
  if (typeof addr !== "object") return null;
  const a = addr as Record<string, unknown>;
  const city = (a.city as string) || "";
  const state = (a.state as string) || "";
  const zip = (a.zip as string) || (a.zip_code as string) || (a.postal_code as string) || "";
  const cityState = [city, state].filter(Boolean).join(", ");
  return [cityState, zip].filter(Boolean).join(" ").trim() || null;
};

export const getKanbanColumn = (status: string | null | undefined): KanbanColumn | null => {
  switch (status) {
    case "pending":
      return "new";
    case "confirmed":
    case "preparing":
      return "preparing";
    case "ready":
    case "picked_up":
    case "out_for_delivery":
      return "ready";
    default:
      return null;
  }
};

/** Minutes since timestamp. */
export const minutesSince = (iso: string | null | undefined): number => {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
};

/** Order is behind schedule or blocking pickup. */
export const isRunningBehind = (order: LiveOrder): boolean => {
  const status = order.order_status || "pending";

  if (order.driver_arrived_at && status === "preparing") return true;
  if (order.driver_arrived_at && status === "confirmed") return true;

  if (order.estimated_delivery_time) {
    const etaMs = new Date(order.estimated_delivery_time).getTime();
    if ((status === "preparing" || status === "confirmed") && etaMs < Date.now()) return true;
    if (status === "ready" && etaMs + 5 * 60 * 1000 < Date.now()) return true;
  }

  if (status === "pending" && minutesSince(order.created_at) >= 3) return true;
  if ((status === "preparing" || status === "confirmed") && minutesSince(order.accepted_at || order.created_at) >= 25) {
    return true;
  }

  return false;
};

export type CardFlashVariant = "pending" | "preparing" | "ready" | "behind";

export const getCardFlashVariant = (order: LiveOrder): CardFlashVariant => {
  if (isRunningBehind(order)) return "behind";
  const status = order.order_status || "pending";
  if (status === "pending") return "pending";
  if (status === "confirmed" || status === "preparing") return "preparing";
  if (status === "ready") return "ready";
  return "preparing";
};
