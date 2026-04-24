import { supabase } from '@/integrations/supabase/client';

/** Persist feeder arrival at merchant — merchant tablet sees via orders realtime UPDATE. */
export async function setOrderDriverArrivedAtStore(orderId: string | undefined) {
  if (!orderId) return { error: new Error('missing order id') as unknown as Error };
  return supabase
    .from('orders')
    .update({
      driver_arrived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
}

/** Retail/curbside: persist spot number for merchant to find the feeder. */
export async function setOrderPickupParkingSpot(orderId: string | undefined, spotNumber: number) {
  if (!orderId) return { error: new Error('missing order id') as unknown as Error };
  return supabase
    .from('orders')
    .update({
      pickup_parking_spot: String(spotNumber),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
}
