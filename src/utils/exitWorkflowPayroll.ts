/**
 * Payroll Integration for Exit Workflows
 * Automatically processes final payroll for terminated employees
 */

import { supabase } from '@/integrations/supabase/client';
import { calculateFinalCompensation, type FinalCompensation } from './exitWorkflowUtils';

/**
 * Process final payroll for exit workflow
 */
export async function processFinalPayroll(
  workflowId: string,
  employeeId: string,
  effectiveDate: string,
  severanceMonths?: number
): Promise<{
  success: boolean;
  payrollId?: string;
  compensation?: FinalCompensation;
  error?: string;
}> {
  try {
    // Calculate final compensation
    const compensation = await calculateFinalCompensation(
      employeeId,
      effectiveDate,
      severanceMonths
    );

    // Get employee data
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }

    // Create payroll record
    const payPeriodEnd = new Date(effectiveDate);
    const payPeriodStart = new Date(payPeriodEnd);
    payPeriodStart.setDate(1); // Start of month

    const { data: payroll, error: payrollError } = await supabase
      .from('payroll')
      .insert({
        employee_id: employeeId,
        pay_period_start: payPeriodStart.toISOString().split('T')[0],
        pay_period_end: payPeriodEnd.toISOString().split('T')[0],
        base_pay: compensation.accruedSalary,
        bonus: compensation.proRatedBonus,
        other_deductions: 0, // Will be calculated by payroll system
        payment_status: 'pending',
        notes: `Final payroll for termination - Workflow ID: ${workflowId}`,
      })
      .select()
      .single();

    if (payrollError) {
      console.error('Error creating payroll record:', payrollError);
      return { success: false, error: payrollError.message };
    }

    // Update workflow with final compensation
    await supabase
      .from('exit_workflows')
      .update({
        final_compensation: compensation.total,
        severance_amount: compensation.severance,
        unused_pto_days: compensation.unusedPTO,
        pto_payout: compensation.ptoPayout,
        final_pay_date: payPeriodEnd.toISOString().split('T')[0],
        status: 'final_settlement',
      })
      .eq('id', workflowId);

    // Update workflow step
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('exit_workflow_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user?.id,
      })
      .eq('workflow_id', workflowId)
      .eq('step_name', 'process_final_pay');

    return {
      success: true,
      payrollId: payroll.id,
      compensation,
    };
  } catch (error: any) {
    console.error('Error processing final payroll:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark payroll as processed/paid
 */
export async function markPayrollPaid(
  payrollId: string,
  paymentDate?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payroll')
      .update({
        payment_status: 'paid',
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
      })
      .eq('id', payrollId);

    if (error) {
      console.error('Error marking payroll as paid:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markPayrollPaid:', error);
    return false;
  }
}

/**
 * Get payroll status for workflow
 */
export async function getWorkflowPayrollStatus(workflowId: string) {
  try {
    const { data: workflow } = await supabase
      .from('exit_workflows')
      .select('final_compensation, final_pay_date, employee_id')
      .eq('id', workflowId)
      .single();

    if (!workflow) return null;

    // Find related payroll records
    const { data: payroll } = await supabase
      .from('payroll')
      .select('*')
      .eq('employee_id', workflow.employee_id)
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      workflow,
      payroll: payroll?.[0] || null,
    };
  } catch (error) {
    console.error('Error getting payroll status:', error);
    return null;
  }
}












































