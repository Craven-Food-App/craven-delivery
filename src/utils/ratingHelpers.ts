/**
 * Driver Rating Utilities
 * Custom color scheme: Platinum, Gold, Silver, Bronze
 */

export const RATING_COLORS = {
  PLATINUM: '#E5E4E2', // 4.8-5.0
  GOLD: '#D4AF37',     // 4.5-4.79
  SILVER: '#C0C0C0',   // 4.0-4.49
  BRONZE: '#CD7F32',   // <4.0
};

export const RATING_TIERS = {
  ELITE: { min: 4.8, color: RATING_COLORS.PLATINUM, name: 'Elite', icon: '💎' },
  PRO: { min: 4.5, color: RATING_COLORS.GOLD, name: 'Pro', icon: '🥇' },
  RISING: { min: 4.0, color: RATING_COLORS.SILVER, name: 'Rising Star', icon: '🥈' },
  NEW: { min: 0, color: RATING_COLORS.BRONZE, name: 'New Driver', icon: '🥉' },
};

export function getRatingColor(rating: number): string {
  if (rating >= 4.8) return RATING_COLORS.PLATINUM;
  if (rating >= 4.5) return RATING_COLORS.GOLD;
  if (rating >= 4.0) return RATING_COLORS.SILVER;
  return RATING_COLORS.BRONZE;
}

export function getRatingTier(rating: number, deliveries: number = 0) {
  if (rating >= 4.8 && deliveries >= 100) return RATING_TIERS.ELITE;
  if (rating >= 4.5 && deliveries >= 50) return RATING_TIERS.PRO;
  if (rating >= 4.0 && deliveries >= 20) return RATING_TIERS.RISING;
  return RATING_TIERS.NEW;
}

export function getRatingTextColor(rating: number): string {
  const color = getRatingColor(rating);
  // Return darker version for text
  if (color === RATING_COLORS.PLATINUM) return '#9CA3AF'; // Gray for contrast
  if (color === RATING_COLORS.GOLD) return '#B8860B'; // Dark goldenrod
  if (color === RATING_COLORS.SILVER) return '#808080'; // Gray
  return '#8B4513'; // Saddle brown
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
  if (trend > 0) return '#10b981'; // Green
  if (trend < 0) return '#ef4444'; // Red
  return '#6b7280'; // Gray
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

