export type MarketTier = {
  tier: "A" | "B" | "C" | "D";
  populationMin: number;
  populationMax: number;
  avgOrdersPerDay: number;
  avgOrderValue: number;
  label: string;
};

export const MARKET_TIERS: MarketTier[] = [
  {
    tier: "A", // Major metros (Detroit, Chicago)
    populationMin: 1500000,
    populationMax: Infinity,
    avgOrdersPerDay: 22,
    avgOrderValue: 34,
    label: "Major Metro",
  },
  {
    tier: "B", // Mid metros (Toledo, Akron, Lansing)
    populationMin: 400000,
    populationMax: 1499999,
    avgOrdersPerDay: 14,
    avgOrderValue: 31,
    label: "Mid-Size Metro",
  },
  {
    tier: "C", // Small cities
    populationMin: 150000,
    populationMax: 399999,
    avgOrdersPerDay: 9,
    avgOrderValue: 28,
    label: "Small City",
  },
  {
    tier: "D", // Rural
    populationMin: 0,
    populationMax: 149999,
    avgOrdersPerDay: 5,
    avgOrderValue: 26,
    label: "Small Town",
  },
];

const OPERATING_DAYS_PER_YEAR = 360;
const LOW_UTILIZATION_MULTIPLIER = 0.7;
const HIGH_UTILIZATION_MULTIPLIER = 1.2;
const PUBLIC_LOW_MULTIPLIER = 0.5; // Conservative public-facing estimate
const PUBLIC_HIGH_MULTIPLIER = 0.4;

export interface EarningsEstimate {
  tier: MarketTier;
  lowEstimate: number;
  highEstimate: number;
  city?: string;
  state?: string;
}

export function getMarketTierByPopulation(population: number): MarketTier | null {
  return (
    MARKET_TIERS.find(
      (t) => population >= t.populationMin && population <= t.populationMax
    ) || null
  );
}

export function calculateEarnings(population: number, city?: string, state?: string): EarningsEstimate | null {
  const tier = getMarketTierByPopulation(population);
  
  if (!tier) {
    return null;
  }

  const baseAnnual =
    tier.avgOrdersPerDay * tier.avgOrderValue * OPERATING_DAYS_PER_YEAR;

  // Internal calculations
  const internalLow = baseAnnual * LOW_UTILIZATION_MULTIPLIER;
  const internalHigh = baseAnnual * HIGH_UTILIZATION_MULTIPLIER;

  // Public-facing conservative estimates (rounded to nearest thousand)
  const publicLow = Math.round((internalLow * PUBLIC_LOW_MULTIPLIER) / 1000) * 1000;
  const publicHigh = Math.round((internalHigh * PUBLIC_HIGH_MULTIPLIER) / 1000) * 1000;

  return {
    tier,
    lowEstimate: Math.max(publicLow, 25000), // Minimum $25k
    highEstimate: Math.max(publicHigh, 50000), // Minimum $50k
    city,
    state,
  };
}

export function formatEarningsRange(estimate: EarningsEstimate): string {
  return `$${estimate.lowEstimate.toLocaleString()} – $${estimate.highEstimate.toLocaleString()}`;
}


