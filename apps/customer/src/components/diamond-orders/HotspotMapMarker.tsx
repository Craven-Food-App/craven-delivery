import React from 'react';
import { ThemeIcon, Modal, Card, Button, Stack, Text, Group, Badge } from '@mantine/core';
import { MapPin } from 'lucide-react';
import { Hotspot } from '@/types/diamond-orders';

interface HotspotMapMarkerProps {
  hotspot: Hotspot;
  onClaim: (hotspotId: string) => void;
  isDiamond: boolean;
  opened: boolean;
  onClose: () => void;
}

export const HotspotMapMarker: React.FC<HotspotMapMarkerProps> = ({ 
  hotspot, 
  onClaim, 
  isDiamond,
  opened,
  onClose
}) => {
  const isExpired = new Date(hotspot.expires_at) < new Date();
  const payout = hotspot.order 
    ? ((hotspot.order.base_pay || hotspot.order.delivery_fee_cents || 0) / 100) + 
      ((hotspot.order.tip || hotspot.order.tip_cents || 0) / 100)
    : 0;

  return (
    <>
      {/* Map Marker */}
      <ThemeIcon
        size={40}
        radius="xl"
        variant="gradient"
        gradient={{ from: '#FF6A00', to: '#D45400', deg: 135 }}
        style={{
          cursor: 'pointer',
        }}
      >
        <MapPin size={24} />
      </ThemeIcon>

      {/* Modal with order details */}
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Group gap="xs">
            <MapPin size={20} />
            <Text fw={700}>Hotspot Order</Text>
          </Group>
        }
        centered
      >
        <Stack gap="md">
          <Card
            p="md"
            radius="md"
            style={{
              background: 'linear-gradient(135deg, #FF6A00 0%, #D45400 100%)',
              border: '2px solid #FF6A00',
            }}
          >
            <Stack gap="xs">
              <Text size="sm" c="white">
                {hotspot.order?.restaurant?.name || 'Restaurant'}
              </Text>
              <Text fw={700} size="xl" c="white">
                ${payout.toFixed(2)}
              </Text>
              {isDiamond && (
                <Badge color="orange" variant="filled" size="sm">
                  Diamond Exclusive
                </Badge>
              )}
            </Stack>
          </Card>

          <Text size="sm" c="dimmed">
            This hotspot expires in {Math.max(0, Math.floor((new Date(hotspot.expires_at).getTime() - new Date().getTime()) / 60000))} minutes
          </Text>

          <Button
            fullWidth
            size="lg"
            disabled={isExpired || !isDiamond}
            onClick={() => {
              onClaim(hotspot.id);
              onClose();
            }}
            style={{
              background: 'linear-gradient(135deg, #FF6A00 0%, #D45400 100%)',
            }}
          >
            {isExpired ? 'Expired' : !isDiamond ? '🔒 Diamond Only' : 'Claim Hotspot Order'}
          </Button>
        </Stack>
      </Modal>
    </>
  );
};

