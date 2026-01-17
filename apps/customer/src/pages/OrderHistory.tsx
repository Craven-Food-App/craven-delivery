import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Box,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  Loader,
  Center,
  Progress,
  Avatar,
  Divider,
} from '@mantine/core';
import {
  IconClock,
  IconCheck,
  IconTruck,
  IconMapPin,
  IconChefHat,
  IconPhone,
  IconMessageCircle,
  IconPackage,
  IconStar,
} from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  price_cents?: number;
  menu_items?: {
    name: string;
  };
}

interface Driver {
  id: string;
  name: string;
  rating?: number;
  distance?: number;
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  total_cents?: number;
  total_amount?: number;
  order_status: string;
  delivery_method: string;
  restaurant: {
    id: string;
    name: string;
    image_url?: string;
  };
  order_items: OrderItem[];
  driver?: Driver;
}

const STATUS_CONFIG: Record<string, { label: string; gradient: string }> = {
  pending: { label: 'Pending', gradient: 'linear-gradient(135deg, #ea580c, #dc2626)' },
  confirmed: { label: 'Confirmed', gradient: 'linear-gradient(135deg, #ea580c, #dc2626)' },
  preparing: { label: 'Preparing', gradient: 'linear-gradient(135deg, #f59e0b, #ea580c)' },
  ready_for_pickup: { label: 'Ready', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  picked_up: { label: 'Picked Up', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  out_for_delivery: { label: 'Delivering', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
  delivering: { label: 'Delivering', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
};

const TIMELINE_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: IconCheck },
  { key: 'preparing', label: 'Preparing', icon: IconChefHat },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: IconPackage },
  { key: 'picked_up', label: 'Picked Up', icon: IconTruck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: IconTruck },
  { key: 'delivering', label: 'Out for Delivery', icon: IconTruck },
  { key: 'delivered', label: 'Delivered', icon: IconMapPin },
];

function getProgressPercentage(orderStatus: string): number {
  const statusOrder = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivering', 'delivered'];
  const currentIndex = statusOrder.indexOf(orderStatus);
  if (currentIndex === -1) return 0;
  return Math.min(100, ((currentIndex + 1) / statusOrder.length) * 100);
}

function getTimelineStatus(orderStatus: string, stepKey: string): 'completed' | 'active' | 'pending' {
  const statusOrder = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivering', 'delivered'];
  const currentIndex = statusOrder.indexOf(orderStatus);
  const stepIndex = statusOrder.indexOf(stepKey);
  
  if (stepIndex === -1 || currentIndex === -1) return 'pending';
  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'active';
  return 'pending';
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveOrders();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('active-orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchActiveOrders();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants (
            id,
            name,
            image_url
          ),
          order_items (
            id,
            quantity,
            price_cents,
            menu_items (
              name
            )
          )
        `)
        .eq('customer_id', user.id)
        .in('order_status', ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivering'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      // If no orders, return empty array
      if (!data || data.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Transform order items to ensure name is properly set
      const transformedData = (data || []).map((order: any) => ({
        ...order,
        order_items: (order.order_items || []).map((item: any) => ({
          ...item,
          name: item.menu_items?.name || item.name || 'Unknown Item',
          price: item.price_cents || item.price || 0,
        })),
      }));

      // Fetch driver info for orders that are being delivered
      const ordersWithDrivers = await Promise.all(
        transformedData.map(async (order: any) => {
          if (['picked_up', 'out_for_delivery', 'delivering'].includes(order.order_status)) {
            try {
              // First get the assignment
              const { data: assignment } = await supabase
                .from('order_assignments')
                .select('driver_id')
                .eq('order_id', order.id)
                .eq('status', 'accepted')
                .single();

              if (assignment?.driver_id) {
                // Try to get driver profile and user profile for name
                const [driverProfileResult, userProfileResult] = await Promise.all([
                  supabase
                    .from('driver_profiles')
                    .select('user_id, rating')
                    .eq('user_id', assignment.driver_id)
                    .single()
                    .then(res => res, () => ({ data: null, error: null })),
                  supabase
                    .from('user_profiles')
                    .select('user_id, full_name')
                    .eq('user_id', assignment.driver_id)
                    .single()
                    .then(res => res, () => ({ data: null, error: null })),
                ]);

                const driverProfile = driverProfileResult.data;
                const userProfile = userProfileResult.data;
                
                if (driverProfile) {
                  return {
                    ...order,
                    driver: {
                      id: driverProfile.user_id,
                      name: userProfile?.full_name || `Driver ${assignment.driver_id.substring(0, 8).toUpperCase()}`,
                      rating: Number(driverProfile.rating) || 4.9,
                      distance: 2.3,
                    },
                  };
                }
              }
            } catch (error) {
              // If driver lookup fails, just return order without driver info
              console.warn('Error fetching driver info:', error);
            }
          }
          return order;
        })
      );

      setOrders(ordersWithDrivers as Order[]);
    } catch (error: any) {
      console.error('Error fetching active orders:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load active orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCallDriver = (driver: Driver) => {
    toast({
      title: 'Calling Driver',
      description: `Calling ${driver.name}...`,
    });
  };

  const handleMessageDriver = (driver: Driver) => {
    toast({
      title: 'Messaging Driver',
      description: `Opening chat with ${driver.name}...`,
    });
  };

  const handleCallRestaurant = (restaurant: { name: string }) => {
    toast({
      title: 'Calling Restaurant',
      description: `Calling ${restaurant.name}...`,
    });
  };

  const handleTrackOrder = (orderId: string) => {
    navigate(`/track-order/${orderId}`);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const orderTime = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - orderTime.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 min ago';
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  const getEstimatedTime = (orderStatus: string) => {
    if (orderStatus === 'delivering' || orderStatus === 'out_for_delivery') {
      return '12 mins';
    }
    if (orderStatus === 'preparing') {
      return '18 mins';
    }
    return '40 mins';
  };

  if (loading) {
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: 'white', paddingBottom: '80px' }}>
        <Center style={{ height: '100vh' }}>
          <Stack align="center" gap="md">
            <Loader size="lg" color="#ff7a00" />
            <Text c="dimmed">Loading active orders...</Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'white', paddingBottom: '80px' }}>
      <Box style={{ maxWidth: isMobile ? '100%' : '768px', margin: '0 auto', padding: '16px', paddingTop: '24px' }}>
        <Stack gap="lg">
          {/* Header */}
          <Box>
            <Text fw={900} size="xl" mb="xs" c="#171717">
              Active Orders
            </Text>
            <Text size="sm" c="#737373">
              Track your cravings in real-time
            </Text>
          </Box>

          {/* Orders List */}
          {orders.length === 0 ? (
            <Card p="xl" style={{ textAlign: 'center' }}>
              <Text size="64px" mb="md" style={{ opacity: 0.3 }}>📦</Text>
              <Text fw={900} size="lg" mb="xs" c="#171717">
                No Active Orders
              </Text>
              <Text size="sm" c="#737373" mb="lg">
                You don't have any orders in progress right now
              </Text>
              <Button onClick={() => navigate('/restaurants')} color="#ff7a00" size="md">
                Start Ordering
              </Button>
            </Card>
          ) : (
            <Stack gap="md">
              {orders.map((order) => {
                const statusConfig = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.pending;
                const progress = getProgressPercentage(order.order_status);
                const estimatedTime = getEstimatedTime(order.order_status);

                return (
                  <Card
                    key={order.id}
                    p="lg"
                    style={{
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Top Border */}
                    <Box
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: statusConfig.gradient,
                      }}
                    />

                    <Stack gap="md">
                      {/* Order Header */}
                      <Group justify="space-between" align="flex-start">
                        <Stack gap={4}>
                          <Text size="xs" fw={600} c="#737373" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Order #{order.order_number || order.id.substring(0, 8).toUpperCase()}
                          </Text>
                          <Text fw={900} size="lg" c="#171717">
                            {order.restaurant?.name}
                          </Text>
                        </Stack>
                        <Badge
                          size="lg"
                          style={{
                            background: statusConfig.gradient,
                            color: 'white',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {statusConfig.label}
                        </Badge>
                      </Group>

                      {/* Progress Bar */}
                      <Box>
                        <Text size="xs" fw={600} c="#525252" mb="xs">
                          Estimated {order.order_status === 'delivering' || order.order_status === 'out_for_delivery' ? 'Arrival' : 'Ready'}: {estimatedTime}
                        </Text>
                        <Progress
                          value={progress}
                          size="sm"
                          radius="md"
                          color="#ff7a00"
                          style={{ height: '8px' }}
                        />
                      </Box>

                      {/* Driver Section */}
                      {order.driver && (order.order_status === 'delivering' || order.order_status === 'out_for_delivery' || order.order_status === 'picked_up') && (
                        <Box
                          p="md"
                          style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '12px',
                            border: '2px solid #e5e7eb',
                          }}
                        >
                          <Group mb="md">
                            <Avatar
                              size="md"
                              radius="xl"
                              style={{
                                background: 'linear-gradient(135deg, #ea580c, #dc2626)',
                                color: 'white',
                                fontWeight: 900,
                              }}
                            >
                              {order.driver.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </Avatar>
                            <Stack gap={2} style={{ flex: 1 }}>
                              <Text fw={700} size="md" c="#171717">
                                {order.driver.name}
                              </Text>
                              <Group gap={4}>
                                <IconStar size={12} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                                <Text size="xs" c="#737373">
                                  {order.driver.rating?.toFixed(1)} • {order.driver.distance?.toFixed(1)} mi away
                                </Text>
                              </Group>
                            </Stack>
                          </Group>
                          <Group gap="xs">
                            <Button
                              variant="outline"
                              size="sm"
                              style={{ flex: 1, borderColor: '#e5e5e5' }}
                              onClick={() => handleCallDriver(order.driver!)}
                              leftSection={<IconPhone size={16} />}
                            >
                              Call
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              style={{ flex: 1, borderColor: '#e5e5e5' }}
                              onClick={() => handleMessageDriver(order.driver!)}
                              leftSection={<IconMessageCircle size={16} />}
                            >
                              Message
                            </Button>
                          </Group>
                        </Box>
                      )}

                      {/* Timeline */}
                      <Box>
                        <Stack gap="md">
                          {TIMELINE_STEPS.map((step) => {
                            const timelineStatus = getTimelineStatus(order.order_status, step.key);
                            const StepIcon = step.icon;
                            
                            return (
                              <Group key={step.key} gap="md" align="flex-start">
                                <Box
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor:
                                      timelineStatus === 'completed'
                                        ? '#10b981'
                                        : timelineStatus === 'active'
                                        ? '#ea580c'
                                        : '#f5f5f5',
                                    color: timelineStatus === 'pending' ? '#a3a3a3' : 'white',
                                    position: 'relative',
                                    zIndex: 1,
                                  }}
                                >
                                  {timelineStatus === 'completed' ? (
                                    <IconCheck size={16} />
                                  ) : (
                                    <StepIcon size={16} />
                                  )}
                                </Box>
                                <Stack gap={2} style={{ flex: 1, paddingTop: '2px' }}>
                                  <Text
                                    size="sm"
                                    fw={700}
                                    c={timelineStatus === 'pending' ? '#a3a3a3' : '#171717'}
                                  >
                                    {step.label}
                                  </Text>
                                  <Text size="xs" c="#737373">
                                    {timelineStatus === 'active' ? 'In progress' : timelineStatus === 'completed' ? 'Completed' : 'Pending'}
                                  </Text>
                                </Stack>
                              </Group>
                            );
                          })}
                        </Stack>
                      </Box>

                      <Divider />

                      {/* Items */}
                      <Box>
                        <Text size="xs" fw={700} c="#171717" mb="md" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Order Items ({order.order_items?.length || 0})
                        </Text>
                        <Stack gap="xs">
                          {order.order_items?.map((item, idx) => (
                            <Group key={idx} justify="space-between">
                              <Text size="sm" c="#404040" fw={500}>
                                {item.name || item.menu_items?.name || 'Unknown Item'}
                              </Text>
                              <Text size="sm" c="#737373" fw={600}>
                                x{item.quantity}
                              </Text>
                            </Group>
                          ))}
                        </Stack>
                      </Box>

                      <Divider />

                      {/* Footer */}
                      <Group justify="space-between" align="center">
                        <Group gap={4}>
                          <IconClock size={14} style={{ color: '#737373' }} />
                          <Text size="xs" c="#737373">
                            Ordered {formatTimeAgo(order.created_at)}
                          </Text>
                        </Group>
                        <Text fw={900} size="lg" c="#171717">
                          ${((order.total_cents || order.total_amount || 0) / 100).toFixed(2)}
                        </Text>
                      </Group>

                      {/* Action Buttons */}
                      <Group gap="xs">
                        {(order.order_status === 'delivering' || order.order_status === 'out_for_delivery') && (
                          <Button
                            onClick={() => handleTrackOrder(order.id)}
                            style={{ flex: 1 }}
                            color="#ff7a00"
                            leftSection={<IconMapPin size={16} />}
                          >
                            Track Live
                          </Button>
                        )}
                        {order.order_status === 'preparing' && (
                          <Button
                            onClick={() => handleCallRestaurant(order.restaurant)}
                            variant="outline"
                            style={{ flex: 1 }}
                            leftSection={<IconPhone size={16} />}
                          >
                            Call Restaurant
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          style={{ flex: 1 }}
                        >
                          Help
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
