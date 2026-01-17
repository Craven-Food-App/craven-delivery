import { FlowExecutive } from '@/types/executiveDocuments';

export type PacketId = 'P1_PREINC' | 'P2_BOARD' | 'P3_OFFICER_CORE' | 'P4_EQUITY';

export interface DocumentFlowNode {
  type: string;
  title: string;
  packetId: PacketId;
  signingStage: number;
  signingOrder: number;
  dependsOn?: string;
  requiredSigners: string[];
  appliesTo: (exec: FlowExecutive) => boolean;
}

export const PACKET_LABELS: Record<PacketId, string> = {
  P1_PREINC: 'Stage 1 • Pre-Incorporation',
  P2_BOARD: 'Stage 2 • Appointment & Authority',
  P3_OFFICER_CORE: 'Stage 3 • Employment & Core Agreements',
  P4_EQUITY: 'Stage 4 • Equity & Compensation',
};

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const isDeferred = (exec: FlowExecutive): boolean => {
  if (exec.defer_salary) return true;
  const status = exec.salary_status?.toLowerCase();
  return status === 'deferred' || status === 'pending_funding';
};

const hasEquity = (exec: FlowExecutive): boolean => {
  const equityPercent = parseNumber(exec.equity_percent ?? exec.equityPercent);
  const shares = parseNumber(exec.shares_issued ?? exec.share_count ?? exec.sharesIssued);
  return equityPercent > 0 || shares > 0;
};

const hasFundingTrigger = (exec: FlowExecutive): boolean => {
  const triggerValue = exec.funding_trigger ?? exec.fundingTrigger;
  if (triggerValue == null) return false;
  const numeric = parseNumber(triggerValue);
  return numeric > 0;
};

export const DOCUMENT_FLOW: DocumentFlowNode[] = [
  {
    type: 'pre_incorporation_consent',
    title: 'Pre-Incorporation Consent (Conditional Appointments)',
    packetId: 'P1_PREINC',
    signingStage: 1,
    signingOrder: 1,
    requiredSigners: ['incorporator', 'officer'], // Include 'officer' so executive signature is required
    appliesTo: (exec) => exec.role === 'ceo' && exec.incorporation_status !== 'incorporated',
  },
  {
    type: 'board_resolution',
    title: 'Board Resolution – Appointment of Officers',
    packetId: 'P2_BOARD',
    signingStage: 2,
    signingOrder: 1,
    dependsOn: 'pre_incorporation_consent',
    requiredSigners: ['board'],
    appliesTo: (exec) => exec.incorporation_status !== 'pre_incorporation',
  },
  {
    type: 'bylaws_officers_excerpt',
    title: 'Bylaws – Officers (Excerpt)',
    packetId: 'P2_BOARD',
    signingStage: 2,
    signingOrder: 2,
    dependsOn: 'board_resolution',
    requiredSigners: ['board', 'officer'], // Include 'officer' so executive signature is required
    appliesTo: () => true,
  },
  {
    type: 'offer_letter',
    title: 'Executive Offer Letter',
    packetId: 'P3_OFFICER_CORE',
    signingStage: 3,
    signingOrder: 1,
    dependsOn: 'board_resolution',
    requiredSigners: ['officer'],
    appliesTo: () => true,
  },
  {
    type: 'confidentiality_ip',
    title: 'Confidentiality & IP Assignment Agreement',
    packetId: 'P3_OFFICER_CORE',
    signingStage: 3,
    signingOrder: 2,
    dependsOn: 'board_resolution',
    requiredSigners: ['officer', 'board'],
    appliesTo: () => true,
  },
  {
    type: 'employment_agreement',
    title: 'Executive Employment Agreement',
    packetId: 'P3_OFFICER_CORE',
    signingStage: 3,
    signingOrder: 3,
    dependsOn: 'confidentiality_ip',
    requiredSigners: ['officer', 'board'],
    appliesTo: () => true,
  },
  {
    type: 'deferred_comp_addendum',
    title: 'Deferred Compensation Addendum',
    packetId: 'P4_EQUITY',
    signingStage: 4,
    signingOrder: 1,
    dependsOn: 'employment_agreement',
    requiredSigners: ['officer', 'board'],
    appliesTo: (exec) => isDeferred(exec) || hasFundingTrigger(exec),
  },
  {
    type: 'stock_issuance',
    title: 'Stock Subscription/Issuance Agreement',
    packetId: 'P4_EQUITY',
    signingStage: 4,
    signingOrder: 2,
    dependsOn: 'employment_agreement',
    requiredSigners: ['officer', 'board'],
    appliesTo: (exec) => hasEquity(exec),
  },
  {
    type: 'founders_agreement',
    title: "Founders' Agreement",
    packetId: 'P4_EQUITY',
    signingStage: 4,
    signingOrder: 3,
    dependsOn: 'stock_issuance',
    requiredSigners: ['founder', 'officer'],
    appliesTo: (exec) => hasEquity(exec) && (exec.role === 'ceo' || exec.full_name?.toLowerCase().includes('torrance')),
  },
  {
    type: 'shareholders_agreement',
    title: "Shareholders' Agreement",
    packetId: 'P4_EQUITY',
    signingStage: 4,
    signingOrder: 4,
    dependsOn: 'stock_issuance',
    requiredSigners: ['shareholder', 'officer'],
    appliesTo: (exec) => hasEquity(exec) && exec.role !== 'ceo' && !exec.full_name?.toLowerCase().includes('torrance'),
  },
];

export const stageComparator = (a: DocumentFlowNode, b: DocumentFlowNode) => {
  if (a.signingStage !== b.signingStage) {
    return a.signingStage - b.signingStage;
  }
  if (a.signingOrder !== b.signingOrder) {
    return a.signingOrder - b.signingOrder;
  }
  return a.title.localeCompare(b.title);
};

export const getExpectedNodesForExecutive = (exec: FlowExecutive): DocumentFlowNode[] =>
  DOCUMENT_FLOW.filter((node) => node.appliesTo(exec)).sort(stageComparator);
