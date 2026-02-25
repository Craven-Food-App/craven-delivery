import { useState, useEffect } from "react";
import {
  Card,
  Tabs,
  Text,
  Stack,
  Group,
  Box,
  Loader,
  Grid,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { supabase } from "@/integrations/supabase/client";
import MerchantOrderList, { type CustomerOrderForList } from "@/components/restaurant/MerchantOrderList";

interface CustomerOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  order_items: any[];
  subtotal_cents: number;
  delivery_fee_cents: number;
  tax_cents: number;
  total_cents: number;
  delivery_method: 'delivery' | 'pickup';
  delivery_address?: string;
  special_instructions?: string;
  order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  estimated_pickup_time?: string;
  estimated_delivery_time?: string;
  created_at: string;
  order_number?: string;
  pickup_code?: string;
}

interface RestaurantCustomerOrderManagementProps {
  restaurantId: string;
}

export const RestaurantCustomerOrderManagement = ({ restaurantId }: RestaurantCustomerOrderManagementProps) => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    
    // Set up real-time subscription for new orders
    const subscription = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [restaurantId]);

  const fetchOrders = async () => {
    try {
      console.log('Fetching orders for restaurant:', restaurantId);
      
      // First fetch orders without nested relationships
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Orders fetch error:', ordersError);
        throw ordersError;
      }
      
      console.log('Orders data:', ordersData);

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch order items separately for each order
      const transformedOrders = await Promise.all(
        ordersData.map(async (order) => {
          try {
            // Fetch order items for this order
            const { data: orderItems, error: itemsError } = await supabase
              .from('order_items')
              .select(`
                id,
                menu_item_id,
                quantity,
                price_cents,
                special_instructions,
                menu_items (name)
              `)
              .eq('order_id', order.id);

            if (itemsError) {
              console.error('Error fetching order items:', itemsError);
            }

            // Try to fetch customer info from user_profiles
            // Note: This may fail due to RLS policies restricting access
            let customerName = 'Customer';
            let customerPhone = '';
            let customerEmail = '';

            try {
              const { data: customerProfile } = await supabase
                .from('user_profiles')
                .select('full_name, phone')
                .eq('user_id', order.customer_id)
                .maybeSingle();

              if (customerProfile) {
                customerName = customerProfile.full_name || 'Customer';
                customerPhone = customerProfile.phone || '';
              }
            } catch (profileError) {
              console.log('Could not fetch customer profile (RLS restriction):', profileError);
              // This is expected due to RLS policies - restaurant owners can't see customer profiles
            }

            return {
              ...order,
              customer_name: customerName,
              customer_email: customerEmail,
              customer_phone: customerPhone,
              order_items: orderItems?.map((item: any) => ({
                ...item,
                name: item.menu_items?.name || 'Unknown Item',
                modifiers: [] // Simplified for now
              })) || [],
              delivery_method: order.delivery_address ? 'delivery' as const : 'pickup' as const,
              payment_status: 'paid' as const
            };
          } catch (error) {
            console.error('Error processing order:', order.id, error);
            // Return order with minimal data if processing fails
            return {
              ...order,
              customer_name: 'Customer',
              customer_email: '',
              customer_phone: '',
              order_items: [],
              delivery_method: order.delivery_address ? 'delivery' as const : 'pickup' as const,
              payment_status: 'paid' as const
            };
          }
        })
      );
      
      console.log('Transformed orders:', transformedOrders);
      setOrders(transformedOrders as CustomerOrder[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      notifications.show({
        title: "Error",
        message: "Failed to fetch orders. Check console for details.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: CustomerOrder['order_status']) => {
    // Optimistic update - update UI immediately
    const previousOrders = [...orders];
    setOrders(orders.map(order => 
      order.id === orderId 
        ? { ...order, order_status: newStatus }
        : order
    ));

    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      notifications.show({
        title: "Order Updated",
        message: `Order status updated to ${newStatus}`,
        color: 'green',
      });
    } catch (error) {
      console.error('Error updating order:', error);
      
      // Revert to previous state on error
      setOrders(previousOrders);
      
      notifications.show({
        title: "Error",
        message: "Failed to update order status",
        color: 'red',
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      confirmed: "secondary",
      preparing: "default",
      ready: "default",
      out_for_delivery: "default",
      delivered: "secondary",
      cancelled: "destructive"
    };
    return colors[status] || "default";
  };

  const getNextStatus = (currentStatus: CustomerOrder['order_status']) => {
    const statusFlow: Record<CustomerOrder['order_status'], CustomerOrder['order_status'] | null> = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'out_for_delivery',
      out_for_delivery: 'delivered',
      delivered: null,
      cancelled: null
    };
    return statusFlow[currentStatus];
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleRefund = async (orderId: string, amountCents?: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("refund-order", {
        body: { order_id: orderId, amount_cents: amountCents },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      notifications.show({
        title: "Refund started",
        message: amountCents != null ? "Partial refund submitted." : "Full refund submitted.",
        color: "green",
      });
      fetchOrders();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Refund failed";
      notifications.show({ title: "Refund failed", message: msg, color: "red" });
    }
  };

  const filterOrdersByStatus = (status?: string) => {
    if (!status || status === 'all') return orders;
    return orders.filter(order => order.order_status === status);
  };

  if (loading) {
    return (
      <Box p="xl" style={{ textAlign: 'center' }}>
        <Loader />
      </Box>
    );
  }

  const pendingOrders = filterOrdersByStatus('pending');
  const activeOrders = orders.filter(o => ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.order_status));
  const completedOrders = filterOrdersByStatus('delivered');

  return (
    <Stack gap="xl">
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card p="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" fw={500}>Pending Orders</Text>
              <Text size="xl" fw={700}>{pendingOrders.length}</Text>
            </Stack>
          </Card>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card p="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" fw={500}>Active Orders</Text>
              <Text size="xl" fw={700}>{activeOrders.length}</Text>
            </Stack>
          </Card>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card p="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" fw={500}>Today's Revenue</Text>
              <Text size="xl" fw={700}>
                ${(orders.reduce((sum, order) => 
                  order.order_status === 'delivered' && 
                  new Date(order.created_at).toDateString() === new Date().toDateString()
                    ? sum + order.total_cents : sum, 0
                ) / 100).toFixed(2)}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="all">
        <Tabs.List>
          <Tabs.Tab value="all">All Orders ({orders.length})</Tabs.Tab>
          <Tabs.Tab value="pending">Pending ({pendingOrders.length})</Tabs.Tab>
          <Tabs.Tab value="active">Active ({activeOrders.length})</Tabs.Tab>
          <Tabs.Tab value="delivered">Completed ({completedOrders.length})</Tabs.Tab>
        </Tabs.List>

        {["all", "pending", "active", "delivered"].map((tab) => {
          const filtered = filterOrdersByStatus(tab === "active" ? undefined : tab === "all" ? undefined : tab).filter(
            (order) =>
              tab === "active"
                ? ["confirmed", "preparing", "ready", "out_for_delivery"].includes(order.order_status)
                : tab === "all" || order.order_status === tab
          ) as CustomerOrderForList[];
          return (
            <Tabs.Panel key={tab} value={tab} pt="md">
              <MerchantOrderList
                orders={filtered}
                getStatusLabel={getStatusLabel}
                onUpdateStatus={updateOrderStatus}
                onRefund={handleRefund}
              />
            </Tabs.Panel>
          );
        })}
      </Tabs>
    </Stack>
  );
};