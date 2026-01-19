import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  ActionIcon,
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
  IconHome,
  IconShoppingCart,
  IconSearch,
  IconUser,
  IconShoppingBag,
  IconArrowLeft,
} from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCart } from '@/contexts/CartContext';

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
  const { cartCount } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveOrders();
    
    // Set up real-time subscription for order updates
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('order-history-updates')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'orders',
            filter: `customer_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Order update received:', payload);
            fetchActiveOrders();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    setupSubscription();
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch all orders (active and past) for order history
      // Use orders table which has customer_id
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
            special_instructions,
            menu_items (
              id,
              name,
              description,
              image_url
            )
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

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

      // Transform orders
      const transformedData = (data || []).map((order: any) => {
        // Handle order_items - should be an array from the relationship
        let orderItems: any[] = [];
        
        if (Array.isArray(order.order_items)) {
          // Array from orders table relationship
          orderItems = order.order_items;
        } else if (order.order_items && typeof order.order_items === 'object') {
          // JSONB field from customer_orders table (fallback)
          try {
            orderItems = Array.isArray(order.order_items) 
              ? order.order_items 
              : JSON.parse(JSON.stringify(order.order_items));
          } catch (e) {
            console.warn('Error parsing order_items:', e);
            orderItems = [];
          }
        }

        return {
          ...order,
          order_items: orderItems.map((item: any) => ({
            ...item,
            name: item.menu_items?.name || 'Unknown Item',
            price: item.price_cents || 0,
            quantity: item.quantity || 1,
            special_instructions: item.special_instructions || null,
          })),
        };
      });

      setOrders(transformedData as Order[]);
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
    <Box style={{ minHeight: '100vh', backgroundColor: 'white', paddingBottom: cartCount > 0 ? '120px' : '80px' }}>
      <Box style={{ maxWidth: isMobile ? '100%' : '768px', margin: '0 auto', padding: '16px', paddingTop: isMobile ? '16px' : '24px' }}>
        <Stack gap="lg">
          {/* Header with Back Button (Mobile) */}
          <Box>
            {isMobile && (
              <Group mb="md" align="center">
                <ActionIcon
                  variant="subtle"
                  onClick={() => navigate(-1)}
                  style={{ color: '#171717' }}
                >
                  <IconArrowLeft size={24} />
                </ActionIcon>
              </Group>
            )}
            <Text fw={900} size="xl" mb="xs" c="#171717">
              Order History
            </Text>
            <Text size="sm" c="#737373">
              Your recent orders
            </Text>
          </Box>

          {/* Orders List */}
          {orders.length === 0 ? (
            <Card p="xl" style={{ textAlign: 'center' }}>
              <Text size="64px" mb="md" style={{ opacity: 0.3 }}>📦</Text>
              <Text fw={900} size="lg" mb="xs" c="#171717">
                No Orders Yet
              </Text>
              <Text size="sm" c="#737373" mb="lg">
                Start ordering to see your order history here
              </Text>
              <Button onClick={() => navigate('/restaurants')} color="#ff7a00" size="md">
                Start Ordering
              </Button>
            </Card>
          ) : (
            <Stack gap="sm">
              {orders.map((order) => {
                const statusConfig = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.pending;
                const progress = getProgressPercentage(order.order_status);
                const estimatedTime = getEstimatedTime(order.order_status);
                const isActive = !['delivered', 'cancelled'].includes(order.order_status);
                const itemCount = order.order_items?.length || 0;
                const firstItem = order.order_items?.[0]?.name || 'Items';

                return (
                  <Card
                    key={order.id}
                    p="md"
                    onClick={() => handleTrackOrder(order.id)}
                    style={{
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      border: isActive ? '2px solid #ff5f1f' : '1px solid #e5e7eb',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Stack gap="sm">
                      {/* Compact Header */}
                      <Group justify="space-between" align="flex-start" gap="xs">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" mb={4}>
                            <Text size="xs" fw={600} c="#737373" style={{ textTransform: 'uppercase' }}>
                              #{order.order_number || order.id.substring(0, 8).toUpperCase()}
                            </Text>
                            <Badge
                              size="sm"
                              style={{
                                background: statusConfig.gradient,
                                color: 'white',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                fontSize: '10px',
                                padding: '2px 8px',
                              }}
                            >
                              {statusConfig.label}
                            </Badge>
                          </Group>
                          <Text fw={700} size="sm" c="#171717" style={{ lineHeight: 1.2 }}>
                            {order.restaurant?.name}
                          </Text>
                          <Text size="xs" c="#737373" mt={2}>
                            {firstItem} {itemCount > 1 ? `+${itemCount - 1} more` : ''}
                          </Text>
                        </Box>
                        <Text fw={700} size="md" c="#171717">
                          ${((order.total_cents || order.total_amount || 0) / 100).toFixed(2)}
                        </Text>
                      </Group>

                      {/* Horizontal Progress Bar */}
                      <Box>
                        {isActive && (
                          <Text size="xs" fw={500} c="#525252" mb={4}>
                            Estimated {order.order_status === 'delivering' || order.order_status === 'out_for_delivery' ? 'Arrival' : 'Ready'}: {estimatedTime}
                          </Text>
                        )}
                        <Progress
                          value={progress}
                          size="md"
                          radius="xl"
                          color="#ff5f1f"
                          style={{ 
                            height: isActive ? '10px' : '6px',
                            backgroundColor: '#f3f4f6'
                          }}
                          animated={isActive}
                        />
                      </Box>

                      {/* Footer */}
                      <Group justify="space-between" align="center">
                        <Group gap={4}>
                          <IconClock size={12} style={{ color: '#9ca3af' }} />
                          <Text size="xs" c="#9ca3af">
                            {formatTimeAgo(order.created_at)}
                          </Text>
                        </Group>
                        {isActive && (
                          <Button
                            size="xs"
                            variant="subtle"
                            color="orange"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTrackOrder(order.id);
                            }}
                          >
                            View Details
                          </Button>
                        )}
                      </Group>
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Bottom Navigation Bar */}
      <BottomNavigation currentPath="/order-history" />

      {/* Cart Button - Only shows if cart has items */}
      {cartCount > 0 && <BottomCartButton />}
    </Box>
  );
}

// Bottom Navigation Component
function BottomNavigation({ currentPath }: { currentPath: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => {
    if (path === '/account') {
      // Highlight "Me" for account-related pages
      return location.pathname === '/account' || 
             location.pathname.startsWith('/customer-dashboard');
    }
    if (path === '/order-history') {
      // Highlight "Orders" when on order history page
      return location.pathname === '/order-history';
    }
    return location.pathname === path;
  };

  const navItems = [
    { icon: IconHome, label: 'Home', path: '/restaurants' },
    { icon: IconShoppingBag, label: 'Orders', path: '/order-history' },
    { icon: IconSearch, label: 'Browse', path: '/restaurants' },
    { icon: IconUser, label: 'Me', path: '/account' },
  ];

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 'env(safe-area-inset-bottom, 0px)',
        left: 0,
        right: 0,
        width: '100%',
        backgroundColor: 'transparent',
        paddingTop: '8px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <ActionIcon
            key={item.path}
            variant="subtle"
            onClick={() => navigate(item.path)}
            size="lg"
            style={{
              color: active ? '#FF6B35' : '#6B7280',
            }}
          >
            <Icon size={28} stroke={active ? 2.5 : 2} />
          </ActionIcon>
        );
      })}
    </Box>
  );
}

// Bottom Cart Button Component
function BottomCartButton() {
  const navigate = useNavigate();
  const { cartCount, getCartTotal, restaurantId } = useCart();
  const [restaurantName, setRestaurantName] = useState<string | null>(null);

  useEffect(() => {
    if (restaurantId) {
      supabase
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single()
        .then(({ data }) => {
          if (data) {
            setRestaurantName(data.name);
          }
        });
    }
  }, [restaurantId]);

  if (cartCount === 0) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: `calc(64px + env(safe-area-inset-bottom, 0px))`,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 1001,
        padding: '0 16px',
      }}
    >
      <Button
        fullWidth
        size="lg"
        onClick={() => navigate('/checkout')}
        leftSection={<IconShoppingCart size={20} />}
        rightSection={
          <Badge size="lg" variant="filled" color="white" c="#FF6B35" style={{ fontSize: '14px', fontWeight: 600 }}>
            {cartCount}
          </Badge>
        }
        style={{
          backgroundColor: '#FF6B35',
          color: 'white',
          fontWeight: 600,
          fontSize: '14px',
          height: '48px',
          borderRadius: '8px',
        }}
      >
        <Box style={{ flex: 1, textAlign: 'left' }}>
          <Text size="xs" c="white" style={{ opacity: 0.9, lineHeight: 1.2 }}>
            View Cart
          </Text>
          {restaurantName && (
            <Text size="sm" fw={700} c="white" style={{ lineHeight: 1.2 }}>
              {restaurantName}
            </Text>
          )}
        </Box>
        <Text size="sm" fw={700} c="white" style={{ marginLeft: 'auto' }}>
          ${(getCartTotal() / 100).toFixed(2)}
        </Text>
      </Button>
    </Box>
  );
}

