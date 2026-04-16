// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Modal, Steps, Card, Descriptions, Tag, Button, Space,
  Alert, Timeline, Typography, Divider, message, Tabs
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  DollarOutlined, KeyOutlined, FileTextOutlined, UserOutlined
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { AccessRevocationStep } from './AccessRevocationStep';
import { AssetReturnStep } from './AssetReturnStep';
import { FinalSettlementStep } from './FinalSettlementStep';
import { logExitWorkflowAction, createBoardResolutionForRemoval } from '@/utils/exitWorkflowUtils';
import { sendTerminationNotice } from '@/utils/exitWorkflowNotifications';
import { sendCompletionNotification, sendInternalNotification } from '@/utils/exitWorkflowNotifications';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface ExitWorkflow {
  id: string;
  employee_id: string;
  workflow_type: string;
  termination_type?: string;
  status: string;
  effective_date: string;
  termination_reason?: string;
  board_resolution_id?: string;
  employee?: any;
  board_resolution?: any;
}

interface WorkflowStep {
  id: string;
  step_name: string;
  step_number: number;
  status: string;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

interface Props {
  workflow: ExitWorkflow;
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const ExitWorkflowDetailModal: React.FC<Props> = ({
  workflow,
  visible,
  onClose,
  onUpdate
}) => {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sendingNotice, setSendingNotice] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [completingWorkflow, setCompletingWorkflow] = useState(false);
  const [creatingResolution, setCreatingResolution] = useState(false);
  const [creatingEquityResolution, setCreatingEquityResolution] = useState(false);
  const [syncingEquityDecision, setSyncingEquityDecision] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [workflowData, setWorkflowData] = useState<ExitWorkflow>(workflow);

  useEffect(() => {
    if (visible && workflow.id) {
      fetchWorkflowSteps();
      setWorkflowData(workflow);
    }
  }, [visible, workflow.id, workflow.status]);

  const fetchWorkflowSteps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exit_workflow_steps')
        .select('*')
        .eq('workflow_id', workflow.id)
        .order('step_number');

      if (error) throw error;
      setSteps(data || []);
    } catch (error: any) {
      message.error('Failed to fetch workflow steps');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const dispatchCompletionNotifications = async (actorId: string) => {
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('user_id, email, first_name, last_name, position')
      .eq('id', workflowData.employee_id)
      .single();

    if (employeeError) throw employeeError;

    const employeeName = `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || 'Executive';
    if (!employee?.email) {
      throw new Error('Cannot send notifications: employee email is missing.');
    }

    const internalRoles = [
      'hr',
      'admin',
      'governance_admin',
      'ceo',
      'cfo',
      'coo',
      'cto',
      'cxo',
      'CRAVEN_CEO',
      'CRAVEN_CFO',
      'CRAVEN_COO',
      'CRAVEN_CTO',
      'CRAVEN_CXO',
    ];

    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', internalRoles);

    const roleMapByUserId = new Map<string, string>();
    (roleRows || []).forEach((row: any) => {
      if (!row?.user_id) return;
      if (!roleMapByUserId.has(row.user_id)) {
        roleMapByUserId.set(row.user_id, String(row.role || '').toLowerCase());
      }
    });

    const internalUserIds = Array.from(roleMapByUserId.keys());
    let internalRecipients: any[] = [];
    if (internalUserIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .in('user_id', internalUserIds);

      internalRecipients = (profileRows || [])
        .filter((profile: any) => !!profile?.email)
        .map((profile: any) => ({
          email: profile.email,
          name: profile.full_name || 'Team Member',
          role: roleMapByUserId.get(profile.user_id) || 'hr',
        }));
    }

    if (internalRecipients.length === 0) {
      const { data: actorProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('user_id', actorId)
        .maybeSingle();
      if (actorProfile?.email) {
        internalRecipients = [{
          email: actorProfile.email,
          name: actorProfile.full_name || 'Workflow Operator',
          role: 'hr',
        }];
      }
    }

    const completionSent = await sendCompletionNotification(
      workflowData.id,
      employee.email,
      employeeName
    );
    if (!completionSent) {
      throw new Error('Failed to send employee completion notice');
    }

    const internalMessage = [
      `Exit workflow completed for ${employeeName}.`,
      `Workflow ID: ${workflowData.id}`,
      `Position: ${employee?.position || workflowData.employee?.position || 'N/A'}`,
      `Effective date: ${workflowData.effective_date}`,
      `Termination type: ${workflowData.termination_type || 'without_cause'}`,
      '',
      'This confirms that final settlement, equity handling, and workflow completion were finalized.',
    ].join('\n');

    const internalSent = internalRecipients.length > 0
      ? await sendInternalNotification(workflowData.id, internalRecipients, internalMessage)
      : true;
    if (!internalSent) {
      throw new Error('Failed to send internal completion notifications');
    }

    await supabase
      .from('exit_workflow_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: actorId,
        notes: `Notifications sent: completion notice to ${employee.email}; internal closeout to ${internalRecipients.length} recipient(s).`,
      })
      .eq('workflow_id', workflowData.id)
      .eq('step_name', 'send_notifications');

    return { employeeEmail: employee.email, internalRecipientCount: internalRecipients.length };
  };

  const handleSendNotificationsNow = async () => {
    setSendingNotifications(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const result = await dispatchCompletionNotifications(user.id);
      message.success(`Notifications sent: ${result.employeeEmail} + ${result.internalRecipientCount} internal recipient(s).`);
      await fetchWorkflowSteps();
      onUpdate();
    } catch (error: any) {
      console.error('Error sending completion notifications:', error);
      message.error(error.message || 'Failed to send notifications');
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleCompleteWorkflow = async () => {
    setCompletingWorkflow(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const notificationStep = steps.find((step) => step.step_name === 'send_notifications');
      if (!notificationStep || notificationStep.status !== 'completed') {
        await dispatchCompletionNotifications(user.id);
      }

      // Mark complete_workflow step as completed
      await supabase
        .from('exit_workflow_steps')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          notes: 'Exit workflow completed',
        })
        .eq('workflow_id', workflowData.id)
        .eq('step_name', 'complete_workflow');

      // Update workflow status to completed
      const { error: updateError } = await supabase
        .from('exit_workflows')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowData.id);

      if (updateError) throw updateError;

      // Update employee status to terminated
      await supabase
        .from('employees')
        .update({
          employment_status: 'terminated',
          termination_date: workflowData.effective_date,
        })
        .eq('id', workflowData.employee_id);

      // Log the completion
      await logExitWorkflowAction(
        'Exit Workflow Completed',
        workflowData.id,
        workflowData.employee_id,
        `${workflowData.employee?.first_name} ${workflowData.employee?.last_name}`,
        workflowData.employee?.position || '',
        'final_settlement',
        'completed',
        {
          completed_at: new Date().toISOString(),
        }
      );

      message.success('Exit workflow completed successfully');
      setWorkflowData({ ...workflowData, status: 'completed' });
      fetchWorkflowSteps();
      onUpdate();
    } catch (error: any) {
      console.error('Error completing workflow:', error);
      message.error(error.message || 'Failed to complete workflow');
    } finally {
      setCompletingWorkflow(false);
    }
  };

  const handleRefreshResolutionStatus = async () => {
    if (!workflowData.board_resolution_id) {
      message.warning('No board resolution ID found');
      return;
    }

    setRefreshingStatus(true);
    try {
      // Get the resolution number - try from workflow's board_resolution object first
      let resolutionNumber = workflowData.board_resolution?.resolution_number;
      
      if (!resolutionNumber) {
        // Try to fetch it from board_resolutions
        const { data: brData, error: brError } = await supabase
          .from('board_resolutions')
          .select('resolution_number')
          .eq('id', workflowData.board_resolution_id)
          .single();
        
        if (brError || !brData) {
          message.error('Could not find resolution number');
          return;
        }
        resolutionNumber = brData.resolution_number;
      }

      // Check governance_board_resolutions status
      const { data: govRes, error: govError } = await supabase
        .from('governance_board_resolutions')
        .select('status, resolution_number')
        .eq('resolution_number', resolutionNumber)
        .maybeSingle();

      if (govError && govError.code !== 'PGRST116') {
        throw govError;
      }

      // If governance resolution is ADOPTED, sync to board_resolutions
      if (govRes && govRes.status === 'ADOPTED') {
        const { error: updateError } = await supabase
          .from('board_resolutions')
          .update({
            status: 'approved',
            updated_at: new Date().toISOString(),
          })
          .eq('resolution_number', resolutionNumber)
          .eq('status', 'pending'); // Only update if still pending

        if (updateError) throw updateError;

        message.success('Resolution status synced successfully. The workflow should update automatically.');
        
        // Refresh workflow data
        setTimeout(() => {
          onUpdate();
          fetchWorkflowSteps();
        }, 1000);
      } else {
        message.info('Governance resolution is not yet ADOPTED. Current status: ' + (govRes?.status || 'not found'));
      }
    } catch (error: any) {
      console.error('Error refreshing resolution status:', error);
      message.error(error.message || 'Failed to refresh resolution status');
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleSendNotice = async () => {
    setSendingNotice(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Send termination notice
      await sendTerminationNotice(
        workflowData.id,
        workflowData.employee?.email || '',
        `${workflowData.employee?.first_name} ${workflowData.employee?.last_name}`,
        workflowData.effective_date,
        (workflowData.termination_type || 'without_cause') as 'for_cause' | 'without_cause' | 'resignation',
        workflowData.termination_reason || undefined
      );

      // Update workflow status
      const { error: updateError } = await supabase
        .from('exit_workflows')
        .update({
          status: 'notice_sent',
          notice_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowData.id);

      if (updateError) throw updateError;

      // Mark send_notice step as completed
      await supabase
        .from('exit_workflow_steps')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          notes: 'Termination notice sent via email',
        })
        .eq('workflow_id', workflowData.id)
        .eq('step_name', 'send_notice');

      // Log the action
      await logExitWorkflowAction(
        'Termination Notice Sent',
        workflowData.id,
        workflowData.employee_id,
        `${workflowData.employee?.first_name} ${workflowData.employee?.last_name}`,
        workflowData.employee?.position || '',
        'board_approved',
        'notice_sent',
        {
          notice_date: new Date().toISOString().split('T')[0],
        }
      );

      message.success('Termination notice sent successfully');
      setWorkflowData({ ...workflowData, status: 'notice_sent' });
      fetchWorkflowSteps();
      onUpdate();
    } catch (error: any) {
      console.error('Error sending notice:', error);
      message.error(error.message || 'Failed to send termination notice');
    } finally {
      setSendingNotice(false);
    }
  };

  const handleEscalateEquityToBoard = async () => {
    setCreatingEquityResolution(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const employeeName = `${workflowData.employee?.first_name || ''} ${workflowData.employee?.last_name || ''}`.trim() || 'Executive';
      const resolutionNumber = `EQ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const { data: inserted, error: insertError } = await supabase
        .from('governance_board_resolutions')
        .insert({
          resolution_number: resolutionNumber,
          title: `Equity Revocation Approval - ${employeeName}`,
          description: `Board approval required to revoke/remove equity for ${employeeName} as part of exit workflow ${workflowData.id}.`,
          type: 'equity_grant',
          status: 'DRAFT',
          effective_date: workflowData.effective_date || null,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      await supabase
        .from('exit_workflow_steps')
        .update({
          status: 'in_progress',
          notes: `Escalated to board resolution ${resolutionNumber}`,
        })
        .eq('workflow_id', workflowData.id)
        .eq('step_name', 'handle_equity');

      await supabase.from('governance_logs').insert({
        action: 'EQUITY_REVOCATION_ESCALATED_TO_BOARD',
        actor_id: user.id,
        entity_type: 'EXIT_WORKFLOW',
        entity_id: workflowData.id,
        description: `Equity revocation escalated to board for ${employeeName}`,
        data: {
          workflow_id: workflowData.id,
          governance_resolution_id: inserted?.id || null,
          resolution_number: resolutionNumber,
        },
      });

      message.success(`Equity escalation sent to board (${resolutionNumber})`);
      fetchWorkflowSteps();
      onUpdate();
    } catch (error: any) {
      console.error('Error escalating equity to board:', error);
      message.error(error.message || 'Failed to escalate equity revocation to board');
    } finally {
      setCreatingEquityResolution(false);
    }
  };

  const handleSyncEquityDecision = async () => {
    setSyncingEquityDecision(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('user_id, email, first_name, last_name')
        .eq('id', workflowData.employee_id)
        .maybeSingle();

      if (employeeError) throw employeeError;

      const employeeUserId = employeeData?.user_id || null;
      const employeeEmail = employeeData?.email || null;
      const employeeName = `${employeeData?.first_name || ''} ${employeeData?.last_name || ''}`.trim() || 'Executive';
      const normalizedWorkflowResolutionStatus = String(workflowData.board_resolution?.status || '').toUpperCase();

      const adoptedBoardStatuses = new Set(['ADOPTED', 'APPROVED', 'BOARD_ADOPTED']);
      const boardApproved = adoptedBoardStatuses.has(normalizedWorkflowResolutionStatus);

      let equityRevoked = false;
      let revocationSource = '';

      const ledgerQuery = supabase
        .from('equity_ledger')
        .select('id, transaction_type, transaction_date, created_at')
        .eq('transaction_type', 'cancellation')
        .order('created_at', { ascending: false })
        .limit(1);

      if (employeeUserId) {
        const { data: cancellationRows, error: ledgerError } = await ledgerQuery.eq('recipient_user_id', employeeUserId);
        if (ledgerError) throw ledgerError;
        if ((cancellationRows || []).length > 0) {
          equityRevoked = true;
          const latest = cancellationRows?.[0];
          revocationSource = `equity_ledger cancellation ${latest?.id || ''}`.trim();
        }
      }

      // Fallback: if board governance already adopted, allow formal sync completion
      // even if no cancellation row was found in this quick lookup.
      if (!equityRevoked && boardApproved) {
        equityRevoked = true;
        revocationSource = `board resolution ${workflowData.board_resolution?.resolution_number || workflowData.board_resolution_id || 'ADOPTED'}`;
      }

      if (!equityRevoked) {
        message.warning('No adopted board decision or equity cancellation found yet. Governance and equity records may still be pending.');
        return;
      }

      const completionNote = `Equity step synced from governance: ${revocationSource}.`;

      const { error: stepUpdateError } = await supabase
        .from('exit_workflow_steps')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          notes: completionNote,
        })
        .eq('workflow_id', workflowData.id)
        .eq('step_name', 'handle_equity');

      if (stepUpdateError) throw stepUpdateError;

      await supabase.from('governance_logs').insert({
        action: 'EQUITY_STEP_SYNCED_FROM_GOVERNANCE',
        actor_id: user.id,
        entity_type: 'EXIT_WORKFLOW',
        entity_id: workflowData.id,
        description: `Equity workflow step synced as completed for ${employeeName}`,
        data: {
          workflow_id: workflowData.id,
          employee_id: workflowData.employee_id,
          source: revocationSource,
        },
      });

      message.success('Equity step synced successfully. Exit workflow is now in sync with governance.');
      await fetchWorkflowSteps();
      onUpdate();
    } catch (error: any) {
      console.error('Error syncing equity decision:', error);
      message.error(error.message || 'Failed to sync equity decision');
    } finally {
      setSyncingEquityDecision(false);
    }
  };

  const getStepStatus = (stepName: string) => {
    const step = steps.find(s => s.step_name === stepName);
    if (!step) return 'wait';
    
    switch (step.status) {
      case 'completed':
        return 'finish';
      case 'in_progress':
        return 'process';
      case 'failed':
        return 'error';
      default:
        return 'wait';
    }
  };

  const getStepIcon = (stepName: string) => {
    const status = getStepStatus(stepName);
    switch (status) {
      case 'finish':
        return <CheckCircleOutlined />;
      case 'process':
        return <ClockCircleOutlined />;
      case 'error':
        return <CloseCircleOutlined />;
      default:
        return null;
    }
  };

  const getStepDisplayName = (stepName: string) => {
    const labels: Record<string, string> = {
      send_notice: 'Send Notice',
      revoke_access: 'Revoke Access',
      collect_assets: 'Collect Assets',
      calculate_settlement: 'Final Settlement',
      handle_equity: 'Handle Equity',
      send_notifications: 'Send Notifications (Employee + Internal)',
      complete_workflow: 'Complete Workflow',
      board_approval: 'Board Approval',
    };
    return labels[stepName] || stepName.replace(/_/g, ' ').toUpperCase();
  };

  const workflowSteps = [
    workflow.workflow_type === 'executive_removal' && {
      title: 'Board Approval',
      key: 'board_approval',
      icon: getStepIcon('board_approval'),
      status: getStepStatus('board_approval'),
    },
    {
      title: 'Send Notice',
      key: 'send_notice',
      icon: getStepIcon('send_notice'),
      status: getStepStatus('send_notice'),
    },
    {
      title: 'Revoke Access',
      key: 'revoke_access',
      icon: getStepIcon('revoke_access'),
      status: getStepStatus('revoke_access'),
    },
    {
      title: 'Collect Assets',
      key: 'collect_assets',
      icon: getStepIcon('collect_assets'),
      status: getStepStatus('collect_assets'),
    },
    {
      title: 'Final Settlement',
      key: 'final_settlement',
      icon: getStepIcon('calculate_settlement'),
      status: getStepStatus('calculate_settlement'),
    },
    {
      title: 'Send Notifications',
      key: 'send_notifications',
      icon: getStepIcon('send_notifications'),
      status: getStepStatus('send_notifications'),
    },
    {
      title: 'Complete',
      key: 'complete',
      icon: getStepIcon('complete_workflow'),
      status: getStepStatus('complete_workflow'),
    },
  ].filter(Boolean);

  const readyToComplete = steps.length > 0 &&
    steps
      .filter((step) => step.step_name !== 'complete_workflow')
      .every((step) => step.status === 'completed' || step.status === 'skipped');
  const equityStep = steps.find((step) => step.step_name === 'handle_equity');
  const notificationStep = steps.find((step) => step.step_name === 'send_notifications');
  const equityNeedsBoardAction = !!equityStep && equityStep.status !== 'completed' && workflowData.status !== 'completed';
  const notificationsPending = !!notificationStep && notificationStep.status !== 'completed' && workflowData.status !== 'completed';

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      initiated: 'blue',
      board_approval_pending: 'orange',
      board_approved: 'green',
      board_rejected: 'red',
      notice_sent: 'cyan',
      access_revoked: 'purple',
      assets_returned: 'geekblue',
      final_settlement: 'gold',
      completed: 'green',
      cancelled: 'default',
    };
    return colors[status] || 'default';
  };

  return (
    <Modal
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Exit Workflow Details
          </Title>
          <Text type="secondary">
            {workflow.employee?.first_name} {workflow.employee?.last_name}
          </Text>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      style={{ top: 20 }}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Overview" key="overview">
          <Card style={{ marginBottom: 16 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Employee">
                {workflow.employee?.first_name} {workflow.employee?.last_name}
              </Descriptions.Item>
              <Descriptions.Item label="Position">
                {workflow.employee?.position}
              </Descriptions.Item>
              <Descriptions.Item label="Workflow Type">
                <Tag>{workflow.workflow_type.replace('_', ' ').toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Termination Type">
                {workflow.termination_type ? (
                  <Tag color={workflow.termination_type === 'for_cause' ? 'red' : 'orange'}>
                    {workflow.termination_type.replace('_', ' ').toUpperCase()}
                  </Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(workflow.status)}>
                  {workflow.status.replace('_', ' ').toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Effective Date">
                {dayjs(workflow.effective_date).format('MMMM DD, YYYY')}
              </Descriptions.Item>
              {workflow.board_resolution && (
                <>
                  <Descriptions.Item label="Board Resolution">
                    <Tag color={workflow.board_resolution.status === 'ADOPTED' ? 'green' : 'orange'}>
                      {workflow.board_resolution.resolution_number}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Resolution Status">
                    <Tag>{workflow.board_resolution.status}</Tag>
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Termination Reason" span={2}>
                {workflow.termination_reason ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{workflow.termination_reason}</div>
                ) : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {workflow.status === 'board_approval_pending' && (
            <Alert
              message="Board Approval Required"
              description={
                <div>
                  <p>This executive removal requires Board approval before proceeding.</p>
                  {workflow.board_resolution_id ? (
                    <div style={{ marginTop: 8 }}>
                      <Space>
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => {
                            window.open(`/company/governance-admin?tab=resolutions&resolution=${workflow.board_resolution_id}`, '_blank');
                          }}
                        >
                          View Board Resolution & Vote →
                        </Button>
                        <Button 
                          type="default" 
                          size="small"
                          icon={<ClockCircleOutlined />}
                          onClick={handleRefreshResolutionStatus}
                          loading={refreshingStatus}
                        >
                          Refresh Status
                        </Button>
                      </Space>
                    </div>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ marginBottom: 8, color: '#ff4d4f', fontWeight: 'bold' }}>
                        ⚠️ CRITICAL: Board resolution not created!
                      </p>
                      <Button 
                        type="primary"
                        danger
                        size="middle"
                        onClick={handleCreateBoardResolution}
                        loading={creatingResolution}
                        style={{ marginTop: 8 }}
                      >
                        Create Board Resolution Now
                      </Button>
                    </div>
                  )}
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {workflow.status === 'board_approved' && (
            <Alert
              message="Board Approved - Ready to Proceed"
              description="The Board has approved this executive removal. You can now proceed with sending notice and completing the remaining steps."
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Button 
                  type="primary"
                  size="small"
                  onClick={handleSendNotice}
                  loading={sendingNotice}
                >
                  Send Termination Notice
                </Button>
              }
            />
          )}

          {workflow.status === 'board_rejected' && (
            <Alert
              message="Board Rejected"
              description="The Board has rejected this executive removal. The workflow has been cancelled."
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Card title="Workflow Progress">
            <Steps
              items={workflowSteps}
              current={steps.filter(s => s.status === 'completed').length}
            />
          </Card>

          {equityNeedsBoardAction && (
            <Card style={{ marginTop: 16 }}>
              <Alert
                message="Equity Action Required"
                description="Equity revocation/removal is pending governance sync. Escalate if needed, then sync once governance adopts or equity cancellation is recorded."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                action={
                  <Space>
                    <Button
                      type="primary"
                      onClick={handleEscalateEquityToBoard}
                      loading={creatingEquityResolution}
                    >
                      Escalate to Board Resolution
                    </Button>
                    <Button
                      type="default"
                      onClick={handleSyncEquityDecision}
                      loading={syncingEquityDecision}
                    >
                      Sync Board Decision
                    </Button>
                  </Space>
                }
              />
            </Card>
          )}

          {notificationsPending && (
            <Card style={{ marginTop: 16 }}>
              <Alert
                message="Notifications Pending"
                description="This step sends (1) employee exit completion notice and (2) internal HR/governance closeout notification."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                action={
                  <Button
                    type="primary"
                    onClick={handleSendNotificationsNow}
                    loading={sendingNotifications}
                  >
                    Send Notifications Now
                  </Button>
                }
              />
            </Card>
          )}

          {readyToComplete && (
            <Card style={{ marginTop: 16 }}>
              <Alert
                message="Ready to Complete"
                description="All steps have been completed. You can now finalize the exit workflow."
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleCompleteWorkflow}
                loading={completingWorkflow}
                block
              >
                Complete Exit Workflow
              </Button>
            </Card>
          )}
        </TabPane>

        <TabPane tab="Access Revocation" key="access">
          <AccessRevocationStep
            workflowId={workflow.id}
            employeeId={workflow.employee_id}
            onUpdate={fetchWorkflowSteps}
          />
        </TabPane>

        <TabPane tab="Asset Return" key="assets">
          <AssetReturnStep
            workflowId={workflow.id}
            employeeId={workflow.employee_id}
            onUpdate={fetchWorkflowSteps}
          />
        </TabPane>

        <TabPane tab="Final Settlement" key="settlement">
          <FinalSettlementStep
            workflowId={workflow.id}
            employeeId={workflow.employee_id}
            effectiveDate={workflow.effective_date}
            terminationType={workflow.termination_type}
            onUpdate={fetchWorkflowSteps}
          />
        </TabPane>

        <TabPane tab="Timeline" key="timeline">
          <Card>
            <Timeline>
              <Timeline.Item color="blue">
                <Text strong>Workflow Initiated</Text>
                <br />
                <Text type="secondary">
                  {dayjs(workflow.created_at).format('MMMM DD, YYYY [at] h:mm A')}
                </Text>
              </Timeline.Item>
              {steps.map(step => (
                <Timeline.Item
                  key={step.id}
                  color={step.status === 'completed' ? 'green' : step.status === 'failed' ? 'red' : 'gray'}
                >
                  <Text strong>{getStepDisplayName(step.step_name)}</Text>
                  {step.completed_at && (
                    <>
                      <br />
                      <Text type="secondary">
                        Completed: {dayjs(step.completed_at).format('MMMM DD, YYYY [at] h:mm A')}
                      </Text>
                    </>
                  )}
                  {step.notes && (
                    <>
                      <br />
                      <Text type="secondary">{step.notes}</Text>
                    </>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

