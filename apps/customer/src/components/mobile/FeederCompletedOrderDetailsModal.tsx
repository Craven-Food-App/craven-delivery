import React from 'react';
import { Modal, Stack, Text, Divider, Group, Badge } from '@mantine/core';
import { formatDeliveryAreaOnly } from '@/lib/formatAddressForCompletedOrder';

export interface CompletedOrderDetailsInput {
  displayOrderId: string;
  restaurantName: string;
  pickupAddress: string;
  dropoffAddress: unknown;
  totalMiles: number;
  elapsedTime: string;
  deliveryCompletedAt: string | null;
  offerAcceptedAt: string | null;
  pickupConfirmedAt: string | null;
  orderStatus?: string;
  items: Array<{ name: string; quantity: number; special_instructions?: string }>;
  stopCount?: number;
}

export interface FeederCompletedOrderDetailsModalProps {
  opened: boolean;
  onClose: () => void;
  details: CompletedOrderDetailsInput;
}

const fmtTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
    : '—';

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Group justify="space-between" align="flex-start" wrap="nowrap">
    <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
      {label}
    </Text>
    <Text size="sm" fw={500} ta="right" style={{ wordBreak: 'break-word', maxWidth: '65%' }}>
      {value}
    </Text>
  </Group>
);

export const FeederCompletedOrderDetailsModal: React.FC<FeederCompletedOrderDetailsModalProps> = ({
  opened,
  onClose,
  details,
}) => (
  <Modal opened={opened} onClose={onClose} title="Order details" centered size="md" padding="lg">
    <Stack gap="sm">
      <Row label="Order ID" value={details.displayOrderId} />
      <Row label="Merchant" value={details.restaurantName} />
      <Row label="Pickup" value={details.pickupAddress} />
      <Row label="Drop-off" value={formatDeliveryAreaOnly(details.dropoffAddress)} />
      <Divider />
      <Row label="Offer accepted" value={fmtTime(details.offerAcceptedAt)} />
      <Row label="Pickup confirmed" value={fmtTime(details.pickupConfirmedAt)} />
      <Row label="Delivery completed" value={fmtTime(details.deliveryCompletedAt)} />
      <Row label="Total miles" value={`${details.totalMiles.toFixed(1)} mi`} />
      <Row label="Total time" value={details.elapsedTime} />
      {details.stopCount && details.stopCount > 1 ? (
        <Row label="Stops" value={String(details.stopCount)} />
      ) : null}
      <Row label="Status" value={details.orderStatus ?? 'delivered'} />
      <Divider label="Items" />
      {details.items.length > 0 ? (
        details.items.map((item, i) => (
          <Group key={`${item.name}-${i}`} justify="space-between">
            <Text size="sm">{item.name}</Text>
            <Badge size="sm" variant="light">
              x{item.quantity}
            </Badge>
          </Group>
        ))
      ) : (
        <Text size="sm" c="dimmed">
          No item list on file
        </Text>
      )}
      <Text size="xs" c="dimmed" mt="sm">
        Customer contact and full drop-off address are hidden after completion.
      </Text>
    </Stack>
  </Modal>
);

export default FeederCompletedOrderDetailsModal;
