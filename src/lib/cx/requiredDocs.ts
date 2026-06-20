export type CXDocType =
  | 'commercial_auto'
  | 'general_liability'
  | 'workers_comp'
  | 'business_license'
  | 'articles'
  | 'w9'
  | 'dot_authority'
  | 'ein_letter';

export interface CXDocSpec {
  key: CXDocType;
  label: string;
  description: string;
  required: boolean;
  needsExpiration: boolean;
}

export const CX_REQUIRED_DOCS: CXDocSpec[] = [
  {
    key: 'commercial_auto',
    label: 'Commercial Auto Insurance Certificate',
    description: 'Current, unexpired COI — $1M minimum combined single limit.',
    required: true,
    needsExpiration: true,
  },
  {
    key: 'general_liability',
    label: 'General Liability Insurance Certificate',
    description: '$1M per occurrence / $2M aggregate minimum.',
    required: true,
    needsExpiration: true,
  },
  {
    key: 'workers_comp',
    label: "Workers' Comp Certificate",
    description: "Or signed exemption affidavit if state-permitted.",
    required: true,
    needsExpiration: true,
  },
  {
    key: 'business_license',
    label: 'Business License',
    description: 'State and/or city issued operating license.',
    required: true,
    needsExpiration: true,
  },
  {
    key: 'articles',
    label: 'Articles of Incorporation / Operating Agreement',
    description: 'Formation documents for your business entity.',
    required: true,
    needsExpiration: false,
  },
  {
    key: 'w9',
    label: 'W-9',
    description: 'Completed and signed within the last 12 months.',
    required: true,
    needsExpiration: false,
  },
  {
    key: 'ein_letter',
    label: 'EIN Verification Letter',
    description: 'IRS CP-575 or 147C letter.',
    required: true,
    needsExpiration: false,
  },
  {
    key: 'dot_authority',
    label: 'DOT / MC Authority',
    description: 'If your operation requires federal motor carrier authority.',
    required: false,
    needsExpiration: false,
  },
];