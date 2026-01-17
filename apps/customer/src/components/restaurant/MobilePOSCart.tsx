import React, { useState } from 'react';
import {
  Drawer,
  Button,
  Card,
  TextInput,
  Textarea,
  Select,
  ScrollArea,
  Badge,
  Divider,
  Stack,
  Group,
  Text,
  Title,
  Box,
  ActionIcon,
} from '@mantine/core';
import {
  IconShoppingCart,
  IconPlus,
  IconMinus,
  IconUser,
  IconMapPin,
  IconCreditCard,
} from '@tabler/icons-react';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';

interface CartItem {
  id: string;
  name: string;
  price_cents: number;
  quantity: number;
  special_instructions?: string;
  modifiers?: { id: string; name: string; price_cents: number }[];
}

interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  special_instructions?: string;
  addressCoordinates?: { lat: number; lng: number };
}

interface MobilePOSCartProps {
  cart: CartItem[];
  customerInfo: CustomerInfo;
  orderType: 'delivery' | 'pickup';
  paymentMethod: 'cash' | 'card' | 'phone_payment';
  isValidAddress: boolean;
  isSubmitting: boolean;
  totals: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
  };
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateInstructions: (itemId: string, instructions: string) => void;
  onCustomerInfoChange: (info: Partial<CustomerInfo>) => void;
  onOrderTypeChange: (type: 'delivery' | 'pickup') => void;
  onPaymentMethodChange: (method: 'cash' | 'card' | 'phone_payment') => void;
  onAddressSelect: (address: any) => void;
  onValidAddressChange: (valid: boolean) => void;
  onSubmit: () => void;
}

export const MobilePOSCart: React.FC<MobilePOSCartProps> = ({
  cart,
  customerInfo,
  orderType,
  paymentMethod,
  isValidAddress,
  isSubmitting,
  totals,
  onUpdateQuantity,
  onUpdateInstructions,
  onCustomerInfoChange,
  onOrderTypeChange,
  onPaymentMethodChange,
  onAddressSelect,
  onValidAddressChange,
  onSubmit
}) => {
  const [opened, setOpened] = useState(false);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <ActionIcon
        size="xl"
        radius="xl"
        color="orange"
        variant="filled"
        onClick={() => setOpened(true)}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          zIndex: 50,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Box style={{ position: 'relative' }}>
          <IconShoppingCart size={24} />
          {cartItemCount > 0 && (
            <Badge
              size="sm"
              color="red"
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                minWidth: '20px',
                height: '20px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {cartItemCount}
            </Badge>
          )}
        </Box>
      </ActionIcon>
      
      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        position="bottom"
        size="90vh"
        title={
          <Group gap="xs">
            <IconShoppingCart size={20} />
            <Text fw={500}>Cart ({cartItemCount} {cartItemCount === 1 ? 'item' : 'items'})</Text>
          </Group>
        }
        styles={{ content: { display: 'flex', flexDirection: 'column' }, body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 0 } }}
      >
        <ScrollArea style={{ flex: 1 }}>
          <Stack gap="lg" p="md">
            {/* Order Type */}
            <Card p="md" withBorder>
              <Stack gap="md">
                <Title order={5}>Order Type</Title>
                <Group gap="xs">
                  <Button
                    variant={orderType === 'pickup' ? 'filled' : 'outline'}
                    onClick={() => onOrderTypeChange('pickup')}
                    style={{ flex: 1 }}
                  >
                    Pickup
                  </Button>
                  <Button
                    variant={orderType === 'delivery' ? 'filled' : 'outline'}
                    onClick={() => onOrderTypeChange('delivery')}
                    style={{ flex: 1 }}
                  >
                    Delivery
                  </Button>
                </Group>
              </Stack>
            </Card>

            {/* Customer Info */}
            <Card p="md" withBorder>
              <Stack gap="md">
                <Group gap="xs">
                  <IconUser size={16} />
                  <Title order={5}>Customer Information</Title>
                </Group>
                <Stack gap="sm">
                  <TextInput
                    label="Name *"
                    value={customerInfo.name}
                    onChange={(e) => onCustomerInfoChange({ name: e.target.value })}
                    placeholder="Customer name"
                  />
                  <TextInput
                    label="Phone *"
                    value={customerInfo.phone}
                    onChange={(e) => onCustomerInfoChange({ phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                  <TextInput
                    label="Email (Optional)"
                    type="email"
                    value={customerInfo.email || ''}
                    onChange={(e) => onCustomerInfoChange({ email: e.target.value })}
                    placeholder="customer@email.com"
                  />
                </Stack>
              </Stack>
            </Card>

            {/* Delivery Address */}
            {orderType === 'delivery' && (
              <Card p="md" withBorder>
                <Stack gap="md">
                  <Group gap="xs">
                    <IconMapPin size={16} />
                    <Title order={5}>Delivery Address</Title>
                  </Group>
                  <Stack gap="sm">
                    <AddressAutocomplete
                      value={customerInfo.address || ''}
                      onChange={(value, coordinates) => {
                        onAddressSelect({ address: value, coordinates });
                      }}
                      onValidAddress={onValidAddressChange}
                      required={true}
                      placeholder="123 Main St, City, State 12345"
                    />
                    <Textarea
                      label="Delivery Instructions (Optional)"
                      value={customerInfo.special_instructions || ''}
                      onChange={(e) => onCustomerInfoChange({ special_instructions: e.target.value })}
                      placeholder="Gate code, door color, etc."
                      rows={2}
                    />
                  </Stack>
                </Stack>
              </Card>
            )}

            {/* Cart Items */}
            <Card p="md" withBorder>
              <Stack gap="md">
                <Title order={5}>Items</Title>
                {cart.length === 0 ? (
                  <Text c="dimmed" ta="center" py="md">Cart is empty</Text>
                ) : (
                  <Stack gap="sm">
                    {cart.map((item) => (
                      <Box key={item.id}>
                        <Group justify="space-between" align="flex-start" gap="sm">
                          <Stack gap="xs" style={{ flex: 1 }}>
                            <Text fw={500}>{item.name}</Text>
                            <Text size="sm" c="dimmed">
                              ${(item.price_cents / 100).toFixed(2)}
                              {item.modifiers && item.modifiers.length > 0 && (
                                <Text component="span" display="block" size="xs">
                                  + {item.modifiers.map(m => m.name).join(', ')}
                                </Text>
                              )}
                            </Text>
                            {item.special_instructions && (
                              <Text size="xs" c="dimmed" fs="italic">
                                Note: {item.special_instructions}
                              </Text>
                            )}
                          </Stack>
                          <Group gap="xs">
                            <ActionIcon
                              size="sm"
                              variant="outline"
                              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            >
                              <IconMinus size={14} />
                            </ActionIcon>
                            <Text size="sm" style={{ minWidth: '32px', textAlign: 'center' }}>{item.quantity}</Text>
                            <ActionIcon
                              size="sm"
                              variant="outline"
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            >
                              <IconPlus size={14} />
                            </ActionIcon>
                          </Group>
                        </Group>
                        <Divider mt="sm" />
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Card>

            {/* Payment Method */}
            <Card p="md" withBorder>
              <Stack gap="md">
                <Group gap="xs">
                  <IconCreditCard size={16} />
                  <Title order={5}>Payment Method</Title>
                </Group>
                <Select
                  value={paymentMethod}
                  onChange={(v: any) => onPaymentMethodChange(v)}
                  data={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'card', label: 'Card' },
                    { value: 'phone_payment', label: 'Phone Payment' },
                  ]}
                />
              </Stack>
            </Card>

            {/* Order Summary */}
            <Card p="md" withBorder>
              <Stack gap="md">
                <Title order={5}>Order Summary</Title>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">Subtotal:</Text>
                    <Text size="sm">${(totals.subtotal / 100).toFixed(2)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Tax:</Text>
                    <Text size="sm">${(totals.tax / 100).toFixed(2)}</Text>
                  </Group>
                  {orderType === 'delivery' && (
                    <Group justify="space-between">
                      <Text size="sm">Delivery Fee:</Text>
                      <Text size="sm">${(totals.deliveryFee / 100).toFixed(2)}</Text>
                    </Group>
                  )}
                  <Divider />
                  <Group justify="space-between">
                    <Text fw={700} size="lg">Total:</Text>
                    <Text fw={700} size="lg">${(totals.total / 100).toFixed(2)}</Text>
                  </Group>
                </Stack>
              </Stack>
            </Card>
          </Stack>
        </ScrollArea>

        {/* Submit Button */}
        <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)', backgroundColor: 'var(--mantine-color-body)' }}>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || cart.length === 0}
            size="lg"
            fullWidth
          >
            {isSubmitting ? 'Processing...' : `Place Order - $${(totals.total / 100).toFixed(2)}`}
          </Button>
        </Box>
      </Drawer>
    </>
  );
};
