import React, { useState } from 'react';
import { Card, ThemeIcon, Badge, Button, Group, Stack, Text, Box, Transition } from '@mantine/core';
import { Lock, Unlock, Sparkles } from 'lucide-react';
import { ExclusiveOrder } from '@/types/diamond-orders';

interface VaultOrderCardProps {
  order: ExclusiveOrder;
  onClaim: (orderId: string) => void;
  isDiamond: boolean;
}

export const VaultOrderCard: React.FC<VaultOrderCardProps> = ({ order, onClaim, isDiamond }) => {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(isDiamond);

  const handleUnlock = () => {
    if (!isDiamond) return;
    setIsUnlocking(true);
    setTimeout(() => {
      setIsUnlocking(false);
      setIsUnlocked(true);
    }, 800);
  };

  const payout = (order.base_pay || order.delivery_fee_cents || 0) / 100 + ((order.tip || order.tip_cents || 0) / 100);

  return (
    <Card
      p="lg"
      radius="md"
      style={{
        background: isUnlocked 
          ? 'linear-gradient(135deg, #FF6A00 0%, #D45400 100%)'
          : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        border: `2px solid ${isUnlocked ? '#FF6A00' : '#444'}`,
        boxShadow: isUnlocked ? '0 0 16px rgba(255,106,0,0.6)' : 'none',
        position: 'relative',
        overflow: 'hidden',
        filter: isUnlocked ? 'none' : 'blur(1px)',
        opacity: isUnlocked ? 1 : 0.7,
      }}
    >
      <Stack gap="md">
        <Group justify="apart" wrap="nowrap" style={{ overflow: 'visible' }}>
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon
              size={40}
              radius="xl"
              variant="gradient"
              gradient={isUnlocked 
                ? { from: '#FF6A00', to: '#D45400', deg: 135 }
                : { from: '#444', to: '#666', deg: 135 }
              }
            >
              {isUnlocked ? <Unlock size={24} /> : <Lock size={24} />}
            </ThemeIcon>
            <Text fw={700} size="lg" c={isUnlocked ? 'white' : 'dimmed'} style={{ whiteSpace: 'nowrap' }}>
              VAULT ORDER
            </Text>
          </Group>
          
          {isUnlocked && (
            <Badge 
              color="orange" 
              variant="filled" 
              size="md"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
                minWidth: 'fit-content',
                flexShrink: 0,
                overflow: 'visible'
              }}
            >
              <Sparkles size={12} style={{ marginRight: 4 }} />
              Unlocked
            </Badge>
          )}
        </Group>

        <Box>
          <Text size="sm" c={isUnlocked ? 'white' : 'dimmed'} mb="xs">
            {order.restaurant?.name || 'Restaurant'}
          </Text>
          <Text fw={700} size="xl" c={isUnlocked ? 'white' : 'dimmed'}>
            ${payout.toFixed(2)}
          </Text>
        </Box>

        {!isUnlocked && (
          <Button
            fullWidth
            size="lg"
            color="gray"
            variant="outline"
            disabled={!isDiamond}
            onClick={handleUnlock}
            leftSection={<Lock size={16} />}
          >
            {isDiamond ? 'Unlock Vault' : '🔒 Diamond Only'}
          </Button>
        )}

        {isUnlocked && (
          <Transition mounted={isUnlocked} transition="fade" duration={400}>
            {(styles) => (
              <Button
                fullWidth
                size="lg"
                style={{
                  background: 'linear-gradient(135deg, #FF6A00 0%, #D45400 100%)',
                  ...styles
                }}
                onClick={() => onClaim(order.id)}
              >
                Claim Order
              </Button>
            )}
          </Transition>
        )}

        {/* Flames effect when unlocked - removed for Mantine 8 compatibility */}
      </Stack>
    </Card>
  );
};

