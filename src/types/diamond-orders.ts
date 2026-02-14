export type RatingTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
export type ExclusiveType = 'flash_drop' | 'vault' | 'mystery' | 'hotspot' | 'batch' | 'arena' | 'none';
export type BatchType = 'surprise' | 'stacked';

export interface ExclusiveOrder {
  id: string;
  restaurant_id: string;
  restaurant?: { name: string };
  customer_id: string;
  pickup_location: { lat: number; lng: number; address?: string } | null;
  dropoff_location: { lat: number; lng: number; address?: string } | null;
  base_pay: number | null;
  tip: number | null;
  status: string;
  exclusive_type: ExclusiveType;
  diamond_only_until: string | null;
  payout_hidden: boolean;
  batch_id: string | null;
  estimated_delivery_time: string | null;
  created_at: string;
  order_assignments?: Array<{ id: string; status: string }>;
  delivery_fee_cents?: number;
  tip_cents?: number;
}

export interface OrderBatch {
  id: string;
  order_ids: string[];
  batch_type: BatchType;
  diamond_only_until: string | null;
  created_at: string;
  orders?: ExclusiveOrder[];
}

export interface Hotspot {
  id: string;
  lat: number;
  lng: number;
  order_id: string;
  claimed_by: string | null;
  expires_at: string;
  order?: ExclusiveOrder;
}

export interface ArenaCompetition {
  id: string;
  order_id: string;
  eligible_drivers: string[];
  winner_driver_id: string | null;
  claim_window_seconds: number;
  started_at: string;
  ended_at: string | null;
  order?: ExclusiveOrder;
}

export interface DriverProfile {
  id: string;
  user_id: string;
  rating_tier: RatingTier;
  acceptance_rate: number;
  completed_orders: number;
  diamond_points: number;
}

