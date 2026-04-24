import { useState, useEffect, useRef } from "react";
import {
  Card,
  Tabs,
  Text,
  Stack,
  Group,
  Box,
  Loader,
  Modal,
  Button,
} from "@mantine/core";
import { IconClock, IconTruck, IconCurrencyDollar, IconPackage } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { supabase } from "@/integrations/supabase/client";
import MerchantOrderList, { type CustomerOrderForList } from "@/components/restaurant/MerchantOrderList";

const NEW_ORDER_SOUND_VOLUME = 0.85;

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
  order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  estimated_pickup_time?: string;
  estimated_delivery_time?: string;
  created_at: string;
  order_number?: string;
  pickup_code?: string;
  driver_id?: string | null;
  driver_name?: string | null;
  driver_vehicle?: string | null;
  /** Set when the feeder marks arrival at the merchant (realtime to merchant). */
  driver_arrived_at?: string | null;
  /** Retail/curbside: spot number the feeder selected. */
  pickup_parking_spot?: string | null;
}

interface RestaurantCustomerOrderManagementProps {
  restaurantId: string;
  /** When true, play sound on new order (default true). Controlled by Settings > Communications. */
  playSoundForNewOrders?: boolean;
}

/** Minimal new-order payload from Supabase realtime INSERT */
interface NewOrderRealtimePayload {
  id: string;
  total_cents?: number;
  order_number?: string | null;
  delivery_address?: unknown;
}

export const RestaurantCustomerOrderManagement = ({ restaurantId, playSoundForNewOrders = true }: RestaurantCustomerOrderManagementProps) => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<NewOrderRealtimePayload | null>(null);
  const newOrderSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    newOrderSoundRef.current = new Audio("/craven-notification.wav");
    newOrderSoundRef.current.volume = NEW_ORDER_SOUND_VOLUME;
    return () => {
      newOrderSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    fetchOrders();

    const subscription = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: {
          eventType?: string;
          new?: NewOrderRealtimePayload & {
            driver_arrived_at?: string | null;
            pickup_parking_spot?: string | null;
          };
          old?: {
            driver_arrived_at?: string | null;
            pickup_parking_spot?: string | null;
          };
        }) => {
          if (payload?.eventType === 'INSERT' && payload?.new) {
            setNewOrderAlert({
              id: payload.new.id,
              total_cents: payload.new.total_cents,
              order_number: payload.new.order_number ?? null,
              delivery_address: payload.new.delivery_address,
            });
            if (playSoundForNewOrders) {
              try {
                newOrderSoundRef.current?.play().catch(() => {});
              } catch {
                // ignore
              }
            }
          }
          if (payload?.eventType === 'UPDATE' && payload?.new) {
            const n = payload.new;
            const o = payload.old;
            if (
              n.driver_arrived_at &&
              n.driver_arrived_at !== o?.driver_arrived_at
            ) {
              notifications.show({
                title: 'Feeder at store',
                message: 'A driver has arrived to pick up this order.',
                color: 'teal',
              });
            }
            if (
              n.pickup_parking_spot != null &&
              String(n.pickup_parking_spot) !== '' &&
              String(n.pickup_parking_spot) !==
                String(o?.pickup_parking_spot ?? '')
            ) {
              notifications.show({
                title: 'Curbside / parking',
                message: `Feeder is at spot ${n.pickup_parking_spot}.`,
                color: 'blue',
              });
            }
          }
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [restaurantId, playSoundForNewOrders]);

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

            let driverName: string | null = null;
            let driverVehicle: string | null = null;
            if (order.driver_id) {
              try {
                const [{ data: driverProfile }, { data: driverUserProfile }] = await Promise.all([
                  supabase
                    .from('driver_profiles')
                    .select('vehicle_type')
                    .eq('user_id', order.driver_id)
                    .maybeSingle(),
                  supabase
                    .from('user_profiles')
                    .select('full_name')
                    .eq('user_id', order.driver_id)
                    .maybeSingle(),
                ]);
                driverVehicle = driverProfile?.vehicle_type ?? null;
                driverName = (driverUserProfile?.full_name as string) ?? null;
              } catch (driverErr) {
                console.log('Could not fetch driver info (RLS may restrict):', driverErr);
              }
            }

            return {
              ...order,
              customer_name: customerName,
              customer_email: customerEmail,
              customer_phone: customerPhone,
              driver_name: driverName,
              driver_vehicle: driverVehicle,
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
              driver_name: null,
              driver_vehicle: null,
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
      picked_up: "default",
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
      picked_up: 'out_for_delivery',
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
  const activeOrders = orders.filter(o => ['confirmed', 'preparing', 'ready', 'picked_up', 'out_for_delivery'].includes(o.order_status));
  const completedOrders = filterOrdersByStatus('delivered');

  const todayRevenueCents = orders.reduce(
    (sum, order) =>
      order.order_status === "delivered" &&
      new Date(order.created_at).toDateString() === new Date().toDateString()
        ? sum + order.total_cents
        : sum,
    0
  );

  const closeNewOrderModal = () => setNewOrderAlert(null);
  const isDelivery = newOrderAlert?.delivery_address != null && typeof newOrderAlert.delivery_address === "object";

  return (
    <Stack gap="md">
      <Modal
        opened={newOrderAlert != null}
        onClose={closeNewOrderModal}
        title={
          <Group gap="sm">
            <IconPackage size={24} style={{ color: "var(--mantine-color-orange-6)" }} />
            <Text size="lg" fw={600}>New order received</Text>
          </Group>
        }
        centered
        size="sm"
        styles={{
          title: { fontWeight: 600 },
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {newOrderAlert?.order_number
              ? `Order #${newOrderAlert.order_number}`
              : `Order ${newOrderAlert?.id?.slice(-8).toUpperCase() ?? ""}`}
            {newOrderAlert?.total_cents != null && (
              <> · ${(newOrderAlert.total_cents / 100).toFixed(2)}</>
            )}
          </Text>
          <Text size="xs" c="dimmed">
            The order is in your list below. {isDelivery
              ? "For delivery orders, a Feeder is notified and can accept in the Feeder app."
              : "Mark it ready when the customer can pick up."}
          </Text>
          <Group justify="flex-end">
            <Button variant="light" color="orange" onClick={closeNewOrderModal}>
              View order
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Box
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "stretch",
        }}
      >
        <Box
          style={{
            flex: "1 1 0",
            minWidth: 100,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--mantine-color-gray-3)",
            background: "var(--mantine-color-gray-0)",
          }}
        >
          <Group gap="xs" wrap="nowrap">
            <IconClock size={18} style={{ color: "var(--mantine-color-orange-6)", flexShrink: 0 }} />
            <Box style={{ minWidth: 0 }}>
              <Text size="xs" c="dimmed" fw={500}>Pending</Text>
              <Text size="lg" fw={700}>{pendingOrders.length}</Text>
            </Box>
          </Group>
        </Box>
        <Box
          style={{
            flex: "1 1 0",
            minWidth: 100,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--mantine-color-gray-3)",
            background: "var(--mantine-color-gray-0)",
          }}
        >
          <Group gap="xs" wrap="nowrap">
            <IconTruck size={18} style={{ color: "var(--mantine-color-orange-6)", flexShrink: 0 }} />
            <Box style={{ minWidth: 0 }}>
              <Text size="xs" c="dimmed" fw={500}>Active</Text>
              <Text size="lg" fw={700}>{activeOrders.length}</Text>
            </Box>
          </Group>
        </Box>
        <Box
          style={{
            flex: "1 1 0",
            minWidth: 100,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--mantine-color-gray-3)",
            background: "var(--mantine-color-gray-0)",
          }}
        >
          <Group gap="xs" wrap="nowrap">
            <IconCurrencyDollar size={18} style={{ color: "var(--mantine-color-orange-6)", flexShrink: 0 }} />
            <Box style={{ minWidth: 0 }}>
              <Text size="xs" c="dimmed" fw={500}>Today</Text>
              <Text size="lg" fw={700}>${(todayRevenueCents / 100).toFixed(2)}</Text>
            </Box>
          </Group>
        </Box>
      </Box>

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
                ? ["confirmed", "preparing", "ready", "picked_up", "out_for_delivery"].includes(order.order_status)
                : tab === "all" || order.order_status === tab
          ) as CustomerOrderForList[];
          return (
            <Tabs.Panel key={tab} value={tab} pt="sm">
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