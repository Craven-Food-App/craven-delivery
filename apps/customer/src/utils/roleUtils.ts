/**
 * Centralized Role and Position Utilities
 * 
 * Provides consistent role/position checking across the entire application.
 * All components should use these functions instead of inline regex checks.
 * 
 * These functions match the database functions for consistency:
 * - is_c_level_position() in database
 * - position_to_exec_role() in database
 */

/**
 * Checks if a position string represents a C-level executive role
 * Matches: CEO, CFO, COO, CTO, CMO, CRO, CPO, CDO, CHRO, CLO, CSO, CXO, President, Board Member, Advisor
 * 
 * @param position - The position/title string to check
 * @returns true if the position is C-level, false otherwise
 */
export const isCLevelPosition = (position?: string | null): boolean => {
  if (!position) return false;
  
  const pos = String(position).toLowerCase();
  return /.*(chief|ceo|cfo|coo|cto|cmo|cro|cpo|cdo|chro|clo|cso|cxo|president|board member|advisor).*/.test(pos);
};

/**
 * Normalizes a position string to an exec_users role
 * Returns: 'ceo', 'cfo', 'coo', 'cto', 'executive', or 'board_member'
 * Returns null if not a C-level position
 * 
 * @param position - The position/title string to normalize
 * @returns The normalized exec role or null
 */
export const getExecRoleFromPosition = (position?: string | null): 'ceo' | 'cfo' | 'coo' | 'cto' | 'executive' | 'board_member' | null => {
  if (!position) return null;
  
  const pos = String(position).toLowerCase();
  
  if (pos.includes('ceo') || pos.includes('chief executive')) return 'ceo';
  if (pos.includes('cfo') || pos.includes('chief financial')) return 'cfo';
  if (pos.includes('coo') || pos.includes('chief operating')) return 'coo';
  if (pos.includes('cto') || pos.includes('chief technology')) return 'cto';
  if (pos.includes('cmo') || pos.includes('chief marketing')) return 'board_member';
  if (pos.includes('cro') || pos.includes('chief revenue')) return 'board_member';
  if (pos.includes('cpo') || pos.includes('chief product')) return 'board_member';
  if (pos.includes('cdo') || pos.includes('chief data')) return 'board_member';
  if (pos.includes('chro') || pos.includes('chief human')) return 'board_member';
  if (pos.includes('clo') || pos.includes('chief legal')) return 'board_member';
  if (pos.includes('cso') || pos.includes('chief security')) return 'board_member';
  if (pos.includes('cxo')) return 'executive';
  if (pos.includes('president')) return 'board_member';
  if (pos.includes('board member') || pos.includes('advisor')) return 'board_member';
  
  return null;
};

/**
 * Checks if a position is specifically CEO
 */
export const isCEOPosition = (position?: string | null): boolean => {
  if (!position) return false;
  const pos = String(position).toLowerCase();
  return pos.includes('ceo') || pos.includes('chief executive');
};

/**
 * Checks if a position is specifically CFO
 */
export const isCFOPosition = (position?: string | null): boolean => {
  if (!position) return false;
  const pos = String(position).toLowerCase();
  return pos.includes('cfo') || pos.includes('chief financial');
};

/**
 * Checks if a position is specifically COO
 */
export const isCOOPosition = (position?: string | null): boolean => {
  if (!position) return false;
  const pos = String(position).toLowerCase();
  return pos.includes('coo') || pos.includes('chief operating');
};

/**
 * Checks if a position is specifically CTO
 */
export const isCTOPosition = (position?: string | null): boolean => {
  if (!position) return false;
  const pos = String(position).toLowerCase();
  return pos.includes('cto') || pos.includes('chief technology');
};

/**
 * Gets the role code from position config
 * Matches positions.ts config structure
 */
export const getPositionCode = (position?: string | null): string | null => {
  if (!position) return null;
  
  const pos = String(position).toLowerCase();
  
  if (pos.includes('ceo') || pos.includes('chief executive')) return 'ceo';
  if (pos.includes('cfo') || pos.includes('chief financial')) return 'cfo';
  if (pos.includes('coo') || pos.includes('chief operating')) return 'coo';
  if (pos.includes('cto') || pos.includes('chief technology')) return 'cto';
  if (pos.includes('cio') || pos.includes('chief information')) return 'cio';
  if (pos.includes('cxo')) return 'cxo';
  if (pos.includes('cmo') || pos.includes('chief marketing')) return 'cmo';
  if (pos.includes('cro') || pos.includes('chief revenue')) return 'cro';
  if (pos.includes('cpo') || pos.includes('chief product')) return 'cpo';
  if (pos.includes('cdo') || pos.includes('chief data')) return 'cdo';
  if (pos.includes('chro') || pos.includes('chief human')) return 'chro';
  if (pos.includes('clo') || pos.includes('chief legal')) return 'clo';
  if (pos.includes('cso') || pos.includes('chief security')) return 'cso';
  
  return null;
};

/**
 * Checks if position should have executive portal access
 */
export const hasExecutivePortalAccess = (position?: string | null): boolean => {
  return isCLevelPosition(position);
};

/**
 * Gets the list of portals a position should have access to
 */
export const getPortalsForPosition = (position?: string | null): Array<'board' | 'ceo' | 'cfo' | 'admin'> => {
  const portals: Array<'board' | 'ceo' | 'cfo' | 'admin'> = [];
  
  if (!position) {
    portals.push('admin');
    return portals;
  }
  
  if (isCLevelPosition(position)) {
    portals.push('board');
    
    if (isCEOPosition(position)) {
      portals.push('ceo');
    }
    
    if (isCFOPosition(position)) {
      portals.push('cfo');
    }
  } else {
    portals.push('admin');
  }
  
  return portals;
};

/**
 * Checks if a user is a corporate officer (appointed by board)
 * This is different from being an employee
 */
export const isOfficer = async (userId?: string | null): Promise<boolean> => {
  if (!userId) return false;
  
  const { supabase } = await import('@/integrations/supabase/client');
  const { data } = await supabase
    .from('exec_users')
    .select('id')
    .eq('user_id', userId)
    .in('officer_status', ['appointed', 'active'])
    .single();
  
  return !!data;
};

/**
 * Checks if a user is an employee (has active employment)
 */
export const isEmployee = async (userId?: string | null): Promise<boolean> => {
  if (!userId) return false;
  
  const { supabase } = await import('@/integrations/supabase/client');
  const { data } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .eq('employment_status', 'active')
    .single();
  
  return !!data;
};

/**
 * Checks if a user is both an officer and an employee
 */
export const isOfficerAndEmployee = async (userId?: string | null): Promise<boolean> => {
  if (!userId) return false;
  
  const { supabase } = await import('@/integrations/supabase/client');
  const { data } = await supabase
    .from('exec_users')
    .select('is_also_employee')
    .eq('user_id', userId)
    .in('officer_status', ['appointed', 'active'])
    .single();
  
  return data?.is_also_employee || false;
};

/**
 * Gets officer appointment date
 */
export const getOfficerAppointmentDate = async (userId?: string | null): Promise<string | null> => {
  if (!userId) return null;
  
  const { supabase } = await import('@/integrations/supabase/client');
  const { data } = await supabase
    .from('exec_users')
    .select('appointment_date')
    .eq('user_id', userId)
    .single();
  
  return data?.appointment_date || null;
};

/**
 * Checks if officer has active salary
 */
export const hasActiveSalary = async (userId?: string | null): Promise<boolean> => {
  if (!userId) return false;
  
  const isOfficerEmployee = await isOfficerAndEmployee(userId);
  return isOfficerEmployee;
};

