import React, { useState, useEffect } from "react";
import { formatAddress } from '@/lib/formatAddress';
import {
  Card,
  Badge,
  Button,
  Tabs,
  Text,
  Title,
  Stack,
  Group,
  Box,
  Loader,
  ActionIcon,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconClock,
  IconMapPin,
  IconCurrencyDollar,
  IconPhone,
  IconCopy,
} from "@tabler/icons-react";
import { Grid } from "@mantine/core";
import { supabase } from "@/integrations/supabase/client";

interface Order {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  pickup_name: string;
  pickup_address: string;
  dropoff_name: string;
  dropoff_address: string;
  payout_cents: number;
  distance_km: number;
  assigned_feeder_id?: string;
  order_number?: string;
  pickup_code?: string;
  restaurant_id?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: any;
  delivery_fee?: number;
  delivery_fee_cents?: number;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  subtotal_cents?: number;
  total_cents?: number;
  [key: string]: any; // Allow additional fields from database
}

interface RestaurantOrderManagementProps {
  restaurantId: string;
}

export const RestaurantOrderManagement = ({ restaurantId }: RestaurantOrderManagementProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    
    // Set up real-time subscription for order updates for this restaurant
    const channel = supabase
      .channel('restaurant-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          console.log('Order update received:', payload);
          fetchOrders();
          
          // If a new order is created, trigger auto-assignment
          if (payload.eventType === 'INSERT' && payload.new) {
            triggerAutoAssignment(payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const triggerAutoAssignment = async (orderId: string) => {
    try {
      console.log('Triggering auto-assignment for order:', orderId);
      
      const { data, error } = await supabase.functions.invoke('auto-assign-orders', {
        body: { orderId }
      });

      if (error) {
        console.error('Auto-assignment error:', error);
        notifications.show({
          title: "Assignment Error",
          message: "Failed to find available drivers. Order will remain pending.",
          color: 'red',
        });
      } else {
        console.log('Auto-assignment result:', data);
        if (data.success) {
          notifications.show({
            title: "Driver Assigned",
            message: "A driver has been notified about this order.",
            color: 'green',
          });
        }
      }
    } catch (error) {
      console.error('Error calling auto-assignment:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      // Fetch orders for this specific restaurant
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders((data || []) as unknown as Order[]);
    } catch (error) {
      console.error("Error fetching orders:", error);
      notifications.show({
        title: "Error",
        message: "Failed to load orders",
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      notifications.show({
        title: "Success",
        message: "Order status updated successfully",
        color: 'green',
      });

      fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      notifications.show({
        title: "Error",
        message: "Failed to update order status",
        color: 'red',
      });
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'assigned':
        return 'secondary';
      case 'picked_up':
        return 'default';
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    switch (currentStatus) {
      case 'pending':
        return 'assigned';
      case 'assigned':
        return 'picked_up';
      case 'picked_up':
        return 'delivered';
      default:
        return null;
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const filterOrdersByStatus = (status: Order['status'] | 'all') => {
    if (status === 'all') return orders;
    return orders.filter(order => order.status === status);
  };


  // Test function to create a sample order
  const createTestOrder = async () => {
    try {
      console.log('Creating test order for restaurant:', restaurantId);

      // Fetch the actual restaurant data — never hardcode a store name
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('name, address, latitude, longitude')
        .eq('id', restaurantId)
        .single();

      if (restaurantError || !restaurant) {
        throw new Error('Could not fetch restaurant details for test order');
      }
      
      const orderData = {
        restaurant_id: restaurantId,
        pickup_name: restaurant.name,
        pickup_address: restaurant.address || 'Address not set',
        pickup_lat: restaurant.latitude || 0,
        pickup_lng: restaurant.longitude || 0,
        dropoff_name: 'Test Customer',
        dropoff_address: '123 Test St, Toledo, OH 43604',
        dropoff_lat: 41.6639,
        dropoff_lng: -83.5552,
        payout_cents: Math.floor(Math.random() * 1000) + 800, // $8-18
        distance_km: Math.random() * 10 + 2, // 2-12 km
        status: 'pending' as const,
        subtotal_cents: 2500,
        total_cents: 3000
      };

      console.log('Order data:', orderData);

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Order created successfully:', data);
      
      notifications.show({
        title: "Test Order Created",
        message: "A test order has been created and auto-assignment initiated.",
        color: 'green',
      });
    } catch (error: any) {
      console.error('Error creating test order:', error);
      notifications.show({
        title: "Error",
        message: `Failed to create test order: ${error.message}`,
        color: 'red',
      });
    }
  };

  if (loading) {
    return (
      <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
        <Loader />
      </Box>
    );
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="center">
        <Title order={3}>Order Management</Title>
        <Group gap="md">
          <Button
            variant="outline"
            size="sm"
            onClick={createTestOrder}
          >
            Create Test Order
          </Button>
          <Group gap="xs">
            <IconClock size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
            <Text size="sm" c="dimmed">Updates in real-time</Text>
          </Group>
        </Group>
      </Group>

      <Tabs defaultValue="all">
        <Tabs.List>
          <Tabs.Tab value="all">All ({orders.length})</Tabs.Tab>
          <Tabs.Tab value="pending">Pending ({filterOrdersByStatus('pending').length})</Tabs.Tab>
          <Tabs.Tab value="assigned">Assigned ({filterOrdersByStatus('assigned').length})</Tabs.Tab>
          <Tabs.Tab value="picked_up">Picked Up ({filterOrdersByStatus('picked_up').length})</Tabs.Tab>
          <Tabs.Tab value="delivered">Delivered ({filterOrdersByStatus('delivered').length})</Tabs.Tab>
        </Tabs.List>

        {(['all', 'pending', 'assigned', 'picked_up', 'delivered'] as const).map((tab) => (
          <Tabs.Panel key={tab} value={tab} pt="md">
            {filterOrdersByStatus(tab).length === 0 ? (
              <Card p="xl">
                <Text ta="center" c="dimmed">No {tab === 'all' ? '' : tab} orders found.</Text>
              </Card>
            ) : (
              <Stack gap="md">
                {filterOrdersByStatus(tab).map((order) => (
                  <Card key={order.id} p="md" withBorder>
                    <Stack gap="md">
                      <Group justify="space-between" align="flex-start">
                        <Stack gap="xs">
                          <Title order={4}>
                            Order #{order.order_number || order.id.slice(-8)}
                          </Title>
                          <Text size="sm" c="dimmed">
                            {new Date(order.created_at).toLocaleString()}
                          </Text>
                        </Stack>
                        <Badge color={getStatusColor(order.status) === 'destructive' ? 'red' : getStatusColor(order.status) === 'secondary' ? 'blue' : 'gray'}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </Group>
                      {/* Pickup Code Display - Prominent for restaurant staff */}
                      {order.pickup_code && (
                        <Box p="md" style={{ background: 'linear-gradient(to right, var(--mantine-color-orange-0), var(--mantine-color-orange-1))', border: '2px solid var(--mantine-color-orange-3)', borderRadius: '8px' }}>
                          <Group justify="space-between" align="flex-start">
                            <Stack gap="xs">
                              <Text size="xs" fw={600} c="orange.7" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                                Pickup Code for Driver
                              </Text>
                              <Text size="xl" fw={900} c="orange.9" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                                {order.pickup_code}
                              </Text>
                              <Text size="xs" c="orange.6">
                                Share this code with the driver when order is ready
                              </Text>
                            </Stack>
                            <ActionIcon
                              variant="outline"
                              size="sm"
                              color="orange"
                              onClick={() => {
                                navigator.clipboard.writeText(order.pickup_code!);
                                notifications.show({
                                  title: "Copied!",
                                  message: `Pickup code ${order.pickup_code} copied to clipboard`,
                                  color: 'green',
                                });
                              }}
                            >
                              <IconCopy size={16} />
                            </ActionIcon>
                          </Group>
                        </Box>
                      )}
                      
                      <Grid gutter="md">
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <Stack gap="xs">
                            <Group gap="xs">
                              <IconMapPin size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
                              <Text size="sm" fw={500}>Pickup</Text>
                            </Group>
                            <Box pl="xl">
                              <Text fw={500}>{order.pickup_name}</Text>
                              <Text size="sm" c="dimmed">{formatAddress(order.pickup_address)}</Text>
                            </Box>
                          </Stack>
                        </Grid.Col>
                        
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <Stack gap="xs">
                            <Group gap="xs">
                              <IconMapPin size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
                              <Text size="sm" fw={500}>Delivery</Text>
                            </Group>
                            <Box pl="xl">
                              <Text fw={500}>{order.dropoff_name}</Text>
                              <Text size="sm" c="dimmed">{formatAddress(order.dropoff_address)}</Text>
                            </Box>
                          </Stack>
                        </Grid.Col>
                      </Grid>

                      <Group justify="space-between" align="center">
                        <Group gap="md">
                          <Group gap="xs">
                            <IconCurrencyDollar size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
                            <Text fw={500}>${(order.payout_cents / 100).toFixed(2)}</Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            {(order.distance_km * 0.621371).toFixed(1)} mi
                          </Text>
                          {order.assigned_feeder_id && (
                            <Badge variant="outline">
                              Assigned to Feeder
                            </Badge>
                          )}
                        </Group>

                        <Group gap="xs">
                          {getNextStatus(order.status) && (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                            >
                              Mark as {getStatusLabel(getNextStatus(order.status)!)}
                            </Button>
                          )}
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              color="red"
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          )}
                        </Group>
                      </Group>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  );
};