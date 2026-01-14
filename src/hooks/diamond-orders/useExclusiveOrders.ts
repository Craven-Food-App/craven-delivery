import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExclusiveOrder } from '@/types/diamond-orders';

export const useExclusiveOrders = (isDiamond: boolean) => {
  const [orders, setOrders] = useState<ExclusiveOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExclusiveOrders();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('exclusive_orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders', filter: `exclusive_type=neq.none` },
        () => {
          fetchExclusiveOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDiamond]);

  const fetchExclusiveOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const now = new Date().toISOString();
      
      // Check if user is a test user
      const { data: settings } = await supabase
        .from('driver_settings')
        .select('is_test_user')
        .eq('user_id', user.id)
        .single();
      
      const isTestUser = settings?.is_test_user || false;
      
      // Build query - fetch all exclusive orders first
      let query = supabase
        .from('orders')
        .select(`
          *,
          restaurant:restaurants(name),
          order_assignments!left(id, status)
        `)
        .neq('exclusive_type', 'none')
        .in('order_status', ['pending', 'confirmed', 'preparing', 'ready'])
        .eq('is_test', isTestUser); // Filter by test status

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching exclusive orders:', error);
        throw error;
      }

      console.log('Fetched exclusive orders:', data?.length || 0, 'isDiamond:', isDiamond);

      // Filter orders based on diamond status and availability
      const availableOrders = (data || []).filter(order => {
        // Filter out orders with accepted assignments
        const assignments = order.order_assignments || [];
        const hasAcceptedAssignment = assignments.some((a: any) => a.status === 'accepted');
        if (hasAcceptedAssignment) {
          console.log('Filtering out order', order.id, 'due to accepted assignment');
          return false;
        }

        // For Diamond drivers: show all exclusive orders
        if (isDiamond) {
          return true;
        }

        // For non-Diamond drivers:
        // - Vault orders are always Diamond-only (exclude them)
        if (order.exclusive_type === 'vault') {
          return false;
        }

        // - Show orders where diamond window has passed OR is null
        if (!order.diamond_only_until) {
          return true; // No diamond window, available to all
        }

        const diamondUntil = new Date(order.diamond_only_until);
        const nowDate = new Date();
        return diamondUntil < nowDate; // Diamond window has passed
      });

      console.log('Available exclusive orders after filtering:', availableOrders.length);
      
      // Map order_status to status and cast Json fields for type compatibility
      const mappedOrders = availableOrders.map(order => ({
        ...order,
        status: order.order_status,
        pickup_location: order.pickup_location as { lat: number; lng: number; address?: string },
        delivery_address: order.delivery_address as { lat: number; lng: number; address: string },
        dropoff_location: order.dropoff_location as { lat: number; lng: number; address?: string }
      }));
      
      setOrders(mappedOrders as ExclusiveOrder[]);
    } catch (error) {
      console.error('Error fetching exclusive orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return { orders, loading, refetch: fetchExclusiveOrders };
};

