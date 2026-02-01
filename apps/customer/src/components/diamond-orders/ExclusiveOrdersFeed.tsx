import React, { useState, useEffect } from 'react';
import { Stack, Text, Loader, Center, Tabs, Group } from '@mantine/core';
import { useExclusiveOrders } from '@/hooks/diamond-orders/useExclusiveOrders';
import { useDriverTier } from '@/hooks/diamond-orders/useDriverTier';
import { FlashDropCard } from './FlashDropCard';
import { VaultOrderCard } from './VaultOrderCard';
import { MysteryOrderCard } from './MysteryOrderCard';
import { SurpriseBatchCard } from './SurpriseBatchCard';
import { ExclusiveOrder, OrderBatch } from '@/types/diamond-orders';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface ExclusiveOrdersFeedProps {
  onClaim: (orderId: string, type: string) => Promise<void>;
}

export const ExclusiveOrdersFeed: React.FC<ExclusiveOrdersFeedProps> = ({ onClaim }) => {
  const { tier, isDiamond, loading: tierLoading } = useDriverTier();
  const { orders, loading: ordersLoading } = useExclusiveOrders(isDiamond);

  const loading = tierLoading || ordersLoading;

  // Debug logging
  useEffect(() => {
    console.log('ExclusiveOrdersFeed - tier:', tier, 'isDiamond:', isDiamond, 'orders:', orders.length);
  }, [tier, isDiamond, orders.length]);
  const [batches, setBatches] = useState<OrderBatch[]>([]);

  useEffect(() => {
    fetchBatches();
  }, [isDiamond]);

  const fetchBatches = async () => {
    try {
      const now = new Date().toISOString();
      let query = supabase
        .from('order_batches')
        .select('*')
        .or(`diamond_only_until.is.null,diamond_only_until.gt.${now}`);

      if (!isDiamond) {
        query = query.or(`diamond_only_until.is.null,diamond_only_until.lt.${now}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch orders for each batch
      const batchesWithOrders = await Promise.all(
        (data || []).map(async (batch) => {
          const { data: batchOrders } = await supabase
            .from('orders')
            .select('*, restaurant:restaurants(name)')
            .in('id', batch.order_ids);
          return { ...batch, orders: batchOrders || [] };
        })
      );

      setBatches(batchesWithOrders as unknown as OrderBatch[]);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const handleClaim = async (orderId: string, type: string) => {
    try {
      await onClaim(orderId, type);
      notifications.show({
        title: 'Order Claimed!',
        message: 'You successfully claimed this exclusive order.',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Claim Failed',
        message: error.message || 'Failed to claim order. It may have been taken.',
        color: 'red',
      });
    }
  };

  if (loading) {
    return (
      <Center h={200}>
        <Loader size="lg" color="orange" />
      </Center>
    );
  }

  const flashDrops = orders.filter(o => o.exclusive_type === 'flash_drop');
  const vaultOrders = orders.filter(o => o.exclusive_type === 'vault');
  const mysteryOrders = orders.filter(o => o.exclusive_type === 'mystery');
  const batchOrders = orders.filter(o => o.exclusive_type === 'batch');

  return (
    <Tabs defaultValue="flash">
      <Tabs.List style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
        <Tabs.Tab 
          value="flash" 
          c="#000"
          fw={700}
          style={{ whiteSpace: 'nowrap' }}
        >
          Flash Drops
        </Tabs.Tab>
        <Tabs.Tab 
          value="vault" 
          c="#000"
          fw={700}
          style={{ whiteSpace: 'nowrap' }}
        >
          Vault
        </Tabs.Tab>
        <Tabs.Tab 
          value="mystery" 
          c="#000"
          fw={700}
          style={{ whiteSpace: 'nowrap' }}
        >
          Mystery
        </Tabs.Tab>
        <Tabs.Tab 
          value="batches" 
          c="#000"
          fw={700}
          style={{ whiteSpace: 'nowrap' }}
        >
          Batches
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="flash" pt="sm">
        <Stack gap="sm">
          {flashDrops.length === 0 ? (
            <Text c="#666" ta="center" py="xl">
              No flash drops available
            </Text>
          ) : (
            flashDrops.map(order => (
              <FlashDropCard
                key={order.id}
                order={order}
                onClaim={(id) => handleClaim(id, 'flash_drop')}
                isDiamond={isDiamond}
              />
            ))
          )}
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="vault" pt="sm">
        <Stack gap="sm">
          {vaultOrders.length === 0 ? (
            <Text c="#666" ta="center" py="xl">
              {!isDiamond ? 'Vault orders are Diamond-only' : 'No vault orders available'}
            </Text>
          ) : (
            vaultOrders.map(order => (
              <VaultOrderCard
                key={order.id}
                order={order}
                onClaim={(id) => handleClaim(id, 'vault')}
                isDiamond={isDiamond}
              />
            ))
          )}
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="mystery" pt="sm">
        <Stack gap="sm">
          {mysteryOrders.length === 0 ? (
            <Text c="#666" ta="center" py="xl">
              No mystery orders available
            </Text>
          ) : (
            mysteryOrders.map(order => (
              <MysteryOrderCard
                key={order.id}
                order={order}
                onClaim={(id) => handleClaim(id, 'mystery')}
                isDiamond={isDiamond}
              />
            ))
          )}
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="batches" pt="sm">
        <Stack gap="sm">
          {batches.length === 0 ? (
            <Text c="#666" ta="center" py="xl">
              No batch orders available
            </Text>
          ) : (
            batches.map(batch => (
              <SurpriseBatchCard
                key={batch.id}
                batch={batch}
                onClaim={(id) => {
                  // Claim all orders in batch
                  batch.order_ids.forEach(orderId => {
                    onClaim(orderId, 'batch');
                  });
                }}
                isDiamond={isDiamond}
              />
            ))
          )}
        </Stack>
      </Tabs.Panel>
    </Tabs>
  );
};

