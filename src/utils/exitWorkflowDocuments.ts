/**
 * Document Generation for Exit Workflows
 * Generates termination letters, separation agreements, and related documents
 */

import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

export interface TerminationDocument {
  type: 'termination_letter' | 'separation_agreement' | 'final_settlement_statement' | 'cobra_notice';
  content: string;
  format: 'html' | 'pdf';
}

/**
 * Generate termination letter
 */
export async function generateTerminationLetter(
  workflowId: string,
  employeeId: string
): Promise<string | null> {
  try {
    // Get workflow and employee data
    const { data: workflow } = await supabase
      .from('exit_workflows')
      .select(`
        *,
        employee:employees(*)
      `)
      .eq('id', workflowId)
      .single();

    if (!workflow || !workflow.employee) {
      throw new Error('Workflow or employee not found');
    }

    const employee = workflow.employee;
    const effectiveDate = dayjs(workflow.effective_date).format('MMMM DD, YYYY');
    const terminationType = workflow.termination_type === 'for_cause' ? 'for cause' : 'without cause';

    const letter = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Termination Letter</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
    .header { text-align: right; margin-bottom: 30px; }
    .date { margin-bottom: 20px; }
    .content { margin: 20px 0; }
    .signature { margin-top: 50px; }
  </style>
</head>
<body>
  <div class="header">
    <p><strong>Crave'n Inc.</strong></p>
    <p>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="date">
    <p>${effectiveDate}</p>
  </div>

  <div>
    <p>${employee.first_name} ${employee.last_name}<br>
    ${employee.email}</p>
  </div>

  <div class="content">
    <p><strong>RE: Termination of Employment</strong></p>

    <p>Dear ${employee.first_name},</p>

    <p>This letter serves as formal notice that your employment with Crave'n Inc. will be terminated ${terminationType}, effective ${effectiveDate}.</p>

    ${workflow.termination_reason ? `<p><strong>Reason for Termination:</strong></p><p>${workflow.termination_reason}</p>` : ''}

    ${workflow.grounds_for_cause && workflow.grounds_for_cause.length > 0 ? `
    <p><strong>Grounds for Termination:</strong></p>
    <ul>
      ${workflow.grounds_for_cause.map(ground => `<li>${ground.replace('_', ' ').toUpperCase()}</li>`).join('')}
    </ul>
    ` : ''}

    <p>Your final compensation, including accrued salary, unused PTO, and any applicable severance, will be processed according to your employment agreement and company policy.</p>

    <p>Please return all company property, including but not limited to:</p>
    <ul>
      <li>Company equipment (laptops, phones, devices)</li>
      <li>Access cards and keys</li>
      <li>Company credit cards</li>
      <li>Confidential documents and materials</li>
    </ul>

    <p>Your ongoing obligations under your employment agreement, including confidentiality and non-compete provisions, remain in effect.</p>

    <p>If you have any questions, please contact Human Resources.</p>

    <div class="signature">
      <p>Sincerely,</p>
      <p><strong>Crave'n Inc.</strong></p>
      <p>Human Resources Department</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Store document
    await supabase.from('executive_documents').insert({
      document_type: 'termination_letter',
      officer_name: `${employee.first_name} ${employee.last_name}`,
      document_content: letter,
      metadata: {
        workflow_id: workflowId,
        employee_id: employeeId,
        generated_at: new Date().toISOString(),
      },
    });

    return letter;
  } catch (error) {
    console.error('Error generating termination letter:', error);
    return null;
  }
}

/**
 * Generate final settlement statement
 */
export async function generateFinalSettlementStatement(
  workflowId: string
): Promise<string | null> {
  try {
    const { data: workflow } = await supabase
      .from('exit_workflows')
      .select(`
        *,
        employee:employees(*)
      `)
      .eq('id', workflowId)
      .single();

    if (!workflow) return null;

    const employee = workflow.employee;
    const statement = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Final Settlement Statement</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .total { font-weight: bold; font-size: 1.2em; }
  </style>
</head>
<body>
  <h2>Final Settlement Statement</h2>
  
  <p><strong>Employee:</strong> ${employee.first_name} ${employee.last_name}</p>
  <p><strong>Employee Number:</strong> ${employee.employee_number}</p>
  <p><strong>Termination Date:</strong> ${dayjs(workflow.effective_date).format('MMMM DD, YYYY')}</p>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Accrued Salary</td>
        <td>$${((workflow.final_compensation || 0) - (workflow.severance_amount || 0) - (workflow.pto_payout || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      ${workflow.unused_pto_days > 0 ? `
      <tr>
        <td>Unused PTO (${workflow.unused_pto_days} days)</td>
        <td>$${(workflow.pto_payout || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      ` : ''}
      ${workflow.severance_amount > 0 ? `
      <tr>
        <td>Severance</td>
        <td>$${(workflow.severance_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      ` : ''}
      <tr class="total">
        <td>Total Final Compensation</td>
        <td>$${(workflow.final_compensation || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>

  <p><strong>Payment Date:</strong> ${workflow.final_pay_date ? dayjs(workflow.final_pay_date).format('MMMM DD, YYYY') : 'To be determined'}</p>
</body>
</html>
    `.trim();

    return statement;
  } catch (error) {
    console.error('Error generating settlement statement:', error);
    return null;
  }
}

/**
 * Generate COBRA notice
 */
export async function generateCOBRANotice(
  workflowId: string,
  employeeEmail: string
): Promise<string | null> {
  try {
    const { data: workflow } = await supabase
      .from('exit_workflows')
      .select(`
        employee:employees(*)
      `)
      .eq('id', workflowId)
      .single();

    if (!workflow) return null;

    const employee = workflow.employee;
    const notice = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>COBRA Continuation Coverage Notice</title>
</head>
<body>
  <h2>COBRA Continuation Coverage Election Notice</h2>
  
  <p>Dear ${employee.first_name} ${employee.last_name},</p>

  <p>This notice contains important information about your right to continue your health care coverage under COBRA.</p>

  <p><strong>What is COBRA?</strong></p>
  <p>The Consolidated Omnibus Budget Reconciliation Act (COBRA) gives workers and their families who lose their health benefits the right to choose to continue group health benefits provided by their group health plan for limited periods of time under certain circumstances.</p>

  <p><strong>Your Coverage Options:</strong></p>
  <ul>
    <li>You may elect to continue your current health insurance coverage</li>
    <li>Coverage will be at your expense (102% of the premium)</li>
    <li>You have 60 days from the date of this notice to elect COBRA coverage</li>
  </ul>

  <p>For more information and to enroll, please contact our benefits administrator.</p>

  <p>Sincerely,<br>Crave'n Inc. Human Resources</p>
</body>
</html>
    `.trim();

    return notice;
  } catch (error) {
    console.error('Error generating COBRA notice:', error);
    return null;
  }
}











































