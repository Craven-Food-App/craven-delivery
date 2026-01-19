import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Gift, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Box,
  Text,
  Title,
  Group,
  Stack,
  Card,
  Divider,
  List,
  ThemeIcon,
} from '@mantine/core';
import { useIsMobile } from '@/hooks/use-mobile';

const PromotionDetails: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const promoCode = searchParams.get('code') || 'CREDIT_20_FIRST3';

  // This is a customer-facing page - no internal structure details
  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* Header */}
      <Box
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}
      >
        <Group gap="md" align="center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            style={{ width: '40px', height: '40px' }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Title order={2} fw={700} c="#171717" style={{ fontSize: isMobile ? '20px' : '24px' }}>
            Promotion Details
          </Title>
        </Group>
      </Box>

      {/* Content */}
      <Box style={{ padding: isMobile ? '24px 16px' : '32px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <Stack gap="xl">
          {/* Hero Section */}
          <Card
            p="xl"
            radius="lg"
            style={{
              background: 'linear-gradient(135deg, #ff6b35 0%, #b91c1c 100%)',
              color: 'white',
            }}
          >
            <Stack gap="md" align="center" style={{ textAlign: 'center' }}>
              <ThemeIcon size={64} radius="xl" color="white" variant="light">
                <Gift size={32} style={{ color: '#ff6b35' }} />
              </ThemeIcon>
              <Title order={1} c="white" fw={900} style={{ fontSize: isMobile ? '32px' : '48px' }}>
                $20 OFF
              </Title>
              <Text size="lg" c="white" style={{ opacity: 0.95, maxWidth: '600px' }}>
                Unlock $20 in credits over your first 3 orders
              </Text>
            </Stack>
          </Card>

          {/* How It Works */}
          <Card p="xl" radius="lg" withBorder>
            <Title order={3} fw={700} c="#171717" mb="md">
              How It Works
            </Title>
            <Stack gap="md">
              <Group gap="md" align="flex-start">
                <ThemeIcon size={40} radius="xl" color="orange" variant="light">
                  <Text fw={700} size="lg">1</Text>
                </ThemeIcon>
                <Box style={{ flex: 1 }}>
                  <Text fw={600} size="md" c="#171717" mb={4}>
                    Place Your First Order
                  </Text>
                  <Text size="sm" c="#737373">
                    Complete your first order and automatically receive credit towards your next order.
                  </Text>
                </Box>
              </Group>

              <Group gap="md" align="flex-start">
                <ThemeIcon size={40} radius="xl" color="orange" variant="light">
                  <Text fw={700} size="lg">2</Text>
                </ThemeIcon>
                <Box style={{ flex: 1 }}>
                  <Text fw={600} size="md" c="#171717" mb={4}>
                    Continue Ordering
                  </Text>
                  <Text size="sm" c="#737373">
                    Keep placing orders to unlock additional credits. The more you order, the more you save.
                  </Text>
                </Box>
              </Group>

              <Group gap="md" align="flex-start">
                <ThemeIcon size={40} radius="xl" color="orange" variant="light">
                  <Text fw={700} size="lg">3</Text>
                </ThemeIcon>
                <Box style={{ flex: 1 }}>
                  <Text fw={600} size="md" c="#171717" mb={4}>
                    Save Up to $20
                  </Text>
                  <Text size="sm" c="#737373">
                    By your third order, you'll have unlocked a total of $20 in credits to use on future orders.
                  </Text>
                </Box>
              </Group>
            </Stack>
          </Card>

          {/* Benefits */}
          <Card p="xl" radius="lg" withBorder>
            <Title order={3} fw={700} c="#171717" mb="md">
              What You Get
            </Title>
            <List
              spacing="md"
              size="md"
              icon={
                <ThemeIcon color="green" size={24} radius="xl">
                  <CheckCircle size={16} />
                </ThemeIcon>
              }
            >
              <List.Item>
                <Text fw={600} size="md" c="#171717" mb={4}>
                  Automatic Enrollment
                </Text>
                <Text size="sm" c="#737373">
                  No promo code needed. You're automatically enrolled when you place your first order.
                </Text>
              </List.Item>
              <List.Item>
                <Text fw={600} size="md" c="#171717" mb={4}>
                  Credits Applied Automatically
                </Text>
                <Text size="sm" c="#737373">
                  Credits are automatically applied to your orders at checkout. No extra steps required.
                </Text>
              </List.Item>
              <List.Item>
                <Text fw={600} size="md" c="#171717" mb={4}>
                  Save on Delivery & Service Fees
                </Text>
                <Text size="sm" c="#737373">
                  Credits can be used to reduce delivery and service fees on your orders.
                </Text>
              </List.Item>
              <List.Item>
                <Text fw={600} size="md" c="#171717" mb={4}>
                  Up to $20 Total Savings
                </Text>
                <Text size="sm" c="#737373">
                  Complete your first 3 orders to unlock the full $20 in credits.
                </Text>
              </List.Item>
            </List>
          </Card>

          {/* Terms & Conditions */}
          <Card p="xl" radius="lg" withBorder style={{ backgroundColor: '#fef2f2', borderColor: '#fee2e2' }}>
            <Group gap="sm" mb="md">
              <AlertCircle size={20} style={{ color: '#dc2626' }} />
              <Title order={3} fw={700} c="#171717">
                Terms & Conditions
              </Title>
            </Group>
            <Stack gap="sm">
              <Text size="sm" c="#737373">
                • Promotion is available for new customers on their first 3 orders
              </Text>
              <Text size="sm" c="#737373">
                • Minimum order subtotal of $15 required to be eligible
              </Text>
              <Text size="sm" c="#737373">
                • Credits are automatically applied at checkout
              </Text>
              <Text size="sm" c="#737373">
                • Credits expire 14 days after your first order
              </Text>
              <Text size="sm" c="#737373">
                • Credits can be used on delivery and service fees
              </Text>
              <Text size="sm" c="#737373">
                • Promotion cannot be combined with other offers
              </Text>
              <Text size="sm" c="#737373">
                • Crave'n reserves the right to modify or cancel this promotion at any time
              </Text>
            </Stack>
          </Card>

          {/* Call to Action */}
          <Card p="xl" radius="lg" style={{ backgroundColor: '#fef2f2', border: '2px solid #ff6b35' }}>
            <Stack gap="md" align="center" style={{ textAlign: 'center' }}>
              <Text fw={700} size="lg" c="#171717">
                Ready to Start Saving?
              </Text>
              <Text size="sm" c="#737373" style={{ maxWidth: '500px' }}>
                Place your first order now and start unlocking credits automatically. No promo code needed!
              </Text>
              <Button
                size="lg"
                onClick={() => navigate('/restaurants')}
                style={{
                  background: 'linear-gradient(to right, #ff6b35, #b91c1c)',
                  color: 'white',
                  fontWeight: 600,
                  padding: '12px 32px',
                }}
              >
                Browse Restaurants
              </Button>
            </Stack>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
};

export default PromotionDetails;

