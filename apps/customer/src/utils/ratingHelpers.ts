/**
 * Crave'N Feeder Tier System (Customer App)
 * 5-tier hierarchy: Feeder → Gold → Platinum → Diamond → Ultimate
 * Rolling 60-day evaluation window
 */

export const RATING_COLORS = {
  PLATINUM: '#C0C0C0',
  GOLD: '#D4AF37',
  SILVER: '#C0C0C0',
  BRONZE: '#FFFFFF',
};

export const RATING_TIERS = {
  ELITE: { min: 4.95, color: '#000000', name: 'Ultimate', icon: '👑' },
  PRO: { min: 4.90, color: '#1E3A5F', name: 'Diamond', icon: '💎' },
  RISING: { min: 4.70, color: '#D4AF37', name: 'Gold', icon: '🥇' },
  NEW: { min: 0, color: '#FFFFFF', name: 'Feeder', icon: '🍽️' },
};

export function getRatingColor(rating: number): string {
  if (rating >= 4.95) return '#000000';
  if (rating >= 4.90) return '#1E3A5F';
  if (rating >= 4.80) return '#C0C0C0';
  if (rating >= 4.70) return '#D4AF37';
  return '#FFFFFF';
}

export function getRatingTier(rating: number, deliveries: number = 0) {
  if (rating >= 4.95 && deliveries >= 1000) return RATING_TIERS.ELITE;
  if (rating >= 4.80 && deliveries >= 200) return RATING_TIERS.PRO;
  if (rating >= 4.70 && deliveries >= 50) return RATING_TIERS.RISING;
  return RATING_TIERS.NEW;
}

export function getRatingTextColor(rating: number): string {
  const color = getRatingColor(rating);
  if (color === '#000000') return '#E8622A'; // Orange for Ultimate
  if (color === '#1E3A5F') return '#1E3A5F';
  if (color === '#C0C0C0') return '#808080';
  if (color === '#D4AF37') return '#B8860B';
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
