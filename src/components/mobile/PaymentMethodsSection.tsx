import React, { useState, useEffect } from 'react';
import { IconArrowLeft, IconPlus, IconTrash, IconCreditCard, IconBuilding, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  Card,
  Title,
  ActionIcon,
  TextInput,
  Select,
  Badge,
  Loader,
  ThemeIcon,
  Paper,
  Divider,
} from '@mantine/core';

interface PaymentMethodsSectionProps {
  onBack: () => void;
}

interface PaymentMethod {
  id: string;
  payment_type: string;
  account_identifier: string;
  is_primary: boolean;
}

export const PaymentMethodsSection: React.FC<PaymentMethodsSectionProps> = ({ onBack }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState({
    payment_type: 'cashapp',
    account_identifier: '',
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('driver_payment_methods')
        .select('*')
        .eq('driver_id', user.id)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!paymentDetails.account_identifier) {
      notifications.show({
        title: "Missing information",
        message: "Please enter your payment account details.",
        color: "red",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('driver_payment_methods')
        .insert({
          driver_id: user.id,
          payment_type: paymentDetails.payment_type,
          account_identifier: paymentDetails.account_identifier,
          is_primary: paymentMethods.length === 0,
          is_verified: false
        });

      if (error) throw error;

      notifications.show({
        title: "Payment method added",
        message: "Your payout method has been set up successfully.",
        color: "green",
      });
      
      setShowAddForm(false);
      setPaymentDetails({
        payment_type: 'cashapp',
        account_identifier: '',
      });
      fetchPaymentMethods();
    } catch (error) {
      notifications.show({
        title: "Error adding payment method",
        message: "Please try again.",
        color: "red",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('driver_payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      notifications.show({
        title: "Payment method removed",
        message: "",
        color: "green",
      });
      fetchPaymentMethods();
    } catch (error) {
      notifications.show({
        title: "Error removing payment method",
        message: "",
        color: "red",
      });
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Unset all as primary
      await supabase
        .from('driver_payment_methods')
        .update({ is_primary: false })
        .eq('driver_id', user.id);

      // Set selected as primary
      const { error } = await supabase
        .from('driver_payment_methods')
        .update({ is_primary: true })
        .eq('id', id);

      if (error) throw error;

      notifications.show({
        title: "Primary method updated",
        message: "",
        color: "green",
      });
      fetchPaymentMethods();
    } catch (error) {
      notifications.show({
        title: "Error updating primary method",
        message: "",
        color: "red",
      });
    }
  };

  const formatAccountIdentifier = (type: string, identifier: string) => {
    switch (type) {
      case 'cashapp':
        return identifier.startsWith('$') ? identifier : `$${identifier}`;
      case 'venmo':
        return identifier.startsWith('@') ? identifier : `@${identifier}`;
      default:
        return identifier;
    }
  };

  const getMethodDisplayName = (type: string) => {
    switch (type) {
      case 'cashapp':
        return 'Cash App';
      case 'paypal':
        return 'PayPal';
      case 'venmo':
        return 'Venmo';
      case 'zelle':
        return 'Zelle';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <Box h="100vh" bg="gray.0" style={{ paddingBottom: '80px', overflowY: 'auto' }}>
      {/* Header */}
      <Paper
        pos="sticky"
        top={0}
        bg="white"
        style={{ zIndex: 10, borderBottom: '1px solid var(--mantine-color-gray-2)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <Group px="md" py="md" gap="md" align="center">
          <ActionIcon onClick={onBack} variant="subtle" color="dark">
            <IconArrowLeft size={24} />
          </ActionIcon>
          <Title order={3} fw={700} c="dark">Payment Methods</Title>
        </Group>
      </Paper>

      <Stack gap="md" p="md">
        {/* Info Card */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md">
            <Group gap="md" align="flex-start">
              <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                <IconBuilding size={20} />
              </ThemeIcon>
              <Box style={{ flex: 1 }}>
                <Text fw={500} c="dark" mb={4}>Bank Account Required</Text>
                <Text size="sm" c="dimmed">
                  Add your bank account to receive weekly payouts for your deliveries.
                </Text>
              </Box>
            </Group>
          </Card.Section>
        </Card>

        {/* Current Payment Methods */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group justify="space-between">
              <Title order={4} fw={600}>Payment Methods</Title>
              <Button
                size="sm"
                leftSection={<IconPlus size={16} />}
                onClick={() => setShowAddForm(true)}
                color="orange"
              >
                Add Method
              </Button>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            {loading ? (
              <Loader size="md" color="orange" />
            ) : paymentMethods.length === 0 ? (
              <Stack align="center" gap="md" py="xl">
                <ThemeIcon size="xl" radius="xl" color="gray" variant="light">
                  <IconCreditCard size={32} />
                </ThemeIcon>
                <Text c="dimmed" ta="center">No payment method added yet</Text>
                <Text size="sm" c="dimmed" ta="center">Add CashApp, PayPal, or other method</Text>
              </Stack>
            ) : (
              <Stack gap="md">
                {paymentMethods.map((method) => (
                  <Paper key={method.id} p="md" bg="gray.0" radius="md">
                    <Group justify="space-between">
                      <Group gap="md">
                        <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                          <IconCreditCard size={20} />
                        </ThemeIcon>
                        <Box>
                          <Group gap="xs" align="center">
                            <Text fw={500}>{getMethodDisplayName(method.payment_type)}</Text>
                            {method.is_primary && (
                              <Badge color="green" variant="light" size="sm">Primary</Badge>
                            )}
                          </Group>
                          <Text size="sm" c="dimmed">
                            {formatAccountIdentifier(method.payment_type, method.account_identifier)}
                          </Text>
                        </Box>
                      </Group>
                      <Group gap="xs">
                        {!method.is_primary && (
                          <Button
                            variant="subtle"
                            size="xs"
                            onClick={() => handleSetPrimary(method.id)}
                          >
                            Set Primary
                          </Button>
                        )}
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleDelete(method.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Card.Section>
        </Card>

        {/* Add Payment Method Form */}
        {showAddForm && (
          <Card shadow="sm" radius="lg" withBorder>
            <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
              <Title order={4} fw={600}>Add Payment Method</Title>
            </Card.Section>
            <Card.Section p="md">
              <Stack gap="md">
                <Select
                  label="Payment Type"
                  value={paymentDetails.payment_type}
                  onChange={(value) => setPaymentDetails({ ...paymentDetails, payment_type: value || 'cashapp' })}
                  data={[
                    { value: 'cashapp', label: 'Cash App' },
                    { value: 'paypal', label: 'PayPal' },
                    { value: 'venmo', label: 'Venmo' },
                    { value: 'zelle', label: 'Zelle' },
                  ]}
                />

                <TextInput
                  label={
                    paymentDetails.payment_type === 'cashapp' ? 'CashTag (e.g., $username)' :
                    paymentDetails.payment_type === 'paypal' ? 'PayPal Email' :
                    paymentDetails.payment_type === 'venmo' ? 'Venmo Username (e.g., @username)' :
                    'Phone or Email'
                  }
                  value={paymentDetails.account_identifier}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, account_identifier: e.target.value })}
                  placeholder={
                    paymentDetails.payment_type === 'cashapp' ? '$username' :
                    paymentDetails.payment_type === 'venmo' ? '@username' :
                    paymentDetails.payment_type === 'paypal' ? 'email@example.com' :
                    'Phone or email'
                  }
                />

                <Group gap="md" mt="md">
                  <Button
                    variant="light"
                    onClick={() => setShowAddForm(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddPaymentMethod}
                    color="orange"
                    style={{ flex: 1 }}
                  >
                    Add Method
                  </Button>
                </Group>

                <Paper p="md" bg="gray.0" radius="md">
                  <Text size="xs" c="dimmed">
                    <Text component="span" fw={600}>Note:</Text> For instant payouts, we recommend Cash App. 
                    Make sure your account details are correct.
                  </Text>
                </Paper>
              </Stack>
            </Card.Section>
          </Card>
        )}

        {/* Payout Schedule */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Title order={4} fw={600}>Payout Schedule</Title>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Frequency</Text>
                <Text size="sm" fw={500}>Weekly</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Payout Day</Text>
                <Text size="sm" fw={500}>Every Tuesday</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Processing Time</Text>
                <Text size="sm" fw={500}>1-2 business days</Text>
              </Group>
            </Stack>
          </Card.Section>
        </Card>
      </Stack>
    </Box>
  );
};
