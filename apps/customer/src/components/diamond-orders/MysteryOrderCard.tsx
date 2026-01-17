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
      p="lg"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #FF6A00 0%, #D45400 100%)',
        border: '2px solid #FF6A00',
        boxShadow: '0 0 16px rgba(255,106,0,0.6)',
        position: 'relative',
      }}
    >
      <Stack gap="md">
        <Group justify="apart">
          <Text fw={700} size="lg" c="white">
            MYSTERY ORDER
          </Text>
          {isDiamond && (
            <Badge color="orange" variant="filled" size="sm">
              Diamond Exclusive
            </Badge>
          )}
        </Group>

        <Box>
          <Text size="sm" c="white" mb="xs">
            {order.restaurant?.name || 'Restaurant'}
          </Text>
          
          {!revealed ? (
            <Group gap="xs" align="center">
              <Skeleton height={40} width={100} radius="md" />
              <Text fw={700} size="xl" c="white">
                ???
              </Text>
            </Group>
          ) : (
            <Transition mounted={revealed} transition="fade" duration={300}>
              {(styles) => (
                <Text fw={700} size="xl" c="white" style={styles}>
                  ${payout.toFixed(2)}
                </Text>
              )}
            </Transition>
          )}
        </Box>

        {!revealed && isDiamond && (
          <Button
            fullWidth
            size="lg"
            variant="outline"
            color="white"
            onClick={handleReveal}
            leftSection={<Eye size={16} />}
            style={{
              borderColor: 'rgba(255,255,255,0.5)',
              color: 'white',
            }}
          >
            Reveal Payout
          </Button>
        )}

        {revealed && (
          <Button
            fullWidth
            size="lg"
            style={{
              background: 'linear-gradient(135deg, #FF6A00 0%, #D45400 100%)',
            }}
            onClick={() => onClaim(order.id)}
          >
            Claim Order
          </Button>
        )}
      </Stack>
    </Card>
  );
};

