/**
 * Feeder Tier Rating Utilities
 * 5-tier system: Feeder, Gold, Platinum, Diamond, Ultimate
 */

import { RatingTier } from '@/types/diamond-orders';

export const TIER_COLORS: Record<string, string> = {
  Feeder: '#F5F5F5',
  Gold: '#D4AF37',
  Platinum: '#E5E4E2',
  Diamond: '#1E3A5F',
  Ultimate: '#1A1A1A',
};

export const TIER_TEXT_COLORS: Record<string, string> = {
  Feeder: '#777777',
  Gold: '#B8860B',
  Platinum: '#808080',
  Diamond: '#FFFFFF',
  Ultimate: '#F57C00',
};

export const TIER_CONFIG: Record<string, {
  name: string;
  color: string;
  textColor: string;
  borderColor?: string;
  dispatchWeight: number;
  minDeliveries: number;
  minRating: number;
  minCompletion: number;
  minOnTime: number;
  maxCancel: number;
}> = {
  Feeder: {
    name: 'Feeder',
    color: '#F5F5F5',
    textColor: '#777777',
    dispatchWeight: 0,
    minDeliveries: 0,
    minRating: 0,
    minCompletion: 0,
    minOnTime: 0,
    maxCancel: 100,
  },
  Gold: {
    name: 'Gold Feeder',
    color: '#D4AF37',
    textColor: '#B8860B',
    dispatchWeight: 5,
    minDeliveries: 50,
    minRating: 4.70,
    minCompletion: 90,
    minOnTime: 90,
    maxCancel: 10,
  },
  Platinum: {
    name: 'Platinum Feeder',
    color: '#E5E4E2',
    textColor: '#808080',
    dispatchWeight: 10,
    minDeliveries: 200,
    minRating: 4.80,
    minCompletion: 95,
    minOnTime: 93,
    maxCancel: 7,
  },
  Diamond: {
    name: 'Diamond Feeder',
    color: '#1E3A5F',
    textColor: '#FFFFFF',
    dispatchWeight: 18,
    minDeliveries: 500,
    minRating: 4.90,
    minCompletion: 97,
    minOnTime: 95,
    maxCancel: 5,
  },
  Ultimate: {
    name: 'Ultimate Feeder',
    color: '#1A1A1A',
    textColor: '#F57C00',
    borderColor: '#F57C00',
    dispatchWeight: 30,
    minDeliveries: 1000,
    minRating: 4.95,
    minCompletion: 98,
    minOnTime: 97,
    maxCancel: 3,
  },
};

export const TIER_ORDER: RatingTier[] = ['Feeder', 'Gold', 'Platinum', 'Diamond', 'Ultimate'];

export function getTierConfig(tier: RatingTier) {
  return TIER_CONFIG[tier] || TIER_CONFIG.Feeder;
}

export function getNextTier(tier: RatingTier): RatingTier | null {
  const idx = TIER_ORDER.indexOf(tier);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

export function getTierColor(tier: RatingTier): string {
  return TIER_COLORS[tier] || TIER_COLORS.Feeder;
}

export function getTierTextColor(tier: RatingTier): string {
  return TIER_TEXT_COLORS[tier] || TIER_TEXT_COLORS.Feeder;
}

// Legacy helpers kept for backward compat
// Legacy getRatingTier for admin components
export function getRatingTier(rating: number, deliveries: number = 0) {
  if (rating >= 4.95 && deliveries >= 1000) return { name: 'Ultimate', color: TIER_COLORS.Ultimate, icon: '' };
  if (rating >= 4.90 && deliveries >= 500) return { name: 'Diamond', color: TIER_COLORS.Diamond, icon: '' };
  if (rating >= 4.80 && deliveries >= 200) return { name: 'Platinum', color: TIER_COLORS.Platinum, icon: '' };
  if (rating >= 4.70 && deliveries >= 50) return { name: 'Gold', color: TIER_COLORS.Gold, icon: '' };
  return { name: 'Feeder', color: TIER_COLORS.Feeder, icon: '' };
}

export function getRatingTextColor(rating: number): string {
  if (rating >= 4.95) return TIER_TEXT_COLORS.Ultimate;
  if (rating >= 4.90) return TIER_TEXT_COLORS.Diamond;
  if (rating >= 4.80) return TIER_TEXT_COLORS.Platinum;
  if (rating >= 4.70) return TIER_TEXT_COLORS.Gold;
  return TIER_TEXT_COLORS.Feeder;
}

export function getRatingColor(rating: number): string {
  if (rating >= 4.95) return TIER_COLORS.Ultimate;
  if (rating >= 4.90) return TIER_COLORS.Diamond;
  if (rating >= 4.80) return TIER_COLORS.Platinum;
  if (rating >= 4.70) return TIER_COLORS.Gold;
  return TIER_COLORS.Feeder;
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

export const TIER_PERKS: Record<string, string[]> = {
  Feeder: ['Standard orders only'],
  Gold: ['Early access to standard orders', '+5 dispatch priority'],
  Platinum: ['Premium merchant access', 'Early scheduling unlock', '+10 dispatch priority'],
  Diamond: ['Priority dispatch access', 'High-value retail access', 'Large order eligibility', '+18 dispatch priority'],
  Ultimate: ['Top dispatch priority', 'Catering & premium retail first access', 'Dedicated support queue', 'Beta feature access', 'Enhanced referral bonus', '+30 dispatch priority'],
};
