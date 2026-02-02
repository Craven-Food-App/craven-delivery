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
      p="sm"
      radius="md"
      style={{
        background: '#ffffff',
        border: `2px solid ${isUnlocked ? '#FF6A00' : '#e0e0e0'}`,
        boxShadow: isUnlocked ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
        position: 'relative',
        overflow: 'hidden',
        opacity: isUnlocked ? 1 : 0.7,
      }}
    >
      <Stack gap="xs">
        <Group justify="apart" wrap="nowrap" style={{ overflow: 'visible' }}>
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon
              size={32}
              radius="xl"
              variant="gradient"
              gradient={isUnlocked 
                ? { from: '#FF6A00', to: '#D45400', deg: 135 }
                : { from: '#999', to: '#ccc', deg: 135 }
              }
            >
              {isUnlocked ? <Unlock size={18} color="#fff" /> : <Lock size={18} color="#666" />}
            </ThemeIcon>
            <Text fw={700} size="sm" c={isUnlocked ? '#000' : '#999'} style={{ whiteSpace: 'nowrap' }}>
              VAULT ORDER
            </Text>
          </Group>
          
          {isUnlocked && (
            <Box
              style={{
                backgroundColor: '#FF6A00',
                color: '#ffffff',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
                minWidth: 'fit-content',
                flexShrink: 0,
                overflow: 'visible',
                borderRadius: '2px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={10} />
              Unlocked
            </Box>
          )}
        </Group>

        <Box>
          <Text size="xs" c={isUnlocked ? '#666' : '#999'} mb={4}>
            {order.restaurant?.name || 'Restaurant'}
          </Text>
          <Text fw={700} size="lg" c={isUnlocked ? '#000' : '#999'}>
            ${payout.toFixed(2)}
          </Text>
        </Box>

        {!isUnlocked && (
          <Button
            fullWidth
            size="sm"
            color="gray"
            variant="outline"
            disabled={!isDiamond}
            onClick={handleUnlock}
            leftSection={<Lock size={14} />}
          >
            {isDiamond ? 'Unlock Vault' : '🔒 Diamond Only'}
          </Button>
        )}

        {isUnlocked && (
          <Transition mounted={isUnlocked} transition="fade" duration={400}>
            {(styles) => (
              <Button
                fullWidth
                size="sm"
                color="orange"
                variant="filled"
                style={styles}
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

