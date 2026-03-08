import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { dbZoneToDeliveryZone, type DeliveryZone, type DbDeliveryZoneRow } from '@/data/deliveryZones';

const QUERY_KEY = ['delivery-zones'] as const;

async function fetchDeliveryZones(): Promise<DeliveryZone[]> {
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as DbDeliveryZoneRow[];
  const zones: DeliveryZone[] = [];
  for (const row of rows) {
    const zone = dbZoneToDeliveryZone(row);
    if (zone) zones.push(zone);
  }
  return zones;
}

export function useDeliveryZones() {
  const { data: zones = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchDeliveryZones,
    staleTime: 60_000, // 1 minute
  });

  return { zones, isLoading, error };
}
