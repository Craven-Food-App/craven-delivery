/** CPO deal pipeline — shared labels and onboarding steps */

/** Kanban columns: left → right is deal progression; Lost is terminal. */
export const PIPELINE_STAGES = [
  {
    value: 'lead',
    label: 'Lead',
    color: 'gray',
    hint: 'Identified target — outreach not started yet.',
    emptyHint: 'Add a partner with New partner, or import a CSV.',
  },
  {
    value: 'contacted',
    label: 'Contacted',
    color: 'blue',
    hint: 'First touch made — awaiting reply or follow-up.',
    emptyHint: 'Advance a lead here once outreach has started.',
  },
  {
    value: 'in_talks',
    label: 'In Talks',
    color: 'cyan',
    hint: 'Active conversation — exploring fit, scope, and timing.',
    emptyHint: 'Move deals forward from Contacted when they’re engaged.',
  },
  {
    value: 'negotiating',
    label: 'Negotiating',
    color: 'yellow',
    hint: 'Terms in play — pricing, contract, or rollout details.',
    emptyHint: 'Advance when you’re past discovery and into deal mechanics.',
  },
  {
    value: 'verbal_agreement',
    label: 'Verbal Agreement',
    color: 'orange',
    hint: 'Yes in principle — paperwork or signature still pending.',
    emptyHint: 'Use when they’ve committed verbally, before it’s fully signed.',
  },
  {
    value: 'signed',
    label: 'Signed',
    color: 'green',
    hint: 'Agreement executed — onboarding or go-live next.',
    emptyHint: 'Advance deals here once the contract is signed.',
  },
  {
    value: 'lost',
    label: 'Lost',
    color: 'red',
    hint: 'Closed without a win — record disposition for reporting and follow-up.',
    emptyHint: 'Use Record closed on a deal, import closed rows, or review dispositions.',
  },
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
  { value: 'vendor', label: 'Vendor' },
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
