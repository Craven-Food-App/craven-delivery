// @ts-nocheck
/**
 * Driver Compensation Pay Engine
 * 
 * Calculates driver earnings based on:
 * - Base percentage of delivery fee
 * - Distance bonuses
 * - Peak time multipliers
 * - Hotspot bonuses
 * - Performance bonuses
 * - Penalties
 */

import { supabase } from '@/integrations/supabase/client';

export interface TripEarningsInput {
  tripId: string;
  driverId: string;
  orderId: string;
  deliveryFeeCents: number;
  distanceMiles: number;
  tripStartTime: Date;
  tripEndTime: Date;
  pickupZone?: string;
  deliveryZone?: string;
  isPeakTime?: boolean;
  isHotspot?: boolean;
  driverScore?: number;
}

export interface TripEarningsResult {
  baseEarningsCents: number;
  distanceBonusCents: number;
  peakMultiplier: number;
  peakBonusCents: number;
  hotspotBonusCents: number;
  performanceBonusCents: number;
  penaltyCents: number;
  totalEarningsCents: number;
  breakdown: {
    base: number;
    distance: number;
    peak: number;
    hotspot: number;
    performance: number;
    penalty: number;
  };
}

export interface WeeklyStatsInput {
  driverId: string;
  weekStartDate: Date;
  weekEndDate: Date;
}

export interface WeeklyStatsResult {
  totalTrips: number;
  totalEarningsCents: number;
  totalHours: number;
  avgEarningsPerHour: number;
  avgEarningsPerTrip: number;
  bonusesEarnedCents: number;
  penaltiesAppliedCents: number;
  netEarningsCents: number;
}

/**
 * Calculate earnings for a single driver trip
 */
export async function calculateDriverTripEarnings(
  input: TripEarningsInput
): Promise<TripEarningsResult> {
  try {
    // Get active compensation config
    const { data: config, error: configError } = await supabase
      .from('compensation_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.warn('No active compensation config found, using defaults');
      // Use defaults
      return calculateWithDefaults(input);
    }

    // Calculate base earnings
    const basePercentage = config.base_percentage || 70;
    const baseEarningsCents = Math.round(
      (input.deliveryFeeCents * basePercentage) / 100
    );
    const minimumPerDelivery = config.minimum_per_delivery || 200; // $2.00
    const baseEarnings = Math.max(baseEarningsCents, minimumPerDelivery);

    // Distance bonus
    const distanceBonusCents = calculateDistanceBonus(
      input.distanceMiles,
      config
    );

    // Peak time multiplier
    const peakMultiplier = await getPeakMultiplier(
      input.tripStartTime,
      input.pickupZone || input.deliveryZone || '',
      config
    );
    const peakBonusCents = peakMultiplier > 1
      ? Math.round(baseEarnings * (peakMultiplier - 1))
      : 0;

    // Hotspot bonus
    const hotspotBonusCents = input.isHotspot
      ? (config.hotspot_bonus_cents || 0)
      : 0;

    // Performance bonus (based on driver score)
    const performanceBonusCents = calculatePerformanceBonus(
      input.driverScore || 0,
      baseEarnings,
      config
    );

    // Penalties (calculated separately, typically negative)
    const penaltyCents = 0; // TODO: Calculate based on violations

    const totalEarningsCents =
      baseEarnings +
      distanceBonusCents +
      peakBonusCents +
      hotspotBonusCents +
      performanceBonusCents -
      penaltyCents;

    return {
      baseEarningsCents: baseEarnings,
      distanceBonusCents,
      peakMultiplier,
      peakBonusCents,
      hotspotBonusCents,
      performanceBonusCents,
      penaltyCents,
      totalEarningsCents: Math.max(0, totalEarningsCents),
      breakdown: {
        base: baseEarnings,
        distance: distanceBonusCents,
        peak: peakBonusCents,
        hotspot: hotspotBonusCents,
        performance: performanceBonusCents,
        penalty: -penaltyCents,
      },
    };
  } catch (error) {
    console.error('Error calculating trip earnings:', error);
    return calculateWithDefaults(input);
  }
}

/**
 * Recalculate weekly stats and bonuses for a driver
 */
export async function recalculateWeeklyStatsAndBonuses(
  input: WeeklyStatsInput
): Promise<WeeklyStatsResult> {
  try {
    // Get all trips for the week
    const { data: trips, error: tripsError } = await supabase
      .from('driver_trips')
      .select('*')
      .eq('driver_id', input.driverId)
      .gte('trip_start_time', input.weekStartDate.toISOString())
      .lte('trip_end_time', input.weekEndDate.toISOString());

    if (tripsError) {
      throw new Error(`Failed to fetch trips: ${tripsError.message}`);
    }

    const tripsList = trips || [];
    const totalTrips = tripsList.length;

    // Calculate total earnings from trips
    let totalEarningsCents = 0;
    let totalHours = 0;
    let bonusesEarnedCents = 0;
    let penaltiesAppliedCents = 0;

    for (const trip of tripsList) {
      // Get earnings for this trip
      const { data: earnings } = await supabase
        .from('driver_earnings')
        .select('total_cents, penalty_cents')
        .eq('trip_id', trip.id)
        .single();

      if (earnings) {
        totalEarningsCents += earnings.total_cents || 0;
        penaltiesAppliedCents += Math.abs(earnings.penalty_cents || 0);
      }

      // Calculate hours worked
      if (trip.trip_start_time && trip.trip_end_time) {
        const start = new Date(trip.trip_start_time);
        const end = new Date(trip.trip_end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    }

    // Get weekly bonuses
    const { data: bonuses } = await supabase
      .from('driver_bonuses')
      .select('amount_cents')
      .eq('driver_id', input.driverId)
      .gte('bonus_date', input.weekStartDate.toISOString().split('T')[0])
      .lte('bonus_date', input.weekEndDate.toISOString().split('T')[0])
      .eq('status', 'approved');

    bonusesEarnedCents =
      bonuses?.reduce((sum, b) => sum + (b.amount_cents || 0), 0) || 0;

    const avgEarningsPerHour =
      totalHours > 0 ? totalEarningsCents / totalHours : 0;
    const avgEarningsPerTrip =
      totalTrips > 0 ? totalEarningsCents / totalTrips : 0;
    const netEarningsCents = totalEarningsCents + bonusesEarnedCents - penaltiesAppliedCents;

    // Update or insert weekly stats
    const { error: statsError } = await supabase
      .from('driver_weekly_stats')
      .upsert(
        {
          driver_id: input.driverId,
          week_start_date: input.weekStartDate.toISOString().split('T')[0],
          week_end_date: input.weekEndDate.toISOString().split('T')[0],
          total_trips: totalTrips,
          total_earnings_cents: totalEarningsCents,
          total_hours: totalHours,
          avg_earnings_per_hour: avgEarningsPerHour,
          avg_earnings_per_trip: avgEarningsPerTrip,
          bonuses_earned_cents: bonusesEarnedCents,
          penalties_applied_cents: penaltiesAppliedCents,
          net_earnings_cents: netEarningsCents,
          calculated_at: new Date().toISOString(),
        },
        {
          onConflict: 'driver_id,week_start_date',
        }
      );

    if (statsError) {
      console.error('Error saving weekly stats:', statsError);
    }

    return {
      totalTrips,
      totalEarningsCents,
      totalHours,
      avgEarningsPerHour,
      avgEarningsPerTrip,
      bonusesEarnedCents,
      penaltiesAppliedCents,
      netEarningsCents,
    };
  } catch (error) {
    console.error('Error recalculating weekly stats:', error);
    throw error;
  }
}

/**
 * Calculate driver score based on performance metrics
 */
export async function calculateDriverScore(driverId: string): Promise<number> {
  try {
    // Get driver performance metrics
    const { data: metrics } = await supabase
      .from('driver_scores')
      .select('*')
      .eq('driver_id', driverId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (metrics) {
      return metrics.overall_score || 0;
    }

    // Calculate from scratch if no score exists
    const { data: trips } = await supabase
      .from('driver_trips')
      .select('on_time, completed, acceptance_rate')
      .eq('driver_id', driverId)
      .limit(100); // Last 100 trips

    if (!trips || trips.length === 0) {
      return 50; // Default score for new drivers
    }

    const onTimeRate =
      trips.filter((t) => t.on_time).length / trips.length;
    const completionRate =
      trips.filter((t) => t.completed).length / trips.length;
    const avgAcceptanceRate =
      trips.reduce((sum, t) => sum + (t.acceptance_rate || 0), 0) /
      trips.length;

    // Weighted score calculation
    const score =
      onTimeRate * 0.4 + completionRate * 0.3 + avgAcceptanceRate * 0.3;
    const normalizedScore = Math.round(score * 100);

    // Save score
    await supabase.from('driver_scores').upsert({
      driver_id: driverId,
      overall_score: normalizedScore,
      on_time_rate: onTimeRate,
      completion_rate: completionRate,
      acceptance_rate: avgAcceptanceRate,
      calculated_at: new Date().toISOString(),
    });

    return normalizedScore;
  } catch (error) {
    console.error('Error calculating driver score:', error);
    return 50; // Default score
  }
}

// Helper functions

function calculateWithDefaults(input: TripEarningsInput): TripEarningsResult {
  const baseEarnings = Math.max(
    Math.round(input.deliveryFeeCents * 0.7),
    200
  );
  return {
    baseEarningsCents: baseEarnings,
    distanceBonusCents: 0,
    peakMultiplier: 1,
    peakBonusCents: 0,
    hotspotBonusCents: 0,
    performanceBonusCents: 0,
    penaltyCents: 0,
    totalEarningsCents: baseEarnings,
    breakdown: {
      base: baseEarnings,
      distance: 0,
      peak: 0,
      hotspot: 0,
      performance: 0,
      penalty: 0,
    },
  };
}

function calculateDistanceBonus(
  distanceMiles: number,
  config: any
): number {
  if (!config.distance_bonus_enabled) return 0;

  const baseBonus = config.distance_bonus_base_cents || 0;
  const perMileBonus = config.distance_bonus_per_mile_cents || 0;
  const maxDistance = config.distance_bonus_max_miles || 10;

  const applicableDistance = Math.min(distanceMiles, maxDistance);
  return baseBonus + Math.round(applicableDistance * perMileBonus);
}

async function getPeakMultiplier(
  tripTime: Date,
  zone: string,
  config: any
): Promise<number> {
  try {
    const { data: peakRules } = await supabase
      .from('peak_rules')
      .select('*')
      .eq('is_active', true)
      .eq('zone', zone)
      .lte('start_time', tripTime.toTimeString().slice(0, 5))
      .gte('end_time', tripTime.toTimeString().slice(0, 5));

    if (peakRules && peakRules.length > 0) {
      return peakRules[0].multiplier || 1;
    }

    // Check day of week
    const dayOfWeek = tripTime.getDay();
    const { data: dayRules } = await supabase
      .from('peak_rules')
      .select('*')
      .eq('is_active', true)
      .eq('day_of_week', dayOfWeek)
      .lte('start_time', tripTime.toTimeString().slice(0, 5))
      .gte('end_time', tripTime.toTimeString().slice(0, 5));

    if (dayRules && dayRules.length > 0) {
      return dayRules[0].multiplier || 1;
    }

    return 1; // No peak multiplier
  } catch (error) {
    console.error('Error getting peak multiplier:', error);
    return 1;
  }
}

function calculatePerformanceBonus(
  driverScore: number,
  baseEarnings: number,
  config: any
): number {
  if (!config.performance_bonus_enabled || driverScore < 80) return 0;

  const bonusPercentage = config.performance_bonus_percentage || 0;
  if (driverScore >= 95) {
    return Math.round(baseEarnings * (bonusPercentage / 100));
  } else if (driverScore >= 90) {
    return Math.round(baseEarnings * (bonusPercentage * 0.75 / 100));
  } else if (driverScore >= 85) {
    return Math.round(baseEarnings * (bonusPercentage * 0.5 / 100));
  } else if (driverScore >= 80) {
    return Math.round(baseEarnings * (bonusPercentage * 0.25 / 100));
  }

  return 0;
}



