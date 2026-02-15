/**
 * Crave'N Feeder Tier System
 * 5-tier hierarchy: Feeder → Gold → Platinum → Diamond → Ultimate
 * Rolling 60-day evaluation window
 *
 * CANONICAL V2 TIER VALUES (tier_status_v2):
 *   FEEDER_PROBATIONARY | GOLD | PLATINUM | DIAMOND | ULTIMATE
 *
 * DISPLAY LABELS:
 *   Feeder | Gold Feeder | Platinum Feeder | Diamond Feeder | Ultimate Feeder
 */

export const TIER_COLORS = {
  FEEDER: '#FFFFFF',    // Neutral white
  GOLD: '#D4AF37',      // Gold gradient base
  PLATINUM: '#C0C0C0',  // Silver-white
  DIAMOND: '#1E3A5F',   // Deep blue
  ULTIMATE: '#000000',  // Black with orange trim
};

export const TIER_BADGE_STYLES = {
  FEEDER:   { bg: '#FFFFFF', text: '#666666', border: '#E0E0E0' },
  GOLD:     { bg: 'linear-gradient(135deg, #D4AF37, #F5D060)', text: '#5C4A00', border: '#D4AF37' },
  PLATINUM: { bg: 'linear-gradient(135deg, #E8E8E8, #FFFFFF, #C0C0C0)', text: '#555555', border: '#B0B0B0' },
  DIAMOND:  { bg: 'linear-gradient(135deg, #1E3A5F, #3A7BD5)', text: '#FFFFFF', border: '#1E3A5F' },
  ULTIMATE: { bg: 'linear-gradient(135deg, #000000, #1A1A1A)', text: '#E8622A', border: '#E8622A' },
};

export type FeederTierName = 'Feeder' | 'Gold' | 'Platinum' | 'Diamond' | 'Ultimate';

export interface TierRequirements {
  name: FeederTierName;
  minDeliveries: number;
  minRating: number;
  minCompletionRate: number;
  minOnTimeRate: number;
  maxCancellationRate: number;
  requiresNoFraud: boolean;
  requiresAdminApproval: boolean;
  dispatchWeight: number;
  icon: string;
  color: string;
}

export const FEEDER_TIERS: TierRequirements[] = [
  {
    name: 'Ultimate',
    minDeliveries: 1000,
    minRating: 4.95,
    minCompletionRate: 98,
    minOnTimeRate: 97,
    maxCancellationRate: 3,
    requiresNoFraud: true,
    requiresAdminApproval: true,
    dispatchWeight: 30,
    icon: '👑',
    color: TIER_COLORS.ULTIMATE,
  },
  {
    name: 'Diamond',
    minDeliveries: 500,
    minRating: 4.90,
    minCompletionRate: 97,
    minOnTimeRate: 95,
    maxCancellationRate: 5,
    requiresNoFraud: true,
    requiresAdminApproval: false,
    dispatchWeight: 18,
    icon: '💎',
    color: TIER_COLORS.DIAMOND,
  },
  {
    name: 'Platinum',
    minDeliveries: 200,
    minRating: 4.80,
    minCompletionRate: 95,
    minOnTimeRate: 93,
    maxCancellationRate: 7,
    requiresNoFraud: false,
    requiresAdminApproval: false,
    dispatchWeight: 10,
    icon: '⚪',
    color: TIER_COLORS.PLATINUM,
  },
  {
    name: 'Gold',
    minDeliveries: 50,
    minRating: 4.70,
    minCompletionRate: 90,
    minOnTimeRate: 90,
    maxCancellationRate: 10,
    requiresNoFraud: false,
    requiresAdminApproval: false,
    dispatchWeight: 5,
    icon: '🥇',
    color: TIER_COLORS.GOLD,
  },
  {
    name: 'Feeder',
    minDeliveries: 0,
    minRating: 0,
    minCompletionRate: 0,
    minOnTimeRate: 0,
    maxCancellationRate: 100,
    requiresNoFraud: false,
    requiresAdminApproval: false,
    dispatchWeight: 0,
    icon: '🍽️',
    color: TIER_COLORS.FEEDER,
  },
];

/** Kept for backward compat — maps old names */
export const RATING_COLORS = {
  PLATINUM: TIER_COLORS.PLATINUM,
  GOLD: TIER_COLORS.GOLD,
  SILVER: TIER_COLORS.PLATINUM,
  BRONZE: TIER_COLORS.FEEDER,
};

export const RATING_TIERS = {
  ELITE:  { min: 4.95, color: TIER_COLORS.ULTIMATE, name: 'Ultimate', icon: '👑' },
  PRO:    { min: 4.80, color: TIER_COLORS.DIAMOND, name: 'Diamond', icon: '💎' },
  RISING: { min: 4.70, color: TIER_COLORS.GOLD, name: 'Gold', icon: '🥇' },
  NEW:    { min: 0,    color: TIER_COLORS.FEEDER, name: 'Feeder', icon: '🍽️' },
};

export function getRatingColor(rating: number): string {
  if (rating >= 4.95) return TIER_COLORS.ULTIMATE;
  if (rating >= 4.90) return TIER_COLORS.DIAMOND;
  if (rating >= 4.80) return TIER_COLORS.PLATINUM;
  if (rating >= 4.70) return TIER_COLORS.GOLD;
  return TIER_COLORS.FEEDER;
}

export function getRatingTier(rating: number, deliveries: number = 0) {
  if (rating >= 4.95 && deliveries >= 1000) return RATING_TIERS.ELITE;
  if (rating >= 4.80 && deliveries >= 200) return RATING_TIERS.PRO;
  if (rating >= 4.70 && deliveries >= 50) return RATING_TIERS.RISING;
  return RATING_TIERS.NEW;
}

export function getRatingTextColor(rating: number): string {
  const color = getRatingColor(rating);
  if (color === TIER_COLORS.ULTIMATE) return '#E8622A'; // Orange for Ultimate
  if (color === TIER_COLORS.DIAMOND) return '#1E3A5F';
  if (color === TIER_COLORS.PLATINUM) return '#808080';
  if (color === TIER_COLORS.GOLD) return '#B8860B';
  return '#666666';
}

export function formatRating(rating: number): string {
  return rating.toFixed(2);
}

export function getRatingPercentage(rating: number): number {
  return (rating / 5) * 100;
}

export function getTrendIcon(trend: number): string {
  if (trend > 0.05) return '↑↑';
  if (trend > 0) return '↑';
  if (trend < -0.05) return '↓↓';
  if (trend < 0) return '↓';
  return '→';
}

export function getTrendColor(trend: number): string {
  if (trend > 0) return '#10b981';
  if (trend < 0) return '#ef4444';
  return '#6b7280';
}

/**
 * Evaluate which tier a feeder qualifies for based on rolling 60-day metrics.
 */
export function evaluateFeederTier(metrics: {
  totalDeliveries: number;
  averageRating: number;
  completionRate: number;
  onTimeRate: number;
  cancellationRate: number;
  hasFraudFlag: boolean;
  hasAdminApproval?: boolean;
}): FeederTierName {
  for (const tier of FEEDER_TIERS) {
    if (
      metrics.totalDeliveries >= tier.minDeliveries &&
      metrics.averageRating >= tier.minRating &&
      metrics.completionRate >= tier.minCompletionRate &&
      metrics.onTimeRate >= tier.minOnTimeRate &&
      metrics.cancellationRate <= tier.maxCancellationRate &&
      (!tier.requiresNoFraud || !metrics.hasFraudFlag) &&
      (!tier.requiresAdminApproval || metrics.hasAdminApproval)
    ) {
      return tier.name;
    }
  }
  return 'Feeder';
}

// ─── CANONICAL V2 TIER SYSTEM ───────────────────────────────────────────────

export type TierStatusV2 = 'FEEDER_PROBATIONARY' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'ULTIMATE';

/** Map internal tier name → canonical V2 enum value */
export const TIER_TO_V2: Record<FeederTierName, TierStatusV2> = {
  Feeder:   'FEEDER_PROBATIONARY',
  Gold:     'GOLD',
  Platinum: 'PLATINUM',
  Diamond:  'DIAMOND',
  Ultimate: 'ULTIMATE',
};

/** Map canonical V2 enum → internal tier name */
export const V2_TO_TIER: Record<TierStatusV2, FeederTierName> = {
  FEEDER_PROBATIONARY: 'Feeder',
  GOLD:     'Gold',
  PLATINUM: 'Platinum',
  DIAMOND:  'Diamond',
  ULTIMATE: 'Ultimate',
};

/** Map canonical V2 enum → display label */
export const V2_DISPLAY_LABELS: Record<TierStatusV2, string> = {
  FEEDER_PROBATIONARY: 'Feeder',
  GOLD:     'Gold Feeder',
  PLATINUM: 'Platinum Feeder',
  DIAMOND:  'Diamond Feeder',
  ULTIMATE: 'Ultimate Feeder',
};

/** Get display label from internal tier name */
export function getTierDisplayLabel(tier: FeederTierName): string {
  return V2_DISPLAY_LABELS[TIER_TO_V2[tier]];
}

/** Convert V2 status to internal tier name */
export function v2ToTierName(v2: TierStatusV2): FeederTierName {
  return V2_TO_TIER[v2];
}

/** Convert internal tier name to V2 status */
export function tierNameToV2(tier: FeederTierName): TierStatusV2 {
  return TIER_TO_V2[tier];
}

/**
 * Get the next tier above the current one, or null if already Ultimate.
 */
export function getNextTier(currentTier: FeederTierName): TierRequirements | null {
  const idx = FEEDER_TIERS.findIndex(t => t.name === currentTier);
  if (idx <= 0) return null; // Already Ultimate or not found
  return FEEDER_TIERS[idx - 1];
}

/**
 * Get dispatch weight for a given tier.
 */
export function getDispatchWeight(tier: FeederTierName): number {
  return FEEDER_TIERS.find(t => t.name === tier)?.dispatchWeight ?? 0;
}

export const COMPLIMENT_OPTIONS = [
  { id: 'fast', label: 'Super Fast', icon: '⚡' },
  { id: 'friendly', label: 'Friendly', icon: '😊' },
  { id: 'professional', label: 'Professional', icon: '👔' },
  { id: 'careful', label: 'Careful with Food', icon: '🍱' },
  { id: 'communicative', label: 'Great Communication', icon: '💬' },
  { id: 'clean', label: 'Clean Vehicle', icon: '✨' },
  { id: 'polite', label: 'Very Polite', icon: '🙏' },
  { id: 'follows_instructions', label: 'Follows Instructions', icon: '📝' },
];
