/**
 * Wrapper for ActiveDeliveryFlow that fetches real order or restaurant data from the database.
 * Used by the feeder /delivery-flow dev route and wherever we need real store data instead of mocks.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ActiveDeliveryFlow from './ActiveDeliveryFlow';

const formatAddress = (addr: any): string => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    const parts = [
      addr.address || addr.street,
      addr.city,
      addr.state,
      addr.zip_code || addr.zip,
    ].filter(Boolean);
    return parts.join(', ');
  }
  return String(addr);
};

interface DeliveryFlowWithRealDataProps {
  onCompleteDelivery: () => void;
}

const DeliveryFlowWithRealData: React.FC<DeliveryFlowWithRealDataProps> = ({ onCompleteDelivery }) => {
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Try to fetch a recent order with restaurant info
        const { data: orderRow, error: orderErr } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            customer_name,
            customer_phone,
            pickup_address,
            dropoff_address,
            delivery_address,
            payout_cents,
            driver_payout_cents,
            distance_km,
            estimated_delivery_time,
            restaurant_id,
            restaurants (name, address, city, state, zip_code, phone, logo_url)
          `)
          .not('restaurant_id', 'is', null)
          .in('restaurants.name', ['CMIH Kitchen', "Crave'n Stylz"])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!orderErr && orderRow) {
          const r = orderRow.restaurants as any;
          const pickupAddr = orderRow.pickup_address || (r ? { address: r.address, city: r.city, state: r.state, zip_code: r.zip_code } : null);
          const dropoffAddr = orderRow.dropoff_address || orderRow.delivery_address;
          setOrderDetails({
            id: orderRow.id,
            order_id: orderRow.id,
            order_number: orderRow.order_number || orderRow.id.slice(0, 8),
            restaurant_name: r?.name || 'Restaurant',
            pickup_address: pickupAddr,
            dropoff_address: dropoffAddr,
            customer_name: orderRow.customer_name || 'Customer',
            customer_phone: orderRow.customer_phone,
            delivery_notes: '',
            payout_cents: orderRow.payout_cents ?? orderRow.driver_payout_cents ?? 850,
            subtotal_cents: 0,
            distance_km: orderRow.distance_km,
            distance_mi: orderRow.distance_km ? (orderRow.distance_km * 0.621371).toFixed(1) : undefined,
            estimated_time: 25,
            items: [],
            isTestOrder: true,
          });
          setLoading(false);
          return;
        }

        // 2. If we didn't find any recent orders, don't fabricate one.
        setError('No recent delivery orders with restaurants found in the database. Create a real test order to use this flow.');
        setLoading(false);
        return;
      } catch (e) {
        console.error('DeliveryFlowWithRealData fetch error:', e);
        setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', fontFamily: 'system-ui' }}>
        <p>Loading delivery data...</p>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div style={{ padding: 24, textAlign: 'center', fontFamily: 'system-ui', color: '#b91c1c' }}>
        <p>{error || 'No order data available'}</p>
        <p style={{ fontSize: 12, marginTop: 8, color: '#6b7280' }}>
          Add restaurants or orders to the database to preview the delivery flow.
        </p>
      </div>
    );
  }

  return (
    <ActiveDeliveryFlow
      orderDetails={orderDetails}
      onCompleteDelivery={onCompleteDelivery}
    />
  );
};

export default DeliveryFlowWithRealData;
