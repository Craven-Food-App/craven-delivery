import React, { useState, useEffect } from 'react';
import { Card, Button, Select, TextInput, Stack, Group, Text, Box, Badge, Table, Loader, Center, Alert } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { Zap, Lock, Eye, Package, Sparkles, Gem } from 'lucide-react';

interface Order {
  id: string;
  restaurant_id: string;
  restaurant?: { name: string };
  order_status: string;
  exclusive_type: string;
  diamond_only_until: string | null;
  delivery_fee_cents: number;
  tip_cents: number;
  created_at: string;
}

export const TestDiamondExclusiveOrders: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [exclusiveType, setExclusiveType] = useState<string>('flash_drop');
  const [diamondSeconds, setDiamondSeconds] = useState<string>('90');
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string>('Bronze');

  useEffect(() => {
    fetchAvailableOrders();
    fetchCurrentUserTier();
  }, []);

  const fetchCurrentUserTier = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from('driver_profiles')
        .select('rating_tier')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCurrentTier(profile.rating_tier || 'Bronze');
      }
    } catch (error) {
      console.error('Error fetching current tier:', error);
    }
  };

  const handleSetDiamondTier = async () => {
    if (!currentUserId) {
      notifications.show({
        title: 'Error',
        message: 'No user ID found. Please log in as a driver.',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      // Check if driver profile exists
      const { data: existingProfile } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('driver_profiles')
          .update({ rating_tier: 'Diamond' })
          .eq('user_id', currentUserId);

        if (error) throw error;
      } else {
        // Create new profile with Diamond tier
        const { error } = await supabase
          .from('driver_profiles')
          .insert({
            user_id: currentUserId,
            rating_tier: 'Diamond',
            status: 'offline',
            is_available: false,
          });

        if (error) throw error;
      }

      notifications.show({
        title: 'Success',
        message: 'Driver tier set to Diamond! Refresh the driver app to see exclusive orders.',
        color: 'green',
      });

      setCurrentTier('Diamond');
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to set Diamond tier',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          restaurant_id,
          restaurant:restaurants(name),
          order_status,
          exclusive_type,
          diamond_only_until,
          delivery_fee_cents,
          tip_cents,
          created_at
        `)
        .in('order_status', ['pending', 'confirmed', 'preparing', 'ready'])
        .eq('exclusive_type', 'none')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAvailableOrders(data || []);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to fetch orders',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExclusiveOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          restaurant_id,
          restaurant:restaurants(name),
          order_status,
          exclusive_type,
          diamond_only_until,
          delivery_fee_cents,
          tip_cents,
          created_at
        `)
        .neq('exclusive_type', 'none')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to fetch exclusive orders',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExclusiveOrders();
  }, []);

  const handleGenerateExclusive = async () => {
    if (selectedOrderIds.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'Please select at least one order',
        color: 'red',
      });
      return;
    }

    if (exclusiveType === 'batch' && selectedOrderIds.length < 2) {
      notifications.show({
        title: 'Error',
        message: 'Batch requires at least 2 orders',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-exclusive-orders', {
        body: {
          type: exclusiveType,
          orderIds: selectedOrderIds,
          diamondOnlySeconds: parseInt(diamondSeconds) || 90,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      notifications.show({
        title: 'Success',
        message: `Successfully created ${exclusiveType} exclusive order(s)`,
        color: 'green',
      });

      setSelectedOrderIds([]);
      await fetchExclusiveOrders();
      await fetchAvailableOrders();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to generate exclusive orders',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetOrder = async (orderId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          exclusive_type: 'none',
          diamond_only_until: null,
          payout_hidden: false,
          batch_id: null,
        })
        .eq('id', orderId);

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Order reset to normal',
        color: 'green',
      });

      await fetchExclusiveOrders();
      await fetchAvailableOrders();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to reset order',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getExclusiveTypeIcon = (type: string) => {
    switch (type) {
      case 'flash_drop':
        return <Zap size={16} />;
      case 'vault':
        return <Lock size={16} />;
      case 'mystery':
        return <Eye size={16} />;
      case 'batch':
        return <Package size={16} />;
      default:
        return <Sparkles size={16} />;
    }
  };

  const getExclusiveTypeColor = (type: string) => {
    switch (type) {
      case 'flash_drop':
        return 'orange';
      case 'vault':
        return 'violet';
      case 'mystery':
        return 'blue';
      case 'batch':
        return 'green';
      default:
        return 'gray';
    }
  };

  return (
    <Stack gap="lg">
      {/* Driver Tier Management */}
      <Card p="lg" radius="md" withBorder style={{ backgroundColor: '#fef3c7' }}>
        <Stack gap="md">
          <Group justify="apart">
            <Group gap="xs">
              <Gem size={24} color="#9333ea" />
              <Text fw={700} size="xl">Driver Tier Management</Text>
            </Group>
            <Badge size="lg" color={currentTier === 'Diamond' ? 'violet' : 'gray'}>
              Current Tier: {currentTier}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            User ID: {currentUserId || 'Not logged in'}
          </Text>
          <Alert color="blue">
            <Text size="sm">
              To see exclusive orders in the driver app, you need to be Diamond tier. 
              Click the button below to set your tier to Diamond for testing.
            </Text>
          </Alert>
          <Button
            onClick={handleSetDiamondTier}
            loading={loading}
            disabled={!currentUserId}
            color="violet"
            leftSection={<Gem size={16} />}
            size="lg"
          >
            Set My Driver Tier to Diamond
          </Button>
        </Stack>
      </Card>

      <Card p="lg" radius="md" withBorder>
        <Stack gap="md">
          <Text fw={700} size="xl">Generate Diamond Exclusive Orders</Text>
          
          <Group grow>
            <Select
              label="Exclusive Type"
              placeholder="Select type"
              data={[
                { value: 'flash_drop', label: 'Flash Drop (90s Diamond window)' },
                { value: 'vault', label: 'Vault (Diamond-only, permanent)' },
                { value: 'mystery', label: 'Mystery (Hidden payout)' },
                { value: 'batch', label: 'Surprise Batch (2+ orders)' },
              ]}
              value={exclusiveType}
              onChange={(value) => setExclusiveType(value || 'flash_drop')}
            />
            
            <TextInput
              label="Diamond Window (seconds)"
              placeholder="90"
              value={diamondSeconds}
              onChange={(e) => setDiamondSeconds(e.target.value)}
              disabled={exclusiveType === 'vault'}
            />
          </Group>

          <Box>
            <Text size="sm" fw={500} mb="xs">Select Orders ({selectedOrderIds.length} selected)</Text>
            <Box
              style={{
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                maxHeight: 200,
                overflowY: 'auto',
                padding: '8px',
              }}
            >
              {availableOrders.length === 0 ? (
                <Text c="dimmed" ta="center" py="md">
                  No available orders
                </Text>
              ) : (
                <Stack gap="xs">
                  {availableOrders.map((order) => (
                    <Group key={order.id} justify="apart">
                      <Group gap="xs">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds([...selectedOrderIds, order.id]);
                            } else {
                              setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                            }
                          }}
                        />
                        <Text size="sm">
                          {order.restaurant?.name || 'Restaurant'} - ${((order.delivery_fee_cents || 0) + (order.tip_cents || 0)) / 100}
                        </Text>
                      </Group>
                      <Badge size="sm" variant="outline">
                        {order.order_status}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>

          <Group>
            <Button
              onClick={handleGenerateExclusive}
              loading={loading}
              disabled={selectedOrderIds.length === 0}
              color="orange"
            >
              Generate Exclusive Order{selectedOrderIds.length > 1 ? 's' : ''}
            </Button>
            <Button
              variant="outline"
              onClick={fetchAvailableOrders}
              loading={loading}
            >
              Refresh Orders
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card p="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="apart">
            <Text fw={700} size="xl">Current Exclusive Orders</Text>
            <Button variant="outline" size="xs" onClick={fetchExclusiveOrders} loading={loading}>
              Refresh
            </Button>
          </Group>

          {loading && orders.length === 0 ? (
            <Center h={200}>
              <Loader />
            </Center>
          ) : orders.length === 0 ? (
            <Alert color="blue">
              No exclusive orders found. Generate some using the form above.
            </Alert>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Restaurant</th>
                  <th>Status</th>
                  <th>Diamond Until</th>
                  <th>Payout</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Badge
                        color={getExclusiveTypeColor(order.exclusive_type)}
                        leftSection={getExclusiveTypeIcon(order.exclusive_type)}
                      >
                        {order.exclusive_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td>{order.restaurant?.name || 'N/A'}</td>
                    <td>
                      <Badge size="sm" variant="outline">
                        {order.order_status}
                      </Badge>
                    </td>
                    <td>
                      {order.diamond_only_until ? (
                        <Text size="sm">
                          {new Date(order.diamond_only_until).toLocaleString()}
                        </Text>
                      ) : (
                        <Text size="sm" c="dimmed">Permanent</Text>
                      )}
                    </td>
                    <td>
                      <Text fw={500}>
                        ${((order.delivery_fee_cents || 0) + (order.tip_cents || 0)) / 100}
                      </Text>
                    </td>
                    <td>
                      <Button
                        size="xs"
                        variant="outline"
                        color="red"
                        onClick={() => handleResetOrder(order.id)}
                      >
                        Reset
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Stack>
      </Card>
    </Stack>
  );
};

