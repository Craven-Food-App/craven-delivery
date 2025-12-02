/**
 * Fortune 500 Finance Portal - Permission Utilities
 * Centralized permission checking and SOD validation
 */

import { supabase } from '@/integrations/supabase/client';

export interface PermissionCheck {
  hasPermission: boolean;
  requiresApproval: boolean;
  maxAmount?: number;
  conditions?: any;
}

/**
 * Check if user has permission and get any restrictions
 */
export async function checkFinancePermission(
  userId: string,
  permissionCode: string,
  entityId?: string
): Promise<PermissionCheck> {
  try {
    const { data, error } = await supabase.rpc('has_finance_permission', {
      p_user_id: userId,
      p_permission_code: permissionCode,
      p_entity_id: entityId || null,
    });

    if (error) throw error;

    // Get role permission conditions
    const { data: rolePermData } = await supabase
      .from('finance_role_permissions')
      .select(`
        conditions,
        role:finance_roles!inner(id),
        permission:finance_permissions!inner(permission_code)
      `)
      .eq('permission.permission_code', permissionCode)
      .in('role.id', 
        await supabase
          .from('finance_user_roles')
          .select('role_id')
          .eq('user_id', userId)
          .eq('approval_status', 'approved')
          .then(res => res.data?.map(r => r.role_id) || [])
      )
      .single();

    const conditions = (rolePermData?.conditions || {}) as Record<string, unknown>;
    const maxAmount = typeof conditions.max_amount === 'string' 
      ? parseFloat(conditions.max_amount) 
      : typeof conditions.max_amount === 'number' 
        ? conditions.max_amount 
        : undefined;

    return {
      hasPermission: data || false,
      requiresApproval: conditions.requires_approval === true || !!maxAmount,
      maxAmount,
      conditions,
    };
  } catch (error) {
    console.error('Error checking permission:', error);
    return {
      hasPermission: false,
      requiresApproval: true,
    };
  }
}

/**
 * Check for Segregation of Duties violations
 */
export async function checkSODViolation(
  userId: string,
  permissionCodes: string[]
): Promise<{ hasViolation: boolean; violations: string[] }> {
  try {
    const { data, error } = await supabase.rpc('check_sod_violation', {
      p_user_id: userId,
      p_permission_codes: permissionCodes,
    });

    if (error) throw error;

    // Get detailed violation information
    const { data: violations } = await supabase
      .from('sod_rules')
      .select('rule_code, rule_name, conflicting_permissions')
      .eq('is_active', true)
      .eq('enforcement_level', 'hard');

    const matchingViolations: string[] = [];
    if (violations) {
      violations.forEach(v => {
        if (v.conflicting_permissions.some((p: string) => permissionCodes.includes(p))) {
          matchingViolations.push(v.rule_name);
        }
      });
    }

    return {
      hasViolation: data || false,
      violations: matchingViolations,
    };
  } catch (error) {
    console.error('Error checking SOD violation:', error);
    return {
      hasViolation: false,
      violations: [],
    };
  }
}

/**
 * Get approval workflow for transaction
 */
export async function getApprovalWorkflow(
  transactionType: string,
  amount: number,
  entityId?: string
): Promise<{
  requiredApprovers: Array<{ role: string; level: number; requiresDual?: boolean }>;
  workflowId: string;
} | null> {
  try {
    const { data: workflows, error } = await supabase
      .from('approval_workflow_definitions')
      .select('*')
      .eq('transaction_type', transactionType)
      .eq('is_active', true)
      .or(`entity_id.is.null,entity_id.eq.${entityId}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!workflows || workflows.length === 0) return null;

    const workflow = workflows[0];
    const thresholds = workflow.amount_thresholds as Array<{
      min: number;
      max: number | null;
      approver_role: string;
      requires_dual?: boolean;
    }>;

    // Find matching threshold
    const matchingThreshold = thresholds.find(
      t => amount >= t.min && (t.max === null || amount <= t.max)
    );

    if (!matchingThreshold) return null;

    return {
      requiredApprovers: [
        {
          role: matchingThreshold.approver_role,
          level: 1,
          requiresDual: matchingThreshold.requires_dual || workflow.requires_dual_approval,
        },
      ],
      workflowId: workflow.id,
    };
  } catch (error) {
    console.error('Error getting approval workflow:', error);
    return null;
  }
}

/**
 * Log finance action to audit trail
 */
export async function logFinanceAction(
  userId: string,
  action: {
    actionType: string;
    resourceType: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    entityId?: string;
    complianceTag?: string;
    severity?: 'info' | 'warning' | 'critical';
  }
): Promise<void> {
  try {
    await supabase.from('finance_audit_log').insert({
      user_id: userId,
      entity_id: action.entityId || null,
      action_type: action.actionType,
      resource_type: action.resourceType,
      resource_id: action.resourceId || null,
      old_values: action.oldValues || null,
      new_values: action.newValues || null,
      compliance_tag: action.complianceTag || null,
      severity: action.severity || 'info',
      ip_address: null, // Can be added from request context
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
    });
  } catch (error) {
    console.error('Error logging finance action:', error);
    // Don't throw - audit logging failures shouldn't break the app
  }
}

/**
 * Check transaction limits
 */
export async function checkTransactionLimit(
  userId: string,
  transactionType: string,
  amount: number,
  entityId?: string
): Promise<{ withinLimit: boolean; limit?: number; period?: string }> {
  try {
    const { data: limits, error } = await supabase
      .from('transaction_limits')
      .select('*')
      .in('role_id', 
        await supabase
          .from('finance_user_roles')
          .select('role_id')
          .eq('user_id', userId)
          .eq('approval_status', 'approved')
          .then(res => res.data?.map(r => r.role_id) || [])
      )
      .eq('transaction_type', transactionType)
      .or(`entity_id.is.null,entity_id.eq.${entityId}`)
      .lte('effective_date', new Date().toISOString().split('T')[0])
      .or(`expiration_date.is.null,expiration_date.gte.${new Date().toISOString().split('T')[0]}`)
      .order('max_amount', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!limits || limits.length === 0) {
      // No limit = unlimited (likely CFO or admin)
      return { withinLimit: true };
    }

    const limit = limits[0];
    const limitMaxAmount = typeof limit.max_amount === 'string' 
      ? parseFloat(limit.max_amount) 
      : typeof limit.max_amount === 'number' 
        ? limit.max_amount 
        : undefined;
    return {
      withinLimit: amount <= (limitMaxAmount || Infinity),
      limit: limitMaxAmount,
      period: limit.period_type,
    };
  } catch (error) {
    console.error('Error checking transaction limit:', error);
    return { withinLimit: false }; // Fail safe - require approval on error
  }
}


