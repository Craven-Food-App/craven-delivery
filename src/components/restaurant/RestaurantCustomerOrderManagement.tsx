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
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefetch = () => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(() => {
      refetchTimerRef.current = null;
      fetchOrders();
    }, 400);
  };

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
          scheduleRefetch();
        }
      )
      .subscribe();

    return () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      subscription.unsubscribe();
    };
  }, [restaurantId, playSoundForNewOrders]);

  const fetchOrders = async () => {
    try {
      // Window: last 30 days, hard cap 100 rows. Active (non-terminal) orders are always included.
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .or(`created_at.gte.${since},order_status.in.(pending,confirmed,preparing,ready,picked_up,out_for_delivery)`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (ordersError) throw ordersError;
      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = ordersData.map((o: any) => o.id);
      const customerIds = Array.from(new Set(ordersData.map((o: any) => o.customer_id).filter(Boolean)));
      const driverIds = Array.from(new Set(ordersData.map((o: any) => o.driver_id).filter(Boolean)));
      const profileIds = Array.from(new Set([...customerIds, ...driverIds]));

      // Batched lookups in parallel — replaces ~4 round-trips per order
      const [itemsRes, profilesRes, driverProfilesRes] = await Promise.all([
        supabase
          .from('order_items')
          .select('id, order_id, menu_item_id, quantity, price_cents, special_instructions, menu_items(name)')
          .in('order_id', orderIds),
        profileIds.length
          ? supabase
              .from('user_profiles')
              .select('user_id, full_name, phone')
              .in('user_id', profileIds)
          : Promise.resolve({ data: [], error: null } as any),
        driverIds.length
          ? supabase
              .from('driver_profiles')
              .select('user_id, vehicle_type')
              .in('user_id', driverIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const itemsByOrder = new Map<string, any[]>();
      (itemsRes.data || []).forEach((it: any) => {
        const arr = itemsByOrder.get(it.order_id) || [];
        arr.push({ ...it, name: it.menu_items?.name || 'Unknown Item', modifiers: [] });
        itemsByOrder.set(it.order_id, arr);
      });
      const profileById = new Map<string, any>();
      (profilesRes.data || []).forEach((p: any) => profileById.set(p.user_id, p));
      const driverProfileById = new Map<string, any>();
      (driverProfilesRes.data || []).forEach((d: any) => driverProfileById.set(d.user_id, d));

      const transformedOrders = ordersData.map((order: any) => {
        const cust = profileById.get(order.customer_id);
        const driverUser = order.driver_id ? profileById.get(order.driver_id) : null;
        const driverProf = order.driver_id ? driverProfileById.get(order.driver_id) : null;
        return {
          ...order,
          customer_name: cust?.full_name || 'Customer',
          customer_email: '',
          customer_phone: cust?.phone || '',
          driver_name: driverUser?.full_name ?? null,
          driver_vehicle: driverProf?.vehicle_type ?? null,
          order_items: itemsByOrder.get(order.id) || [],
          delivery_method: order.delivery_address ? ('delivery' as const) : ('pickup' as const),
          payment_status: 'paid' as const,
        };
      });

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