// src/lib/templates/governanceContext.ts

import { supabase } from '@/integrations/supabase/client';

export interface AppointmentContext {
  companyId?: string; // Optional since we use settings
  appointeeUserId: string;
  roleTitles: string[];
  appointmentDate: string;
  isPreIncorporation: boolean;
}

export async function buildCommonContext(companyId?: string) {
  // Fetch from company_settings instead of companies table
  const { data: settings } = await supabase
    .from('company_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'company_name',
      'state_of_incorporation',
      'registered_office',
      'incorporator_name',
      'incorporator_address',
      'incorporator_email',
      'founder_name',
      'state_filing_office',
    ]);

  const settingsMap: Record<string, string> = {};
  settings?.forEach((s) => {
    settingsMap[s.setting_key] = s.setting_value;
  });

  // Get trust info (if exists)
  const { data: trust } = await supabase
    .from('trusts')
    .select('*')
    .maybeSingle();

  // Get cap table (if exists)
  const { data: cap } = await supabase
    .from('cap_tables')
    .select('*')
    .maybeSingle();

  return {
    company_name: settingsMap['company_name'] || 'Crave\'n, Inc.',
    company_state: settingsMap['state_of_incorporation'] || 'Delaware',
    state: settingsMap['state_of_incorporation'] || 'Delaware',
    registered_office: settingsMap['registered_office'] || '',
    state_filing_office: settingsMap['state_filing_office'] || 'Delaware Secretary of State',
    trust_name: trust?.name || 'Invero Business Trust (Irrevocable Trust)',
    founder_name: settingsMap['founder_name'] || settingsMap['incorporator_name'] || 'Torrance Stroman',
    cap_table_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    resolution_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    // Add other common fields as needed
  };
}

export async function buildAppointmentContext(ctx: AppointmentContext) {
  const common = await buildCommonContext(ctx.companyId);

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', ctx.appointeeUserId)
    .maybeSingle();

  // Get exec_user if exists
  const { data: execUser } = await supabase
    .from('exec_users')
    .select('*')
    .eq('user_id', ctx.appointeeUserId)
    .maybeSingle();

  // Get auth user for email fallback
  const { data: { user } } = await supabase.auth.getUser();

  const fullName = 
    profile?.full_name || 
    user?.email?.split('@')[0] || 
    '';
  const email = user?.email || '';

  return {
    ...common,
    officer_name: fullName,
    officer_email: email,
    officer_address: '',
    appointee_name: fullName,
    appointee_1_name: fullName,
    appointee_1_email: email,
    appointee_1_role: ctx.roleTitles.join(', '),
    role: ctx.roleTitles.join(', '),
    executive_name: fullName,
    executive_role: ctx.roleTitles.join(', '),
    effective_date: ctx.appointmentDate,
    resolution_date: ctx.appointmentDate,
    executive_effective_date: ctx.appointmentDate,
  };
}

