import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Badge,
  Tabs,
  Text,
  Title,
  Stack,
  Group,
  Box,
  Loader,
  Divider,
  ActionIcon,
  Grid,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconClock,
  IconMapPin,
  IconPhone,
  IconMail,
  IconPackage,
  IconTruck,
  IconCopy,
} from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";

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
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

        {['all', 'pending', 'active', 'delivered'].map((tab) => (
          <Tabs.Panel key={tab} value={tab} pt="md">
            <Stack gap="md">
            {filterOrdersByStatus(tab === 'active' ? undefined : tab === 'all' ? undefined : tab)
              .filter(order => tab === 'active' 
                ? ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(order.order_status)
                : tab === 'all' ? true : order.order_status === tab
              )
              .map((order) => (
              <Card key={order.id} p="md" withBorder>
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap="xs">
                      <Title order={4}>Order #{order.order_number || order.id.slice(-8)}</Title>
                      <Group gap="md">
                        <Group gap="xs">
                          <IconClock size={12} style={{ color: 'var(--mantine-color-dimmed)' }} />
                          <Text size="sm" c="dimmed">{new Date(order.created_at).toLocaleString()}</Text>
                        </Group>
                        <Badge color={getStatusColor(order.order_status) === 'destructive' ? 'red' : getStatusColor(order.order_status) === 'secondary' ? 'blue' : 'gray'}>
                          {getStatusLabel(order.order_status)}
                        </Badge>
                      </Group>
                    </Stack>
                    <Stack gap="xs" align="flex-end">
                      <Text size="lg" fw={700}>${(order.total_cents / 100).toFixed(2)}</Text>
                      <Text size="sm" c="dimmed">{order.delivery_method}</Text>
                    </Stack>
                  </Group>

                  {/* Order Number and Pickup Code */}
                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Box p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: '8px', border: '1px solid var(--mantine-color-gray-3)' }}>
                        <Stack gap="xs">
                          <Text size="xs" fw={600} c="gray.6" tt="uppercase">Order Number</Text>
                          <Text size="lg" fw={700} style={{ fontFamily: 'monospace' }}>
                            {order.order_number || order.id.slice(-8)}
                          </Text>
                        </Stack>
                      </Box>
                    </Grid.Col>
                    
                    {/* Pickup Code */}
                    {order.pickup_code && (
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <Box p="md" style={{ background: 'linear-gradient(to right, var(--mantine-color-orange-0), var(--mantine-color-orange-1))', border: '2px solid var(--mantine-color-orange-3)', borderRadius: '8px' }}>
                          <Group justify="space-between" align="flex-start">
                            <Stack gap="xs">
                              <Text size="xs" fw={600} c="orange.7" tt="uppercase">Pickup Code</Text>
                              <Text size="lg" fw={900} c="orange.9" style={{ fontFamily: 'monospace' }}>
                                {order.pickup_code}
                              </Text>
                            </Stack>
                            <ActionIcon
                              variant="subtle"
                              color="orange"
                              onClick={() => {
                                navigator.clipboard.writeText(order.pickup_code!);
                                notifications.show({
                                  title: "Copied!",
                                  message: `Pickup code copied`,
                                  color: 'green',
                                });
                              }}
                            >
                              <IconCopy size={16} />
                            </ActionIcon>
                          </Group>
                        </Box>
                      </Grid.Col>
                    )}
                  </Grid>
                  
                  {/* Customer Information */}
                  <Stack gap="xs">
                    <Text fw={500}>Customer</Text>
                    <Stack gap="xs">
                      <Group gap="xs">
                        <IconPackage size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                        <Text size="sm">{order.customer_name}</Text>
                      </Group>
                      <Group gap="xs">
                        <IconMail size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                        <Text size="sm">{order.customer_email}</Text>
                      </Group>
                      <Group gap="xs">
                        <IconPhone size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                        <Text size="sm">{order.customer_phone}</Text>
                      </Group>
                      {order.delivery_address && (
                        <Group gap="xs">
                          <IconMapPin size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                          <Text size="sm">
                            {typeof order.delivery_address === 'string' 
                              ? order.delivery_address 
                              : order.delivery_address && typeof order.delivery_address === 'object' && 'street' in order.delivery_address
                                ? `${(order.delivery_address as any).street}, ${(order.delivery_address as any).city}, ${(order.delivery_address as any).state} ${(order.delivery_address as any).zip}`
                                : 'N/A'
                            }
                          </Text>
                        </Group>
                      )}
                    </Stack>
                  </Stack>

                  <Divider />

                  {/* Order Items */}
                  <Stack gap="xs">
                    <Text fw={500}>Items ({order.order_items.length})</Text>
                    <Stack gap="xs">
                      {order.order_items.map((item: any, index: number) => (
                        <Group key={index} justify="space-between">
                          <Stack gap="xs">
                            <Text size="sm">{item.quantity}x {item.name}</Text>
                            {item.modifiers?.length > 0 && (
                              <Box pl="md">
                                <Stack gap="xs">
                                  {item.modifiers.map((mod: any) => (
                                    <Text key={mod.id} size="sm" c="dimmed">+ {mod.name}</Text>
                                  ))}
                                </Stack>
                              </Box>
                            )}
                            {item.special_instructions && (
                              <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }} pl="md">
                                Note: {item.special_instructions}
                              </Text>
                            )}
                          </Stack>
                          <Text size="sm" fw={500}>
                            ${((item.price_cents + (item.modifiers?.reduce((sum: number, mod: any) => sum + mod.price_cents, 0) || 0)) * item.quantity / 100).toFixed(2)}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  </Stack>

                  {order.special_instructions && (
                    <>
                      <Divider />
                      <Stack gap="xs">
                        <Text fw={500}>Special Instructions</Text>
                        <Text size="sm" c="dimmed">{order.special_instructions}</Text>
                      </Stack>
                    </>
                  )}

                  {/* Order Actions */}
                  {order.order_status !== 'delivered' && order.order_status !== 'cancelled' && (
                    <>
                      <Divider />
                      <Group gap="xs" wrap="wrap">
                        {getNextStatus(order.order_status) && (
                          <Button
                            onClick={() => updateOrderStatus(order.id, getNextStatus(order.order_status)!)}
                            size="sm"
                          >
                            Mark as {getStatusLabel(getNextStatus(order.order_status)!)}
                          </Button>
                        )}
                        
                        {order.order_status === 'pending' && (
                          <>
                            <Button
                              onClick={() => updateOrderStatus(order.id, 'confirmed')}
                              size="sm"
                              color="green"
                            >
                              Confirm Order
                            </Button>
                            <Button
                              color="red"
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              size="sm"
                            >
                              Cancel Order
                            </Button>
                          </>
                        )}
                      </Group>
                    </>
                  )}
                </Stack>
              </Card>
            ))}
            </Stack>
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  );
};