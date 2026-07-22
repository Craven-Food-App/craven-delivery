import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Box,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  Loader,
  Center,
  Progress,
  Paper,
  Modal,
  Textarea,
  Radio,
  ActionIcon,
} from '@mantine/core';
import {
  IconMessageCircle,
  IconPackage,
  IconArrowLeft,
  IconX,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
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
  driver_id?: string;
  payment_status?: string;
  payment_intent_id?: string;
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
  cancelled: { label: 'Cancelled', gradient: 'linear-gradient(135deg, #dc2626, #991b1b)' },
};

function getProgressPercentage(orderStatus: string): number {
  const statusOrder = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivering', 'delivered'];
  const currentIndex = statusOrder.indexOf(orderStatus);
  if (currentIndex === -1) return 0;
  return Math.min(100, ((currentIndex + 1) / statusOrder.length) * 100);
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<'customer' | 'restaurant'>('customer');
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

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

  const handleMessageDriver = (orderId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    navigate(`/customer-support?orderId=${orderId}&type=driver`);
  };

  const handleTrackOrder = (orderId: string) => {
    navigate(`/track-order/${orderId}`);
  };

  const canCancelOrder = (order: Order): boolean => {
    const nonCancellableStatuses = ['delivered', 'cancelled'];
    return !nonCancellableStatuses.includes(order.order_status);
  };

  const canClearOrder = (order: Order): boolean => {
    return order.order_status === 'pending';
  };

  const isRestaurantPreparing = (order: Order): boolean => {
    const preparingStatuses = ['preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivering'];
    return preparingStatuses.includes(order.order_status);
  };

  const handleOpenCancelModal = (order: Order, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedOrder(order);
    setCancelReason('customer');
    setCancelNotes('');
    setCancelModalOpen(true);
  };

  const handleClearPendingOrder = async (order: Order, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (!confirm('Are you sure you want to clear this pending order? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: 'cancelled' })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Order Cleared',
        description: 'Pending order has been cleared.',
      });

      fetchActiveOrders();
    } catch (error: any) {
      console.error('Error clearing order:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to clear order',
        variant: 'destructive',
      });
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;

    setCancelling(true);
    try {
      const isPaid = selectedOrder.payment_status === 'paid' || selectedOrder.payment_intent_id;
      const isPreparing = isRestaurantPreparing(selectedOrder);

      // Update order status to cancelled
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);

      if (updateError) throw updateError;

      // Create cancellation record
      const cancellationData: any = {
        order_id: selectedOrder.id,
        cancelled_by: cancelReason === 'customer' ? 'customer' : 'restaurant',
        reason: cancelNotes || 'No reason provided',
        cancelled_at: new Date().toISOString(),
      };

      // If paid, create refund request
      if (isPaid) {
        const refundAmount = selectedOrder.total_cents || selectedOrder.total_amount || 0;
        
        // Create refund request
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error: refundError } = await supabase
          .from('refund_requests')
          .insert({
            order_id: selectedOrder.id,
            customer_id: user.id,
            amount_cents: refundAmount,
            reason: cancelNotes || `Order cancelled by ${cancelReason === 'customer' ? 'customer' : 'restaurant'}`,
            status: isPreparing ? 'pending' : 'approved', // Auto-approve if not preparing
            type: 'full',
          });

        if (refundError) {
          console.error('Error creating refund request:', refundError);
          // Continue with cancellation even if refund request fails
        } else if (!isPreparing) {
          // If not preparing, process refund immediately
          try {
            await supabase.functions.invoke('process-refund', {
              body: {
                orderId: selectedOrder.id,
                amountCents: refundAmount,
                reason: cancelNotes || 'Order cancelled',
              },
            });
          } catch (refundProcessError) {
            console.error('Error processing refund:', refundProcessError);
            // Refund will be processed manually by admin
          }
        }
      }

      toast({
        title: 'Order Cancelled',
        description: isPaid && !isPreparing
          ? 'Your order has been cancelled and a refund is being processed.'
          : isPaid && isPreparing
          ? 'Your order has been cancelled. Refund will be reviewed due to preparation status.'
          : 'Your order has been cancelled.',
      });

      setCancelModalOpen(false);
      setSelectedOrder(null);
      setCancelReason('customer');
      setCancelNotes('');
      fetchActiveOrders();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to cancel order',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
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
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    return orderTime.toLocaleDateString();
  };

  const formatMoney = (order: Order) =>
    `$${((order.total_cents || order.total_amount || 0) / 100).toFixed(2)}`;

  const toggleDetails = (orderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
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
      <Box style={{ minHeight: '100vh', backgroundColor: '#fafafa', paddingBottom: '96px' }}>
        <Center style={{ height: '100vh' }}>
          <Stack align="center" gap="md">
            <Loader size="lg" color="#ff7a00" />
            <Text c="dimmed" size="sm">Loading orders…</Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        backgroundColor: '#fafafa',
        paddingBottom: `calc(96px + env(safe-area-inset-bottom, 0px))`,
        paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))',
      }}
    >
      {/* Compact sticky header */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '10px 12px',
          paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
        }}
      >
        <Group gap="xs" align="center" wrap="nowrap">
          {isMobile && (
            <ActionIcon
              variant="subtle"
              size="md"
              onClick={() => navigate(-1)}
              style={{ color: '#171717' }}
              aria-label="Back"
            >
              <IconArrowLeft size={22} />
            </ActionIcon>
          )}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={800} size="md" c="#171717" style={{ lineHeight: 1.2 }}>
              Order History
            </Text>
            <Text size="xs" c="#737373" style={{ lineHeight: 1.2 }}>
              {orders.length === 0
                ? 'No recent orders'
                : `${orders.length} order${orders.length === 1 ? '' : 's'}`}
            </Text>
          </Box>
        </Group>
      </Box>

      <Box
        style={{
          maxWidth: isMobile ? '100%' : '640px',
          margin: '0 auto',
          padding: '10px 12px 16px',
        }}
      >
        {orders.length === 0 ? (
          <Paper
            p="xl"
            radius="md"
            style={{ textAlign: 'center', border: '1px solid #e5e7eb' }}
          >
            <IconPackage size={40} style={{ color: '#d1d5db', marginBottom: 8 }} />
            <Text fw={700} size="md" mb={4} c="#171717">
              No orders yet
            </Text>
            <Text size="sm" c="#737373" mb="md">
              Your past and active orders will show up here
            </Text>
            <Button onClick={() => navigate('/restaurants')} color="orange" size="sm">
              Start Ordering
            </Button>
          </Paper>
        ) : (
          <Stack gap={8}>
            {orders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.pending;
              const progress = getProgressPercentage(order.order_status);
              const estimatedTime = getEstimatedTime(order.order_status);
              const isActive = !['delivered', 'cancelled'].includes(order.order_status);
              const itemCount = order.order_items?.length || 0;
              const firstItem =
                order.order_items?.[0]?.menu_items?.name ||
                order.order_items?.[0]?.name ||
                'Items';
              const expanded = expandedOrderId === order.id;
              const orderCode = (
                order.order_number || order.id.substring(0, 8)
              ).toUpperCase();

              return (
                <Paper
                  key={order.id}
                  radius="md"
                  style={{
                    background: '#fff',
                    border: expanded ? '1px solid #ff5f1f' : '1px solid #e5e7eb',
                    overflow: 'hidden',
                  }}
                >
                  {/* Compact summary row */}
                  <Box
                    component="button"
                    type="button"
                    onClick={(e) => toggleDetails(order.id, e)}
                    aria-expanded={expanded}
                    style={{
                      width: '100%',
                      appearance: 'none',
                      border: 0,
                      background: 'transparent',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Group justify="space-between" align="flex-start" gap={8} wrap="nowrap">
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap={6} mb={2} wrap="nowrap">
                          <Badge
                            size="xs"
                            radius="sm"
                            style={{
                              background: statusConfig.gradient,
                              color: '#fff',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              fontSize: '9px',
                              padding: '0 6px',
                              flexShrink: 0,
                            }}
                          >
                            {statusConfig.label}
                          </Badge>
                          <Text
                            size="xs"
                            c="#9ca3af"
                            style={{
                              fontVariantNumeric: 'tabular-nums',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            #{orderCode}
                          </Text>
                        </Group>
                        <Text
                          fw={700}
                          size="sm"
                          c="#171717"
                          style={{
                            lineHeight: 1.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {order.restaurant?.name || 'Restaurant'}
                        </Text>
                        <Text
                          size="xs"
                          c="#737373"
                          mt={2}
                          style={{
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {firstItem}
                          {itemCount > 1 ? ` · +${itemCount - 1} more` : ''}
                          {' · '}
                          {formatTimeAgo(order.created_at)}
                        </Text>
                      </Box>
                      <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                        <Text fw={800} size="sm" c="#171717" style={{ lineHeight: 1.2 }}>
                          {formatMoney(order)}
                        </Text>
                        <Group gap={2} align="center">
                          <Text size="xs" fw={600} c="#ff5f1f">
                            {expanded ? 'Hide' : 'Details'}
                          </Text>
                          {expanded ? (
                            <IconChevronUp size={14} color="#ff5f1f" />
                          ) : (
                            <IconChevronDown size={14} color="#ff5f1f" />
                          )}
                        </Group>
                      </Stack>
                    </Group>

                    {/* Slim progress only for active + collapsed peek */}
                    {isActive && !expanded && (
                      <Progress
                        value={progress}
                        size={4}
                        radius="xl"
                        color="#ff5f1f"
                        mt={8}
                        animated
                      />
                    )}
                  </Box>

                  {/* Expanded details */}
                  {expanded && (
                    <Box
                      style={{
                        borderTop: '1px solid #f3f4f6',
                        padding: '10px 12px 12px',
                        background: '#fff',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isActive && (
                        <Box mb={10}>
                          <Group justify="space-between" mb={4}>
                            <Text size="xs" fw={600} c="#525252">
                              {order.order_status === 'delivering' ||
                              order.order_status === 'out_for_delivery'
                                ? 'Est. arrival'
                                : 'Est. ready'}
                            </Text>
                            <Text size="xs" fw={700} c="#171717">
                              {estimatedTime}
                            </Text>
                          </Group>
                          <Progress
                            value={progress}
                            size={6}
                            radius="xl"
                            color="#ff5f1f"
                            animated
                          />
                        </Box>
                      )}

                      <Text size="xs" fw={700} c="#525252" mb={6} tt="uppercase">
                        Items
                      </Text>
                      <Stack gap={4} mb={12}>
                        {(order.order_items || []).slice(0, 6).map((item) => (
                          <Group key={item.id} justify="space-between" gap={8} wrap="nowrap">
                            <Text
                              size="xs"
                              c="#171717"
                              style={{
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.quantity > 1 ? `${item.quantity}× ` : ''}
                              {item.menu_items?.name || item.name}
                            </Text>
                            <Text size="xs" c="#737373" style={{ flexShrink: 0 }}>
                              $
                              {(
                                (item.price_cents ?? Math.round((item.price || 0) * 100)) / 100
                              ).toFixed(2)}
                            </Text>
                          </Group>
                        ))}
                        {itemCount > 6 && (
                          <Text size="xs" c="#9ca3af">
                            +{itemCount - 6} more items
                          </Text>
                        )}
                      </Stack>

                      <Group gap={6} wrap="wrap">
                        {isActive && (
                          <Button
                            size="xs"
                            color="orange"
                            variant="filled"
                            onClick={() => handleTrackOrder(order.id)}
                          >
                            Track order
                          </Button>
                        )}
                        <Button
                          size="xs"
                          variant="light"
                          color="gray"
                          onClick={() => handleTrackOrder(order.id)}
                        >
                          Full details
                        </Button>
                        {isActive && order.driver_id && (
                          <Button
                            size="xs"
                            variant="light"
                            color="orange"
                            leftSection={<IconMessageCircle size={14} />}
                            onClick={(e) => handleMessageDriver(order.id, e)}
                          >
                            Driver
                          </Button>
                        )}
                        {canCancelOrder(order) &&
                          (canClearOrder(order) ? (
                            <Button
                              size="xs"
                              variant="subtle"
                              color="red"
                              leftSection={<IconTrash size={14} />}
                              onClick={(e) => handleClearPendingOrder(order, e)}
                            >
                              Clear
                            </Button>
                          ) : (
                            <Button
                              size="xs"
                              variant="subtle"
                              color="red"
                              leftSection={<IconX size={14} />}
                              onClick={(e) => handleOpenCancelModal(order, e)}
                            >
                              Cancel
                            </Button>
                          ))}
                      </Group>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Cancel Order Modal */}
      <Modal
        opened={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setSelectedOrder(null);
          setCancelReason('customer');
          setCancelNotes('');
        }}
        title="Cancel Order"
        size="md"
        centered
      >
        {selectedOrder && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Order #
              {(selectedOrder.order_number || selectedOrder.id.substring(0, 8)).toUpperCase()}
            </Text>
            <Text size="sm" fw={500}>
              {selectedOrder.restaurant?.name}
            </Text>
            <Text size="sm" c="dimmed">
              Total: {formatMoney(selectedOrder)}
            </Text>

            {isRestaurantPreparing(selectedOrder) && (
              <Paper p="sm" style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24' }}>
                <Text size="sm" c="#92400e" fw={500}>
                  This order has started preparation. Cancellation will be reviewed and may
                  require restaurant approval.
                </Text>
              </Paper>
            )}

            <Radio.Group
              label="Cancellation Type"
              value={cancelReason}
              onChange={(value) => setCancelReason(value as 'customer' | 'restaurant')}
            >
              <Stack gap="xs" mt="xs">
                <Radio value="customer" label="Crave'n Cancellation" />
                <Radio value="restaurant" label="Restaurant Cancellation" />
              </Stack>
            </Radio.Group>

            <Textarea
              label="Reason for Cancellation"
              placeholder="Please provide a reason for cancelling this order..."
              value={cancelNotes}
              onChange={(e) => setCancelNotes(e.currentTarget.value)}
              minRows={3}
            />

            {(selectedOrder.payment_status === 'paid' || selectedOrder.payment_intent_id) && (
              <Paper p="sm" style={{ backgroundColor: '#dbeafe', border: '1px solid #60a5fa' }}>
                <Text size="sm" c="#1e40af" fw={500}>
                  This order was paid.{' '}
                  {isRestaurantPreparing(selectedOrder)
                    ? 'A refund request will be submitted for review.'
                    : 'A full refund will be processed automatically.'}
                </Text>
              </Paper>
            )}

            <Group justify="flex-end" gap="sm" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setCancelModalOpen(false);
                  setSelectedOrder(null);
                  setCancelReason('customer');
                  setCancelNotes('');
                }}
                disabled={cancelling}
              >
                Keep Order
              </Button>
              <Button
                color="red"
                onClick={handleCancelOrder}
                loading={cancelling}
                disabled={cancelling}
              >
                Confirm Cancellation
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
