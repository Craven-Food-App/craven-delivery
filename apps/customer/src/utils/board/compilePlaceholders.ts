import { supabase } from '@/integrations/supabase/client';

export interface PlaceholderContext {
  company_name?: string;
  company_state?: string;
  company_incorporation_date?: string;
  director_name?: string;
  director_appointment_date?: string;
  director_consent_date?: string;
  director_email?: string;
  director_address?: string;
  officer_address?: string;
  meeting_date?: string;
  minutes_date?: string;
  cap_table_date?: string;
  director_list?: string;
  appointed_officers_list?: string;
  resolution_number?: string;
  resolution_date?: string;
  executive_name?: string;
  executive_role?: string;
  executive_effective_date?: string;
  salary?: string;
  equity_amount?: string;
  equity_percentage?: string;
  authority_scope?: string;
  related_appointment_id?: string;
  officer_name?: string;
  officer_email?: string;
  founder_name?: string;
  state_filing_office?: string;
}

export async function compileBoardPlaceholders(
  templateType: string,
  context?: Partial<PlaceholderContext>
): Promise<Record<string, string>> {
  const placeholders: Record<string, string> = {};

  // Fetch company settings
  const { data: companySettings } = await supabase
    .from('company_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['company_name', 'state_of_incorporation', 'state_filing_office', 'incorporator_name', 'incorporator_address', 'incorporator_email']);

  const settingsMap: Record<string, string> = {};
  companySettings?.forEach((s) => {
    settingsMap[s.setting_key] = s.setting_value;
  });

  // Base company placeholders
  placeholders['{{company_name}}'] = settingsMap['company_name'] || 'Crave\'n, Inc.';
  placeholders['{{company_state}}'] = settingsMap['state_of_incorporation'] || 'Delaware';
  placeholders['{{state_filing_office}}'] = settingsMap['state_filing_office'] || 'Delaware Secretary of State';
  placeholders['{{company_incorporation_date}}'] = context?.company_incorporation_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Director placeholders
  if (templateType === 'initial_director_consent' || templateType === 'organizational_board_minutes') {
    // Fetch board members
    const { data: boardMembers, error: boardError } = await supabase
      .from('board_members')
      .select('full_name, role_title, appointment_date, email, user_id')
      .in('status', ['Active', 'Pending', 'Conditional'])
      .order('appointment_date', { ascending: true });

    if (!boardError && boardMembers && boardMembers.length > 0) {
      const director = boardMembers[0] as any;
      placeholders['{{director_name}}'] = context?.director_name || director.full_name || '';
      placeholders['{{director_appointment_date}}'] = context?.director_appointment_date || 
        (director.appointment_date ? new Date(director.appointment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '');
      placeholders['{{director_consent_date}}'] = context?.director_consent_date || 
        new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      placeholders['{{director_email}}'] = context?.director_email || director.email || '';
      
      // Get director address from company settings or user profile
      placeholders['{{director_address}}'] = context?.director_address || 
        settingsMap['incorporator_address'] || '';

      // Director list for minutes
      if (templateType === 'organizational_board_minutes') {
        placeholders['{{director_list}}'] = context?.director_list || 
          (boardMembers as any[]).map((m: any) => `<p>${m.full_name} - ${m.role_title}</p>`).join('');
      }
    }

    // For Initial Action, Organizational Minutes, Capitalization Table, and Officer Acceptance templates, also need officer and founder info
    if (templateType === 'initial_director_consent' || templateType === 'organizational_board_minutes' || templateType === 'capitalization_table_exhibit' || templateType === 'multi_role_officer_acceptance') {
      // Get officer info (usually the same as director in single-founder mode)
      if (!boardError && boardMembers && boardMembers.length > 0) {
        const director = boardMembers[0] as any;
        placeholders['{{officer_name}}'] = context?.officer_name || director.full_name || '';
        placeholders['{{officer_email}}'] = context?.officer_email || director.email || '';
        placeholders['{{officer_address}}'] = context?.officer_address || settingsMap['incorporator_address'] || '';
      }

      // Get founder name (usually the incorporator)
      placeholders['{{founder_name}}'] = context?.founder_name || 
        settingsMap['incorporator_name'] || 
        (!boardError && boardMembers && boardMembers.length > 0 ? (boardMembers[0] as any).full_name : 'Torrance Stroman');
    }
  }

  // Meeting date / Minutes date / Cap table date
  placeholders['{{meeting_date}}'] = context?.meeting_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  placeholders['{{minutes_date}}'] = context?.minutes_date || context?.meeting_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  placeholders['{{cap_table_date}}'] = context?.cap_table_date || context?.resolution_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Resolution placeholders
  if (templateType === 'board_resolution_officer_appointment' || templateType === 'board_resolution_stock_issuance' || templateType === 'board_resolution_appointing_ceo' || templateType === 'corporate_banking_resolution') {
    // Generate resolution number
    const { data: resolutions } = await supabase
      .from('board_documents')
      .select('resolution_number')
      .eq('type', 'board_resolution')
      .not('resolution_number', 'is', null);

    const nextNumber = (resolutions?.length || 0) + 1;
    placeholders['{{resolution_number}}'] = context?.resolution_number || `RES-${String(nextNumber).padStart(4, '0')}`;
    placeholders['{{resolution_date}}'] = context?.resolution_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // For officer appointment resolution, also need director and officer info
    const { data: boardMembers } = await supabase
      .from('board_members')
      .select('full_name, role_title, appointment_date, email, user_id')
      .in('status', ['Active', 'Pending', 'Conditional'])
      .order('appointment_date', { ascending: true });

    if (boardMembers && boardMembers.length > 0) {
      const director = boardMembers[0] as any;
      placeholders['{{director_name}}'] = context?.director_name || director.full_name || '';
      placeholders['{{director_email}}'] = context?.director_email || director.email || '';
      placeholders['{{director_address}}'] = context?.director_address || settingsMap['incorporator_address'] || '';

      // Officer info (usually same as director in single-founder mode)
      placeholders['{{officer_name}}'] = context?.officer_name || director.full_name || '';
      placeholders['{{officer_email}}'] = context?.officer_email || director.email || '';
    }

    // Executive appointment details
    if (context?.related_appointment_id) {
      const { data: appointment } = await supabase
        .from('executive_appointments')
        .select('*, user_profiles:user_id(full_name)')
        .eq('id', context.related_appointment_id)
        .single();

      if (appointment) {
        const appointmentData = appointment as any;
        placeholders['{{executive_name}}'] = context?.executive_name || appointmentData.user_profiles?.full_name || appointmentData.role_title || 'N/A';
        placeholders['{{executive_role}}'] = context?.executive_role || appointmentData.role_title || 'N/A';
        placeholders['{{executive_effective_date}}'] = context?.executive_effective_date || 
          (appointmentData.effective_date ? new Date(appointmentData.effective_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '');

        // Parse compensation
        let compStructure: any = {};
        if (appointmentData.compensation_structure) {
          try {
            compStructure = typeof appointmentData.compensation_structure === 'string' 
              ? JSON.parse(appointmentData.compensation_structure) 
              : appointmentData.compensation_structure;
          } catch (e) {
            compStructure = { description: appointmentData.compensation_structure };
          }
        }

        placeholders['{{salary}}'] = context?.salary || 
          (compStructure.annual_salary ? `$${Number(compStructure.annual_salary).toLocaleString()}` : 'TBD');

        // Parse equity
        let equityDetails: any = {};
        if (appointmentData.equity_details) {
          try {
            equityDetails = typeof appointmentData.equity_details === 'string'
              ? JSON.parse(appointmentData.equity_details)
              : appointmentData.equity_details;
          } catch (e) {
            equityDetails = {};
          }
        }

        placeholders['{{equity_amount}}'] = context?.equity_amount || 
          (equityDetails.shares ? equityDetails.shares.toLocaleString() : '');
        placeholders['{{equity_percentage}}'] = context?.equity_percentage || 
          (equityDetails.percentage ? `${equityDetails.percentage}%` : '');

        placeholders['{{authority_scope}}'] = context?.authority_scope || 
          compStructure.authority_scope || 'exercise all powers and perform all duties as may be assigned by the Board of Directors';
      }
    }
  }

  // Appointed officers list
  if (templateType === 'organizational_board_minutes' && context?.appointed_officers_list) {
    placeholders['{{appointed_officers_list}}'] = context.appointed_officers_list;
  }

  return placeholders;
}

export function replacePlaceholders(html: string, placeholders: Record<string, string>): string {
  let result = html;
  Object.entries(placeholders).forEach(([key, value]) => {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  });
  return result;
}

