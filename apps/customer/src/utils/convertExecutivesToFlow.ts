import { Person, Company, Role } from '@/types/signing';
import { ExecutiveData, getExecutiveData } from './getExecutiveData';
import { supabase } from '@/integrations/supabase/client';

/**
 * Convert ExecutiveData to Person format for document signing flow
 */
export function convertExecutiveToPerson(exec: ExecutiveData): Person {
  const roles: Role[] = [];
  
  // Map role to Role type
  if (exec.role === 'ceo') roles.push('CEO');
  if (exec.role === 'cfo') roles.push('CFO');
  if (exec.role === 'coo') roles.push('COO');
  if (exec.role === 'cto') roles.push('CTO');
  if (exec.role === 'cxo') roles.push('CXO');
  if (['ceo', 'cfo', 'coo', 'cto', 'cxo'].includes(exec.role)) roles.push('OFFICER');
  if (exec.role === 'board_member') roles.push('BOARD');
  
  // Check if incorporator (typically CEO is also incorporator)
  // This should be determined from company settings or a flag
  if (exec.role === 'ceo') {
    roles.push('INCORPORATOR');
  }
  
  // Check if shareholder (has equity)
  if (exec.equity_percent && exec.equity_percent > 0) {
    roles.push('SHAREHOLDER');
  }

  const person: Person = {
    id: exec.id,
    fullName: exec.full_name,
    email: exec.email,
    roles: roles.length > 0 ? roles : ['OFFICER'],
  };

  // Add equity if present
  if (exec.equity_percent && exec.equity_percent > 0) {
    person.equity = {
      sharesGranted: parseInt(exec.shares_issued?.toString() || '0'),
      vesting: exec.vesting_schedule ? {
        cliffMonths: 12,
        totalMonths: 48,
        startDateISO: exec.grant_date || new Date().toISOString(),
      } : undefined,
      strikePriceUSD: exec.strike_price ? parseFloat(exec.strike_price.toString()) : undefined,
      consideration: 'Services',
    };
  }

  // Add salary if present
  if (exec.salary) {
    person.salary = {
      annualUSD: exec.salary,
      isDeferred: exec.salary_status === 'deferred' || !!exec.funding_trigger,
      deferUntil: exec.funding_trigger ? `Funding>=${exec.funding_trigger}` : undefined,
    };
  }

  return person;
}

/**
 * Get company data for document flow
 */
export async function getCompanyData(): Promise<Company> {
  const { data: settings } = await supabase
    .from('company_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'company_name',
      'state_of_incorporation',
      'registered_office',
      'registered_agent_name',
      'registered_agent_address',
      'fiscal_year_end',
      'incorporation_date',
      'ein',
    ]);

  const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);

  return {
    id: 'company_001',
    legalName: settingsMap.get('company_name') || 'Craven, Inc.',
    state: (settingsMap.get('state_of_incorporation') as 'DE' | 'OH' | 'CA') || 'DE',
    incorporationDateISO: settingsMap.get('incorporation_date') || new Date().toISOString(),
    principalOfficeAddress: settingsMap.get('registered_office') || '',
    registeredOffice: settingsMap.get('registered_office') || '',
    registeredAgentName: settingsMap.get('registered_agent_name') || '',
    registeredAgentAddress: settingsMap.get('registered_agent_address') || '',
    fiscalYearEnd: settingsMap.get('fiscal_year_end') || 'December 31',
    ein: settingsMap.get('ein') || undefined,
  };
}

/**
 * Get all executives as Person[] for flow engine
 */
export async function getAllExecutivesAsPeople(): Promise<Person[]> {
  const executives = await getExecutiveData();
  return executives.map(convertExecutiveToPerson);
}

