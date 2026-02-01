import React from 'react';
import { Card, Badge, Button, Group, Stack, Text, Box, Paper } from '@mantine/core';
import { Package, Zap } from 'lucide-react';
import { OrderBatch } from '@/types/diamond-orders';

interface SurpriseBatchCardProps {
  batch: OrderBatch;
  onClaim: (batchId: string) => void;
  isDiamond: boolean;
}

export const SurpriseBatchCard: React.FC<SurpriseBatchCardProps> = ({ batch, onClaim, isDiamond }) => {
  const orderCount = batch.order_ids?.length || 0;
  const isLocked = !isDiamond && batch.diamond_only_until && new Date(batch.diamond_only_until) > new Date();
  
  // Calculate total payout from orders
  const totalPayout = batch.orders?.reduce((sum, order) => {
    const payout = (order.base_pay || order.delivery_fee_cents || 0) / 100 + ((order.tip || order.tip_cents || 0) / 100);
    return sum + payout;
  }, 0) || 0;

  return (
    <Card
      p="sm"
      radius="md"
      style={{
        background: '#ffffff',
        border: `2px solid ${isLocked ? '#e0e0e0' : '#FF6A00'}`,
        boxShadow: isLocked ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
        position: 'relative',
        overflow: 'hidden',
        opacity: isLocked ? 0.7 : 1,
      }}
    >
      <Stack gap="xs">
        <Group justify="apart">
          <Group gap="xs">
            <Package size={18} color={isLocked ? '#999' : '#FF6A00'} />
            <Text fw={700} size="sm" c={isLocked ? '#999' : '#000'}>
              SURPRISE BATCH
            </Text>
          </Group>
          {isDiamond && batch.diamond_only_until && (
            <Badge color="orange" variant="filled" size="xs">
              <Zap size={10} style={{ marginRight: 4 }} />
              Diamond Early Access
            </Badge>
          )}
        </Group>

        <Box>
          <Text size="xs" c={isLocked ? '#999' : '#666'} mb={4}>
            Batch of {orderCount} Orders
          </Text>
          <Text fw={700} size="lg" c={isLocked ? '#999' : '#000'}>
            ${totalPayout.toFixed(2)} Total
          </Text>
        </Box>

        {/* Visual stack of mini cards */}
        <Group gap="xs" align="flex-end">
          {batch.orders?.slice(0, 3).map((order, index) => (
            <Paper
              key={order.id}
              p={6}
              radius="sm"
              style={{
                background: isLocked ? '#f0f0f0' : '#fff5e6',
                border: `1px solid ${isLocked ? '#e0e0e0' : '#FF6A00'}`,
                flex: 1,
                transform: `translateY(${index * -3}px)`,
                zIndex: 3 - index,
              }}
            >
              <Text size={10} c={isLocked ? '#999' : '#000'} ta="center">
                ${(((order.base_pay || order.delivery_fee_cents || 0) / 100) + ((order.tip || order.tip_cents || 0) / 100)).toFixed(0)}
              </Text>
            </Paper>
          ))}
          {orderCount > 3 && (
            <Paper
              p={6}
              radius="sm"
              style={{
                background: isLocked ? '#f0f0f0' : '#fff5e6',
                border: `1px solid ${isLocked ? '#e0e0e0' : '#FF6A00'}`,
                flex: 1,
              }}
            >
              <Text size={10} c={isLocked ? '#999' : '#000'} ta="center">
                +{orderCount - 3}
              </Text>
            </Paper>
          )}
        </Group>

        <Button
          fullWidth
          size="sm"
          color={isLocked ? 'gray' : 'orange'}
          variant={isLocked ? 'outline' : 'filled'}
          disabled={isLocked}
          onClick={() => onClaim(batch.id)}
          leftSection={<Package size={14} />}
          style={{
            transition: 'all 0.2s',
          }}
        >
          {isLocked ? '🔒 Diamond Only' : `Claim Entire Batch (${orderCount} orders)`}
        </Button>
      </Stack>
    </Card>
  );
};

