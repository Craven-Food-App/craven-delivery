/**
 * Email Notification System for Exit Workflows
 * Sends notifications at key stages of the exit process
 */

import { supabase } from '@/integrations/supabase/client';

export interface NotificationRecipient {
  email: string;
  name: string;
  role: 'employee' | 'manager' | 'hr' | 'executive' | 'board';
}

/**
 * Send termination notice to employee
 */
export async function sendTerminationNotice(
  workflowId: string,
  employeeEmail: string,
  employeeName: string,
  effectiveDate: string,
  terminationType: 'for_cause' | 'without_cause' | 'resignation',
  reason?: string
): Promise<boolean> {
  try {
    // Call edge function to send email
    const { data, error } = await supabase.functions.invoke('send-exit-notification', {
      body: {
        type: 'termination_notice',
        workflow_id: workflowId,
        recipient_email: employeeEmail,
        recipient_name: employeeName,
        effective_date: effectiveDate,
        termination_type: terminationType,
        reason: reason,
      },
    });

    if (error) {
      console.error('Error sending termination notice:', error);
      return false;
    }

    // Update workflow status
    await supabase
      .from('exit_workflows')
      .update({
        notice_date: new Date().toISOString().split('T')[0],
        status: 'notice_sent',
        internal_notification_sent: true,
      })
      .eq('id', workflowId);

    // Update workflow step
    await supabase
      .from('exit_workflow_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('workflow_id', workflowId)
      .eq('step_name', 'send_notice');

    return true;
  } catch (error) {
    console.error('Error in sendTerminationNotice:', error);
    return false;
  }
}

/**
 * Send internal notification to managers/HR
 */
export async function sendInternalNotification(
  workflowId: string,
  recipients: NotificationRecipient[],
  message: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-exit-notification', {
      body: {
        type: 'internal_notification',
        workflow_id: workflowId,
        recipients: recipients.map(r => ({ email: r.email, name: r.name })),
        message: message,
      },
    });

    if (error) {
      console.error('Error sending internal notification:', error);
      return false;
    }

    await supabase
      .from('exit_workflows')
      .update({ internal_notification_sent: true })
      .eq('id', workflowId);

    return true;
  } catch (error) {
    console.error('Error in sendInternalNotification:', error);
    return false;
  }
}

/**
 * Send Board notification for executive removal
 */
export async function sendBoardNotification(
  workflowId: string,
  resolutionId: string,
  executiveName: string,
  executivePosition: string
): Promise<boolean> {
  try {
    // Get board members
    const { data: boardMembers } = await supabase
      .from('board_members')
      .select('user_id, user:auth.users(email)')
      .eq('status', 'active');

    if (!boardMembers || boardMembers.length === 0) {
      console.warn('No active board members found');
      return false;
    }

    const recipients = boardMembers
      .map(bm => ({
        email: (bm.user as any)?.email,
        name: 'Board Member',
      }))
      .filter(r => r.email);

    const { data, error } = await supabase.functions.invoke('send-exit-notification', {
      body: {
        type: 'board_notification',
        workflow_id: workflowId,
        resolution_id: resolutionId,
        executive_name: executiveName,
        executive_position: executivePosition,
        recipients: recipients,
      },
    });

    return !error;
  } catch (error) {
    console.error('Error in sendBoardNotification:', error);
    return false;
  }
}

/**
 * Send completion notification
 */
export async function sendCompletionNotification(
  workflowId: string,
  employeeEmail: string,
  employeeName: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-exit-notification', {
      body: {
        type: 'completion_notice',
        workflow_id: workflowId,
        recipient_email: employeeEmail,
        recipient_name: employeeName,
      },
    });

    return !error;
  } catch (error) {
    console.error('Error in sendCompletionNotification:', error);
    return false;
  }
}
























