/** CPO deal pipeline — shared labels and onboarding steps */

export const PIPELINE_STAGES = [
  { value: 'lead', label: 'Lead', color: 'gray' },
  { value: 'contacted', label: 'Contacted', color: 'blue' },
  { value: 'in_talks', label: 'In Talks', color: 'cyan' },
  { value: 'negotiating', label: 'Negotiating', color: 'yellow' },
  { value: 'verbal_agreement', label: 'Verbal Agreement', color: 'orange' },
  { value: 'signed', label: 'Signed', color: 'green' },
  { value: 'lost', label: 'Lost', color: 'red' },
] as const;

export const PIPELINE_STAGE_VALUES = PIPELINE_STAGES.map((s) => s.value) as string[];

export const PARTNER_TYPES: { value: string; label: string }[] = [
  { value: 'strategic_distribution', label: 'Strategic Distribution' },
  { value: 'demand', label: 'Demand' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'restaurant_merchant', label: 'Restaurant / Merchant (legacy)' },
  { value: 'strategic_corporate', label: 'Strategic / Corporate (legacy)' },
  { value: 'technology_integration', label: 'Technology / Integration (legacy)' },
  { value: 'revenue_share', label: 'Revenue Share (legacy)' },
  { value: 'co_marketing', label: 'Co-Marketing (legacy)' },
  { value: 'vendor', label: 'Vendor (legacy)' },
  { value: 'other', label: 'Other' },
];

export function partnerTypeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return PARTNER_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const ONBOARDING_DEFAULT_STEPS = [
  'NDA Signed',
  'Contract Executed',
  'Integration Setup',
  'Technical Onboarding',
  'First Order / Transaction',
  'Marketing Materials Shared',
  'Training Completed',
  'Go-Live Confirmed',
];

export const DEAL_TYPE_OPTIONS = [
  { value: 'exclusive', label: 'Exclusive' },
  { value: 'pilot', label: 'Pilot' },
  { value: 'rollout', label: 'Rollout' },
  { value: 'nda_only', label: 'NDA / exploratory' },
  { value: 'other', label: 'Other' },
];

/** When a deal is closed / lost — reason codes for CRM, export, and re-engagement. */
export const PARTNERSHIP_DISPOSITIONS = [
  { value: 'not_interested', label: 'Not interested' },
  { value: 'not_now', label: 'Not now (timing)' },
  { value: 'competitor', label: 'Lost to competitor' },
  { value: 'pricing', label: 'Pricing / economics' },
  { value: 'no_fit', label: 'No fit / wrong ICP' },
  { value: 'no_response', label: 'No response / ghosted' },
  { value: 'other', label: 'Other' },
] as const;

export const PARTNERSHIP_DISPOSITION_VALUES = PARTNERSHIP_DISPOSITIONS.map((d) => d.value) as string[];

export function dispositionLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return PARTNERSHIP_DISPOSITIONS.find((d) => d.value === value)?.label ?? value;
}
