import React, { useState } from 'react';
import { Card, Skeleton, Badge, Button, Group, Stack, Text, Box, Transition } from '@mantine/core';
import { Eye, EyeOff } from 'lucide-react';
import { ExclusiveOrder } from '@/types/diamond-orders';

interface MysteryOrderCardProps {
  order: ExclusiveOrder;
  onClaim: (orderId: string) => void;
  isDiamond: boolean;
}

export const MysteryOrderCard: React.FC<MysteryOrderCardProps> = ({ order, onClaim, isDiamond }) => {
  const [revealed, setRevealed] = useState(false);
  const payout = (order.base_pay || order.delivery_fee_cents || 0) / 100 + ((order.tip || order.tip_cents || 0) / 100);

  const handleReveal = () => {
    if (!isDiamond) return;
    setRevealed(true);
  };

  return (
    <Card
      p="sm"
      radius="md"
      style={{
        background: '#ffffff',
        border: '2px solid #FF6A00',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'relative',
      }}
    >
      <Stack gap="xs">
        <Group justify="apart">
          <Text fw={700} size="sm" c="#000">
            MYSTERY ORDER
          </Text>
          {isDiamond && (
            <Badge color="orange" variant="filled" size="xs">
              Diamond Exclusive
            </Badge>
          )}
        </Group>

        <Box>
          <Text size="xs" c="#666" mb={4}>
            {order.restaurant?.name || 'Restaurant'}
          </Text>
          
          {!revealed ? (
            <Group gap="xs" align="center">
              <Skeleton height={32} width={80} radius="md" />
              <Text fw={700} size="lg" c="#000">
                ???
              </Text>
            </Group>
          ) : (
            <Transition mounted={revealed} transition="fade" duration={300}>
              {(styles) => (
                <Text fw={700} size="lg" c="#000" style={styles}>
                  ${payout.toFixed(2)}
                </Text>
              )}
            </Transition>
          )}
        </Box>

        {!revealed && isDiamond && (
          <Button
            fullWidth
            size="sm"
            variant="outline"
            color="orange"
            onClick={handleReveal}
            leftSection={<Eye size={14} />}
          >
            Reveal Payout
          </Button>
        )}

        {revealed && (
          <Button
            fullWidth
            size="sm"
            color="orange"
            variant="filled"
            onClick={() => onClaim(order.id)}
          >
            Claim Order
          </Button>
        )}
      </Stack>
    </Card>
  );
};

