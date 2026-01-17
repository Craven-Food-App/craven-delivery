export type Role = 'INCORPORATOR' | 'BOARD' | 'CEO' | 'CFO' | 'COO' | 'CTO' | 'CXO' | 'OFFICER' | 'SHAREHOLDER';

export interface Person {
  id: string;
  fullName: string;
  email: string;
  roles: Role[];
  equity?: {
    sharesGranted: number;
    vesting?: {
      cliffMonths: number;
      totalMonths: number;
      startDateISO: string;
      acceleration?: 'none' | 'singleTrigger' | 'doubleTrigger';
    };
    strikePriceUSD?: number;
    consideration?: 'IP Assignment' | 'Cash' | 'Services' | 'Founder IP + Services';
    notes?: string;
  };
  salary?: {
    annualUSD: number;
    isDeferred: boolean;
    deferUntil?: string;
  };
}

export interface Company {
  id: string;
  legalName: string;
  state: 'DE' | 'OH' | 'CA' | string;
  incorporationDateISO: string;
  principalOfficeAddress: string;
  ein?: string;
  registeredOffice?: string;
  registeredAgentName?: string;
  registeredAgentAddress?: string;
  fiscalYearEnd?: string;
}

export interface TemplateRef {
  id: string;
  templateKey: string; // Maps to document_templates.template_key
  usageContext: string; // Maps to template_usage.usage_context
  title: string;
}

export interface SignatureSlot {
  personId: string;
  roleHint?: Role;
  actsAs?: 'Individual' | 'Company';
  required: boolean;
  order: number; // within the document
}

export interface RoutedDocument {
  templateId: string;
  templateKey: string;
  title: string;
  blockingIds?: string[];
  signers: SignatureSlot[];
  carbonCopyPersonIds?: string[];
  dataBindings: Record<string, unknown>;
}

export interface Packet {
  packetId: string;
  title: string;
  order: number;
  documents: RoutedDocument[];
}

export interface FlowOutput {
  packets: Packet[];
}

