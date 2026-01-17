import { supabase } from '@/integrations/supabase/client';

export interface AppointExecutivePayload {
  executive_name: string;
  executive_title: 'CEO' | 'COO' | 'CFO' | 'CTO' | 'CMO' | 'Admin';
  start_date: string;
  equity_percent: string;
  shares_issued: string;
  equity_type?: string;
  vesting_schedule?: string;
  strike_price?: string;
  annual_salary?: string;
  governing_law?: string;
  defer_salary?: boolean;
  funding_trigger?: string;
}

export async function appointExecutive(payload: AppointExecutivePayload) {
  const { data, error } = await supabase.functions.invoke('appoint-executive', {
    body: payload,
  });

  if (error) throw error;
  return data;
}
