/**
 * Driver Rating Utilities (Customer App)
 * 5-tier system: Feeder, Gold, Platinum, Diamond, Ultimate
 */

export const RATING_COLORS = {
  FEEDER: '#F5F5F5',
  GOLD: '#D4AF37',
  PLATINUM: '#E5E4E2',
  DIAMOND: '#1E3A5F',
  ULTIMATE: '#1A1A1A',
};

export const RATING_TIERS = {
  ULTIMATE: { min: 4.95, color: RATING_COLORS.ULTIMATE, name: 'Ultimate', icon: '' },
  ELITE: { min: 4.90, color: RATING_COLORS.DIAMOND, name: 'Diamond', icon: '' },
  PRO: { min: 4.80, color: RATING_COLORS.PLATINUM, name: 'Platinum', icon: '' },
  RISING: { min: 4.70, color: RATING_COLORS.GOLD, name: 'Gold', icon: '' },
  NEW: { min: 0, color: RATING_COLORS.FEEDER, name: 'Feeder', icon: '' },
};

export function getRatingColor(rating: number): string {
  if (rating >= 4.95) return RATING_COLORS.ULTIMATE;
  if (rating >= 4.90) return RATING_COLORS.DIAMOND;
  if (rating >= 4.80) return RATING_COLORS.PLATINUM;
  if (rating >= 4.70) return RATING_COLORS.GOLD;
  return RATING_COLORS.FEEDER;
}

export function getRatingTier(rating: number, deliveries: number = 0) {
  if (rating >= 4.95 && deliveries >= 1000) return RATING_TIERS.ULTIMATE;
  if (rating >= 4.90 && deliveries >= 500) return RATING_TIERS.ELITE;
  if (rating >= 4.80 && deliveries >= 200) return RATING_TIERS.PRO;
  if (rating >= 4.70 && deliveries >= 50) return RATING_TIERS.RISING;
  return RATING_TIERS.NEW;
}

export function getRatingTextColor(rating: number): string {
  if (rating >= 4.95) return '#F57C00';
  if (rating >= 4.90) return '#FFFFFF';
  if (rating >= 4.80) return '#808080';
  if (rating >= 4.70) return '#B8860B';
  return '#777777';
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
