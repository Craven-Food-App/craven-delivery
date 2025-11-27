import { Company, Person, FlowOutput, Packet, RoutedDocument, SignatureSlot, Role } from '@/types/signing';

// Template mappings to your existing template system
export const TEMPLATE_MAPPINGS: Record<string, { templateKey: string; usageContext: string }> = {
  INCORPORATOR_CONSENT: { templateKey: 'pre_incorporation_consent', usageContext: 'pre_incorporation_consent' },
  INCORPORATOR_STATEMENT: { templateKey: 'incorporator_statement', usageContext: 'incorporator_statement' },
  CERTIFICATE_OF_INCORPORATION: { templateKey: 'certificate_of_incorporation', usageContext: 'certificate_of_incorporation' },
  BYLAWS: { templateKey: 'bylaws_complete', usageContext: 'company_bylaws' },
  BYLAWS_ACKNOWLEDGMENT: { templateKey: 'bylaws_acknowledgment', usageContext: 'bylaws_acknowledgment' },
  BOARD_APPOINT_OFFICERS: { templateKey: 'board_resolution', usageContext: 'board_consent_appointment' },
  BYLAWS_ADOPTION: { templateKey: 'board_resolution', usageContext: 'board_consent_bylaws' },
  OFFICER_ACK: { templateKey: 'offer_letter', usageContext: 'officer_acceptance' },
  EMPLOYMENT_AGREEMENT: { templateKey: 'employment_agreement', usageContext: 'employment_agreement' },
  NDA_PIIA: { templateKey: 'confidentiality_ip', usageContext: 'confidentiality_ip' },
  FIDUCIARY_DUTY: { templateKey: 'fiduciary_duty_ethics', usageContext: 'fiduciary_duty_ethics' },
  CONFLICT_OF_INTEREST: { templateKey: 'conflict_of_interest_disclosure', usageContext: 'conflict_of_interest_disclosure' },
  STOCK_PURCHASE: { templateKey: 'stock_issuance', usageContext: 'stock_issuance' },
  OPTION_GRANT: { templateKey: 'stock_issuance', usageContext: 'stock_option_grant' },
  EQUITY_PLAN: { templateKey: 'equity_incentive_plan', usageContext: 'equity_incentive_plan' },
  DEFERRED_COMP: { templateKey: 'deferred_comp_addendum', usageContext: 'deferred_comp_addendum' },
  INDEMNIFICATION: { templateKey: 'officer_indemnification', usageContext: 'officer_indemnification' },
};

const hasRole = (p: Person, r: Role) => p.roles.includes(r);
const findAll = (people: Person[], role: Role) => people.filter(p => hasRole(p, role));
const firstOrThrow = (arr: Person[], label: string) => {
  if (!arr.length) throw new Error(`Missing ${label}`);
  return arr[0];
};

export function buildExecutiveFlow(company: Company, people: Person[]): FlowOutput {
  const incorporator = firstOrThrow(findAll(people, 'INCORPORATOR'), 'Incorporator');
  const board = findAll(people, 'BOARD');
  const officers = people.filter(p => p.roles.some(r => ['CEO','CFO','CXO','COO','CTO','OFFICER'].includes(r)));
  const equityHolders = people.filter(p => p.equity && (p.equity.sharesGranted > 0));

  // Packet 1: Pre-Incorporation & Founding Documents
  const packet1: Packet = {
    packetId: 'P1_PREINC',
    title: 'Pre-Incorporation & Founding Documents',
    order: 1,
    documents: [
      {
        templateId: 'INCORPORATOR_CONSENT',
        templateKey: TEMPLATE_MAPPINGS.INCORPORATOR_CONSENT.templateKey,
        title: '1. Pre-Incorporation Consent',
        signers: [
          { personId: incorporator.id, roleHint: 'INCORPORATOR', actsAs: 'Individual', required: true, order: 1 },
        ],
        dataBindings: { company, incorporator, boardNames: board.map(b => b.fullName) },
      },
      {
        templateId: 'CERTIFICATE_OF_INCORPORATION',
        templateKey: TEMPLATE_MAPPINGS.CERTIFICATE_OF_INCORPORATION.templateKey,
        title: '2. Certificate of Incorporation',
        blockingIds: ['INCORPORATOR_CONSENT'],
        signers: [
          { personId: incorporator.id, roleHint: 'INCORPORATOR', actsAs: 'Individual', required: true, order: 1 },
        ],
        dataBindings: { 
          company, 
          incorporator, 
          boardMembers: board.map(b => ({ name: b.fullName, email: b.email })),
          boardCount: board.length 
        },
      },
      {
        templateId: 'BYLAWS',
        templateKey: TEMPLATE_MAPPINGS.BYLAWS.templateKey,
        title: '3. Company Bylaws',
        blockingIds: ['CERTIFICATE_OF_INCORPORATION'],
        signers: board.map<SignatureSlot>((b, i) => ({
          personId: b.id,
          roleHint: 'BOARD',
          actsAs: 'Company',
          required: true,
          order: i + 1,
        })),
        dataBindings: { 
          company,
          boardMembers: board.map(b => ({ name: b.fullName, email: b.email })),
          officers: officers.map(o => ({
            name: o.fullName,
            title: o.roles.includes('CEO') ? 'Chief Executive Officer'
                  : o.roles.includes('CFO') ? 'Chief Financial Officer'
                  : o.roles.includes('CXO') ? 'Chief Experience Officer'
                  : o.roles.includes('COO') ? 'Chief Operating Officer'
                  : o.roles.includes('CTO') ? 'Chief Technology Officer'
                  : 'Officer',
          })),
        },
      },
      {
        templateId: 'INCORPORATOR_STATEMENT',
        templateKey: TEMPLATE_MAPPINGS.INCORPORATOR_STATEMENT.templateKey,
        title: 'Incorporator Statement (Internal)',
        blockingIds: ['BYLAWS'],
        signers: [
          { personId: incorporator.id, roleHint: 'INCORPORATOR', actsAs: 'Individual', required: true, order: 1 },
        ],
        dataBindings: { company, incorporator, boardMembers: board.map(b => ({ name: b.fullName, email: b.email, address: company.principalOfficeAddress })) },
      },
    ],
  };

  // Packet 2: Board Actions & Governance
  const packet2: Packet = {
    packetId: 'P2_BOARD',
    title: 'Board Actions & Governance',
    order: 2,
    documents: [
      {
        templateId: 'BOARD_APPOINT_OFFICERS',
        templateKey: TEMPLATE_MAPPINGS.BOARD_APPOINT_OFFICERS.templateKey,
        title: '5. Board Resolution (Appointment)',
        blockingIds: ['INCORPORATOR_STATEMENT'],
        signers: board.map<SignatureSlot>((b, i) => ({
          personId: b.id,
          roleHint: 'BOARD',
          actsAs: 'Company',
          required: true,
          order: i + 1,
        })),
        carbonCopyPersonIds: officers.map(o => o.id),
        dataBindings: {
          company,
          officers: officers.map(o => ({
            name: o.fullName,
            roles: o.roles.filter(r => ['CEO','CFO','CXO','COO','CTO','OFFICER'].includes(r)),
            salary: o.salary,
            title: o.roles.includes('CEO') ? 'Chief Executive Officer'
                  : o.roles.includes('CFO') ? 'Chief Financial Officer'
                  : o.roles.includes('CXO') ? 'Chief Experience Officer'
                  : o.roles.includes('COO') ? 'Chief Operating Officer'
                  : o.roles.includes('CTO') ? 'Chief Technology Officer'
                  : 'Officer',
          })),
          directors: board.map(b => ({ name: b.fullName, email: b.email })),
        },
      },
    ],
  };

  // Packet 3: Officer Agreements & Governance Acknowledgments
  const packet3Docs: RoutedDocument[] = [];
  
  officers.forEach(off => {
    const officerTitle = off.roles.includes('CEO') ? 'Chief Executive Officer'
                       : off.roles.includes('CFO') ? 'Chief Financial Officer'
                       : off.roles.includes('CXO') ? 'Chief Experience Officer'
                       : off.roles.includes('COO') ? 'Chief Operating Officer'
                       : off.roles.includes('CTO') ? 'Chief Technology Officer'
                       : 'Officer';

    // Bylaws Acknowledgment
    packet3Docs.push({
      templateId: `BYLAWS_ACK_${off.id}`,
      templateKey: TEMPLATE_MAPPINGS.BYLAWS_ACKNOWLEDGMENT.templateKey,
      title: `4. Bylaws Acknowledgment – ${off.fullName}`,
      blockingIds: ['BOARD_APPOINT_OFFICERS'],
      signers: [
        { personId: off.id, roleHint: 'OFFICER', actsAs: 'Individual', required: true, order: 1 },
      ],
      dataBindings: { company, officer: off, title: officerTitle },
    });

    // Officer Acceptance
    packet3Docs.push({
      templateId: `OFFICER_ACK_${off.id}`,
      templateKey: TEMPLATE_MAPPINGS.OFFICER_ACK.templateKey,
      title: `6. Appointment Letter – ${off.fullName}`,
      blockingIds: [`BYLAWS_ACK_${off.id}`],
      signers: [
        { personId: off.id, roleHint: 'OFFICER', actsAs: 'Individual', required: true, order: 1 },
      ],
      dataBindings: { company, officer: off, roles: off.roles, title: officerTitle },
    });

    // Employment Agreement
    packet3Docs.push({
      templateId: `EMPLOYMENT_AGREEMENT_${off.id}`,
      templateKey: TEMPLATE_MAPPINGS.EMPLOYMENT_AGREEMENT.templateKey,
      title: `7. Employment Agreement – ${off.fullName}`,
      blockingIds: [`OFFICER_ACK_${off.id}`],
      signers: [
        { personId: off.id, roleHint: 'OFFICER', actsAs: 'Individual', required: true, order: 1 },
        { personId: board[0]?.id, roleHint: 'BOARD', actsAs: 'Company', required: true, order: 2 },
      ],
      dataBindings: {
        company,
        executive: off,
        title: officerTitle,
        salary: off.salary,
      },
    });

    // NDA/PIIA
    packet3Docs.push({
      templateId: `NDA_PIIA_${off.id}`,
      templateKey: TEMPLATE_MAPPINGS.NDA_PIIA.templateKey,
      title: `8. Confidentiality & IP Assignment – ${off.fullName}`,
      blockingIds: [`EMPLOYMENT_AGREEMENT_${off.id}`],
      signers: [
        { personId: off.id, roleHint: 'OFFICER', actsAs: 'Individual', required: true, order: 1 },
        { personId: board[0]?.id, roleHint: 'BOARD', actsAs: 'Company', required: true, order: 2 },
      ],
      dataBindings: { company, recipient: off },
    });

    // Fiduciary Duty & Ethics
    packet3Docs.push({
      templateId: `FIDUCIARY_DUTY_${off.id}`,
      templateKey: TEMPLATE_MAPPINGS.FIDUCIARY_DUTY.templateKey,
      title: `9. Fiduciary Duty & Ethics Acknowledgment – ${off.fullName}`,
      blockingIds: [`NDA_PIIA_${off.id}`],
      signers: [
        { personId: off.id, roleHint: 'OFFICER', actsAs: 'Individual', required: true, order: 1 },
      ],
      dataBindings: { company, officer: off, title: officerTitle },
    });

    // Conflict of Interest
    packet3Docs.push({
      templateId: `CONFLICT_OF_INTEREST_${off.id}`,
      templateKey: TEMPLATE_MAPPINGS.CONFLICT_OF_INTEREST.templateKey,
      title: `10. Conflict of Interest Disclosure – ${off.fullName}`,
      blockingIds: [`FIDUCIARY_DUTY_${off.id}`],
      signers: [
        { personId: off.id, roleHint: 'OFFICER', actsAs: 'Individual', required: true, order: 1 },
      ],
      dataBindings: { company, officer: off, title: officerTitle },
    });
  });

  const packet3: Packet = {
    packetId: 'P3_OFFICER_CORE',
    title: 'Employment & Governance',
    order: 3,
    documents: packet3Docs,
  };

  // Packet 4: Equity & Compensation
  const packet4Docs: RoutedDocument[] = [];
  
  // Equity Incentive Plan (if equity holders exist)
  if (equityHolders.length > 0) {
    packet4Docs.push({
      templateId: 'EQUITY_PLAN',
      templateKey: TEMPLATE_MAPPINGS.EQUITY_PLAN.templateKey,
      title: '12. Equity Incentive Plan',
      blockingIds: ['BOARD_APPOINT_OFFICERS'],
      signers: board.map<SignatureSlot>((b, i) => ({
        personId: b.id,
        roleHint: 'BOARD',
        actsAs: 'Company',
        required: true,
        order: i + 1,
      })),
      dataBindings: {
        company,
        equityPoolShares: 10000000, // 10M shares in equity pool
        planEffectiveDate: new Date().toISOString().split('T')[0],
        planAdoptionDate: new Date().toISOString().split('T')[0],
      },
    });
  }

  equityHolders.forEach(holder => {
    const baseBindings = {
      company,
      holder,
      vesting: holder.equity?.vesting,
      consideration: holder.equity?.consideration,
    };

    if (holder.equity!.sharesGranted > 0 && holder.equity!.strikePriceUSD === undefined) {
      // Stock Subscription
      packet4Docs.push({
        templateId: `STOCK_PURCHASE_${holder.id}`,
        templateKey: TEMPLATE_MAPPINGS.STOCK_PURCHASE.templateKey,
        title: `11. Stock Subscription – ${holder.fullName}`,
        blockingIds: equityHolders.length > 0 ? ['EQUITY_PLAN'] : [],
        signers: [
          { personId: holder.id, roleHint: 'SHAREHOLDER', actsAs: 'Individual', required: true, order: 1 },
          { personId: board[0]?.id, roleHint: 'BOARD', actsAs: 'Company', required: true, order: 2 },
        ],
        dataBindings: baseBindings,
      });
    }

    if (holder.equity!.strikePriceUSD !== undefined) {
      // Option Grant
      packet4Docs.push({
        templateId: `OPTION_GRANT_${holder.id}`,
        templateKey: TEMPLATE_MAPPINGS.OPTION_GRANT.templateKey,
        title: `12. Option/RSU Agreement – ${holder.fullName}`,
        blockingIds: ['EQUITY_PLAN'],
        signers: [
          { personId: holder.id, roleHint: 'OFFICER', actsAs: 'Individual', required: true, order: 1 },
          { personId: board[0]?.id, roleHint: 'BOARD', actsAs: 'Company', required: true, order: 2 },
        ],
        dataBindings: { ...baseBindings, strikePriceUSD: holder.equity!.strikePriceUSD },
      });
    }
  });

  // Deferred Compensation (for officers with deferred salary)
  officers.forEach(off => {
    if (off.salary?.isDeferred) {
      packet4Docs.push({
        templateId: `DEFERRED_COMP_${off.id}`,
        templateKey: TEMPLATE_MAPPINGS.DEFERRED_COMP.templateKey,
        title: `13. Deferred Compensation – ${off.fullName}`,
        blockingIds: [`EMPLOYMENT_AGREEMENT_${off.id}`],
        signers: [
          { personId: off.id, roleHint: 'OFFICER', actsAs: 'Individual', required: true, order: 1 },
          { personId: board[0]?.id, roleHint: 'BOARD', actsAs: 'Company', required: true, order: 2 },
        ],
        dataBindings: { company, executive: off, salary: off.salary, equity: off.equity },
      });
    }
  });

  // Officer Indemnification Agreements
  officers.forEach(off => {
    const officerTitle = off.roles.includes('CEO') ? 'Chief Executive Officer'
                       : off.roles.includes('CFO') ? 'Chief Financial Officer'
                       : off.roles.includes('CXO') ? 'Chief Experience Officer'
                       : off.roles.includes('COO') ? 'Chief Operating Officer'
                       : off.roles.includes('CTO') ? 'Chief Technology Officer'
                       : 'Officer';

    packet4Docs.push({
      templateId: `INDEMNIFICATION_${off.id}`,
      templateKey: TEMPLATE_MAPPINGS.INDEMNIFICATION.templateKey,
      title: `14. Officer Indemnification Agreement – ${off.fullName}`,
      blockingIds: [`CONFLICT_OF_INTEREST_${off.id}`],
      signers: [
        { personId: off.id, roleHint: 'OFFICER', actsAs: 'Individual', required: true, order: 1 },
        { personId: board[0]?.id, roleHint: 'BOARD', actsAs: 'Company', required: true, order: 2 },
      ],
      dataBindings: { company, officer: off, title: officerTitle },
    });
  });

  const packet4: Packet = {
    packetId: 'P4_EQUITY',
    title: 'Equity & Indemnification',
    order: 4,
    documents: packet4Docs,
  };

  const packets = [packet1, packet2, packet3, packet4].filter(p => p.documents.length > 0);
  return { packets };
}

