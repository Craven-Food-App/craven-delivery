import { FlowExecutive } from '@/types/executiveDocuments';

export type Fortune500PacketId = 
  | 'P1_PRE_LEGAL' 
  | 'P2_BOARD_AUTH' 
  | 'P3_EMPLOYMENT' 
  | 'P4_GOVERNANCE' 
  | 'P5_LIABILITY' 
  | 'P6_EQUITY' 
  | 'P7_COMPENSATION' 
  | 'P8_ACTIVATION';

export interface Fortune500Gate {
  gateNumber: number;
  documentType: string;
  title: string;
  packetId: Fortune500PacketId;
  stageName: string;
  departmentOwner: string;
  blockingGates: number[];
  requiredSigners: string[];
  appliesTo: (exec: FlowExecutive) => boolean;
  isHardStop: boolean;
}

export const FORTUNE500_PACKET_LABELS: Record<Fortune500PacketId, string> = {
  P1_PRE_LEGAL: 'Stage 1 • Executive Selection',
  P2_BOARD_AUTH: 'Stage 2 • Board Authorization',
  P3_EMPLOYMENT: 'Stage 3 • Employment Binding',
  P4_GOVERNANCE: 'Stage 4 • Personal Governance',
  P5_LIABILITY: 'Stage 5 • Liability Protection',
  P6_EQUITY: 'Stage 6 • Equity & Securities',
  P7_COMPENSATION: 'Stage 7 • Compensation Accrual',
  P8_ACTIVATION: 'Stage 8 • System Activation',
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

const hasVestingEquity = (exec: FlowExecutive): boolean => {
  // Assume vesting if equity is present (can be refined later)
  return hasEquity(exec);
};

const isPreIncorporation = (exec: FlowExecutive): boolean => {
  return exec.incorporation_status === 'pre_incorporation';
};

const isIncorporated = (exec: FlowExecutive): boolean => {
  return exec.incorporation_status === 'incorporated';
};

export const FORTUNE500_DOCUMENT_FLOW: Fortune500Gate[] = [
  // ========== STAGE 1: PRE-LEGAL (SELECTION & APPROVAL) ==========
  {
    gateNumber: 1,
    documentType: 'background_check',
    title: 'Background Check Complete',
    packetId: 'P1_PRE_LEGAL',
    stageName: 'Executive Selection',
    departmentOwner: 'HR + Board',
    blockingGates: [],
    requiredSigners: ['board'],
    appliesTo: () => true,
    isHardStop: true,
  },
  {
    gateNumber: 2,
    documentType: 'compensation_approval',
    title: 'Compensation Package Approved',
    packetId: 'P1_PRE_LEGAL',
    stageName: 'Executive Selection',
    departmentOwner: 'Finance + HR',
    blockingGates: [1],
    requiredSigners: ['cfo', 'board'],
    appliesTo: () => true,
    isHardStop: true,
  },

  // ========== STAGE 2: BOARD AUTHORIZATION ==========
  {
    gateNumber: 3,
    documentType: 'pre_incorporation_consent',
    title: 'Pre-Incorporation Consent',
    packetId: 'P2_BOARD_AUTH',
    stageName: 'Board Authorization',
    departmentOwner: 'Legal',
    blockingGates: [2],
    requiredSigners: ['incorporator', 'officer'],
    appliesTo: (exec) => isPreIncorporation(exec) && exec.role === 'ceo',
    isHardStop: true,
  },
  {
    gateNumber: 4,
    documentType: 'certificate_of_incorporation',
    title: 'Certificate of Incorporation',
    packetId: 'P2_BOARD_AUTH',
    stageName: 'Board Authorization',
    departmentOwner: 'Legal',
    blockingGates: [3],
    requiredSigners: ['incorporator'],
    appliesTo: (exec) => isPreIncorporation(exec),
    isHardStop: true,
  },
  {
    gateNumber: 5,
    documentType: 'bylaws',
    title: 'Company Bylaws',
    packetId: 'P2_BOARD_AUTH',
    stageName: 'Board Authorization',
    departmentOwner: 'Legal + Corporate Secretary',
    blockingGates: [4],
    requiredSigners: ['board'],
    appliesTo: () => true,
    isHardStop: true,
  },
  {
    gateNumber: 6,
    documentType: 'board_resolution',
    title: 'Board Resolution – Appointment of Officers',
    packetId: 'P2_BOARD_AUTH',
    stageName: 'Board Authorization',
    departmentOwner: 'Legal + Board',
    blockingGates: [5],
    requiredSigners: ['board'],
    appliesTo: (exec) => isIncorporated(exec),
    isHardStop: true,
  },

  // ========== STAGE 3: EMPLOYMENT BINDING ==========
  {
    gateNumber: 7,
    documentType: 'offer_letter',
    title: 'Executive Appointment Letter',
    packetId: 'P3_EMPLOYMENT',
    stageName: 'Formal Offer',
    departmentOwner: 'HR + Legal',
    blockingGates: [6],
    requiredSigners: ['officer'],
    appliesTo: () => true,
    isHardStop: true,
  },
  {
    gateNumber: 8,
    documentType: 'employment_agreement',
    title: 'Executive Employment Agreement',
    packetId: 'P3_EMPLOYMENT',
    stageName: 'Employment Binding',
    departmentOwner: 'HR + Legal',
    blockingGates: [7],
    requiredSigners: ['officer', 'board'],
    appliesTo: () => true,
    isHardStop: true,
  },
  {
    gateNumber: 9,
    documentType: 'confidentiality_ip',
    title: 'Confidentiality & IP Assignment Agreement',
    packetId: 'P3_EMPLOYMENT',
    stageName: 'Employment Binding',
    departmentOwner: 'Legal + IT Security',
    blockingGates: [8],
    requiredSigners: ['officer', 'board'],
    appliesTo: () => true,
    isHardStop: true,
  },

  // ========== STAGE 4: PERSONAL GOVERNANCE BINDING ==========
  {
    gateNumber: 10,
    documentType: 'bylaws_acknowledgment',
    title: 'Bylaws Acknowledgment & Personal Consent',
    packetId: 'P4_GOVERNANCE',
    stageName: 'Personal Governance',
    departmentOwner: 'Legal + Corporate Secretary',
    blockingGates: [9],
    requiredSigners: ['officer', 'board'],
    appliesTo: () => true,
    isHardStop: true,
  },
  {
    gateNumber: 11,
    documentType: 'fiduciary_ethics_ack',
    title: 'Fiduciary Duty & Ethics Acknowledgment',
    packetId: 'P4_GOVERNANCE',
    stageName: 'Personal Governance',
    departmentOwner: 'Compliance + Legal',
    blockingGates: [10],
    requiredSigners: ['officer', 'board'],
    appliesTo: () => true,
    isHardStop: true,
  },
  {
    gateNumber: 12,
    documentType: 'conflict_of_interest_disclosure',
    title: 'Initial Conflict of Interest Disclosure',
    packetId: 'P4_GOVERNANCE',
    stageName: 'Personal Governance',
    departmentOwner: 'Compliance + Internal Audit',
    blockingGates: [11],
    requiredSigners: ['officer'],
    appliesTo: () => true,
    isHardStop: true,
  },

  // ========== STAGE 5: LIABILITY PROTECTION ==========
  {
    gateNumber: 13,
    documentType: 'officer_indemnification',
    title: 'Officer Indemnification Agreement',
    packetId: 'P5_LIABILITY',
    stageName: 'Liability Protection',
    departmentOwner: 'Legal + Risk + Insurance',
    blockingGates: [12],
    requiredSigners: ['officer', 'board'],
    appliesTo: () => true,
    isHardStop: true,
  },

  // ========== STAGE 6: EQUITY & SECURITIES ==========
  {
    gateNumber: 14,
    documentType: 'equity_incentive_plan',
    title: 'Equity Incentive Plan – 14% Pool',
    packetId: 'P6_EQUITY',
    stageName: 'Equity Authorization',
    departmentOwner: 'Legal + Board + Finance',
    blockingGates: [6],
    requiredSigners: ['board'],
    appliesTo: (exec) => hasEquity(exec),
    isHardStop: true,
  },
  {
    gateNumber: 15,
    documentType: 'stock_issuance',
    title: 'Stock Subscription Agreement',
    packetId: 'P6_EQUITY',
    stageName: 'Equity Issuance',
    departmentOwner: 'Legal + Finance',
    blockingGates: [14],
    requiredSigners: ['officer', 'board'],
    appliesTo: (exec) => hasEquity(exec),
    isHardStop: true,
  },
  {
    gateNumber: 16,
    documentType: 'option_rsu_award',
    title: 'Option/RSU Award Agreement',
    packetId: 'P6_EQUITY',
    stageName: 'Equity Vesting',
    departmentOwner: 'Legal + Finance',
    blockingGates: [14],
    requiredSigners: ['officer', 'board'],
    appliesTo: (exec) => hasVestingEquity(exec),
    isHardStop: false,
  },
  {
    gateNumber: 17,
    documentType: 'founders_agreement',
    title: "Founders' Agreement",
    packetId: 'P6_EQUITY',
    stageName: 'Equity Governance',
    departmentOwner: 'Legal',
    blockingGates: [15],
    requiredSigners: ['founder', 'officer'],
    appliesTo: (exec) => hasEquity(exec) && (exec.role === 'ceo' || exec.full_name?.toLowerCase().includes('torrance')),
    isHardStop: false,
  },
  {
    gateNumber: 18,
    documentType: 'shareholders_agreement',
    title: "Shareholders' Agreement",
    packetId: 'P6_EQUITY',
    stageName: 'Equity Governance',
    departmentOwner: 'Legal',
    blockingGates: [15],
    requiredSigners: ['shareholder', 'officer'],
    appliesTo: (exec) => hasEquity(exec) && exec.role !== 'ceo' && !exec.full_name?.toLowerCase().includes('torrance'),
    isHardStop: false,
  },

  // ========== STAGE 7: COMPENSATION ACCRUAL ==========
  {
    gateNumber: 19,
    documentType: 'deferred_comp_addendum',
    title: 'Deferred Compensation Addendum',
    packetId: 'P7_COMPENSATION',
    stageName: 'Compensation Setup',
    departmentOwner: 'Finance + Payroll',
    blockingGates: [8],
    requiredSigners: ['officer', 'board'],
    appliesTo: (exec) => isDeferred(exec),
    isHardStop: false,
  },

  // ========== STAGE 8: SYSTEM ACTIVATION ==========
  {
    gateNumber: 20,
    documentType: 'executive_activation',
    title: 'Executive System Activation',
    packetId: 'P8_ACTIVATION',
    stageName: 'System Activation',
    departmentOwner: 'IT Security + Finance + Risk',
    blockingGates: [13], // Requires indemnification complete
    requiredSigners: ['admin'],
    appliesTo: () => true,
    isHardStop: true,
  },
];

export const getExpectedGatesForExecutive = (exec: FlowExecutive): Fortune500Gate[] =>
  FORTUNE500_DOCUMENT_FLOW.filter((gate) => gate.appliesTo(exec));

export const getGateByNumber = (gateNumber: number): Fortune500Gate | undefined =>
  FORTUNE500_DOCUMENT_FLOW.find((gate) => gate.gateNumber === gateNumber);

export const getBlockingGates = (gateNumber: number): number[] => {
  const gate = getGateByNumber(gateNumber);
  return gate?.blockingGates ?? [];
};

export const getWorkflowStageForGate = (gateNumber: number): string => {
  const gate = getGateByNumber(gateNumber);
  return gate?.stageName ?? 'Unknown';
};

export const getNextGate = (currentGateNumber: number, exec: FlowExecutive): Fortune500Gate | null => {
  const applicableGates = getExpectedGatesForExecutive(exec);
  const currentIndex = applicableGates.findIndex((g) => g.gateNumber === currentGateNumber);
  if (currentIndex === -1 || currentIndex === applicableGates.length - 1) {
    return null;
  }
  return applicableGates[currentIndex + 1];
};

export const STATUS_MAP: Record<string, string> = {
  'draft': 'Draft',
  'selected': 'Executive Selected',
  'pending_comp_approval': 'Pending Compensation Approval',
  'ready_for_board_authorization': 'Ready for Board Authorization',
  'authorized_to_offer': 'Authorized to Offer',
  'pending_employment_agreement': 'Pending Employment Agreement',
  'pending_ip_confidentiality': 'Pending IP & Confidentiality',
  'pending_personal_governance': 'Pending Personal Governance',
  'pending_fiduciary_binding': 'Pending Fiduciary Binding',
  'pending_conflict_clearance': 'Pending Conflict Clearance',
  'pending_indemnification': 'Pending Indemnification',
  'pending_equity_authorization': 'Pending Equity Authorization',
  'shareholder_active': 'Shareholder Active',
  'plan_active': 'Plan Active',
  'equity_vesting_active': 'Equity Vesting Active',
  'compensation_live': 'Compensation Live',
  'fully_appointed_active': 'Fully Appointed & Active',
  'rejected': 'Rejected',
};