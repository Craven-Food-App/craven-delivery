import React, { useState } from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  TextInput,
  Button,
  Group,
  Code,
  Loader,
  Center,
} from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import {
  calculateDriverTripEarnings,
  recalculateWeeklyStatsAndBonuses,
  calculateDriverScore,
} from '@/services/compensation/driverPayEngine';

export default function DiagnosticsTools() {
  const [tripId, setTripId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [tripResult, setTripResult] = useState<any>(null);
  const [weeklyResult, setWeeklyResult] = useState<any>(null);
  const [scoreResult, setScoreResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRecalculateTrip = async () => {
    if (!tripId) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a Trip ID',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch trip data
      const { data: trip, error } = await supabase
        .from('driver_trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) throw error;
      if (!trip) throw new Error('Trip not found');

      // Fetch order data
      const { data: order } = await supabase
        .from('orders')
        .select('delivery_fee_cents')
        .eq('id', trip.order_id)
        .single();

      const result = await calculateDriverTripEarnings({
        tripId: trip.id,
        driverId: trip.driver_id,
        orderId: trip.order_id,
        deliveryFeeCents: order?.delivery_fee_cents || 0,
        distanceMiles: trip.distance_miles || 0,
        tripStartTime: new Date(trip.trip_start_time),
        tripEndTime: new Date(trip.trip_end_time),
        pickupZone: trip.pickup_zone,
        deliveryZone: trip.delivery_zone,
      });

      setTripResult(result);
      notifications.show({
        title: 'Success',
        message: 'Trip earnings recalculated',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to recalculate trip earnings',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateWeekly = async () => {
    if (!driverId) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a Driver ID',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const weekEnd = new Date();
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const result = await recalculateWeeklyStatsAndBonuses({
        driverId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
      });

      setWeeklyResult(result);
      notifications.show({
        title: 'Success',
        message: 'Weekly stats recalculated',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to recalculate weekly stats',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateScore = async () => {
    if (!driverId) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a Driver ID',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const score = await calculateDriverScore(driverId);
      setScoreResult(score);
      notifications.show({
        title: 'Success',
        message: `Driver score calculated: ${score}`,
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to calculate driver score',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="lg" p="lg">
      <Title order={2}>Compensation Engine Diagnostics</Title>

      {/* Trip Recalculation */}
      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Recalculate Trip Earnings
        </Title>
        <Stack gap="md">
          <TextInput
            label="Trip ID"
            placeholder="Enter trip ID"
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
          />
          <Button onClick={handleRecalculateTrip} loading={loading}>
            Recalculate Earnings
          </Button>
          {tripResult && (
            <Card withBorder padding="md" bg="gray.0">
              <Text size="sm" fw={600} mb="xs">
                Result:
              </Text>
              <Code block>{JSON.stringify(tripResult, null, 2)}</Code>
            </Card>
          )}
        </Stack>
      </Card>

      {/* Weekly Stats Recalculation */}
      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Recalculate Weekly Stats
        </Title>
        <Stack gap="md">
          <TextInput
            label="Driver ID"
            placeholder="Enter driver ID"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
          />
          <Button onClick={handleRecalculateWeekly} loading={loading}>
            Recalculate Weekly Stats
          </Button>
          {weeklyResult && (
            <Card withBorder padding="md" bg="gray.0">
              <Text size="sm" fw={600} mb="xs">
                Result:
              </Text>
              <Code block>{JSON.stringify(weeklyResult, null, 2)}</Code>
            </Card>
          )}
        </Stack>
      </Card>

      {/* Driver Score Calculation */}
      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Calculate Driver Score
        </Title>
        <Stack gap="md">
          <TextInput
            label="Driver ID"
            placeholder="Enter driver ID"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
          />
          <Button onClick={handleCalculateScore} loading={loading}>
            Calculate Score
          </Button>
          {scoreResult !== null && (
            <Card withBorder padding="md" bg="gray.0">
              <Text size="sm" fw={600}>
                Driver Score: {scoreResult}
              </Text>
            </Card>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}


