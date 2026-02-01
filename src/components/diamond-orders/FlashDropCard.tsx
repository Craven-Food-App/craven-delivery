import React, { useState, useEffect } from 'react';
import { Card, RingProgress, Badge, Button, Group, Stack, Text, Box } from '@mantine/core';
import { Zap } from 'lucide-react';
import { ExclusiveOrder } from '@/types/diamond-orders';

interface FlashDropCardProps {
  order: ExclusiveOrder;
  onClaim: (orderId: string) => void;
  isDiamond: boolean;
}

export const FlashDropCard: React.FC<FlashDropCardProps> = ({ order, onClaim, isDiamond }) => {
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!order.diamond_only_until) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(order.diamond_only_until!).getTime();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      
      setTimeRemaining(remaining);
      setIsExpired(remaining === 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [order.diamond_only_until]);

  const progress = (timeRemaining / 90) * 100;
  const isLocked = !isDiamond && order.diamond_only_until && new Date(order.diamond_only_until) > new Date();
  const payout = (order.base_pay || order.delivery_fee_cents || 0) / 100 + ((order.tip || order.tip_cents || 0) / 100);

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
        opacity: isLocked ? 0.6 : 1,
      }}
    >
      <Stack gap="xs">
        <Group justify="apart" align="flex-start">
          <Stack gap={4}>
            <Group gap="xs">
              <Zap size={16} color={isLocked ? '#999' : '#FF6A00'} />
              <Text fw={700} size="sm" c={isLocked ? '#999' : '#000'}>
                FLASH DROP
              </Text>
            </Group>
            {isDiamond && order.diamond_only_until && (
              <Badge color="orange" variant="filled" size="xs">
                Diamond Early Access
              </Badge>
            )}
          </Stack>
          
          {!isExpired && order.diamond_only_until && (
            <RingProgress
              size={48}
              thickness={5}
              sections={[{ value: progress, color: isLocked ? '#999' : '#FF6A00' }]}
              label={
                <Text ta="center" c={isLocked ? '#999' : '#000'} fw={700} size={10}>
                  {timeRemaining}s
                </Text>
              }
            />
          )}
        </Group>

        <Box>
          <Text size="xs" c={isLocked ? '#999' : '#666'} mb={4}>
            {order.restaurant?.name || 'Restaurant'}
          </Text>
          <Text fw={700} size="lg" c={isLocked ? '#999' : '#000'}>
            ${payout.toFixed(2)}
          </Text>
        </Box>

        <Button
          fullWidth
          size="sm"
          color={isLocked ? 'gray' : 'orange'}
          variant={isLocked ? 'outline' : 'filled'}
          disabled={isLocked || isExpired}
          onClick={() => onClaim(order.id)}
          style={{
            transition: 'all 0.2s',
          }}
        >
          {isLocked ? '🔒 Diamond Only' : isExpired ? 'Expired' : 'Claim Now'}
        </Button>
      </Stack>
    </Card>
  );
};

