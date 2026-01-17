/**
 * Unified Audit Trail Logger
 * 
 * This utility provides functions to log all administrative and C-level activities
 * to the unified_audit_trail table for compliance and tracking.
 */

import { supabase } from '@/integrations/supabase/client';

export interface AuditLogParams {
  actionType: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'view' | 'export' | 'import' | 'sign' | 'access' | 'download' | 'upload';
  actionCategory: 'personnel' | 'financial' | 'document' | 'system' | 'security' | 'compliance' | 'portal' | 'communication' | 'application';
  actionDescription: string;
  targetResourceType?: string;
  targetResourceId?: string;
  targetResourceName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  severity?: 'low' | 'normal' | 'high' | 'critical';
  requiresReview?: boolean;
  complianceTag?: 'gdpr' | 'sox' | 'hipaa' | 'pci' | 'ferpa';
}

/**
 * Log an audit trail entry
 * 
 * @param params Audit log parameters
 * @returns Promise<UUID | null> - The log ID if successful, null otherwise
 */
export async function logAuditTrail(params: AuditLogParams): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('[AuditLogger] No authenticated user, skipping audit log');
      return null;
    }

    // Get IP address and user agent from browser if available
    const ipAddress = (window as any).clientIP || null;
    const userAgent = navigator.userAgent;

    const { data, error } = await supabase.rpc('log_audit_trail' as any, {
      p_action_type: params.actionType,
      p_action_category: params.actionCategory,
      p_action_description: params.actionDescription,
      p_target_resource_type: params.targetResourceType || null,
      p_target_resource_id: params.targetResourceId || null,
      p_target_resource_name: params.targetResourceName || null,
      p_old_values: params.oldValues || {},
      p_new_values: params.newValues || {},
      p_metadata: params.metadata || {},
      p_severity: params.severity || 'normal',
      p_requires_review: params.requiresReview || false,
      p_compliance_tag: params.complianceTag || null,
      p_user_id: user.id,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });

    if (error) {
      console.error('[AuditLogger] Error logging audit trail:', error);
      // Don't throw - audit logging should not break the main flow
      return null;
    }

    return String(data) || null;
  } catch (error) {
    console.error('[AuditLogger] Exception in logAuditTrail:', error);
    // Silent fail - audit logging should not break the main flow
    return null;
  }
}

/**
 * Log a personnel action (hire, fire, promote, etc.)
 */
export async function logPersonnelAction(
  action: 'hire' | 'terminate' | 'promote' | 'demote' | 'salary_change' | 'status_change',
  employeeId: string,
  employeeName: string,
  details?: Record<string, any>,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
): Promise<void> {
  const actionMap: Record<string, string> = {
    hire: 'create',
    terminate: 'delete',
    promote: 'update',
    demote: 'update',
    salary_change: 'update',
    status_change: 'update',
  };

  await logAuditTrail({
    actionType: actionMap[action] as any,
    actionCategory: 'personnel',
    actionDescription: `${action.replace('_', ' ')}: ${employeeName}`,
    targetResourceType: 'employee',
    targetResourceId: employeeId,
    targetResourceName: employeeName,
    oldValues,
    newValues,
    metadata: details,
    severity: action === 'terminate' ? 'high' : action === 'salary_change' ? 'normal' : 'normal',
    requiresReview: action === 'terminate' || action === 'salary_change',
    complianceTag: 'gdpr',
  });
}

/**
 * Log a financial action (approval, rejection, etc.)
 */
export async function logFinancialAction(
  action: 'approve' | 'reject' | 'create' | 'update',
  resourceId: string,
  resourceName: string,
  amount?: number,
  details?: Record<string, any>
): Promise<void> {
  await logAuditTrail({
    actionType: action,
    actionCategory: 'financial',
    actionDescription: `Financial ${action}: ${resourceName}${amount ? ` ($${amount.toLocaleString()})` : ''}`,
    targetResourceType: 'financial_approval',
    targetResourceId: resourceId,
    targetResourceName: resourceName,
    metadata: { ...details, amount },
    severity: amount && amount > 100000 ? 'high' : 'normal',
    requiresReview: amount ? amount > 10000 : false,
    complianceTag: 'sox',
  });
}

/**
 * Log a document action (upload, download, sign, etc.)
 */
export async function logDocumentAction(
  action: 'upload' | 'download' | 'sign' | 'delete' | 'view',
  documentId: string,
  documentName: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditTrail({
    actionType: action,
    actionCategory: 'document',
    actionDescription: `Document ${action}: ${documentName}`,
    targetResourceType: 'document',
    targetResourceId: documentId,
    targetResourceName: documentName,
    metadata: details,
    severity: action === 'delete' ? 'high' : 'normal',
    requiresReview: action === 'delete',
    complianceTag: 'gdpr',
  });
}

/**
 * Log a system/security action
 */
export async function logSystemAction(
  action: 'access' | 'permission_change' | 'role_change' | 'config_change',
  description: string,
  details?: Record<string, any>,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
): Promise<void> {
  await logAuditTrail({
    actionType: action.includes('change') ? 'update' : 'access',
    actionCategory: 'system',
    actionDescription: description,
    oldValues,
    newValues,
    metadata: details,
    severity: action.includes('change') ? 'high' : 'normal',
    requiresReview: action.includes('change'),
    complianceTag: 'sox',
  });
}

/**
 * Log portal access
 */
export async function logPortalAccess(
  portal: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditTrail({
    actionType: 'access',
    actionCategory: 'portal',
    actionDescription: `Accessed ${portal} portal`,
    metadata: { portal, ...details },
    severity: 'low',
    requiresReview: false,
  });
}

/**
 * Log application review action
 */
export async function logApplicationAction(
  action: 'approve' | 'reject' | 'review' | 'delete',
  applicationId: string,
  applicantName: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditTrail({
    actionType: action === 'review' ? 'view' : action,
    actionCategory: 'application',
    actionDescription: `Application ${action}: ${applicantName}`,
    targetResourceType: 'application',
    targetResourceId: applicationId,
    targetResourceName: applicantName,
    metadata: details,
    severity: action === 'delete' ? 'high' : action === 'approve' || action === 'reject' ? 'normal' : 'low',
    requiresReview: action === 'delete' || action === 'approve' || action === 'reject',
    complianceTag: 'gdpr',
  });
}

