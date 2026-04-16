// @ts-nocheck
/**
 * Exit Workflow Utilities
 * Helper functions for exit/termination workflows
 */

import { supabase } from '@/integrations/supabase/client';
import { isCLevelPosition } from './roleUtils';
import { logAuditTrail, logPersonnelAction } from './auditLogger';

export interface ExitWorkflowStep {
  step_name: string;
  step_number: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
}

/**
 * Get required steps based on workflow type and employee position
 */
export function getRequiredSteps(
  workflowType: 'employee_termination' | 'executive_removal' | 'resignation' | 'retirement',
  isExecutive: boolean
): string[] {
  const baseSteps = [
    'send_notice',
    'revoke_access',
    'collect_assets',
    'calculate_settlement',
    'process_final_pay',
    'handle_equity',
    'send_notifications',
    'complete_workflow'
  ];

  if (isExecutive && workflowType === 'executive_removal') {
    return ['board_approval', ...baseSteps];
  }

  return baseSteps;
}

/**
 * Create workflow steps in database
 */
export async function createWorkflowSteps(
  workflowId: string,
  steps: string[]
): Promise<void> {
  const stepRecords = steps.map((step, index) => ({
    workflow_id: workflowId,
    step_name: step,
    step_number: index + 1,
    status: 'pending',
  }));

  const { error } = await supabase
    .from('exit_workflow_steps')
    .insert(stepRecords);

  if (error) {
    console.error('Error creating workflow steps:', error);
    throw error;
  }
}

/**
 * Create board resolution for executive removal
 * PRODUCTION-GRADE: Comprehensive error handling, validation, and fallbacks
 */
export async function createBoardResolutionForRemoval(
  workflowId: string,
  employeeId: string,
  employeeName: string,
  employeePosition: string,
  terminationType: 'for_cause' | 'without_cause' | 'resignation',
  grounds?: string[],
  reason?: string
): Promise<string | null> {
  console.log('🚀 [BOARD RESOLUTION] Starting creation process...', {
    workflowId,
    employeeId,
    employeeName,
    employeePosition,
    terminationType,
  });

  try {
    // Step 1: Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [BOARD RESOLUTION] Authentication failed:', authError);
      throw new Error('User not authenticated');
    }
    console.log('✅ [BOARD RESOLUTION] User authenticated:', user.id);

    // Step 2: Get employee email (REQUIRED field)
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('email, first_name, last_name')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      console.error('❌ [BOARD RESOLUTION] Employee not found:', empError);
      throw new Error(`Employee not found: ${empError?.message || 'Unknown error'}`);
    }

    const employeeEmail = employee.email || `${employee.first_name?.toLowerCase() || 'employee'}.${employee.last_name?.toLowerCase() || 'unknown'}@cravenusa.com`;
    console.log('✅ [BOARD RESOLUTION] Employee email:', employeeEmail);

    // Step 3: Generate unique resolution number
    const year = new Date().getFullYear();
    let resolutionNumber: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const { count, error: countError } = await supabase
        .from('board_resolutions')
        .select('*', { count: 'exact', head: true })
        .like('resolution_number', `${year}-%`);

      if (countError) {
        console.error('❌ [BOARD RESOLUTION] Error counting resolutions:', countError);
        // Fallback: use timestamp-based number
        resolutionNumber = `${year}-${Date.now().toString().slice(-6)}`;
        break;
      }

      const nextNum = (count || 0) + 1 + attempts;
      resolutionNumber = `${year}-${String(nextNum).padStart(4, '0')}`;
      attempts++;

      // Verify uniqueness
      const { data: existing } = await supabase
        .from('board_resolutions')
        .select('id')
        .eq('resolution_number', resolutionNumber)
        .maybeSingle();

      if (!existing) break; // Number is unique
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      // Final fallback
      resolutionNumber = `${year}-${Date.now().toString().slice(-6)}`;
    }

    console.log('✅ [BOARD RESOLUTION] Generated resolution number:', resolutionNumber);

    // Step 4: Prepare resolution data
    const resolutionTitle = `Removal of ${employeeName} as ${employeePosition}`;
    const resolutionText = terminationType === 'for_cause'
      ? `Resolution to remove ${employeeName} from the position of ${employeePosition} for cause. Grounds: ${grounds?.join(', ') || 'N/A'}. Reason: ${reason || 'N/A'}`
      : `Resolution to remove ${employeeName} from the position of ${employeePosition} without cause. Reason: ${reason || 'N/A'}`;

    const resolutionData = {
      resolution_number: resolutionNumber,
      resolution_type: 'removal' as const,
      subject_position: employeePosition,
      subject_person_name: employeeName,
      subject_person_email: employeeEmail,
      resolution_title: resolutionTitle,
      resolution_text: resolutionText,
      effective_date: new Date().toISOString().split('T')[0],
      status: 'pending' as const,
      created_by: user.id,
      board_members: [] as any[],
      votes_for: 0,
      votes_against: 0,
      votes_abstain: 0,
      required_documents: [] as any[],
      notes: JSON.stringify({
        workflow_id: workflowId,
        employee_id: employeeId,
        termination_type: terminationType,
        grounds_for_cause: grounds || [],
        reason: reason || '',
        created_at: new Date().toISOString(),
      }),
    };

    console.log('📝 [BOARD RESOLUTION] Resolution data prepared:', {
      resolution_number: resolutionData.resolution_number,
      resolution_type: resolutionData.resolution_type,
      subject_person_name: resolutionData.subject_person_name,
      status: resolutionData.status,
    });

    // Step 5: Use database function to create resolution (bypasses RLS)
    console.log('📞 [BOARD RESOLUTION] Calling database function to create resolution...');
    
    const { data: resolutionId, error: functionError } = await supabase.rpc(
      'create_board_resolution_for_removal',
      {
        p_workflow_id: workflowId,
        p_employee_id: employeeId,
        p_employee_name: employeeName,
        p_employee_position: employeePosition,
        p_employee_email: employeeEmail,
        p_termination_type: terminationType,
        p_termination_reason: reason || '',
        p_grounds_for_cause: grounds || null,
        p_created_by: user.id,
      }
    );

    if (functionError || !resolutionId) {
      console.error('❌ [BOARD RESOLUTION] Database function failed:', functionError);
      
      // Fallback: Try direct insert (in case function doesn't exist yet)
      console.log('🔄 [BOARD RESOLUTION] Attempting fallback direct insert...');
      const { data: resolution, error: insertError } = await supabase
        .from('board_resolutions')
        .insert(resolutionData)
        .select()
        .single();

      if (insertError || !resolution) {
        console.error('❌ [BOARD RESOLUTION] Fallback insert also failed:', insertError);
        throw new Error(`CRITICAL: Both function and direct insert failed. Function error: ${functionError?.message || 'Unknown'}. Insert error: ${insertError?.message || 'Unknown'}`);
      }

      console.log('✅ [BOARD RESOLUTION] Fallback insert succeeded:', resolution.id);
      
      // Link resolution to workflow
      await supabase
        .from('exit_workflows')
        .update({ 
          board_resolution_id: resolution.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId);

      return resolution.id;
    }

    console.log('✅ [BOARD RESOLUTION] Database function succeeded. Resolution ID:', resolutionId);
    
    // Verify the resolution was created and linked
    const { data: verifyResolution } = await supabase
      .from('board_resolutions')
      .select('id, resolution_number')
      .eq('id', resolutionId)
      .single();

    if (!verifyResolution) {
      throw new Error('CRITICAL: Resolution function returned ID but resolution not found in database');
    }

    console.log('✅ [BOARD RESOLUTION] Resolution verified:', verifyResolution.resolution_number);
    
    // Step 7: Log the creation
    try {
      await logExitWorkflowAction(
        'Board Resolution Created',
        workflowId,
        employeeId,
        employeeName,
        employeePosition,
        undefined,
        undefined,
        {
          resolution_id: verifyResolution.id,
          resolution_number: verifyResolution.resolution_number,
          resolution_type: 'removal',
        }
      );
    } catch (logError) {
      console.warn('⚠️ [BOARD RESOLUTION] Failed to log action (non-critical):', logError);
    }
    
    console.log('🎉 [BOARD RESOLUTION] SUCCESS - Resolution created and linked:', {
      resolution_id: verifyResolution.id,
      resolution_number: verifyResolution.resolution_number,
      workflow_id: workflowId,
    });
    
    return verifyResolution.id;
  } catch (error: any) {
    console.error('💥 [BOARD RESOLUTION] CRITICAL ERROR:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    
    // Re-throw with detailed message for UI display
    throw new Error(`Board Resolution Creation Failed: ${error.message || 'Unknown error'}. Check console for details.`);
  }
}

/**
 * Check if employee is executive and requires board approval
 */
export async function requiresBoardApproval(employeeId: string): Promise<boolean> {
  const { data: employee } = await supabase
    .from('employees')
    .select('position')
    .eq('id', employeeId)
    .single();

  if (!employee) return false;
  return isCLevelPosition(employee.position);
}

/**
 * Calculate final compensation for exiting employee
 */
export async function calculateFinalCompensation(
  employeeId: string,
  effectiveDate: string,
  severanceMonths: number = 0
): Promise<{
  accruedSalary: number;
  unusedPTO: number;
  ptoPayout: number;
  severance: number;
  proRatedBonus: number;
  total: number;
}> {
  const { data: employee } = await supabase
    .from('employees')
    .select('salary, hourly_rate, employment_type')
    .eq('id', employeeId)
    .single();

  if (!employee) {
    throw new Error('Employee not found');
  }

  // Calculate accrued salary (simplified - would need actual payroll data)
  const monthlySalary = employee.salary ? employee.salary / 12 : 0;
  const accruedSalary = monthlySalary * 0.5; // Assume mid-month termination

  // Calculate unused PTO (simplified)
  const unusedPTO = 10; // Would come from PTO tracking system
  const dailyRate = employee.salary ? employee.salary / 260 : 0; // 260 working days
  const ptoPayout = unusedPTO * dailyRate;

  // Calculate severance
  const severance = monthlySalary * severanceMonths;

  // Pro-rated bonus (simplified)
  const proRatedBonus = 0;

  const total = accruedSalary + ptoPayout + severance + proRatedBonus;

  return {
    accruedSalary,
    unusedPTO,
    ptoPayout,
    severance,
    proRatedBonus,
    total,
  };
}

/**
 * Get default asset checklist based on employee type
 */
export function getDefaultAssetChecklist(isExecutive: boolean): Array<{ type: string; description: string; required: boolean }> {
  const baseAssets = [
    { type: 'laptop', description: 'Company laptop', required: true },
    { type: 'phone', description: 'Company phone', required: true },
    { type: 'badge', description: 'Access badge', required: true },
    { type: 'keys', description: 'Office keys', required: false },
  ];

  if (isExecutive) {
    baseAssets.push(
      { type: 'corporate_card', description: 'Corporate credit card', required: true },
      { type: 'documents', description: 'Confidential documents', required: true },
      { type: 'equipment', description: 'Executive equipment', required: false }
    );
  }

  return baseAssets;
}

/**
 * Get default access systems to revoke
 */
export function getDefaultAccessSystems(isExecutive: boolean): Array<{ system: string; access_type: string; priority: 'high' | 'medium' | 'low' }> {
  const baseSystems = [
    { system: 'email', access_type: 'full', priority: 'high' as const },
    { system: 'github', access_type: 'write', priority: 'high' as const },
    { system: 'slack', access_type: 'full', priority: 'high' as const },
    { system: 'vpn', access_type: 'full', priority: 'high' as const },
    { system: 'building_access', access_type: 'full', priority: 'high' as const },
  ];

  if (isExecutive) {
    baseSystems.push(
      { system: 'financial_systems', access_type: 'admin', priority: 'high' as const },
      { system: 'governance_portal', access_type: 'admin', priority: 'high' as const },
      { system: 'board_portal', access_type: 'admin', priority: 'high' as const }
    );
  }

  return baseSystems;
}

/**
 * Log exit workflow action to both governance_logs and unified_audit_trail
 */
export async function logExitWorkflowAction(
  action: string,
  workflowId: string,
  employeeId: string,
  employeeName: string,
  employeePosition: string,
  oldStatus?: string,
  newStatus?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[ExitWorkflow] No authenticated user, skipping audit log');
      return;
    }

    const isExecutive = isCLevelPosition(employeePosition);
    const actionDescription = newStatus 
      ? `Exit workflow status changed: ${oldStatus} → ${newStatus} for ${employeeName}`
      : `${action} for ${employeeName} (${employeePosition})`;

    // 1. Log to governance_logs (for Governance Admin Logs tab)
    try {
      await supabase.from('governance_logs').insert({
        action: action.toUpperCase().replace(/\s+/g, '_'),
        actor_id: user.id,
        entity_type: 'EXIT_WORKFLOW',
        entity_id: workflowId,
        description: actionDescription,
        data: {
          workflow_id: workflowId,
          employee_id: employeeId,
          employee_name: employeeName,
          employee_position: employeePosition,
          old_status: oldStatus,
          new_status: newStatus,
          is_executive: isExecutive,
          ...metadata,
        },
      });
    } catch (govLogError: any) {
      console.error('[ExitWorkflow] Failed to log to governance_logs:', govLogError);
    }

    // 2. Log to unified_audit_trail (for comprehensive audit)
    await logAuditTrail({
      actionType: newStatus ? 'update' : 'create',
      actionCategory: 'personnel',
      actionDescription: actionDescription,
      targetResourceType: 'exit_workflow',
      targetResourceId: workflowId,
      targetResourceName: `${employeeName} - Exit Workflow`,
      oldValues: oldStatus ? { status: oldStatus } : {},
      newValues: newStatus ? { status: newStatus } : {},
      metadata: {
        workflow_id: workflowId,
        employee_id: employeeId,
        employee_name: employeeName,
        employee_position: employeePosition,
        is_executive: isExecutive,
        ...metadata,
      },
      severity: isExecutive ? 'high' : 'normal',
      requiresReview: isExecutive || newStatus === 'completed',
      complianceTag: isExecutive ? 'sox' : 'gdpr',
    });

    // 3. Log personnel action for status changes
    if (oldStatus && newStatus) {
      await logPersonnelAction(
        'status_change',
        employeeId,
        employeeName,
        {
          workflow_id: workflowId,
          old_status: oldStatus,
          new_status: newStatus,
          is_executive: isExecutive,
          ...metadata,
        },
        { status: oldStatus },
        { status: newStatus }
      );
    }
  } catch (error: any) {
    console.error('[ExitWorkflow] Error logging workflow action:', error);
    // Don't throw - audit logging should not break the main flow
  }
}
