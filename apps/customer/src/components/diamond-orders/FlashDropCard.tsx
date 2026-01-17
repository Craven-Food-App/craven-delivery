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
        filter: isLocked ? 'blur(2px)' : 'none',
        opacity: isLocked ? 0.6 : 1,
      }}
    >
      <Stack gap="md">
        <Group justify="apart" align="flex-start">
          <Stack gap="xs">
            <Group gap="xs">
              <Zap size={20} color={isLocked ? '#666' : '#fff'} />
              <Text fw={700} size="lg" c={isLocked ? 'dimmed' : 'white'}>
                FLASH DROP
              </Text>
            </Group>
            {isDiamond && order.diamond_only_until && (
              <Badge color="orange" variant="filled" size="sm">
                Diamond Early Access
              </Badge>
            )}
          </Stack>
          
          {!isExpired && order.diamond_only_until && (
            <RingProgress
              size={60}
              thickness={6}
              sections={[{ value: progress, color: isLocked ? 'gray' : 'white' }]}
              label={
                <Text ta="center" c={isLocked ? 'dimmed' : 'white'} fw={700} size="xs">
                  {timeRemaining}s
                </Text>
              }
            />
          )}
        </Group>

        <Box>
          <Text size="sm" c={isLocked ? 'dimmed' : 'white'} mb="xs">
            {order.restaurant?.name || 'Restaurant'}
          </Text>
          <Text fw={700} size="xl" c={isLocked ? 'dimmed' : 'white'}>
            ${payout.toFixed(2)}
          </Text>
        </Box>

        <Button
          fullWidth
          size="lg"
          color={isLocked ? 'gray' : 'orange'}
          variant={isLocked ? 'outline' : 'filled'}
          disabled={isLocked || isExpired}
          onClick={() => onClaim(order.id)}
          style={{
            background: isLocked 
              ? 'transparent'
              : 'linear-gradient(135deg, #FF6A00 0%, #D45400 100%)',
            transition: 'all 0.2s',
          }}
        >
          {isLocked ? '🔒 Diamond Only' : isExpired ? 'Expired' : 'Claim Now'}
        </Button>
      </Stack>
    </Card>
  );
};

