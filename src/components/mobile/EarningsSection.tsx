// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  IconCurrencyDollar, 
  IconClock, 
  IconCalendar,
  IconCreditCard,
  IconBolt,
  IconChevronRight,
  IconHelpCircle,
  IconInfoCircle,
  IconX,
  IconCheck
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  Card,
  Title,
  Loader,
  Progress,
  Divider,
  Modal,
  TextInput,
  Badge,
  Grid,
  Paper,
  ThemeIcon,
} from '@mantine/core';

interface DailyEarnings {
  day: string;
  date: number;
  amount: number;
}

interface WeeklyEarnings {
  weekStart: string;
  weekEnd: string;
  total: number;
  isCurrentWeek: boolean;
}

interface EarningsData {
  today: {
    total: number;
    deliveries: number;
    activeTime: string;
    basePay: number;
    tips: number;
    bonuses: number;
  };
  currentWeek: {
    total: number;
    deliveries: number;
    activeTime: string;
    goal: number;
    daysWorked: number;
    dailyEarnings: DailyEarnings[];
    weekRange: string;
  };
  weeklyHistory: WeeklyEarnings[];
  lifetime: {
    total: number;
    deliveries: number;
    totalTime: string;
    avgPerDelivery: number;
  };
  instantPay: {
    available: number;
    dailyLimit: number;
    used: number;
  };
}

interface DeliveryHistory {
  id: string;
  date: string;
  restaurant: string;
  earnings: number;
  distance: number;
  time: string;
}

const getInitialEarningsData = (userId: string): EarningsData => {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  return {
    today: { total: 45.75, deliveries: 3, activeTime: '2h 15m', basePay: 28.50, tips: 12.25, bonuses: 5.00 },
    currentWeek: {
      total: 127.45, deliveries: 8, activeTime: '6h 30m', goal: 500, daysWorked: 3,
      dailyEarnings: [
        { day: 'Sun', date: weekStart.getDate(), amount: 0 },
        { day: 'Mon', date: weekStart.getDate() + 1, amount: 35.20 },
        { day: 'Tue', date: weekStart.getDate() + 2, amount: 46.50 },
        { day: 'Wed', date: weekStart.getDate() + 3, amount: 0 },
        { day: 'Thu', date: new Date().getDate(), amount: 45.75 },
        { day: 'Fri', date: weekStart.getDate() + 5, amount: 0 },
        { day: 'Sat', date: weekStart.getDate() + 6, amount: 0 },
      ],
      weekRange: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    },
    weeklyHistory: [],
    lifetime: { total: 1247.80, deliveries: 89, totalTime: '52h 15m', avgPerDelivery: 14.02 },
    instantPay: { available: 127.45, dailyLimit: 500, used: 0 }
  };
};

const INITIAL_DELIVERY_HISTORY: DeliveryHistory[] = [
  {
    id: "delivery-004", 
    date: new Date().toISOString(), 
    restaurant: "Chipotle Mexican Grill", 
    earnings: 16.50,
    distance: 2.3, 
    time: '18 min'
  },
  {
    id: "delivery-003", 
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), 
    restaurant: "Panda Express", 
    earnings: 14.75,
    distance: 1.8, 
    time: '12 min'
  },
  {
    id: "delivery-002", 
    date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), 
    restaurant: "McDonald's", 
    earnings: 14.50,
    distance: 1.2, 
    time: '15 min'
  },
  {
    id: "delivery-001", 
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), 
    restaurant: "Five Guys", 
    earnings: 18.25,
    distance: 3.1, 
    time: '22 min'
  }
];

const INSTANT_CASHOUT_FEE = 0.50;

const InstantCashoutModal = ({ isOpen, onClose, availableAmount, onCashoutSuccess }: any) => {
  const [cashoutAmount, setCashoutAmount] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCashoutAmount(Math.max(0, availableAmount).toFixed(2));
      setMessage('');
      setSuccess(false);
    }
  }, [isOpen, availableAmount]);

  const handleCashout = async () => {
    const amount = parseFloat(cashoutAmount);
    const netAmount = amount - INSTANT_CASHOUT_FEE;

    if (isNaN(amount) || amount <= 0) {
      setMessage('Please enter a valid amount greater than $0.00.');
      return;
    }
    if (amount > availableAmount) {
      setMessage(`Amount ($${amount.toFixed(2)}) exceeds available balance ($${availableAmount.toFixed(2)}).`);
      return;
    }
    if (netAmount < 0.01) {
      setMessage(`Minimum net cashout must be over $0.00. (Requires entry > $${INSTANT_CASHOUT_FEE.toFixed(2)})`);
      return;
    }
    
    setLoading(true);
    setMessage('Processing instant cashout...');

    try {
      setMessage(`Successfully cashed out $${amount.toFixed(2)} (Net: $${netAmount.toFixed(2)})! Check your bank in minutes.`);
      setSuccess(true);
      
      setTimeout(() => {
        onCashoutSuccess?.(amount);
        onClose();
      }, 800);

    } catch (error) {
      console.error("Cashout UI error:", error);
      setMessage("Cashout failed. Please try again.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconBolt size={20} color="var(--mantine-color-green-6)" />
          <Text fw={600}>CashApp Instant Cashout</Text>
        </Group>
      }
      centered
    >
      <Stack gap="md">
        <Box style={{ textAlign: 'center' }}>
          <Text size="sm" c="dimmed" mb={4}>Available to Cash Out</Text>
          <Text size="3xl" fw={700} c="green.6">${Math.max(0, availableAmount).toFixed(2)}</Text>
          <Text size="xs" c="dimmed" mt={4}>Instant transfer to your CashApp</Text>
        </Box>

        <TextInput
          label={`Cashout Amount (CashApp Fee: $${INSTANT_CASHOUT_FEE.toFixed(2)})`}
          type="number"
          value={cashoutAmount}
          onChange={(e) => setCashoutAmount(e.target.value)}
          min="0.01"
          max={availableAmount.toFixed(2)}
          step="0.01"
          disabled={success || loading}
        />

        {message && (
          <Text size="sm" fw={500} c={success ? 'green' : 'red'}>
            {message}
          </Text>
        )}

        <Button
          fullWidth
          color="green"
          onClick={handleCashout}
          disabled={success || loading || availableAmount < INSTANT_CASHOUT_FEE}
          leftSection={loading ? null : success ? <IconCheck size={20} /> : <IconBolt size={20} />}
          loading={loading}
        >
          {success ? 'Sent to CashApp!' : loading ? 'Processing...' : 'Cash Out to CashApp'}
        </Button>

        <Paper p="md" bg="green.0" style={{ border: '1px solid var(--mantine-color-green-2)' }} radius="lg">
          <Text size="xs" fw={600} c="green.7" mb={4}>💡 Same-Day CashApp Transfer</Text>
          <Text size="xs" c="green.6">
            • Funds arrive in your CashApp within minutes<br/>
            • Available 24/7 including weekends<br/>
            • Secure & encrypted transfer
          </Text>
        </Paper>
      </Stack>
    </Modal>
  );
};

export const EarningsSection = () => {
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const uid = 'local-user';
    setUserId(uid);
    setEarningsData(getInitialEarningsData(uid));
    setDeliveryHistory(INITIAL_DELIVERY_HISTORY);
    setLoading(false);
  }, []);

  const handleCashoutSuccess = (amount: number) => {
    setEarningsData((prev) => {
      if (!prev) return prev;
      const updatedAvailable = Math.max(0, prev.instantPay.available - amount);
      const updatedUsed = (prev.instantPay.used || 0) + amount;
      return {
        ...prev,
        instantPay: { ...prev.instantPay, available: updatedAvailable, used: updatedUsed }
      };
    });
  };

  if (loading) {
    return (
      <Box h="100vh" bg="slate.0" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '64px' }}>
        <Stack align="center" gap="md">
          <Loader size="xl" color="orange" />
          <Text c="dimmed">Connecting to real-time earnings data...</Text>
        </Stack>
      </Box>
    );
  }

  if (!earningsData) {
    return (
      <Box h="100vh" bg="slate.0" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '64px' }}>
        <Stack align="center" gap="md" p="xl">
          <IconCurrencyDollar size={48} color="var(--mantine-color-slate-4)" />
          <Title order={3} fw={600} c="slate.9">No Earnings Data Available</Title>
          <Text c="dimmed" style={{ textAlign: 'center' }}>Could not load earnings. This is likely a new account initialization or a connection error.</Text>
          <Button onClick={() => setLoading(true)}>Try Reconnect</Button>
        </Stack>
      </Box>
    );
  }
  
  const currentWeek = earningsData.currentWeek;
  const today = earningsData.today;
  const lifetime = earningsData.lifetime;
  const instantPay = earningsData.instantPay;

  const maxWeeklyEarning = Math.max(
    ...currentWeek.dailyEarnings.map(d => d.amount),
    100
  );

  const todayAvgPerDelivery = today.deliveries > 0 ? today.total / today.deliveries : 0;
  const weekGoalProgress = (currentWeek.total / currentWeek.goal) * 100;
  
  return (
    <Box h="100vh" bg="slate.0" style={{ paddingBottom: '80px', overflowY: 'auto' }}>
      <Box maw={1024} mx="auto">
        {/* Earnings Header */}
        <Paper
          pos="sticky"
          top={0}
          bg="white"
          style={{ zIndex: 10, borderBottom: '1px solid var(--mantine-color-slate-2)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        >
          <Box p="md">
            <Title order={1} fw={700} c="slate.9" style={{ textAlign: 'right' }}>Earnings</Title>
            <Text size="sm" c="slate.6" style={{ textAlign: 'right' }}>Track your income and performance</Text>
          </Box>
        </Paper>

        {/* Weekly Earnings Summary */}
        <Paper
          p="xl"
          style={{ background: 'linear-gradient(to bottom right, var(--mantine-color-orange-6), var(--mantine-color-orange-7))', color: 'white' }}
        >
          {/* Daily Earnings Bar Chart */}
          <Box px={0} pb="xl">
            <Text c="orange.2" size="sm" style={{ textAlign: 'center' }} mb="xl">Confirmed Earnings for Current Week</Text>
            <Group align="flex-end" justify="space-between" gap="xs" mb="xl" h={144}>
              {currentWeek.dailyEarnings.map((day, index) => {
                const height = maxWeeklyEarning > 0 ? (day.amount / maxWeeklyEarning) * 100 : 0;
                const isToday = day.date === new Date().getDate();
                
                return (
                  <Stack key={index} gap={4} align="center" style={{ flex: 1 }}>
                    <Box h={24} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      {day.amount > 0 && (
                        <Text size="xs" fw={isToday ? 700 : 500} c="white" style={{ whiteSpace: 'nowrap' }}>
                          ${day.amount.toFixed(0)}
                        </Text>
                      )}
                    </Box>
                    
                    <Box h={80} w="100%" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Box
                        w="100%"
                        maw={40}
                        bg={isToday ? 'white' : 'rgba(255,255,255,0.9)'}
                        style={{
                          height: day.amount > 0 ? `${Math.max(5, height)}%` : '4px',
                          borderRadius: '4px 4px 0 0',
                          boxShadow: isToday ? '0 4px 6px rgba(0,0,0,0.2)' : undefined,
                          transition: 'all 0.5s',
                        }}
                      />
                    </Box>
                    
                    <Box h={32} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                      <Text size="xs" fw={isToday ? 700 : 500} c={isToday ? 'white' : 'orange.2'}>
                        {day.day}
                      </Text>
                    </Box>
                  </Stack>
                );
              })}
            </Group>
          </Box>
        
          {/* Current Week Summary & Goal */}
          <Card bg="orange.7" style={{ backgroundColor: 'rgba(255,255,255,0.3)', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} radius="lg" p="md" mb="md">
            <Stack gap="md">
              <Group justify="space-between" gap="md">
                <Box style={{ flex: 1 }}>
                  <Text c="orange.2" size="sm">Week Total ({currentWeek.weekRange})</Text>
                  <Text size="3xl" fw={900} c="white">${currentWeek.total.toFixed(2)}</Text>
                </Box>
                <Box style={{ textAlign: 'right' }}>
                  <Text c="orange.2" size="sm">Goal: ${currentWeek.goal}</Text>
                  <Badge color="yellow" variant="filled" size="lg" fw={700} c="dark">
                    {Math.min(100, weekGoalProgress).toFixed(0)}%
                  </Badge>
                </Box>
              </Group>
              <Progress 
                value={weekGoalProgress}
                color="orange.4"
                size="sm"
                radius="xl"
              />
            </Stack>
          </Card>

          {/* Quick Actions */}
          <Stack gap="md" p="md" pt={0}>
            <Grid gutter="md">
              <Grid.Col span={6}>
                <Button
                  h={80}
                  color="green"
                  onClick={() => setShowCashoutModal(true)}
                  disabled={instantPay.available < INSTANT_CASHOUT_FEE}
                  leftSection={<IconBolt size={24} />}
                  style={{ flexDirection: 'column', gap: 4 }}
                >
                  <Text size="sm" fw={600}>CashApp Pay</Text>
                  <Text size="sm" fw={700}>${Math.max(0, instantPay.available).toFixed(2)}</Text>
                </Button>
              </Grid.Col>
              <Grid.Col span={6}>
                <Button
                  h={80}
                  variant="outline"
                  color="white"
                  leftSection={<IconCreditCard size={24} />}
                  style={{ flexDirection: 'column', gap: 4, borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  <Text size="sm">Manage</Text>
                  <Text size="sm" fw={600}>Payments</Text>
                </Button>
              </Grid.Col>
            </Grid>
          </Stack>
        </Paper>

        {/* White Background Content */}
        <Paper bg="white" p="md">
          {/* Today's Stats */}
          <Box mb="xl">
            <Title order={3} fw={600} c="dark" mb="md">Today's Performance</Title>
            <Card shadow="sm" radius="lg" withBorder>
              <Card.Section p="md">
                <Grid gutter="md">
                  <Grid.Col span={4}>
                    <Stack gap="xs" align="center">
                      <ThemeIcon size="lg" radius="xl" color="orange" variant="light">
                        <IconClock size={20} />
                      </ThemeIcon>
                      <Text size="sm" c="dimmed">Active Time</Text>
                      <Text fw={600} size="sm">{today.activeTime}</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <Stack gap="xs" align="center">
                      <ThemeIcon size="lg" radius="xl" color="orange" variant="light">
                        <IconCalendar size={20} />
                      </ThemeIcon>
                      <Text size="sm" c="dimmed">Deliveries</Text>
                      <Text fw={600} size="sm">{today.deliveries}</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <Stack gap="xs" align="center">
                      <ThemeIcon size="lg" radius="xl" color="orange" variant="light">
                        <IconCurrencyDollar size={20} />
                      </ThemeIcon>
                      <Text size="sm" c="dimmed">Avg / Del</Text>
                      <Text fw={600} size="sm">${todayAvgPerDelivery.toFixed(2)}</Text>
                    </Stack>
                  </Grid.Col>
                </Grid>
                <Divider my="md" />
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Base Pay</Text>
                    <Text fw={500} size="sm">${today.basePay.toFixed(2)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Customer Tips</Text>
                    <Text fw={500} size="sm">${today.tips.toFixed(2)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Bonuses</Text>
                    <Text fw={500} size="sm">${today.bonuses.toFixed(2)}</Text>
                  </Group>
                </Stack>
              </Card.Section>
            </Card>
          </Box>

          {/* Recent Deliveries */}
          <Box mb="xl">
            <Title order={3} fw={600} c="dark" mb="md">Recent Deliveries</Title>
            <Card shadow="sm" radius="lg" withBorder>
              {deliveryHistory.slice(0, 5).map((delivery, index) => (
                <React.Fragment key={delivery.id}>
                  <Card.Section p="md">
                    <Group justify="space-between" gap="md">
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600} c="dark" size="sm" lineClamp={1}>{delivery.restaurant}</Text>
                        <Text size="xs" c="dimmed">
                          {new Date(delivery.date).toLocaleDateString()} - {delivery.time}
                        </Text>
                      </Box>
                      <Stack gap={4} align="flex-end">
                        <Text size="lg" fw={700} c="green.6">${delivery.earnings.toFixed(2)}</Text>
                        <Text size="xs" c="dimmed">{delivery.distance.toFixed(1)} mi</Text>
                      </Stack>
                    </Group>
                  </Card.Section>
                  {index < deliveryHistory.length - 1 && index < 4 && <Divider />}
                </React.Fragment>
              ))}
            </Card>
            <Button
              fullWidth
              variant="light"
              color="orange"
              mt="md"
              rightSection={<IconChevronRight size={16} />}
            >
              View All History
            </Button>
          </Box>
        </Paper>
      </Box>
      
      {/* Instant Cashout Modal */}
      <InstantCashoutModal
        isOpen={showCashoutModal}
        onClose={() => setShowCashoutModal(false)}
        availableAmount={instantPay.available}
        onCashoutSuccess={handleCashoutSuccess}
      />

      {/* Android Bottom Bar */}
      <Box 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: '48px', 
          backgroundColor: '#000',
          zIndex: 1000 
        }} 
      />
    </Box>
  );
};

export default EarningsSection;
