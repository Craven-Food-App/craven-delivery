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
      p="lg"
      radius="md"
      style={{
        background: isLocked 
          ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
          : 'linear-gradient(135deg, #FF6A00 0%, #D45400 100%)',
        border: `2px solid ${isLocked ? '#444' : '#FF6A00'}`,
        boxShadow: isLocked ? 'none' : '0 0 16px rgba(255,106,0,0.6)',
        position: 'relative',
        overflow: 'hidden',
        filter: isLocked ? 'blur(1px)' : 'none',
        opacity: isLocked ? 0.7 : 1,
      }}
    >
      <Stack gap="md">
        <Group justify="apart">
          <Group gap="xs">
            <Package size={24} color={isLocked ? '#666' : '#fff'} />
            <Text fw={700} size="lg" c={isLocked ? 'dimmed' : 'white'}>
              SURPRISE BATCH
            </Text>
          </Group>
          {isDiamond && batch.diamond_only_until && (
            <Badge color="orange" variant="filled" size="sm">
              <Zap size={12} style={{ marginRight: 4 }} />
              Diamond Early Access
            </Badge>
          )}
        </Group>

        <Box>
          <Text size="sm" c={isLocked ? 'dimmed' : 'white'} mb="xs">
            Batch of {orderCount} Orders
          </Text>
          <Text fw={700} size="xl" c={isLocked ? 'dimmed' : 'white'}>
            ${totalPayout.toFixed(2)} Total
          </Text>
        </Box>

        {/* Visual stack of mini cards */}
        <Group gap="xs" align="flex-end">
          {batch.orders?.slice(0, 3).map((order, index) => (
            <Paper
              key={order.id}
              p="xs"
              radius="sm"
              style={{
                background: isLocked ? '#333' : 'rgba(255,255,255,0.2)',
                flex: 1,
                transform: `translateY(${index * -4}px)`,
                zIndex: 3 - index,
              }}
            >
              <Text size="xs" c={isLocked ? 'dimmed' : 'white'} ta="center">
                ${(((order.base_pay || order.delivery_fee_cents || 0) / 100) + ((order.tip || order.tip_cents || 0) / 100)).toFixed(0)}
              </Text>
            </Paper>
          ))}
          {orderCount > 3 && (
            <Paper
              p="xs"
              radius="sm"
              style={{
                background: isLocked ? '#333' : 'rgba(255,255,255,0.2)',
                flex: 1,
              }}
            >
              <Text size="xs" c={isLocked ? 'dimmed' : 'white'} ta="center">
                +{orderCount - 3}
              </Text>
            </Paper>
          )}
        </Group>

        <Button
          fullWidth
          size="lg"
          color={isLocked ? 'gray' : 'orange'}
          variant={isLocked ? 'outline' : 'filled'}
          disabled={isLocked}
          onClick={() => onClaim(batch.id)}
          leftSection={<Package size={16} />}
          style={{
            background: isLocked 
              ? 'transparent'
              : 'linear-gradient(135deg, #FF6A00 0%, #D45400 100%)',
            transition: 'all 0.2s',
          }}
        >
          {isLocked ? '🔒 Diamond Only' : `Claim Entire Batch (${orderCount} orders)`}
        </Button>
      </Stack>
    </Card>
  );
};

