/**
 * Payout calculation utilities
 * Matches PostgreSQL function calculate_driver_payout_cents exactly
 */

export interface PayoutSettings {
  basePayCents: number;
  shareBps: number;
}

export interface ScenarioResult {
  label: string;
  distance: string;
  deliveryFees: number;
  tip: number;
  driverFeeShare: number;
  driverBeforeTip: number;
  driverPayout: number;
  platformShare: number;
}

export interface PayoutMetrics {
  avgDriverPayout: number;
  avgPlatformShare: number;
  totalRevenue: number;
  totalDriverPayout: number;
  driverMargin: number;
}

/**
 * Calculate driver payout - matches PostgreSQL function exactly
 */
export const calculateDriverPayout = (
  deliveryFeesCents: number,
  tipCents: number,
  basePayCents: number,
  shareBps: number
) => {
  // Matches your PostgreSQL function exactly
  const driverFeeShare = Math.floor((deliveryFeesCents * shareBps) / 10000);
  const driverBeforeTip = Math.max(basePayCents, driverFeeShare);
  const driverPayout = driverBeforeTip + tipCents;
  const platformShare = deliveryFeesCents - driverFeeShare;

  return {
    driverFeeShare: driverFeeShare / 100,
    driverBeforeTip: driverBeforeTip / 100,
    driverPayout: driverPayout / 100,
    platformShare: platformShare / 100,
  };
};

/**
 * Calculate scenarios for different delivery types
 */
export const calculateScenarios = (settings: PayoutSettings): ScenarioResult[] => {
  const scenarios = [
    { label: 'Short', distance: '< 2mi', deliveryFeesCents: 399, tipCents: 300 },
    { label: 'Medium', distance: '2-5mi', deliveryFeesCents: 599, tipCents: 500 },
    { label: 'Long', distance: '5-10mi', deliveryFeesCents: 899, tipCents: 700 },
    { label: 'Premium', distance: '10mi+', deliveryFeesCents: 1299, tipCents: 1000 },
    { label: 'Low Tip', distance: 'Various', deliveryFeesCents: 599, tipCents: 100 },
  ];

  return scenarios.map(scenario => {
    const result = calculateDriverPayout(
      scenario.deliveryFeesCents,
      scenario.tipCents,
      settings.basePayCents,
      settings.shareBps
    );

    return {
      label: scenario.label,
      distance: scenario.distance,
      deliveryFees: scenario.deliveryFeesCents / 100,
      tip: scenario.tipCents / 100,
      ...result,
    };
  });
};

/**
 * Calculate aggregate metrics from scenarios
 */
export const calculateMetrics = (scenarios: ScenarioResult[]): PayoutMetrics => {
  const avgDriverPayout = scenarios.reduce((sum, s) => sum + s.driverPayout, 0) / scenarios.length;
  const avgPlatformShare = scenarios.reduce((sum, s) => sum + s.platformShare, 0) / scenarios.length;
  const totalRevenue = scenarios.reduce((sum, s) => sum + s.deliveryFees, 0);
  const totalDriverPayout = scenarios.reduce((sum, s) => sum + s.driverPayout, 0);
  
  return {
    avgDriverPayout,
    avgPlatformShare,
    totalRevenue,
    totalDriverPayout,
    driverMargin: totalRevenue > 0 ? (totalDriverPayout / totalRevenue) * 100 : 0,
  };
};




























