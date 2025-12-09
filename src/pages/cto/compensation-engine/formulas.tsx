import React from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  Code,
  Divider,
} from '@mantine/core';

export default function FormulaReference() {
  return (
    <Stack gap="lg" p="lg">
      <Title order={2}>Compensation Engine Formula Reference</Title>

      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Trip Earnings Calculation
        </Title>
        <Code block>
          {`function calculateDriverTripEarnings(trip) {
  // Base earnings
  baseEarnings = max(
    (deliveryFee * basePercentage / 100),
    minimumPerDelivery
  );
  
  // Distance bonus
  distanceBonus = distanceBonusEnabled
    ? baseBonus + (miles * perMileBonus)
    : 0;
  
  // Peak time multiplier
  peakMultiplier = getPeakMultiplier(tripTime, zone);
  peakBonus = peakMultiplier > 1
    ? baseEarnings * (peakMultiplier - 1)
    : 0;
  
  // Hotspot bonus
  hotspotBonus = isHotspot ? hotspotBonusAmount : 0;
  
  // Performance bonus
  performanceBonus = driverScore >= 95
    ? baseEarnings * (performanceBonusPercentage / 100)
    : 0;
  
  // Total
  totalEarnings = baseEarnings 
    + distanceBonus 
    + peakBonus 
    + hotspotBonus 
    + performanceBonus 
    - penalties;
  
  return totalEarnings;
}`}
        </Code>
      </Card>

      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Weekly Stats Aggregation
        </Title>
        <Code block>
          {`function recalculateWeeklyStatsAndBonuses(driverId, weekStart, weekEnd) {
  // Get all trips for the week
  trips = getTrips(driverId, weekStart, weekEnd);
  
  // Calculate totals
  totalEarnings = sum(trips.earnings);
  totalHours = sum(trips.hours);
  totalTrips = count(trips);
  
  // Get bonuses
  bonuses = getBonuses(driverId, weekStart, weekEnd);
  
  // Calculate averages
  avgEarningsPerHour = totalEarnings / totalHours;
  avgEarningsPerTrip = totalEarnings / totalTrips;
  
  // Net earnings
  netEarnings = totalEarnings + bonuses - penalties;
  
  return {
    totalTrips,
    totalEarnings,
    totalHours,
    avgEarningsPerHour,
    avgEarningsPerTrip,
    bonusesEarned,
    penaltiesApplied,
    netEarnings
  };
}`}
        </Code>
      </Card>

      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Driver Score Calculation
        </Title>
        <Code block>
          {`function calculateDriverScore(driverId) {
  // Get performance metrics
  metrics = getDriverMetrics(driverId);
  
  // Weighted calculation
  score = (onTimeRate * 0.4) 
    + (completionRate * 0.3) 
    + (acceptanceRate * 0.3);
  
  // Normalize to 0-100
  normalizedScore = score * 100;
  
  return normalizedScore;
}`}
        </Code>
      </Card>
    </Stack>
  );
}


