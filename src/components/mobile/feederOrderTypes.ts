/** Feeder offer queue: one row per `order_assignments` pending offer. */
export interface OrderAssignment {
  assignment_id: string;
  order_id: string;
  order_number?: string;
  /** Same pickup; used for batching (same store + close dropoffs). */
  restaurant_id?: string | null;
  restaurant_name: string;
  pickup_address: unknown;
  dropoff_address: unknown;
  payout_cents: number;
  distance_km: number;
  distance_mi: string;
  expires_at: string;
  estimated_time: number;
  isTestOrder?: boolean;
  customer_name?: string;
  subtotal_cents?: number;
  tip_cents?: number;
  mileage_pay_cents?: number;
  storeType?: string;
  storeLogoUrl?: string;
  parking_spot_count?: number;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    price_cents: number;
    special_instructions?: string;
    image_url?: string;
  }>;
}
